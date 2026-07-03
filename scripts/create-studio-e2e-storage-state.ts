import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ACCESS_COOKIE, SUPABASE_REFRESH_COOKIE } from "@saltyfactory/auth";

type LoadedEnv = Record<string, string | undefined>;

function loadEnvFile(path: string, env: LoadedEnv) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const parts = trimmed.split("=");
      const rawKey = parts.shift();
      if (!rawKey) continue;
      const key = rawKey.trim();
      if (!key || process.env[key] !== undefined || env[key] !== undefined) continue;
      const value = parts.join("=").trim().replace(/^['"]|['"]$/g, "");
      env[key] = value;
    }
  } catch {
    // Local env files are optional; explicit process env wins.
  }
}

function readEnv() {
  const env: LoadedEnv = { ...process.env };
  loadEnvFile(resolve(".env.local"), env);
  loadEnvFile(resolve(".env"), env);
  return env;
}

function required(env: LoadedEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required for authenticated Studio Playwright storage-state generation.`);
  return value;
}

function assertSafeRuntime(env: LoadedEnv) {
  if (env.NODE_ENV === "production" || env.APP_ENV === "production") {
    throw new Error("Refusing to create Studio E2E auth state while NODE_ENV or APP_ENV is production.");
  }
}

function cookie(name: string, value: string, baseUrl: string, maxAgeSeconds: number) {
  const url = new URL(baseUrl);
  return {
    name,
    value,
    domain: url.hostname,
    path: "/",
    expires: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "Lax" as const
  };
}

export async function createStudioE2eStorageState() {
  const env = readEnv();
  assertSafeRuntime(env);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY are required.");
  }

  const email = required(env, "STUDIO_E2E_EMAIL");
  const password = required(env, "STUDIO_E2E_PASSWORD");
  const baseUrl = env.STUDIO_E2E_BASE_URL || "http://localhost:3001";
  const outputPath = resolve(env.STUDIO_E2E_STORAGE_STATE || "test-results/studio-auth-state.json");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const session = data.session;
  if (error || !session?.access_token || !session.refresh_token) {
    throw new Error("Supabase test-account sign-in failed. Verify STUDIO_E2E_EMAIL/STUDIO_E2E_PASSWORD and that the user has a Studio workspace membership.");
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify({
    cookies: [
      cookie(SUPABASE_ACCESS_COOKIE, session.access_token, baseUrl, Math.max(60, Number(session.expires_in ?? 3600))),
      cookie(SUPABASE_REFRESH_COOKIE, session.refresh_token, baseUrl, 60 * 60 * 24 * 30)
    ],
    origins: []
  }, null, 2));

  console.log(`Studio E2E storage state written to ${outputPath}`);
  console.log("The file contains browser auth cookies for a dedicated test account. Do not commit it.");
  return outputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createStudioE2eStorageState().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
