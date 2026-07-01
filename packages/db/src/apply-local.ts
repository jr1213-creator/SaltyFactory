import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const requiredStudioTables = [
  "users",
  "organizations",
  "workspaces",
  "organization_members",
  "generation_jobs",
  "trend_clusters",
  "phrase_candidates",
  "trend_signals",
  "trend_sources",
  "product_drafts",
  "design_assets",
  "publish_reviews",
  "encrypted_credentials",
  "integration_sync_runs",
  "site_audit_runs",
  "site_audit_findings"
];

function repoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) return current;
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

function loadRootEnvLocal(root = repoRoot()) {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match?.[1]) continue;
    if (process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = (match[2] || "").trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

function migrationStatements(sqlText: string) {
  return sqlText
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => !/^\s*ALTER TABLE\b[\s\S]+?\bFOREIGN KEY\b/i.test(statement))
    .map((statement) => statement
      .replace(/^\s*CREATE TABLE\s+(?!IF NOT EXISTS)/i, "CREATE TABLE IF NOT EXISTS ")
      .replace(/^\s*CREATE UNIQUE INDEX\s+(?!IF NOT EXISTS)/i, "CREATE UNIQUE INDEX IF NOT EXISTS ")
      .replace(/^\s*CREATE INDEX\s+(?!IF NOT EXISTS)/i, "CREATE INDEX IF NOT EXISTS "));
}

async function existingTables(sql: postgres.Sql) {
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${sql(requiredStudioTables)}
  `;
  return new Set(rows.map((row) => row.table_name));
}

async function assertRequiredTables(sql: postgres.Sql) {
  const tables = await existingTables(sql);
  const missing = requiredStudioTables.filter((table) => !tables.has(table));
  if (missing.length) throw new Error(`Required Studio tables are missing after schema apply: ${missing.join(", ")}`);
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "database schema apply failed";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]");
}

export async function applyLocalSchema() {
  loadRootEnvLocal();
  const databaseUrls = candidateDatabaseUrls();
  if (!databaseUrls.length) throw new Error("DATABASE_URL is required");

  const migrationsDir = resolve(repoRoot(), "packages/db/migrations");
  const files = readdirSync(migrationsDir).filter((file) => /^\d+_.*\.sql$/.test(file)).sort();
  if (!files.length) throw new Error("No SQL migrations found in packages/db/migrations");

  const sql = await connect(databaseUrls);
  const applied: string[] = [];
  let statementsApplied = 0;
  try {
    await sql`create table if not exists saltyfactory_schema_applied (
      filename text primary key,
      applied_at timestamp with time zone default now() not null
    )`;

    for (const file of files) {
      const existing = await sql<{ filename: string }[]>`select filename from saltyfactory_schema_applied where filename = ${file} limit 1`;
      if (existing.length) continue;

      const text = readFileSync(resolve(migrationsDir, file), "utf8");
      for (const statement of migrationStatements(text)) {
        try {
          await sql.unsafe(statement);
          statementsApplied += 1;
        } catch (error) {
          if (isSkippableLocalSchemaConflict(error, statement)) continue;
          throw error;
        }
      }
      await sql`insert into saltyfactory_schema_applied (filename) values (${file}) on conflict (filename) do nothing`;
      applied.push(file);
    }

    await assertRequiredTables(sql);
    return {
      ok: true,
      applied,
      statementsApplied,
      requiredTablesVerified: requiredStudioTables,
      note: "Foreign-key statements are skipped for local apply so existing Supabase-owned/incompatible tables are preserved."
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function candidateDatabaseUrls() {
  const urls = [process.env.DIRECT_DATABASE_URL].filter(Boolean) as string[];
  const derived = deriveSupabaseDirectDatabaseUrl();
  if (derived) urls.push(derived);
  if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL);
  return Array.from(new Set(urls));
}

function deriveSupabaseDirectDatabaseUrl() {
  if (!process.env.DATABASE_URL) return "";
  try {
    const pool = new URL(process.env.DATABASE_URL);
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const projectRef = supabaseUrl
      ? new URL(supabaseUrl).hostname.split(".")[0]
      : pool.username.includes(".")
        ? pool.username.split(".").at(-1)
        : pool.hostname.match(/^([a-z0-9]+)\.pooler\.supabase\.com$/)?.[1];
    if (!projectRef) return "";
    const direct = new URL(pool.toString());
    direct.hostname = `db.${projectRef}.supabase.co`;
    direct.port = "5432";
    direct.username = "postgres";
    return direct.toString();
  } catch {
    return "";
  }
}

async function connect(urls: string[]) {
  const errors: string[] = [];
  for (const url of urls) {
    const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => undefined });
    try {
      await sql`select 1`;
      return sql;
    } catch (error) {
      errors.push(sanitizeError(error));
      await sql.end({ timeout: 5 }).catch(() => undefined);
    }
  }
  throw new Error(`Could not connect to Postgres using configured safe candidates: ${errors.join(" | ")}`);
}

function isSkippableLocalSchemaConflict(error: unknown, statement: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (/^\s*CREATE (UNIQUE )?INDEX\b/i.test(statement) && code === "42703") return true;
  if (/^\s*CREATE (TABLE|UNIQUE INDEX|INDEX)\b/i.test(statement) && code === "42P07") return true;
  return false;
}

if (process.env.NODE_ENV !== "test") {
  applyLocalSchema()
    .then((summary) => console.log(JSON.stringify(summary, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: sanitizeError(error) }, null, 2));
      process.exitCode = 1;
    });
}
