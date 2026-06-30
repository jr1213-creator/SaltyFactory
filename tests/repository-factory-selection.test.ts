import { describe, expect, it } from "vitest";
import { createRuntimeRepositories, selectRepositoryAdapter } from "@saltyfactory/db";

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

  it("development memory requires explicit adapter", () => {
    expect(() => selectRepositoryAdapter({ NODE_ENV: "development", APP_ENV: "development" })).toThrow("REPOSITORY_ADAPTER=memory");
    expect(selectRepositoryAdapter({ NODE_ENV: "development", APP_ENV: "development", REPOSITORY_ADAPTER: "memory" }).adapter).toBe("memory");
  });
});
