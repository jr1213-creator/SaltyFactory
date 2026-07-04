import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEnv, validateProductionReadiness } from "../packages/config/src/index";
import { selectRepositoryAdapter } from "../packages/db/src/repositories/factory";

const failures: string[] = [];

function studioRoute(path: string) {
  return readFileSync(join("apps", "studio", "app", "api", "studio", path, "route.ts"), "utf8");
}

function walkRoutes(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walkRoutes(path, out);
    else if (entry === "route.ts") out.push(path);
  }
  return out;
}

const env = readFileSync(".env.example", "utf8");
for (const key of [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "STUDIO_AUTH_ENABLED=true",
  "LIVE_PUBLISHING_ENABLED=false",
  "REPOSITORY_ADAPTER=auto",
  "CREDENTIAL_STORAGE_ENABLED=false",
  "CREDENTIAL_ENCRYPTION_KEY",
  "GOOGLE_INTEGRATIONS_ENABLED=false",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_ANALYTICS_ENABLED=false",
  "GOOGLE_SEARCH_CONSOLE_ENABLED=false",
  "GOOGLE_BUSINESS_PROFILE_ENABLED=false"
]) {
  if (!env.includes(key)) failures.push(`.env.example missing ${key}`);
}

const migrationFiles = existsSync("packages/db/migrations") ? readdirSync("packages/db/migrations").filter((file) => /^\d+_.*\.sql$/.test(file)).sort() : [];
const migrations = migrationFiles.filter((file) => /^0000_.*\.sql$/.test(file));
if (!migrations.length) {
  failures.push("base migration missing");
} else {
  const sql = migrationFiles.map((file) => readFileSync(`packages/db/migrations/${file}`, "utf8")).join("\n");
  for (const needle of [
    'CREATE TABLE "trend_signals"',
    'CREATE TABLE "generation_jobs"',
    'CREATE TABLE "trend_clusters"',
    'CREATE TABLE "phrase_candidates"',
    'CREATE TABLE "product_drafts"',
    'CREATE TABLE "publish_reviews"',
    'CREATE TABLE "encrypted_credentials"',
    'CREATE TABLE "integration_sync_runs"',
    'CREATE TABLE "site_audit_runs"',
    'CREATE TABLE "site_audit_findings"',
    'CREATE TABLE "workspace_business_profiles_v1"',
    'CREATE TABLE "workspace_channels"',
    'CREATE TABLE "baseline_snapshots"',
    'CREATE TABLE "pod_migration_candidates"',
    'CREATE TABLE "listing_drafts_v1"',
    '"workspace_id" text NOT NULL',
    '"gates" jsonb',
    '"secret_ref" text'
  ]) {
    if (!sql.includes(needle)) failures.push(`migrations missing ${needle}`);
  }
}

const migrateText = readFileSync(join("packages", "db", "src", "migrate.ts"), "utf8") + readFileSync(join("packages", "db", "src", "apply-local.ts"), "utf8");
if (migrateText.includes('console.log("migrations applied")') || !migrateText.includes("applyLocalSchema") || !migrateText.includes("saltyfactory_schema_applied")) failures.push("db:migrate must run a real tracked schema apply");

const disabled = parseEnv({
  APP_ENV: "production",
  NODE_ENV: "production",
  STUDIO_AUTH_ENABLED: "true",
  AI_TEXT_ENABLED: "false",
  AI_IMAGE_ENABLED: "false",
  BACKGROUND_REMOVAL_ENABLED: "false",
  UPSCALE_ENABLED: "false",
  SHOPIFY_STOREFRONT_ENABLED: "false",
  SHOPIFY_ADMIN_ENABLED: "false",
  PRINTIFY_ENABLED: "false",
  LIVE_PUBLISHING_ENABLED: "false",
  NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com"
});
if (disabled.providers.aiText.enabled) failures.push("AI text enabled without token");

const readiness = validateProductionReadiness(disabled);
for (const message of [
  "DATABASE_URL required for production managed Postgres",
  "Supabase URL and service role key required server-side",
  "Supabase Auth URL required for Studio auth",
  "Supabase anon key required for Studio auth"
]) {
  if (!readiness.failures.includes(message)) failures.push(`production readiness missing: ${message}`);
}

const credentialReadiness = validateProductionReadiness(parseEnv({
  APP_ENV: "production",
  NODE_ENV: "production",
  STUDIO_AUTH_ENABLED: "true",
  CREDENTIAL_STORAGE_ENABLED: "true",
  DATABASE_URL: "postgres://example",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com"
}));
if (!credentialReadiness.failures.includes("CREDENTIAL_ENCRYPTION_KEY required when encrypted credential storage is enabled")) failures.push("production readiness did not require credential encryption key");

try {
  selectRepositoryAdapter({ APP_ENV: "production", NODE_ENV: "production", REPOSITORY_ADAPTER: "memory", DATABASE_URL: "postgres://example" });
  failures.push("production allowed memory repository adapter");
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("forbidden")) failures.push("production memory repository failure was unclear");
}

const selected = selectRepositoryAdapter({ APP_ENV: "production", NODE_ENV: "production", DATABASE_URL: "postgres://example" });
if (selected.adapter !== "drizzle") failures.push("production did not select Drizzle repositories");
if (env.includes("STUDIO_AUTH_ENABLED=false")) failures.push("production auth bypass documented");

