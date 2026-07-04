import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { POST as sendToGenerationPost } from "../apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route";
import { GET as assetPreviewGet } from "../apps/studio/app/api/studio/assets/[id]/preview/route";
import { POST as runQaPost } from "../apps/studio/app/api/studio/assets/[id]/run-qa/route";
import { POST as approveAssetPost } from "../apps/studio/app/api/studio/assets/[id]/approve/route";
import { POST as mockupGeneratePost } from "../apps/studio/app/api/studio/mockups/generate/route";
import { GET as mockupPreviewGet } from "../apps/studio/app/api/studio/mockups/[id]/preview/route";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
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

  setSupabaseUserVerifierForTests(async (token) => token === "smoke" ? { id: actorId, email: "smoke@saltyfactory.local", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, authorizedWorkspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));

  const repos = createRepositories();
  const briefId = `brief_smoke_${Date.now()}`;
  await repos.brief.create({
    id: briefId,
    workspace_id: workspaceId,
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

  const generationResponse = await sendToGenerationPost(authedPost(`/api/studio/design-briefs/${briefId}/send-to-generation`, { variantCount: 1 }), {
    params: Promise.resolve({ id: briefId })
  });
  const generation = await generationResponse.json();
  if (!generation.ok) throw new Error(`generation_failed:${generation.status}`);
  const assetId = String(generation.asset.id);

  const preview = await assetPreviewGet(authedRequest(`/api/studio/assets/${assetId}/preview`), { params: Promise.resolve({ id: assetId }) });
  if (preview.status !== 200 || !String(preview.headers.get("content-type") ?? "").startsWith("image/")) throw new Error("asset_preview_failed");

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
    mockupPreviewPath: `/api/studio/mockups/${mockupId}/preview`
  }, null, 2));
  console.log(JSON.stringify({ ok: true, briefId, generationJobId: generation.job.id, assetId, mockupId, reportPath }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
