import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRuntimeRepositories, resetDbClientForTests, resolveRuntimeDatabaseUrl, selectRepositoryAdapter } from "@saltyfactory/db";

afterEach(() => {
  resetDbClientForTests();
});

describe("repository factory selection", () => {
  it("production config rejects memory repository mode", () => {
    expect(() => selectRepositoryAdapter({ APP_ENV: "production", NODE_ENV: "production", REPOSITORY_ADAPTER: "memory", DATABASE_URL: "postgres://example" })).toThrow("forbidden");
  });

  it("production config requires DATABASE_URL", () => {
    expect(() => selectRepositoryAdapter({ APP_ENV: "production", NODE_ENV: "production" })).toThrow("DATABASE_URL");
  });

  it("repository factory returns memory repos in test", () => {
    expect(createRuntimeRepositories({ NODE_ENV: "test", APP_ENV: "test" }).adapter).toBe("memory");
  });

  it("repository factory returns Drizzle repos when DATABASE_URL exists", () => {
    expect(createRuntimeRepositories({ NODE_ENV: "development", APP_ENV: "development", DATABASE_URL: "postgres://user:pass@localhost:5432/saltyfactory" }).adapter).toBe("drizzle");
  });

  it("runtime Drizzle repositories reuse the cached database client", () => {
    const source = readFileSync(join(process.cwd(), "packages/db/src/repositories/factory.ts"), "utf8");
    expect(source).toContain("createDrizzleRepositories(getDb(resolveRuntimeDatabaseUrl(config)))");
    expect(source).not.toContain("createDrizzleRepositories(createDb(resolveRuntimeDatabaseUrl(config)))");
  });

  it("runtime database URL preserves the configured pooler unless DIRECT_DATABASE_URL is explicit", () => {
    const pooler = "postgres://postgres.project:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
    const direct = "postgres://postgres:secret@db.project.supabase.co:5432/postgres";

    expect(resolveRuntimeDatabaseUrl({
      DATABASE_URL: pooler,
      SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co"
    })).toBe(pooler);
    expect(resolveRuntimeDatabaseUrl({ DATABASE_URL: pooler, DIRECT_DATABASE_URL: direct })).toBe(direct);
  });

  it("development memory requires explicit adapter", () => {
    expect(() => selectRepositoryAdapter({ NODE_ENV: "development", APP_ENV: "development" })).toThrow("REPOSITORY_ADAPTER=memory");
    expect(selectRepositoryAdapter({ NODE_ENV: "development", APP_ENV: "development", REPOSITORY_ADAPTER: "memory" }).adapter).toBe("memory");
  });
});
