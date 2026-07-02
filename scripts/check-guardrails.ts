import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files: string[] = [];
const failures: string[] = [];

function walk(directory: string) {
  for (const entry of readdirSync(directory)) {
    if (["node_modules", ".next", "dist"].includes(entry)) continue;
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.(ts|tsx|js|json|env)$/.test(entry)) files.push(path);
  }
}

function text(path: string) {
  return readFileSync(path, "utf8");
}

function studioRoute(path: string) {
  return text(join(root, "apps/studio/app/api/studio", path, "route.ts"));
}

walk(root);

const pkg = JSON.parse(text(join(root, "package.json")));
const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }).toLowerCase();
if (deps.includes("openai")) failures.push("OpenAI dependency found");
if (deps.includes("anthropic")) failures.push("Anthropic dependency found");

for (const file of files) {
  const content = text(file);
  const normalized = file.replace(/\\/g, "/");
  const publicSecret = /NEXT_PUBLIC_(SHOPIFY_ADMIN_TOKEN|PRINTIFY_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|HF_API_TOKEN|REPLICATE_API_TOKEN|REMOVE_BG_API_KEY|GOOGLE_OAUTH_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|GOOGLE_ACCESS_TOKEN|GOOGLE_REFRESH_TOKEN)/.test(content);
  if (publicSecret) failures.push(`${file}: secret-like NEXT_PUBLIC exposure`);
  if (/app\/api\/(generate|publish)/.test(normalized) && !/app\/api\/studio\//.test(normalized)) failures.push(`${file}: public generation or publish route`);
  if (!normalized.endsWith("scripts/check-guardrails.ts") && /href=\{?["']#["']|javascript:void\(0\)/.test(content)) failures.push(`${file}: disabled or placeholder links must not use # or javascript:void(0)`);
  const frontendFile = /apps\/(studio\/app\/studio|storefront\/app)|packages\/ui\//.test(normalized);
  if (frontendFile && /GOOGLE_OAUTH_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|access_token|refresh_token|google-access-token|google-refresh-token/.test(content)) failures.push(`${file}: Google secrets or tokens must not be rendered in frontend code`);
}

const generationSubmitRoute = text(join(root, "apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route.ts"));
const imageProviderResolver = text(join(root, "packages/image-pipeline/src/providers/index.ts"));
if (!generationSubmitRoute.includes("private_storage_not_configured") || !imageProviderResolver.includes("private_storage_not_configured")) failures.push("Hugging Face generation must fail closed when private storage is not configured");
if (/asset_hf[\s\S]{0,700}writeFile\(/.test(generationSubmitRoute)) failures.push("Hugging Face generation must not write provider output to local disk");
if (/generator:\s*"hugging_face"[\s\S]{0,260}storageBucket:\s*"local-dev-private-assets"/.test(generationSubmitRoute)) failures.push("Hugging Face generation must not record local-dev-private-assets");
if (!imageProviderResolver.includes("local_dev_image_generation_blocked_in_production")) failures.push("local_dev_mock image generation must be production-blocked");

const env = text(join(root, ".env.example"));
for (const bad of ["OPENAI", "ANTHROPIC"]) if (env.includes(bad)) failures.push(`${bad} env var documented`);
for (const line of ["AI_TEXT_ENABLED=false", "AI_IMAGE_ENABLED=false", "LIVE_PUBLISHING_ENABLED=false", "SHOPIFY_ADMIN_ENABLED=false", "PRINTIFY_ENABLED=false", "CREDENTIAL_STORAGE_ENABLED=false"]) {
  if (!env.includes(line)) failures.push(`Missing default ${line}`);
}

for (const needle of ["evaluatePublishReviewGates", "AuditEventRepository", "startStudioMagicLink", "exchangeSupabaseAuthCode", "SUPABASE_ACCESS_COOKIE", "encryptCredential", "safeFetchText", "forbiddenAiActions"]) {
  if (!files.some((file) => text(file).includes(needle))) failures.push(`Missing ${needle}`);
}

const authText = text(join(root, "packages/auth/src/index.ts"));
const proxyText = text(join(root, "apps/studio/proxy.ts"));
const loginRoute = text(join(root, "apps/studio/app/api/studio/login", "route.ts"));
if (/Boolean\(process\.env\.STUDIO_ADMIN_EMAIL\)/.test(proxyText) || /return process\.env\.STUDIO_ADMIN_EMAIL\s*\?/.test(authText) || /createStudioSessionValue|verifyStudioSessionValue|sf_studio_session/.test(authText)) failures.push("Studio auth must use Supabase Auth, not env-only or custom signed sessions");
if (/STUDIO_ADMIN_PASSWORD_HASH|PASSWORD_HASH|bcrypt|argon2/.test(authText + env)) failures.push("Custom password hash auth is forbidden");
if (!/pathname === "\/api\/studio\/login"/.test(proxyText)) failures.push("Studio login API must remain public in proxy");
if (!/signInWithOtp/.test(authText) || !/exchangeCodeForSession/.test(authText) || !/getUser\(accessToken\)/.test(authText)) failures.push("Supabase Auth OTP/callback/session verification missing");
if (/Set-Cookie/.test(loginRoute)) failures.push("Studio login route must not create sessions directly");

for (const path of ["publish/shopify", "publish/printify"]) {
  const routeText = studioRoute(path);
  const post = routeText.split("export async function POST")[1] || "";
  if (!routeText.includes("requirePublishPermission")) failures.push(`${path}: publish route must require publish permission`);
  if (/requireStudioUser\s*\(/.test(routeText) || /requireAuditActor\s*\(/.test(routeText)) failures.push(`${path}: publish route uses generic auth`);
  if (!post.includes("evaluatePublishReviewGates")) failures.push(`${path}: publish POST gate evaluator missing`);
  if (!post.includes("getByProductDraftId")) failures.push(`${path}: publish POST must load persisted publish review`);
  if (!post.includes("blocked_by_guardrail")) failures.push(`${path}: publish POST must return blocked_by_guardrail for unsafe requests`);
  if (!post.includes("createCommerceProviders")) failures.push(`${path}: publish POST must use real commerce provider adapter`);
  if (/fixtures\.publishReviewBlocked/.test(routeText)) failures.push(`${path}: publish POST must not use fixture publish review`);
}

const approveRoute = studioRoute("drafts/approve");
if (!approveRoute.includes("requireApprovalPermission")) failures.push("drafts/approve: approval route must require approval permission");
if (/requireStudioUser\s*\(|requireAuditActor\s*\(/.test(approveRoute)) failures.push("drafts/approve: approval route uses generic auth");

for (const path of ["generate/submit", "generate/status", "mockups/generate", "phrases/generate", "trends/ingest"]) {
  const routeText = studioRoute(path);
  if (!routeText.includes("requireProviderMutationPermission")) failures.push(`${path}: provider-impacting route must require provider mutation permission`);
}

for (const file of files.filter((file) => file.replace(/\\/g, "/").includes("apps/studio/app/api/studio/"))) {
  const content = text(file);
  if (/body\.(role|user_id|userId|organization_id|organizationId|workspace_id|workspaceId)/.test(content)) failures.push(`${file}: Studio API route appears to trust client-provided identity/workspace fields`);
}

const trendIngest = text(join(root, "apps/studio/app/api/studio/trend-sources/[id]/ingest/route.ts"));
if (!trendIngest.includes("safeFetchText")) failures.push("trend source ingestion must use SSRF-safe fetcher");

const aiText = text(join(root, "packages/ai-free/src/employees.ts"));
for (const forbidden of ["publish", "provider_sync", "ad_spend", "send_email", "send_sms", "auto_reply_review"]) {
  if (!aiText.includes(forbidden)) failures.push(`AI employee forbidden action missing: ${forbidden}`);
}

const createFromAssetsRoute = text(join(root, "apps/studio/app/api/studio/drafts/create-from-assets/route.ts"));
if (!createFromAssetsRoute.includes("approved_mockup_required")) failures.push("asset-only draft creation must remain blocked when mockups are required");
if (!createFromAssetsRoute.includes("mockup_asset_mismatch")) failures.push("draft creation must reject mismatched asset/mockup evidence");

const publishPage = text(join(root, "apps/studio/app/studio/publish/page.tsx"));
if (/<button(?![^>]*disabled)[^>]*>(Approve & Publish|Use Review Workflow Below|Request Changes|Reject)</.test(publishPage)) failures.push("publish summary panel must not expose active no-op or auto-publish-looking actions");

const assetsPage = text(join(root, "apps/studio/app/studio/assets/page.tsx"));
if (/<button(?![^>]*disabled)[^>]*>(View Full Report|Approve Asset)</.test(assetsPage)) failures.push("asset summary panel must not expose active no-op QA or approval actions");

const generatePage = text(join(root, "apps/studio/app/studio/generate/page.tsx"));
if (generatePage.includes("Submit Generation")) failures.push("generation page must navigate through approved briefs instead of exposing a context-free Submit Generation button");

const assetClient = text(join(root, "apps/studio/app/studio/assets/AssetWorkflowClient.tsx"));
if (assetClient.includes("aria-disabled")) failures.push("Assets page must not use aria-disabled for clickable disabled workflow links");
if (!assetClient.includes("/studio/mockups?asset_id=")) failures.push("Approved asset workflow should route to mockups with source asset preselected");

const googleOauthStart = text(join(root, "apps/studio/app/api/studio/integrations/google/oauth/start/route.ts"));
const googleOauthCallback = text(join(root, "apps/studio/app/api/studio/integrations/google/oauth/callback/route.ts"));
const googleAdapter = text(join(root, "packages/integrations/src/google.ts"));
if (!googleOauthStart.includes("requireProviderMutationPermission")) failures.push("Google OAuth start must require owner/admin provider permission");
if (!googleOauthCallback.includes("requireProviderMutationPermission")) failures.push("Google OAuth callback must require owner/admin provider permission");
if (!googleOauthCallback.includes("exchangeGoogleOAuthCode") || !googleOauthCallback.includes("storeVerifiedGoogleOAuth")) failures.push("Google OAuth callback must exchange code and store verified encrypted credentials server-side");
if (!googleAdapter.includes("verifyGoogleOAuthToken") || !googleAdapter.includes("credentialSecret") || !googleAdapter.includes("encryptCredential")) failures.push("Google provider must verify live API access and store encrypted credentials before connected status");
for (const path of [
  "integrations/google/test",
  "integrations/google/analytics/sync",
  "integrations/google/search-console/sync",
  "integrations/google/business-profile/sync",
  "integrations/google/configure",
  "integrations/google/disconnect"
]) {
  const routeText = studioRoute(path);
  if (!routeText.includes("requireProviderMutationPermission")) failures.push(`${path}: Google integration route must require owner/admin provider permission`);
}
const googleStatusRoute = studioRoute("integrations/google/status");
if (!googleStatusRoute.includes("requireWorkspaceMember")) failures.push("Google status route must require workspace membership");
if (/replyReview|createPost|localPosts|locations\.patch|updateLocation|accounts\.locations\.patch/i.test(googleAdapter + googleOauthCallback)) failures.push("Google Business Profile write actions must remain disabled");
const analyticsPage = text(join(root, "apps/studio/app/studio/analytics/page.tsx"));
if (/Organic Search|Demo|1,234|4\.9|fake/i.test(analyticsPage)) failures.push("Analytics page must not contain fake Google metrics or fake review data");

for (const path of [
  "business-profile",
  "channels",
  "migration-guide",
  "baseline",
  "pod-migration",
  "dropshipping",
  "listing-drafts",
  "social-planner",
  "ai-employees/configure",
  "integrations/shopify/test",
  "integrations/printify/test",
  "integrations/supabase-storage/test"
]) {
  const routeText = studioRoute(path);
  if (!routeText.includes("requireProviderMutationPermission") && !routeText.includes("_v1")) failures.push(`${path}: v1 mutation route must require owner/admin permission`);
}
const socialRoute = studioRoute("social-planner");
if (/auto.?post|publishTo|createPost/i.test(socialRoute) && !socialRoute.includes("autoPosting: false")) failures.push("Social planner must not expose auto-posting");
const storageText = text(join(root, "packages/storage/src/index.ts"));
if (!storageText.includes("asset_not_approved_for_public_url")) failures.push("Storage adapter must block public URLs for unapproved assets");
if (/serviceRoleKey[\s\S]{0,300}return .*serviceRoleKey/.test(storageText)) failures.push("Storage adapter must not return service role key");
const commerceText = text(join(root, "packages/commerce/src/index.ts"));
if (!commerceText.includes("assertPublishAllowedForShopify") || !commerceText.includes("assertPublishAllowedForPrintify")) failures.push("Commerce adapters must preserve publish gate assertions");
const aiGatewayText = text(join(root, "packages/ai-free/src/index.ts"));
if (!aiGatewayText.includes("sourceLabel") || !aiGatewayText.includes("detectPromptSafetyIssues")) failures.push("AI gateway must label outputs and run prompt safety checks");

const publicServiceRoleName = "NEXT_PUBLIC_SUPABASE_" + "SERVICE_ROLE_KEY";
if ((env + files.map((file) => text(file)).join("\n")).includes(publicServiceRoleName)) failures.push("Service role key must never be public");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("guardrails passed");
