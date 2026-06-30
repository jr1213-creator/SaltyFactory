import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDir = join(process.cwd(), "packages", "db", "migrations");
const migrationFile = readdirSync(migrationDir).find((file) => /^0000_.*\.sql$/.test(file));
const sql = readFileSync(join(migrationDir, migrationFile ?? ""), "utf8");

describe("db migration sql", () => {
  it("creates a single full base migration", () => {
    expect(migrationFile).toBeTruthy();
    expect(sql).toContain('CREATE TABLE "trend_signals"');
    expect(sql).toContain('"workspace_id" text NOT NULL');
    expect(sql).toContain('"related_terms" jsonb');
    expect(sql).toContain('"captured_at" timestamp with time zone NOT NULL');
  });

  it("creates product, publish, and ai employee production columns", () => {
    for (const needle of ['"variant_ids" jsonb', '"gates" jsonb', '"shopify_publish_allowed" boolean', '"blocked_reasons" jsonb', '"provider_used" text']) {
      expect(sql).toContain(needle);
    }
  });

  it("does not create raw provider token columns", () => {
    expect(sql.toLowerCase()).not.toMatch(/"[^"]*(api_token|admin_token|printify_token|hf_token|password)[^"]*"/);
    expect(sql).toContain('"secret_ref" text');
  });
});
