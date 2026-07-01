import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const requiredTables = [
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
  "users",
  "organizations",
  "workspaces",
  "organization_members"
];

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
    const migrations = [
      "0000_great_agent_zero.sql",
      "0001_warm_sway.sql",
      "0002_living_clea.sql"
    ].map((file) => readFileSync(join(process.cwd(), "packages/db/migrations", file), "utf8")).join("\n");

    for (const table of requiredTables) {
      expect(schema).toContain(table.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()));
      expect(migrations).toContain(`CREATE TABLE "${table}"`);
    }
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
