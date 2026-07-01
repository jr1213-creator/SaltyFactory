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
  const publicSecret = /NEXT_PUBLIC_(SHOPIFY_ADMIN_TOKEN|PRINTIFY_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|HF_API_TOKEN|REPLICATE_API_TOKEN|REMOVE_BG_API_KEY)/.test(content);
  if (publicSecret) failures.push(`${file}: secret-like NEXT_PUBLIC exposure`);
  if (/app\/api\/(generate|publish)/.test(normalized) && !/app\/api\/studio\//.test(normalized)) failures.push(`${file}: public generation or publish route`);
  if (!normalized.endsWith("scripts/check-guardrails.ts") && /href=\{?["']#["']|javascript:void\(0\)/.test(content)) failures.push(`${file}: disabled or placeholder links must not use # or javascript:void(0)`);
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
  if (/ok:\s*true/.test(post)) failures.push(`${path}: publish POST must not return fixture-only success`);
  if (!/not_implemented|provider_disabled/.test(post)) failures.push(`${path}: publish POST must fail honestly until persisted provider flow exists`);
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

const publicServiceRoleName = "NEXT_PUBLIC_SUPABASE_" + "SERVICE_ROLE_KEY";
if ((env + files.map((file) => text(file)).join("\n")).includes(publicServiceRoleName)) failures.push("Service role key must never be public");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("guardrails passed");
