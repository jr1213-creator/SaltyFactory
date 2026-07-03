import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  functionalV1StudioTables,
  migrationStatements,
  requiredStudioColumnShapes,
  requiredStudioTableColumns,
  requiredStudioTables,
  tablesCreatedByMigration
} from "../packages/db/src/apply-local";
import {
  businessProfileSetupStateForError,
  classifyStudioDataError,
  getBusinessProfileStudioData,
  getStudioLists,
  isSchemaIncompleteError,
  sanitizeStudioDataError
} from "../apps/studio/app/studio/data";

describe("local database schema apply", () => {
  it("uses a real migrate/apply implementation, not a placeholder", () => {
    const migrate = readFileSync(join(process.cwd(), "packages/db/src/migrate.ts"), "utf8");
    const apply = readFileSync(join(process.cwd(), "packages/db/src/apply-local.ts"), "utf8");
    expect(migrate).not.toContain('console.log("migrations applied")');
    expect(apply).toContain("applyLocalSchema");
    expect(apply).toContain("saltyfactory_schema_applied");
    expect(apply).toContain("FOREIGN KEY");
  });

  it("includes required Studio tables in schema and migrations", () => {
    const schema = readFileSync(join(process.cwd(), "packages/db/src/schema.ts"), "utf8");
    const migrationsDir = join(process.cwd(), "packages/db/migrations");
    const migrations = readdirSync(migrationsDir)
      .filter((file) => /^\d+_.*\.sql$/.test(file))
      .sort()
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");

    for (const table of requiredStudioTables) {
      expect(schema).toContain(table.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()));
      expect(migrations).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("treats functional-v1 Studio tables as required schema", () => {
    const apply = readFileSync(join(process.cwd(), "packages/db/src/apply-local.ts"), "utf8");
    expect(requiredStudioTables).toEqual(expect.arrayContaining(functionalV1StudioTables));
    for (const table of functionalV1StudioTables) {
      expect(apply).toContain(table);
    }
  });

  it("verifies audit_events schema required by Studio writes", () => {
    const apply = readFileSync(join(process.cwd(), "packages/db/src/apply-local.ts"), "utf8");
    expect(requiredStudioTables).toContain("audit_events");
    expect(requiredStudioTableColumns.audit_events).toEqual(expect.arrayContaining([
      "id",
      "workspace_id",
      "created_at",
      "updated_at",
      "entity_type",
      "entity_id",
      "action",
      "actor_type",
      "actor_id",
      "after_state",
      "metadata"
    ]));
    expect(apply).toContain("Required Studio table columns are missing after schema apply");
    expect(apply).toContain('alter table "audit_events" add column if not exists "updated_at"');
    expect(requiredStudioColumnShapes["audit_events.id"]).toMatchObject({ udtName: "text" });
    expect(requiredStudioColumnShapes["audit_events.event_type"]).toMatchObject({ nullableIfPresent: true });
    expect(apply).toContain('alter table "audit_events" alter column "id" type text using "id"::text');
    expect(apply).toContain('alter table "audit_events" alter column "event_type" drop not null');
  });

  it("detects migration-created tables so applied-journal drift can be repaired", () => {
    const migration = readFileSync(join(process.cwd(), "packages/db/migrations/0003_premium_venom.sql"), "utf8");
    const createdTables = tablesCreatedByMigration(migration);
    const statements = migrationStatements(migration);

    expect(createdTables).toEqual(expect.arrayContaining(functionalV1StudioTables));
    expect(statements.some((statement) => /\bFOREIGN KEY\b/i.test(statement))).toBe(false);
    expect(statements.some((statement) => /^CREATE TABLE IF NOT EXISTS "workspace_business_profiles_v1"/i.test(statement))).toBe(true);
    expect(statements.some((statement) => /^CREATE INDEX IF NOT EXISTS "workspace_channels_status_idx"/i.test(statement))).toBe(true);
  });

  it("loads both root and Studio env files without printing values", () => {
    const apply = readFileSync(join(process.cwd(), "packages/db/src/apply-local.ts"), "utf8");
    expect(apply).toContain('resolve(root, ".env.local")');
    expect(apply).toContain('resolve(root, "apps/studio/.env.local")');
    expect(apply).toContain("differs between .env.local and apps/studio/.env.local");
    expect(apply).not.toContain("console.log(process.env");
  });

  it("labels only missing schema errors as schema incomplete", () => {
    const missingRelation = Object.assign(new Error("Failed query: select * from workspace_channels"), {
      cause: Object.assign(new Error('relation "workspace_channels" does not exist'), { code: "42P01" })
    });
    const missingColumn = Object.assign(new Error("Failed query: select readiness_score"), {
      cause: Object.assign(new Error('column "readiness_score" does not exist'), { code: "42703" })
    });

    expect(isSchemaIncompleteError(missingRelation)).toBe(true);
    expect(isSchemaIncompleteError(missingColumn)).toBe(true);
    expect(classifyStudioDataError(missingRelation)).toBe("schema_incomplete");
    expect(isSchemaIncompleteError(new Error("Failed query: select * from workspace_channels"))).toBe(false);
    expect(isSchemaIncompleteError(Object.assign(new Error("permission denied for table workspace_channels"), { code: "42501" }))).toBe(false);
  });

  it("classifies non-schema Studio data setup failures honestly", async () => {
    const unreachable = Object.assign(new Error("Failed query: select * from workspace_channels"), {
      cause: Object.assign(new Error("connect EACCES 203.0.113.10:5432"), { code: "EACCES" })
    });
    const permission = Object.assign(new Error("permission denied for table workspace_channels"), { code: "42501" });
    const workspace = new Error("workspace access required for wks_default");

    expect(classifyStudioDataError(unreachable)).toBe("database_unreachable");
    expect(classifyStudioDataError(permission)).toBe("database_permission_denied");
    expect(classifyStudioDataError(workspace)).toBe("workspace_setup_required");
    expect(sanitizeStudioDataError(new Error("postgres://user:pass@example/db access_token=abc123 client_secret=shh"))).not.toMatch(/abc123|shh|user:pass/);

    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalRepositoryAdapter = process.env.REPOSITORY_ADAPTER;
    const originalAppEnv = process.env.APP_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.REPOSITORY_ADAPTER;
    process.env.APP_ENV = "development";
    try {
      const result = await getStudioLists();
      expect(result.schemaIncomplete).toBe(false);
      expect(result.setupMessage).toContain("Studio database is not configured");
      expect(result.setupMessage).not.toContain("Database schema incomplete");
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
      if (originalRepositoryAdapter === undefined) delete process.env.REPOSITORY_ADAPTER;
      else process.env.REPOSITORY_ADAPTER = originalRepositoryAdapter;
      if (originalAppEnv === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = originalAppEnv;
    }
  });

  it("Business Profile setup state only uses schema warning for true schema errors", async () => {
    const missingBusinessProfileTable = Object.assign(new Error('relation "workspace_business_profiles_v1" does not exist'), { code: "42P01" });
    const repositoryFailure = Object.assign(new Error("unexpected business profile repository failure"), { code: "XX000" });

    expect(businessProfileSetupStateForError(missingBusinessProfileTable)).toMatchObject({
      schemaIncomplete: true,
      setupMessage: "Database schema incomplete. Apply migrations to enable this feature."
    });
    expect(businessProfileSetupStateForError(repositoryFailure)).toMatchObject({
      schemaIncomplete: false,
      setupMessage: "Business profile unavailable. Check database access and workspace setup."
    });
  });

  it("Business Profile scoped loader does not show schema warning when repository is available", async () => {
    const originalRepositoryAdapter = process.env.REPOSITORY_ADAPTER;
    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.REPOSITORY_ADAPTER = "memory";
    delete process.env.DATABASE_URL;
    try {
      const result = await getBusinessProfileStudioData();
      expect(result.schemaIncomplete).toBe(false);
      expect(result.setupMessage).toBe("");
      expect(result.businessProfiles).toEqual([]);
    } finally {
      if (originalRepositoryAdapter === undefined) delete process.env.REPOSITORY_ADAPTER;
      else process.env.REPOSITORY_ADAPTER = originalRepositoryAdapter;
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("Studio pages expose a non-production schema setup state instead of crashing", () => {
    const data = readFileSync(join(process.cwd(), "apps/studio/app/studio/data.tsx"), "utf8");
    const dashboard = readFileSync(join(process.cwd(), "apps/studio/app/studio/page.tsx"), "utf8");
    const assets = readFileSync(join(process.cwd(), "apps/studio/app/studio/assets/page.tsx"), "utf8");
    const publish = readFileSync(join(process.cwd(), "apps/studio/app/studio/publish/page.tsx"), "utf8");
    expect(data).toContain("Database schema incomplete. Apply migrations to enable this feature.");
    expect(data).toContain('process.env.APP_ENV === "production"');
    expect(dashboard).toContain("SafeStudioSetupNotice");
    expect(dashboard).toContain("Persistent Studio storage is not fully connected");
    expect(assets).toContain("SchemaSetupState");
    expect(publish).toContain("SchemaSetupState");
  });
});
