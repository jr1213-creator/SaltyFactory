import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DbClient | null = null;

function defaultDatabaseUrl() {
  if (process.env.DIRECT_DATABASE_URL) return process.env.DIRECT_DATABASE_URL;
  const derived = deriveSupabaseDirectDatabaseUrl();
  return derived || process.env.DATABASE_URL;
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

export function createDb(url = defaultDatabaseUrl()): DbClient {
  if (!url) throw new Error("DATABASE_URL is required for managed Postgres/Supabase Postgres");
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  return drizzle(sql, { schema });
}

export function getDb(url = defaultDatabaseUrl()): DbClient {
  if (!cached) cached = createDb(url);
  return cached;
}

export function resetDbClientForTests() {
  cached = null;
}

export type Db = DbClient;
