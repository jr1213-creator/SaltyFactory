import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  SUPABASE_ACCESS_COOKIE,
  requireProviderMutationPermission,
  setSupabaseUserVerifierForTests,
  setWorkspaceAuthorizerForTests
} from "@saltyfactory/auth";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";

function loadEnvFile(filePath: string) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [rawKey, ...rawValue] = trimmed.split("=");
      const key = rawKey?.trim();
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = rawValue.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Local env files are optional. Explicit process env always wins.
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "apps/studio/.env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

function requireLiveRuntimeConfig() {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("live_smoke_refuses_production_runtime");
  }
  const missing = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL && "SUPABASE_URL",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.SUPABASE_PRIVATE_ASSETS_BUCKET && "SUPABASE_PRIVATE_ASSETS_BUCKET"
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`live_smoke_missing_required_runtime:${missing.join(",")}`);
  }
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.NODE_ENV = "test";
  mutableEnv.APP_ENV = mutableEnv.APP_ENV || "test";
  mutableEnv.REPOSITORY_ADAPTER = "drizzle";
}

function workspaceId() {
  return process.env.STUDIO_WORKSPACE_ID || "wks_default";
}

const actorId = "image_mockup_smoke_owner";

function authedRequest(pathname: string, init: RequestInit = {}) {
  return new Request(`http://localhost:3001${pathname}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      cookie: `${SUPABASE_ACCESS_COOKIE}=smoke`
    }
  });
}

function authedPost(pathname: string, body?: Record<string, unknown>) {
  return authedRequest(pathname, {
    method: "POST",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
  });
}

async function main() {
  if (process.env.RUN_LIVE_IMAGE_MOCKUP_SMOKE !== "true") {
    console.log("smoke:image-mockup-live skipped; set RUN_LIVE_IMAGE_MOCKUP_SMOKE=true to run.");
    return;
  }
  loadLocalEnv();
  requireLiveRuntimeConfig();
  (process.env as Record<string, string | undefined>).PLAYWRIGHT_AUTH_BYPASS = "true";

  setSupabaseUserVerifierForTests(async (token) => token === "smoke" ? { id: actorId, email: "smoke@saltyfactory.local", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, authorizedWorkspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));
  await requireProviderMutationPermission(authedRequest("/api/studio/smoke-auth-check"), workspaceId());

  const [
    { POST: sendToGenerationPost },
    { GET: assetPreviewGet },
    { GET: assetDerivativePreviewGet },
    { POST: runQaPost },
    { POST: approveAssetPost },
    { POST: mockupGeneratePost },
    { GET: mockupPreviewGet }
  ] = await Promise.all([
    import("../apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route"),
    import("../apps/studio/app/api/studio/assets/[id]/preview/route"),
    import("../apps/studio/app/api/studio/assets/[id]/derivatives/[kind]/preview/route"),
    import("../apps/studio/app/api/studio/assets/[id]/run-qa/route"),
    import("../apps/studio/app/api/studio/assets/[id]/approve/route"),
    import("../apps/studio/app/api/studio/mockups/generate/route"),
    import("../apps/studio/app/api/studio/mockups/[id]/preview/route")
  ]);

  const repos = createRepositories();
  const briefId = `brief_smoke_${Date.now()}`;
  await repos.brief.create({
    id: briefId,
    workspace_id: workspaceId(),
    status: "approved",
    approved_for_generation: true,
    collection: "Smoke Test",
    product_targets: ["tee"],
    style_direction: { title: "Smoke image mockup brief", suggested_phrase: "Coastal Rodeo Social Club", product_type: "tee", background_requirement: "transparent" },
    generation_prompt: "Original coastal western badge art for a private SaltyFactory smoke test.",
    negative_prompt: "brand logos, copyrighted characters",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  const generationResponse = await sendToGenerationPost(authedPost(`/api/studio/design-briefs/${briefId}/send-to-generation`, {
    variantCount: 1,
    width: 512,
    height: 512,
    numInferenceSteps: 1,
    seed: 140704
  }), {
    params: Promise.resolve({ id: briefId })
  });
  const generation = await generationResponse.json();
  if (!generation.ok) {
    throw new Error(JSON.stringify({
      status: "generation_failed",
      httpStatus: generationResponse.status,
      errorStatus: generation.errorStatus ?? generation.status,
      safeMessage: generation.safeMessage ?? generation.message ?? "Generation failed before an image was stored.",
      blockingReasons: generation.blockingReasons ?? generation.setupRequired ?? []
    }));
  }
  if (generation.provider?.credentialSource === "local_demo" || generation.provider?.provider === "local_dev_mock") {
    throw new Error("generation_used_local_demo_not_live_provider");
  }
  const assetId = String(generation.asset.id);

  const preview = await assetPreviewGet(authedRequest(`/api/studio/assets/${assetId}/preview`), { params: Promise.resolve({ id: assetId }) });
  if (preview.status !== 200 || !String(preview.headers.get("content-type") ?? "").startsWith("image/")) throw new Error("asset_preview_failed");
  const derivativePreview = await assetDerivativePreviewGet(authedRequest(`/api/studio/assets/${assetId}/derivatives/print_png/preview`), {
    params: Promise.resolve({ id: assetId, kind: "print_png" })
  });
  if (derivativePreview.status !== 200 || !String(derivativePreview.headers.get("content-type") ?? "").startsWith("image/")) throw new Error("asset_derivative_preview_failed");

  await runQaPost(authedPost(`/api/studio/assets/${assetId}/run-qa`), { params: Promise.resolve({ id: assetId }) });
  await approveAssetPost(authedPost(`/api/studio/assets/${assetId}/approve`), { params: Promise.resolve({ id: assetId }) });

  const mockupResponse = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, mode: "recommended" }));
  const mockupBody = await mockupResponse.json();
  if (!mockupBody.ok) throw new Error(`mockup_failed:${mockupBody.status}`);
  const mockupId = String(mockupBody.mockup.id);
  const mockupPreview = await mockupPreviewGet(authedRequest(`/api/studio/mockups/${mockupId}/preview`), { params: Promise.resolve({ id: mockupId }) });
  if (mockupPreview.status !== 200 || !String(mockupPreview.headers.get("content-type") ?? "").startsWith("image/")) throw new Error("mockup_preview_failed");

  const reportPath = path.resolve(process.cwd(), ".saltyfactory-private", "smoke-reports", `image-mockup-${Date.now()}.json`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify({
    briefId,
    generationJobId: generation.job.id,
    assetId,
    derivativeKinds: generation.derivativeKinds,
    mockupId,
    assetPreviewPath: `/api/studio/assets/${assetId}/preview`,
    derivativePreviewPath: `/api/studio/assets/${assetId}/derivatives/print_png/preview`,
    mockupPreviewPath: `/api/studio/mockups/${mockupId}/preview`
  }, null, 2));
  console.log(JSON.stringify({
    ok: true,
    briefId,
    generationJobId: generation.job.id,
    assetId,
    derivativeKinds: generation.derivativeKinds,
    mockupId,
    assetPreviewPath: `/api/studio/assets/${assetId}/preview`,
    derivativePreviewPath: `/api/studio/assets/${assetId}/derivatives/print_png/preview`,
    mockupPreviewPath: `/api/studio/mockups/${mockupId}/preview`,
    reportPath
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
