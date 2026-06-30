import { createDrizzleRepositories } from "./drizzle";
import { createMemoryRepositories } from "./memory";
import { createDb } from "../client";
import type { RepositoryBundle, RepositoryRuntimeConfig } from "./contracts";

export type RepositorySelection =
  | { adapter: "memory"; reason: "test_mode" | "explicit_development_memory" }
  | { adapter: "drizzle"; reason: "database_url_configured" };

const truthy = (value: string | undefined) => Boolean(value && value.trim().length > 0);

export function selectRepositoryAdapter(config: RepositoryRuntimeConfig = process.env): RepositorySelection {
  const nodeEnv = config.NODE_ENV ?? "development";
  const appEnv = config.APP_ENV ?? "development";
  const requested = config.REPOSITORY_ADAPTER ?? "auto";
  const hasDatabaseUrl = truthy(config.DATABASE_URL);

  if (appEnv === "production") {
    if (requested === "memory") throw new Error("In-memory repositories are forbidden in production");
    if (!hasDatabaseUrl) throw new Error("DATABASE_URL is required for production Drizzle repositories");
    return { adapter: "drizzle", reason: "database_url_configured" };
  }

  if (nodeEnv === "test") return { adapter: "memory", reason: "test_mode" };
  if (requested === "memory") return { adapter: "memory", reason: "explicit_development_memory" };
  if (hasDatabaseUrl) return { adapter: "drizzle", reason: "database_url_configured" };

  throw new Error("DATABASE_URL is missing. Set REPOSITORY_ADAPTER=memory only for explicit development fixtures.");
}

export function assertProductionRepositoryConfig(config: RepositoryRuntimeConfig = process.env) {
  const selected = selectRepositoryAdapter(config);
  if ((config.APP_ENV ?? config.NODE_ENV) === "production" && selected.adapter !== "drizzle") {
    throw new Error("Production runtime must use Drizzle repositories");
  }
  return selected;
}

export function createRuntimeRepositories(config: RepositoryRuntimeConfig = process.env): RepositoryBundle {
  const selected = selectRepositoryAdapter(config);
  return selected.adapter === "memory" ? createMemoryRepositories() as RepositoryBundle : createDrizzleRepositories(createDb(config.DATABASE_URL));
}

export const createRepositories = createRuntimeRepositories;
