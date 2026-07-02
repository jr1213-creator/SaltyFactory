import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;
export type DatabaseRuntimeConfig = {
  [key: string]: string | undefined;
  DATABASE_URL?: string;
  DIRECT_DATABASE_URL?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

let cached: DbClient | null = null;

export function resolveRuntimeDatabaseUrl(config: DatabaseRuntimeConfig = process.env) {
  return config.DIRECT_DATABASE_URL || config.DATABASE_URL;
}

function defaultDatabaseUrl() {
  return resolveRuntimeDatabaseUrl();
}

export function createDb(url = defaultDatabaseUrl()): DbClient {
  if (!url) throw new Error("DATABASE_URL is required for managed Postgres/Supabase Postgres");
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  return drizzle(sql, { schema });
}

export async function checkRuntimeDatabaseConnection(config: DatabaseRuntimeConfig = process.env) {
  const url = resolveRuntimeDatabaseUrl(config);
  if (!url) throw new Error("DATABASE_URL is required for managed Postgres/Supabase Postgres");
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => undefined });
  try {
    await sql`select 1 as ok`;
    return { connected: true };
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

export function getDb(url = defaultDatabaseUrl()): DbClient {
  if (!cached) cached = createDb(url);
  return cached;
}

export function resetDbClientForTests() {
  cached = null;
}

export type Db = DbClient;
