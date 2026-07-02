import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  functionalV1StudioTables,
  migrationStatements,
  requiredStudioTables,
  tablesCreatedByMigration
} from "../packages/db/src/apply-local";
import { isSchemaIncompleteError } from "../apps/studio/app/studio/data";

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
    expect(isSchemaIncompleteError(new Error("Failed query: select * from workspace_channels"))).toBe(false);
    expect(isSchemaIncompleteError(Object.assign(new Error("permission denied for table workspace_channels"), { code: "42501" }))).toBe(false);
  });

  it("Studio pages expose a non-production schema setup state instead of crashing", () => {
    const data = readFileSync(join(process.cwd(), "apps/studio/app/studio/data.tsx"), "utf8");
    const dashboard = readFileSync(join(process.cwd(), "apps/studio/app/studio/page.tsx"), "utf8");
    const assets = readFileSync(join(process.cwd(), "apps/studio/app/studio/assets/page.tsx"), "utf8");
    const publish = readFileSync(join(process.cwd(), "apps/studio/app/studio/publish/page.tsx"), "utf8");
    expect(data).toContain("Database schema incomplete. Apply migrations to enable this feature.");
    expect(data).toContain('process.env.APP_ENV === "production"');
    expect(dashboard).toContain("SchemaSetupState");
    expect(assets).toContain("SchemaSetupState");
    expect(publish).toContain("SchemaSetupState");
  });
});
