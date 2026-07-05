import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import {
  SmokeSetupError,
  assertLiveGeneratedAsset,
  assertLiveImageProvider,
  getOrCreateApprovedSmokeBrief,
  internalPreviewBaseTemplateBytes,
  isApprovedSmokeBrief,
  proveMockupContainsSourceArt,
  safePreflightDiagnostics,
  verifyImagePreviewResponse
} from "../scripts/smoke-image-mockup-live";
import { POST as createBriefPost } from "../apps/studio/app/api/studio/design-briefs/route";
import { POST as approveBriefPost } from "../apps/studio/app/api/studio/design-briefs/[id]/approve/route";
import { POST as runQaPost } from "../apps/studio/app/api/studio/assets/[id]/run-qa/route";
import { POST as approveAssetPost } from "../apps/studio/app/api/studio/assets/[id]/approve/route";

const workspaceId = "wks_default";
const actorId = "image_mockup_smoke_owner_test";

function useSharedMemoryRuntime() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("REPOSITORY_ADAPTER", "memory");
  vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
  vi.stubEnv("STUDIO_WORKSPACE_ID", workspaceId);
  setSupabaseUserVerifierForTests(async (token) => token === "smoke" ? { id: actorId, email: "smoke@saltyfactory.local", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, authorizedWorkspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));
}

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("live image/mockup smoke harness", () => {
  it("normalizes Hugging Face provider spelling used by local smoke env files", () => {
    const config = parseEnv({
      IMAGE_GENERATION_ENABLED: "true",
      IMAGE_GENERATION_PROVIDER: "huggingface",
      HUGGING_FACE_API_TOKEN: "server-only-token",
      HUGGING_FACE_IMAGE_MODEL: "black-forest-labs/FLUX.1-schnell"
    });

    expect(config.IMAGE_GENERATION_PROVIDER).toBe("hugging_face");
  });

  it("creates an approved smoke brief through the current app route schema", async () => {
    useSharedMemoryRuntime();
    const repos = createRepositories();

    const brief = await getOrCreateApprovedSmokeBrief({ repos, createBriefPost, approveBriefPost });
    const stored = await repos.brief.getById(brief.id, workspaceId);

    expect(isApprovedSmokeBrief(stored)).toBe(true);
    expect(stored?.phrase_id).toMatch(/^phrase_manual_brief_/);
    expect(stored?.cluster_id).toMatch(/^cluster_manual_brief_/);
    expect(stored?.generation_prompt).toContain("coastal cowgirl boutique style");
    expect(stored?.approved_for_generation).toBe(true);
  });

  it("rejects an existing SMOKE_BRIEF_ID when the brief is not approved", async () => {
    useSharedMemoryRuntime();
    const repos = createRepositories();
    const briefId = `brief_unapproved_${Date.now()}`;
    vi.stubEnv("SMOKE_BRIEF_ID", briefId);
    await repos.brief.create({
      id: briefId,
      workspace_id: workspaceId,
      phrase_id: "phrase_smoke",
      cluster_id: "cluster_smoke",
      collection: "Smoke",
      product_targets: ["tee"],
      style_direction: {},
      generation_prompt: "test",
      negative_prompt: "logos",
      status: "draft",
      approved_for_generation: false,
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);

    await expect(getOrCreateApprovedSmokeBrief({
      repos,
      createBriefPost: async () => Response.json({ ok: false }),
      approveBriefPost: async () => Response.json({ ok: false })
    })).rejects.toThrow(/smoke_brief_id_not_approved/);
  });

  it("accepts an existing approved SMOKE_BRIEF_ID without creating a new brief", async () => {
    useSharedMemoryRuntime();
    const repos = createRepositories();
    const briefId = `brief_approved_${Date.now()}`;
    vi.stubEnv("SMOKE_BRIEF_ID", briefId);
    await repos.brief.create({
      id: briefId,
      workspace_id: workspaceId,
      phrase_id: "phrase_smoke",
      cluster_id: "cluster_smoke",
      collection: "Smoke",
      product_targets: ["tee"],
      style_direction: {},
      generation_prompt: "test",
      negative_prompt: "logos",
      status: "approved",
      approved_for_generation: true,
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);

    const brief = await getOrCreateApprovedSmokeBrief({
      repos,
      createBriefPost: async () => { throw new Error("create route should not be called"); },
      approveBriefPost: async () => { throw new Error("approve route should not be called"); }
    });

    expect(brief.id).toBe(briefId);
    expect(isApprovedSmokeBrief(brief)).toBe(true);
  });

  it("rejects local demo providers and local-dev asset ids for live smoke", () => {
    expect(() => assertLiveImageProvider({
      status: "local_demo",
      provider: "local_dev_mock",
      model: "local-dev-fixture",
      credentialSource: "local_demo",
      setupAction: "/studio/onboarding/providers/image-generation",
      safeMessage: "Local demo",
      setupRequired: [],
      blockingReasons: [],
      recommendedModels: []
    } as any)).toThrow(/live_smoke_rejected_local_demo_provider/);

    expect(() => assertLiveGeneratedAsset({ provider: { provider: "local_dev_mock", credentialSource: "local_demo" }, asset: { generator: "local_dev_mock" } }, "asset_local_dev_1")).toThrow(/live_smoke_rejected_non_huggingface_asset_id/);
  });

  it("masks provider secrets in preflight diagnostics", () => {
    const provider = {
      status: "ready",
      provider: "huggingface",
      model: "black-forest-labs/FLUX.1-schnell",
      credentialSource: "credential_store",
      setupAction: "/studio/onboarding/providers/image-generation",
      safeMessage: "ready",
      setupRequired: [],
      blockingReasons: [],
      recommendedModels: [],
      serverCredential: { token: "hf_secret_value_should_not_print", source: "credential_store" }
    } as any;

    const diagnostics = safePreflightDiagnostics({ workspaceId, smokeBriefMode: "create", provider, storageReady: true, privateBucketName: "private-assets" });

    expect(diagnostics.token).toBe("present_masked");
    expect(JSON.stringify(diagnostics)).not.toContain("hf_secret_value_should_not_print");
    expect(JSON.stringify(diagnostics)).not.toMatch(/service_role|secret/i);
  });

  it("verifies image preview responses by content type and bytes", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#ef675b" } }).png().toBuffer();

    const proof = await verifyImagePreviewResponse(new Response(png, { status: 200, headers: { "content-type": "image/png" } }), "asset");

    expect(proof.byteLength).toBeGreaterThan(0);
    await expect(verifyImagePreviewResponse(Response.json({ ok: false }, { status: 404 }), "asset")).rejects.toThrow(/asset_preview_failed/);
  });

  it("blocks generated opaque apparel print PNGs with transparent background missing", async () => {
    useSharedMemoryRuntime();
    const repos = createRepositories();
    const assetId = `asset_hf_opaque_${Date.now()}_0_test`;
    await repos.asset.create({
      id: assetId,
      workspace_id: workspaceId,
      brief_id: `brief_${assetId}`,
      job_id: `job_${assetId}`,
      asset_type: "generated_source_art",
      storage_bucket: "private-assets",
      file_path: `workspaces/${workspaceId}/private/assets/${assetId}.png`,
      file_size_bytes: 1024,
      width: 512,
      height: 512,
      dpi: 300,
      transparent_background: false,
      generator: "huggingface",
      model: "black-forest-labs/FLUX.1-schnell",
      qa_status: "pending",
      risk_status: "pending",
      approved_for_mockup: false,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      metadata: { generated_master: true, print_target: "apparel_front_square" },
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);
    for (const kind of ["thumbnail", "web_preview", "print_png"] as const) {
      await repos.asset.create({
        id: `${assetId}_${kind}`,
        workspace_id: workspaceId,
        brief_id: `brief_${assetId}`,
        job_id: `job_${assetId}`,
        asset_type: kind,
        storage_bucket: "private-assets",
        file_path: `workspaces/${workspaceId}/private/assets/${assetId}-${kind}.${kind === "print_png" ? "png" : "webp"}`,
        file_size_bytes: 2048,
        width: kind === "print_png" ? 4500 : 400,
        height: kind === "print_png" ? 4500 : 400,
        dpi: 300,
        transparent_background: false,
        generator: "huggingface",
        model: "black-forest-labs/FLUX.1-schnell",
        qa_status: "passed",
        risk_status: "pending",
        approved_for_mockup: false,
        mime_type: kind === "print_png" ? "image/png" : "image/webp",
        extension: kind === "print_png" ? "png" : "webp",
        visibility: "private",
        metadata: { derivative_package: true, derivative_kind: kind, source_asset_id: assetId, parent_asset_id: assetId, alpha_source_available: false },
        created_by: actorId,
        updated_by: actorId
      } as WorkspaceRow);
    }

    const qaResponse = await runQaPost(authedPost(`/api/studio/assets/${assetId}/run-qa`), { params: Promise.resolve({ id: assetId }) });
    const qaBody = await qaResponse.json();
    const approveResponse = await approveAssetPost(authedPost(`/api/studio/assets/${assetId}/approve`), { params: Promise.resolve({ id: assetId }) });
    const approveBody = await approveResponse.json();

    expect(qaResponse.status).toBe(200);
    expect(qaBody.status).toBe("failed");
    expect(qaBody.qa.blocked_reasons).toContain("transparent_background_missing");
    expect(qaBody.qa.checks.plain_background_print_file.status).toBe("failed");
    expect(approveResponse.status).toBe(409);
    expect(approveBody.blockingReasons).toContain("asset_qa_not_passed");
  });

  it("proves a rendered mockup contains source artwork pixels", async () => {
    const template = {
      productType: "tee_front",
      canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } }
    };
    const sourceBytes = await sharp({ create: { width: 1200, height: 1200, channels: 4, background: "#ff00ff" } }).png().toBuffer();
    const baseBytes = await internalPreviewBaseTemplateBytes(template);
    const art = await sharp(sourceBytes).ensureAlpha().resize(900, 900, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
    const mockupBytes = await sharp(baseBytes).composite([{ input: art, left: 450, top: 520, blend: "over" }]).png().toBuffer();

    const proof = await proveMockupContainsSourceArt({ sourceBytes, mockupBytes, template });

    expect(proof.passed).toBe(true);
    expect(proof.sourceLikeRatio).toBeGreaterThan(0.15);
    expect(proof.changedRatio).toBeGreaterThan(0.15);
  });

  it("keeps the live smoke harness off stale raw design_briefs inserts", () => {
    const source = readFileSync("scripts/smoke-image-mockup-live.ts", "utf8");

    expect(source).toContain("getOrCreateApprovedSmokeBrief");
    expect(source).not.toMatch(/repos\.brief\.create\(\s*\{/);
    expect(source).not.toMatch(/brief_smoke_/);
  });
});
