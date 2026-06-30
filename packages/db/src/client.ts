import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DbClient | null = null;

export function createDb(url = process.env.DATABASE_URL): DbClient {
  if (!url) throw new Error("DATABASE_URL is required for managed Postgres/Supabase Postgres");
  const sql = postgres(url, { max: 5, prepare: false });
  return drizzle(sql, { schema });
}

export function getDb(url = process.env.DATABASE_URL): DbClient {
  if (!cached) cached = createDb(url);
  return cached;
}

export function resetDbClientForTests() {
  cached = null;
}

export type Db = DbClient;
