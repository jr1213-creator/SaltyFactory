import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

export const functionalV1StudioTables = [
  "baseline_snapshots",
  "dropship_product_candidates",
  "listing_drafts_v1",
  "migration_wizard_runs",
  "pod_migration_candidates",
  "social_content_items",
  "workspace_business_profiles_v1",
  "workspace_channels"
];

export const requiredStudioTables = [
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
  "site_audit_findings",
  ...functionalV1StudioTables
];

const envKeysThatMustMatch = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL"
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

function parseEnvFile(envPath: string) {
  const values = new Map<string, string>();
  if (!existsSync(envPath)) return values;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match?.[1]) continue;
    values.set(match[1], (match[2] || "").trim().replace(/^(['"])(.*)\1$/, "$2"));
  }
  return values;
}

function loadLocalEnvFiles(root = repoRoot()) {
  const envFiles = [
    { label: ".env.local", path: resolve(root, ".env.local") },
    { label: "apps/studio/.env.local", path: resolve(root, "apps/studio/.env.local") }
  ].map((file) => ({ ...file, values: parseEnvFile(file.path) }));
  const explicitProcessEnv = new Set(envKeysThatMustMatch.filter((key) => process.env[key] !== undefined));

  const [rootEnv, studioEnv] = envFiles;
  for (const key of envKeysThatMustMatch) {
    if (explicitProcessEnv.has(key)) continue;
    const rootValue = rootEnv?.values.get(key);
    const studioValue = studioEnv?.values.get(key);
    if (rootValue !== undefined && studioValue !== undefined && rootValue !== studioValue) {
      throw new Error(`${key} differs between .env.local and apps/studio/.env.local; align them before running db:migrate`);
    }
  }

  for (const file of envFiles) {
    for (const [key, value] of file.values) {
      if (process.env[key] !== undefined) continue;
      process.env[key] = value;
    }
  }
}

export function migrationStatements(sqlText: string) {
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

export function tablesCreatedByMigration(sqlText: string) {
  const tables = new Set<string>();
  const tablePattern = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_]*)\.)?(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/gi;
  for (const match of sqlText.matchAll(tablePattern)) {
    const table = match[1] || match[2];
    if (table) tables.add(table);
  }
  return Array.from(tables);
}

async function missingTables(sql: postgres.Sql, tables: string[]) {
  if (!tables.length) return [];
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${sql(tables)}
  `;
  const present = new Set(rows.map((row) => row.table_name));
  return tables.filter((table) => !present.has(table));
}

async function assertRequiredTables(sql: postgres.Sql) {
  const missing = await missingTables(sql, requiredStudioTables);
  if (missing.length) throw new Error(`Required Studio tables are missing after schema apply: ${missing.join(", ")}`);
}

async function applyMigrationStatements(sql: postgres.Sql, sqlText: string) {
  let statementsApplied = 0;
  for (const statement of migrationStatements(sqlText)) {
    try {
      await sql.unsafe(statement);
      statementsApplied += 1;
    } catch (error) {
      if (isSkippableLocalSchemaConflict(error, statement)) continue;
      throw error;
    }
  }
  return statementsApplied;
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "database schema apply failed";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]");
}

export async function applyLocalSchema() {
  loadLocalEnvFiles();
  const databaseUrls = candidateDatabaseUrls();
  if (!databaseUrls.length) throw new Error("DATABASE_URL is required");

  const migrationsDir = resolve(repoRoot(), "packages/db/migrations");
  const files = readdirSync(migrationsDir).filter((file) => /^\d+_.*\.sql$/.test(file)).sort();
  if (!files.length) throw new Error("No SQL migrations found in packages/db/migrations");

  const sql = await connect(databaseUrls);
  const applied: string[] = [];
  const repaired: { file: string; missingTables: string[] }[] = [];
  let statementsApplied = 0;
  try {
    await sql`create table if not exists saltyfactory_schema_applied (
      filename text primary key,
      applied_at timestamp with time zone default now() not null
    )`;

    for (const file of files) {
      const text = readFileSync(resolve(migrationsDir, file), "utf8");
      const existing = await sql<{ filename: string }[]>`select filename from saltyfactory_schema_applied where filename = ${file} limit 1`;
      if (existing.length) {
        const missingCreatedTables = await missingTables(sql, tablesCreatedByMigration(text));
        if (!missingCreatedTables.length) continue;
        statementsApplied += await applyMigrationStatements(sql, text);
        repaired.push({ file, missingTables: missingCreatedTables });
        continue;
      }

      statementsApplied += await applyMigrationStatements(sql, text);
      await sql`insert into saltyfactory_schema_applied (filename) values (${file}) on conflict (filename) do nothing`;
      applied.push(file);
    }

    await assertRequiredTables(sql);
    return {
      ok: true,
      applied,
      repaired,
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