const authText = readFileSync(join("packages", "auth", "src", "index.ts"), "utf8");
const proxyText = readFileSync(join("apps", "studio", "proxy.ts"), "utf8");
const loginRoute = readFileSync(join("apps", "studio", "app", "api", "studio", "login", "route.ts"), "utf8");
if (!authText.includes("signInWithOtp") || !authText.includes("exchangeCodeForSession") || !authText.includes("getUser(accessToken)")) failures.push("Supabase Studio auth flow missing");
if (/Boolean\(process\.env\.STUDIO_ADMIN_EMAIL\)/.test(proxyText) || /return process\.env\.STUDIO_ADMIN_EMAIL\s*\?/.test(authText) || /createStudioSessionValue|verifyStudioSessionValue|sf_studio_session/.test(authText)) failures.push("production Studio auth is env-only or custom signed-cookie based");
if (/STUDIO_AUTH_SECRET|STUDIO_ADMIN_PASSWORD_HASH|PASSWORD_HASH|bcrypt|argon2/.test(env + authText)) failures.push("custom Studio auth secret/password workaround found");
if (!authText.includes("PLAYWRIGHT_AUTH_BYPASS") || !authText.includes("test_auth_bypass_forbidden_in_production") || !authText.includes("test_auth_bypass_requires_test_runtime")) failures.push("Playwright auth bypass must remain test-only and production-blocked");
if (process.env.APP_ENV === "production" && process.env.PLAYWRIGHT_AUTH_BYPASS === "true") failures.push("PLAYWRIGHT_AUTH_BYPASS is forbidden in production");
if (/Set-Cookie/.test(loginRoute)) failures.push("Studio login route must not create sessions without Supabase callback");
if (!/pathname === "\/api\/studio\/login"/.test(proxyText)) failures.push("Studio login API is not explicitly public in proxy");

for (const path of ["publish/shopify", "publish/printify"]) {
  const routeText = studioRoute(path);
  const post = routeText.split("export async function POST")[1] || "";
  if (!routeText.includes("requirePublishPermission")) failures.push(`${path}: publish route missing owner/admin publish permission`);
  if (/requireStudioUser\s*\(|requireAuditActor\s*\(/.test(routeText)) failures.push(`${path}: publish route uses generic auth`);
  if (!post.includes("evaluatePublishReviewGates")) failures.push(`${path}: publish POST gate evaluator missing`);
  if (!post.includes("getByProductDraftId")) failures.push(`${path}: publish POST must load persisted publish review`);
  if (!post.includes("blocked_by_guardrail")) failures.push(`${path}: publish POST must return blocked_by_guardrail for unsafe requests`);
  if (path === "publish/printify") {
    if (!post.includes("resolvePrintifyRuntime")) failures.push(`${path}: publish POST must use the Printify runtime resolver`);
  } else if (!post.includes("createCommerceProviders")) {
    failures.push(`${path}: publish POST must use real commerce provider adapter`);
  }
  if (/fixtures\.publishReviewBlocked/.test(routeText)) failures.push(`${path}: publish POST must not use fixture publish review`);
}

const approveRoute = studioRoute("drafts/approve");
if (!approveRoute.includes("requireApprovalPermission")) failures.push("drafts/approve: approval route missing owner/admin permission");
if (/requireStudioUser\s*\(|requireAuditActor\s*\(/.test(approveRoute)) failures.push("drafts/approve: approval route uses generic auth");

for (const path of ["generate/submit", "generate/status", "mockups/generate", "phrases/generate", "trends/ingest"]) {
  const routeText = studioRoute(path);
  if (!routeText.includes("requireProviderMutationPermission")) failures.push(`${path}: provider-impacting route missing owner/admin permission`);
}

for (const path of [
  "integrations/google/oauth/start",
  "integrations/google/oauth/callback",
  "integrations/google/test",
  "integrations/google/analytics/sync",
  "integrations/google/search-console/sync",
  "integrations/google/business-profile/sync",
  "integrations/google/configure",
  "integrations/google/disconnect",
  "integrations/shopify/test",
  "integrations/printify/test",
  "integrations/supabase-storage/test"
]) {
  const routeText = studioRoute(path);
  if (!routeText.includes("requireProviderMutationPermission")) failures.push(`${path}: provider route missing owner/admin permission`);
}

for (const routePath of walkRoutes(join("apps", "studio", "app", "api", "studio"))) {
  const routeText = readFileSync(routePath, "utf8");
  if (/body\.(role|user_id|userId|organization_id|organizationId|workspace_id|workspaceId)/.test(routeText)) failures.push(`${routePath}: Studio API route appears to trust client-provided identity/workspace fields`);
}

const publicServiceRoleName = "NEXT_PUBLIC_SUPABASE_" + "SERVICE_ROLE_KEY";
if ((env + authText + proxyText).includes(publicServiceRoleName)) failures.push("Supabase service role key exposed as public");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("production checks passed with expected missing-secret readiness failures, Supabase Studio auth, route-level permissions, credential encryption readiness, and Drizzle repository enforcement");
