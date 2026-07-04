import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import type { PublishReview } from "@saltyfactory/domain";
import { encryptCredential } from "@saltyfactory/security";
import { allTrueGates } from "./helpers";
import AssetsPage from "../apps/studio/app/studio/assets/page";
import BriefsPage from "../apps/studio/app/studio/briefs/page";
import GeneratePage from "../apps/studio/app/studio/image-generation/page";
import MockupsPage from "../apps/studio/app/studio/mockups/page";
import PrintifyCatalogPage from "../apps/studio/app/studio/printify-catalog/page";
import ProductBuilderPage from "../apps/studio/app/studio/product-builder/page";
import PublishReviewPage from "../apps/studio/app/studio/publish-review/page";
import { POST as sendToGenerationPost } from "../apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route";
import { GET as assetPreviewGet } from "../apps/studio/app/api/studio/assets/[id]/preview/route";
import { GET as assetDerivativePreviewGet } from "../apps/studio/app/api/studio/assets/[id]/derivatives/[kind]/preview/route";
import { GET as mockupPreviewGet } from "../apps/studio/app/api/studio/mockups/[id]/preview/route";
import { POST as mockupGeneratePost } from "../apps/studio/app/api/studio/mockups/generate/route";
import { POST as mockupApprovePost } from "../apps/studio/app/api/studio/mockups/[id]/approve/route";
import { POST as mockupHeroPost } from "../apps/studio/app/api/studio/mockups/[id]/hero/route";
import { POST as draftFromAssetsPost } from "../apps/studio/app/api/studio/drafts/create-from-assets/route";
import { POST as printifySelectionPost } from "../apps/studio/app/api/studio/integrations/printify/catalog/selection/route";
import { GET as printifyBlueprintsGet } from "../apps/studio/app/api/studio/integrations/printify/catalog/blueprints/route";
import { POST as publishReviewPost } from "../apps/studio/app/api/studio/publish-reviews/route";
import { POST as publishPrintifyPost } from "../apps/studio/app/api/studio/publish/printify/route";
import { POST as publishShopifyPost } from "../apps/studio/app/api/studio/publish/shopify/route";
import { runWorkerOnce } from "../apps/worker/src/index";

const originalEnv = { ...process.env };
const workspaceId = "wks_default";
const actorId = "pod_golden_owner";
const encryptionKey = "0123456789abcdef0123456789abcdef";

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: actorId, email: "owner@saltycowhide.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, authorizedWorkspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));
}

function setMemoryRuntime() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("REPOSITORY_ADAPTER", "memory");
  vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
  vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
}

function authedRequest(pathname: string, init: RequestInit = {}) {
  return new Request(`http://localhost:3001${pathname}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`
    }
  });
}

function authedPost(pathname: string, body?: Record<string, unknown>) {
  const init: RequestInit = {
    method: "POST",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
  };
  return authedRequest(pathname, init);
}

function localPrivatePath(kind: "assets" | "mockups", storageKey: string) {
  return path.resolve(process.cwd(), ".saltyfactory-private", kind, workspaceId, path.basename(storageKey));
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function internalLightTeeBaseBuffer() {
  const width = 1800;
  const height = 2200;
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f8fbfc"/>
    <rect x="${Math.round(width * 0.19)}" y="${Math.round(height * 0.13)}" width="${Math.round(width * 0.62)}" height="${Math.round(height * 0.70)}" rx="${Math.round(width * 0.06)}" fill="#f4eadb" stroke="#0b1f33" stroke-width="10"/>
    <rect x="${Math.round(width * 0.27)}" y="${Math.round(height * 0.06)}" width="${Math.round(width * 0.46)}" height="${Math.round(height * 0.11)}" rx="${Math.round(width * 0.05)}" fill="#ffffff" stroke="#dbe7ea" stroke-width="8"/>
    <text x="${Math.round(width / 2)}" y="${Math.round(height * 0.91)}" text-anchor="middle" font-family="Inter, Arial" font-size="${Math.max(34, Math.round(width * 0.035))}" fill="#526475">tee front internal compositor preview</text>
  </svg>`);
  return sharp(svg).png().toBuffer();
}

async function writeLocalArtwork(assetId: string, color = "#0f766e") {
  const storageKey = `workspaces/${workspaceId}/private/assets/${assetId}.png`;
  const filePath = localPrivatePath("assets", storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  const buffer = await sharp({ create: { width: 3000, height: 3000, channels: 4, background: color } }).png().toBuffer();
  await writeFile(filePath, buffer);
  return { storageKey, buffer };
}

async function seedApprovedAsset(repos: RepositoryBundle, suffix: string) {
  const assetId = `asset_golden_${suffix}`;
  const { storageKey, buffer } = await writeLocalArtwork(assetId);
  await repos.asset.create({
    id: assetId,
    workspace_id: workspaceId,
    brief_id: `brief_${suffix}`,
    asset_type: "generated_source_art",
    storage_bucket: "local-dev-private-assets",
    file_path: storageKey,
    file_size_bytes: buffer.byteLength,
    width: 3000,
    height: 3000,
    dpi: 300,
    transparent_background: true,
    generator: "huggingface",
    model: "black-forest-labs/FLUX.1-schnell",
    qa_status: "passed",
    risk_status: "pending",
    approved_for_mockup: true,
    mime_type: "image/png",
    extension: "png",
    visibility: "private",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);
  const derivativeKey = `workspaces/${workspaceId}/private/assets/${assetId}-print_png.png`;
  const derivativePath = localPrivatePath("assets", derivativeKey);
  await mkdir(path.dirname(derivativePath), { recursive: true });
  await writeFile(derivativePath, buffer);
  await repos.asset.create({
    id: `${assetId}_print_png`,
    workspace_id: workspaceId,
    brief_id: `brief_${suffix}`,
    asset_type: "print_png",
    storage_bucket: "local-dev-private-assets",
    file_path: derivativeKey,
    file_size_bytes: buffer.byteLength,
    width: 3000,
    height: 3000,
    dpi: 300,
    transparent_background: true,
    generator: "huggingface",
    model: "black-forest-labs/FLUX.1-schnell",
    qa_status: "passed",
    risk_status: "pending",
    approved_for_mockup: false,
    mime_type: "image/png",
    extension: "png",
    visibility: "private",
    metadata: { derivative_package: true, derivative_kind: "print_png", source_asset_id: assetId, parent_asset_id: assetId },
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);
  await repos.qa.create({
    id: `qa_golden_${suffix}`,
    workspace_id: workspaceId,
    asset_id: assetId,
    status: "passed",
    approved_for_product_draft: true,
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);
  return assetId;
}

async function seedApprovedAssetWithColor(repos: RepositoryBundle, suffix: string, color: string) {
  const assetId = `asset_golden_${suffix}`;
  const { storageKey, buffer } = await writeLocalArtwork(assetId, color);
  await repos.asset.create({
    id: assetId,
    workspace_id: workspaceId,
    brief_id: `brief_${suffix}`,
    asset_type: "generated_source_art",
    storage_bucket: "local-dev-private-assets",
    file_path: storageKey,
    file_size_bytes: buffer.byteLength,
    width: 3000,
    height: 3000,
    dpi: 300,
    transparent_background: true,
    generator: "huggingface",
    model: "black-forest-labs/FLUX.1-schnell",
    qa_status: "passed",
    risk_status: "pending",
    approved_for_mockup: true,
    mime_type: "image/png",
    extension: "png",
    visibility: "private",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);
  const derivativeKey = `workspaces/${workspaceId}/private/assets/${assetId}-print_png.png`;
  const derivativePath = localPrivatePath("assets", derivativeKey);
  await mkdir(path.dirname(derivativePath), { recursive: true });
  await writeFile(derivativePath, buffer);
  await repos.asset.create({
    id: `${assetId}_print_png`,
    workspace_id: workspaceId,
    brief_id: `brief_${suffix}`,
    asset_type: "print_png",
    storage_bucket: "local-dev-private-assets",
    file_path: derivativeKey,
    file_size_bytes: buffer.byteLength,
    width: 3000,
    height: 3000,
    dpi: 300,
    transparent_background: true,
    generator: "huggingface",
    model: "black-forest-labs/FLUX.1-schnell",
    qa_status: "passed",
    risk_status: "pending",
    approved_for_mockup: false,
    mime_type: "image/png",
    extension: "png",
    visibility: "private",
    metadata: { derivative_package: true, derivative_kind: "print_png", source_asset_id: assetId, parent_asset_id: assetId },
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);
  await repos.qa.create({
    id: `qa_golden_${suffix}`,
    workspace_id: workspaceId,
    asset_id: assetId,
    status: "passed",
    approved_for_product_draft: true,
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);
  return assetId;
}

async function imageRegionContainsRgb(
  imagePath: string,
  region: { left: number; top: number; width: number; height: number },
  expected: { r: number; g: number; b: number },
  tolerance = 8
) {
  const { data } = await sharp(imagePath)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 3) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    if (
      Math.abs(r - expected.r) <= tolerance
      && Math.abs(g - expected.g) <= tolerance
      && Math.abs(b - expected.b) <= tolerance
    ) {
      return true;
    }
  }
  return false;
}

async function seedPrintifyProvider(repos: RepositoryBundle, token = "printify_golden_secret") {
  const credentialRef = `cred_printify_golden_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await repos.integration.saveEncryptedCredential({
    id: `ecred_${credentialRef}`,
    workspace_id: workspaceId,
    provider_key: "printify",
    credential_ref: credentialRef,
    encrypted_payload: encryptCredential({ secret: token, key: encryptionKey, provider: "printify", workspaceId, createdBy: actorId }),
    status: "active",
    created_by: actorId,
    updated_by: actorId
  });
  await repos.integration.createProviderConnection({
    id: `conn_printify_golden_${credentialRef}`,
    workspace_id: workspaceId,
    provider_key: "printify",
    provider_type: "printify",
    provider_name: "Printify",
    enabled: true,
    status: "connected",
    secret_ref: credentialRef,
    configuration: { selectedShopId: "shop_golden_123", selectedShopName: "Golden Path Shop", maskedDisplayValue: "Saved securely" },
    created_by: actorId,
    updated_by: actorId
  });
  return token;
}

async function seedShopifyProvider(repos: RepositoryBundle, token = "shpat_golden_shopify_secret") {
  const credentialRef = `cred_shopify_golden_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await repos.integration.saveEncryptedCredential({
    id: `ecred_${credentialRef}`,
    workspace_id: workspaceId,
    provider_key: "shopify",
    credential_ref: credentialRef,
    encrypted_payload: encryptCredential({
      secret: JSON.stringify({ v: 1, credentialMode: "legacy_admin_token", adminToken: token }),
      key: encryptionKey,
      provider: "shopify",
      workspaceId,
      createdBy: actorId
    }),
    status: "active",
    created_by: actorId,
    updated_by: actorId
  });
  const row = {
    id: `conn_shopify_golden_${Date.now()}`,
    workspace_id: workspaceId,
    provider_key: "shopify",
    provider_type: "shopify",
    provider_name: "Shopify Admin",
    enabled: true,
    status: "connected",
    secret_ref: credentialRef,
    configuration: {
      storeDomain: "saltycowhide.myshopify.com",
      selectedCollectionId: "gid://shopify/Collection/999",
      credentialMode: "legacy_admin_token"
    },
    created_by: actorId,
    updated_by: actorId
  };
  const existing = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "shopify");
  if (existing) {
    await repos.integration.updateProviderConnectionStatus(workspaceId, "shopify", { ...row, id: existing.id });
  } else {
    await repos.integration.createProviderConnection(row);
  }
  return token;
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("POD golden path execution", () => {
  it("renders the core golden path Studio pages without workspace/schema crashes", async () => {
    authorizeAsOwner();
    setMemoryRuntime();

    const pages = await Promise.all([
      BriefsPage(),
      GeneratePage(),
      AssetsPage(),
      MockupsPage(),
      PrintifyCatalogPage(),
      ProductBuilderPage(),
      PublishReviewPage()
    ]);
    const html = pages.map((page) => renderToStaticMarkup(page)).join("\n");

    expect(html).toContain("Design Briefs");
    expect(html).toContain("POD Product Builder");
    expect(html).toContain("Image Generation Studio");
    expect(html).toContain("Generation Jobs &amp; Assets");
    expect(html).toContain("Mockups");
    expect(html).toContain("Printify Catalog");
    expect(html).toContain("Publish Review");
    expect(html).not.toMatch(/Failed query|default_brand_name|workspaces\.id/);
  });

  it("generation success creates a private asset and visible protected previews", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    vi.stubEnv("IMAGE_GENERATION_ENABLED", "true");
    vi.stubEnv("IMAGE_GENERATION_PROVIDER", "local_dev_mock");
    vi.stubEnv("LOCAL_DEV_IMAGE_GENERATION", "true");
    const repos = createRepositories();
    const briefId = `brief_golden_generation_${Date.now()}`;
    await repos.brief.create({
      id: briefId,
      workspace_id: workspaceId,
      status: "approved",
      approved_for_generation: true,
      collection: "Golden Path",
      product_targets: ["tee"],
      style_direction: { title: "Golden path brief", suggested_phrase: "Coastal Rodeo Social Club", product_type: "tee", background_requirement: "transparent" },
      generation_prompt: "Original coastal western badge art.",
      negative_prompt: "brand logos",
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);

    const response = await sendToGenerationPost(authedPost(`/api/studio/design-briefs/${briefId}/send-to-generation`), {
      params: Promise.resolve({ id: briefId })
    });
    const body = await response.json();
    const assetId = String(body.asset?.id ?? "");
    const asset = await repos.asset.getById(assetId, workspaceId);
    const generatedAssets = Array.isArray(body.assets) ? body.assets : [];
    const allAssets = await repos.asset.listByWorkspace(workspaceId);
    const derivativeRows = allAssets.filter((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
      return String(metadata.source_asset_id ?? "") === assetId;
    });

    expect(response.status).toBe(200);
    expect(body.status).toBe("succeeded");
    expect(generatedAssets).toHaveLength(4);
    expect(asset).toBeTruthy();
    expect(asset?.metadata).toMatchObject({ variant_index: 0, seed: expect.any(Number), style_preset: "coastal_cowgirl", print_target: "apparel_front_square" });
    expect(derivativeRows.map((row) => row.asset_type).sort()).toEqual(["print_png", "thumbnail", "web_preview"]);
    expect(JSON.stringify(body)).not.toMatch(/hf_|service_role|token/i);

    const unauthPreview = await assetPreviewGet(new Request(`http://localhost:3001/api/studio/assets/${assetId}/preview`), {
      params: Promise.resolve({ id: assetId })
    });
    const preview = await assetPreviewGet(authedRequest(`/api/studio/assets/${assetId}/preview`), {
      params: Promise.resolve({ id: assetId })
    });
    const derivativePreview = await assetDerivativePreviewGet(authedRequest(`/api/studio/assets/${assetId}/derivatives/print_png/preview`), {
      params: Promise.resolve({ id: assetId, kind: "print_png" })
    });
    const assetsHtml = renderToStaticMarkup(await AssetsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));
    const generateHtml = renderToStaticMarkup(await GeneratePage());

    expect(unauthPreview.status).toBe(401);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toContain("image/png");
    expect((await preview.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect(derivativePreview.status).toBe(200);
    expect(derivativePreview.headers.get("content-type")).toContain("image/png");
    expect(assetsHtml).toContain(`/api/studio/assets/${assetId}/preview`);
    expect(assetsHtml).toContain(`/api/studio/assets/${assetId}/derivatives/print_png/preview`);
    expect(assetsHtml).toContain("Open asset");
    expect(generateHtml).toContain("Generated Artwork");
    expect(generateHtml).toContain(`/api/studio/assets/${assetId}/preview`);
    expect(generateHtml).toContain("Generate 4 options");
  }, 15000);

  it("serves Supabase-backed private asset previews as protected image bytes", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role_should_not_leak");
    vi.stubEnv("SUPABASE_PRIVATE_ASSETS_BUCKET", "private-assets");
    const repos = createRepositories();
    const assetId = `asset_supabase_preview_${Date.now()}`;
    const storageKey = `workspaces/${workspaceId}/private/assets/${assetId}.png`;
    const bytes = await sharp({ create: { width: 64, height: 64, channels: 4, background: "#0f766e" } }).png().toBuffer();
    await repos.asset.create({
      id: assetId,
      workspace_id: workspaceId,
      brief_id: `brief_${assetId}`,
      asset_type: "generated_source_art",
      storage_bucket: "private-assets",
      file_path: storageKey,
      file_size_bytes: bytes.byteLength,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      width: 64,
      height: 64,
      dpi: 300,
      transparent_background: true,
      generator: "huggingface",
      model: "black-forest-labs/FLUX.1-schnell",
      qa_status: "pending",
      risk_status: "pending",
      approved_for_mockup: false,
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      expect(String(url)).toContain(`/storage/v1/object/private-assets/${storageKey}`);
      expect(String((init.headers as Record<string, string>).authorization)).toContain("Bearer");
      return new Response(bytes, { status: 200, headers: { "content-type": "application/octet-stream" } });
    });

    const missing = await assetPreviewGet(authedRequest("/api/studio/assets/missing_asset/preview"), {
      params: Promise.resolve({ id: "missing_asset" })
    });
    const otherWorkspaceId = `asset_other_workspace_${Date.now()}`;
    await repos.asset.create({ id: otherWorkspaceId, workspace_id: "wks_other", brief_id: "brief_other", asset_type: "generated_source_art", storage_bucket: "private-assets", file_path: `workspaces/wks_other/private/assets/${otherWorkspaceId}.png`, file_size_bytes: 1, width: 1, height: 1, dpi: 72, transparent_background: false, generator: "huggingface", model: "model", qa_status: "pending", risk_status: "pending", approved_for_mockup: false, created_by: actorId, updated_by: actorId } as WorkspaceRow);
    const otherWorkspace = await assetPreviewGet(authedRequest(`/api/studio/assets/${otherWorkspaceId}/preview`), {
      params: Promise.resolve({ id: otherWorkspaceId })
    });
    const preview = await assetPreviewGet(authedRequest(`/api/studio/assets/${assetId}/preview`), {
      params: Promise.resolve({ id: assetId })
    });
    const body = Buffer.from(await preview.arrayBuffer());

    expect(missing.status).toBe(404);
    expect(otherWorkspace.status).toBe(404);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toContain("image/png");
    expect(preview.headers.get("location")).toBeNull();
    expect(body.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(body.toString("utf8")).not.toContain("service_role_should_not_leak");
  });

  it("worker generation stores binary image bytes with bucket, path, and MIME metadata", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const bytes = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#2563eb" } }).png().toBuffer();
    let uploaded: { path?: string; data?: unknown; contentType?: string } = {};
    await repos.job.create({
      id: `job_worker_preview_${Date.now()}`,
      workspace_id: workspaceId,
      brief_id: "brief_worker_preview",
      provider: "huggingface",
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: "coastal western badge",
      negative_prompt: "logos",
      parameters: {},
      status: "queued",
      retry_count: 0,
      max_retries: 3,
      created_by: actorId
    } as WorkspaceRow);
    const imageProvider = {
      enabled: true,
      providerId: "huggingface",
      generateImage: async () => ({ ok: true as const, data: { bytes, contentType: "image/png" }, modelUsed: "black-forest-labs/FLUX.1-schnell", sourceLabel: "model_generated" as const }),
      getJobStatus: async () => ({ ok: true as const, data: { status: "completed" }, sourceLabel: "model_generated" as const }),
      isHealthy: async () => true
    };
    const storage = {
      uploadPrivateAsset: async (path: string, data: Uint8Array | Buffer, contentType: string) => {
        uploaded = { path, data, contentType };
        return { ok: true as const, path };
      },
      downloadPrivateAsset: async () => ({ ok: true as const, bytes, contentType: "image/png" }),
      createSignedPrivateUrl: async (path: string) => ({ ok: true as const, url: `https://signed.example/${encodeURIComponent(path)}` }),
      moveApprovedAssetToPublic: async (_privatePath: string, publicPath: string) => ({ ok: true as const, path: publicPath }),
      createPublicApprovedUrl: (path: string, approved: boolean) => approved ? { ok: true as const, url: `https://public.example/${path}` } : { ok: false as const, error: "asset_not_approved_for_public_url" },
      deletePrivateTemporaryAsset: async (path: string) => ({ ok: true as const, path })
    };

    const result = await runWorkerOnce(undefined, { repos, imageProvider: imageProvider as any, storage: storage as any, actorId });
    const asset = await repos.asset.getById(String((result as any).outputAssetId), workspaceId);

    expect(result).toMatchObject({ ok: true, processed: 1 });
    expect(asset).toMatchObject({ storage_bucket: "saltyfactory-private-assets", mime_type: "image/png", visibility: "private" });
    expect(String(asset?.file_path)).toMatch(/^workspaces\/wks_default\/private\/assets\/asset_worker_.+\.png$/);
    expect(uploaded.contentType).toBe("image/png");
    expect(uploaded.data).toBeInstanceOf(Buffer);
  });

  it("creates and displays a composed mockup from source artwork pixels", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const assetId = await seedApprovedAssetWithColor(repos, `mockup_${Date.now()}`, "#ff00ff");

    const response = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, product_type: "tee_front" }));
    const body = await response.json();
    const mockupId = String(body.mockup?.id ?? "");
    const rerenderResponse = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, product_type: "tee_front", placement: { x: 520, y: 620, scale: 0.8 } }));
    const rerenderBody = await rerenderResponse.json();
    await mockupApprovePost(authedPost(`/api/studio/mockups/${mockupId}/approve`), {
      params: Promise.resolve({ id: mockupId })
    });
    const heroResponse = await mockupHeroPost(authedPost(`/api/studio/mockups/${mockupId}/hero`), {
      params: Promise.resolve({ id: mockupId })
    });
    const heroBody = await heroResponse.json();
    const preview = await mockupPreviewGet(authedRequest(`/api/studio/mockups/${mockupId}/preview`), {
      params: Promise.resolve({ id: mockupId })
    });
    const mockupPath = localPrivatePath("mockups", `workspaces/${workspaceId}/private/mockups/${mockupId}.png`);
    const mockupBytes = await sharp(mockupPath).png().toBuffer();
    const baseTemplateBytes = await internalLightTeeBaseBuffer();
    const containsSourceMarker = await imageRegionContainsRgb(
      mockupPath,
      { left: 850, top: 920, width: 120, height: 120 },
      { r: 255, g: 0, b: 255 }
    );
    const html = renderToStaticMarkup(await MockupsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));

    expect(response.status).toBe(200);
    expect(rerenderResponse.status).toBe(200);
    expect(body.status).toBe("composited_mockup_created");
    expect(body.mockup.metadata).toMatchObject({ derivative_kind: "print_png", provider_source: "internal", renderer_version: "internal-sharp-v1" });
    expect(rerenderBody.mockup.metadata.checksum_sha256).not.toBe(body.mockup.metadata.checksum_sha256);
    expect(heroResponse.status).toBe(200);
    expect(heroBody.mockup.metadata).toMatchObject({ is_hero: true });
    expect(preview.status).toBe(200);
    expect(sha256(mockupBytes)).not.toEqual(sha256(baseTemplateBytes));
    expect(containsSourceMarker).toBe(true);
    expect(html).toContain("Mockup Studio");
    expect(html).toContain("Printify Mockup Workflow");
    expect(html).toContain("Create a Printify product to generate real mockups");
    expect(html).not.toContain(`/api/studio/mockups/${mockupId}/preview`);
    expect(html).not.toContain("Internal template");
  });

  it("presents the mockup studio as a Printify-only production gallery with safe proof details", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const assetId = await seedApprovedAsset(repos, `studio_gallery_${Date.now()}`);
    const draftId = `draft_printify_gallery_${Date.now()}`;
    const mockupId = `mockup_printify_gallery_${Date.now()}`;
    await repos.draft.create({
      id: draftId,
      workspace_id: workspaceId,
      title: "Printify Gallery Tee",
      description: "Draft shell for real Printify mockups.",
      product_type: "tee",
      collection: "Studio Drafts",
      tags: ["printify"],
      asset_id: assetId,
      status: "draft"
    } as WorkspaceRow);
    await repos.printify.create({
      id: `ptyref_gallery_${Date.now()}`,
      workspace_id: workspaceId,
      product_draft_id: draftId,
      printify_product_id: "printify_gallery_product",
      printify_shop_id: "shop_golden_123",
      printify_blueprint_id: "5",
      printify_print_provider_id: "99",
      printify_upload_id: "upload_gallery_1",
      printify_variant_ids: ["17390"],
      mockup_urls: ["https://images.printify.com/gallery-front.png"],
      sync_status: "draft_created_mockups_synced",
      printify_published: false
    } as WorkspaceRow);
    await repos.mockup.create({
      id: mockupId,
      workspace_id: workspaceId,
      asset_id: assetId,
      product_draft_id: draftId,
      template_id: "tmpl_printify_provider_mockup",
      color_variant: "front",
      storage_bucket: "printify-provider-url",
      file_path: "https://images.printify.com/gallery-front.png",
      width: 1200,
      height: 1500,
      status: "printify_mockup_imported",
      approved_for_product: true,
      metadata: {
        provider_source: "printify",
        provider_mockup_url: "https://images.printify.com/gallery-front.png",
        public_url: "https://images.printify.com/gallery-front.png",
        printify_product_id: "printify_gallery_product",
        printify_variant_ids: ["17390"],
        printify_position: "front",
        printify_is_default: true,
        is_hero: true
      },
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);

    const html = renderToStaticMarkup(await MockupsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));
    const proofDetailsTag = html.match(/<details[^>]+data-testid="mockup-proof-details"[^>]*>/)?.[0] ?? "";
    const draftButtonTag = html.match(/<button[^>]+data-testid="create-product-draft-button"[^>]*>/)?.[0] ?? "";

    expect(html).toContain("Source asset proof");
    expect(html).toContain("Provider-generated mockup images");
    expect(html).toContain("Printify Mockup");
    expect(html).toContain("https://images.printify.com/gallery-front.png");
    expect(html).toContain("mockup-gallery-grid");
    expect(html).toContain("mockup-card");
    expect(html).toContain("print_png");
    expect(proofDetailsTag).not.toContain("open");
    expect(draftButtonTag).not.toContain("disabled");
    expect(html).not.toContain("Internal template");
    expect(html).not.toContain("Light Tee");
    expect(html).not.toMatch(/<a[^>]+href="\/api\//);
    expect(html).not.toMatch(/\{[\s\S]*"ok"[\s\S]*\}/);
    expect(html).not.toMatch(/generated_composited_preview|mockup_approved_for_product|mockup_render_job_failed|asset_not_approved_for_mockup/);
    expect(html).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|token|secret/i);
  });

  it("gates product draft creation until a Printify product and hero/default mockup exist", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const assetId = await seedApprovedAsset(repos, `studio_gate_${Date.now()}`);

    const emptyHtml = renderToStaticMarkup(await MockupsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));
    const emptyDraftButton = emptyHtml.match(/<button[^>]+data-testid="create-product-draft-button"[^>]*>/)?.[0] ?? "";
    expect(emptyHtml).toContain("Choose a Printify product shell first.");
    expect(emptyDraftButton).toContain("disabled");

    const draftId = `draft_printify_gate_${Date.now()}`;
    const mockupId = `mockup_printify_gate_${Date.now()}`;
    await repos.draft.create({
      id: draftId,
      workspace_id: workspaceId,
      title: "Printify Gate Tee",
      description: "Draft shell for gate proof.",
      product_type: "tee",
      collection: "Studio Drafts",
      tags: ["printify"],
      asset_id: assetId,
      status: "draft"
    } as WorkspaceRow);
    await repos.printify.create({
      id: `ptyref_gate_${Date.now()}`,
      workspace_id: workspaceId,
      product_draft_id: draftId,
      printify_product_id: "printify_gate_product",
      printify_shop_id: "shop_golden_123",
      printify_blueprint_id: "5",
      printify_print_provider_id: "99",
      printify_upload_id: "upload_gate_1",
      printify_variant_ids: ["17390"],
      mockup_urls: ["https://images.printify.com/gate-front.png"],
      sync_status: "draft_created_mockups_synced",
      printify_published: false
    } as WorkspaceRow);
    await repos.mockup.create({
      id: mockupId,
      workspace_id: workspaceId,
      asset_id: assetId,
      product_draft_id: draftId,
      template_id: "tmpl_printify_provider_mockup",
      color_variant: "front",
      storage_bucket: "printify-provider-url",
      file_path: "https://images.printify.com/gate-front.png",
      width: 1200,
      height: 1500,
      status: "printify_mockup_imported",
      approved_for_product: false,
      metadata: {
        provider_source: "printify",
        provider_mockup_url: "https://images.printify.com/gate-front.png",
        public_url: "https://images.printify.com/gate-front.png",
        printify_product_id: "printify_gate_product",
        printify_is_default: true
      },
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);
    const readyHtml = renderToStaticMarkup(await MockupsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));
    const readyDraftButton = readyHtml.match(/<button[^>]+data-testid="create-product-draft-button"[^>]*>/)?.[0] ?? "";
    expect(readyHtml).toContain("Ready. The selected product draft has real Printify mockup evidence.");
    expect(readyDraftButton).not.toContain("disabled");
  });

  it("blocks internal mockup rendering when the print-ready derivative is missing", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const assetId = `asset_no_derivative_${Date.now()}`;
    const { storageKey, buffer } = await writeLocalArtwork(assetId, "#ef675b");
    await repos.asset.create({
      id: assetId,
      workspace_id: workspaceId,
      brief_id: `brief_${assetId}`,
      asset_type: "generated_source_art",
      storage_bucket: "local-dev-private-assets",
      file_path: storageKey,
      file_size_bytes: buffer.byteLength,
      width: 3000,
      height: 3000,
      dpi: 300,
      transparent_background: true,
      generator: "huggingface",
      model: "black-forest-labs/FLUX.1-schnell",
      qa_status: "passed",
      risk_status: "pending",
      approved_for_mockup: true,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);

    const response = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, product_type: "tee_front" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      status: "blocked",
      blockingReasons: ["print_derivative_missing"]
    });
    expect(JSON.stringify(body)).not.toMatch(/service_role|token|secret/i);
  });

  it("renders multiple recommended internal mockups for an approved asset package", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const assetId = await seedApprovedAsset(repos, `recommended_${Date.now()}`);

    const response = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, mode: "recommended" }));
    const body = await response.json();
    const mockups = await repos.mockup.listByWorkspace(workspaceId);

    expect(response.status).toBe(200);
    expect(body.status).toBe("recommended_mockups_created");
    expect(body.mockups.length).toBeGreaterThanOrEqual(1);
    expect(mockups.length).toBeGreaterThanOrEqual(1);
    expect(mockups[0]?.metadata).toMatchObject({ derivative_kind: "print_png", renderer_version: "internal-sharp-v1" });
  });

  it("makes Printify catalog browsable when connected, even before a product draft exists", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const token = await seedPrintifyProvider(repos);
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return Response.json([{ id: 5, title: "Unisex Jersey Tee", brand: "Printify", images: [] }]);
    });

    const response = await printifyBlueprintsGet(authedRequest("/api/studio/integrations/printify/catalog/blueprints"));
    const body = await response.json();
    const html = renderToStaticMarkup(await PrintifyCatalogPage());

    expect(response.status).toBe(200);
    expect(body.blueprints[0]).toMatchObject({ id: "5", title: "Unisex Jersey Tee" });
    expect(html).toContain("Catalog Browser");
    expect(html).toContain("Variant Matrix");
    expect(html).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(token);
    expect(String((calls[0]?.init.headers as Record<string, string>).authorization)).toContain("Bearer");
  });

  it("creates a product draft, saves Printify selection, and shows Publish Review readiness", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    await seedPrintifyProvider(repos);
    await seedShopifyProvider(repos);
    const assetId = await seedApprovedAsset(repos, `draft_${Date.now()}`);
    const mockupId = `mockup_printify_draft_${Date.now()}`;
    await repos.mockup.create({
      id: mockupId,
      workspace_id: workspaceId,
      asset_id: assetId,
      template_id: "tmpl_printify_provider_mockup",
      color_variant: "front",
      storage_bucket: "printify-provider-url",
      file_path: "https://images.printify.com/golden-draft-front.png",
      width: 1200,
      height: 1500,
      status: "printify_mockup_imported",
      approved_for_product: true,
      metadata: {
        provider_source: "printify",
        provider_mockup_url: "https://images.printify.com/golden-draft-front.png",
        public_url: "https://images.printify.com/golden-draft-front.png",
        printify_product_id: "printify_fixture_product",
        printify_is_default: true,
        is_hero: true
      },
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);

    const draftResponse = await draftFromAssetsPost(authedPost("/api/studio/drafts/create-from-assets", {
      asset_id: assetId,
      mockup_ids: [mockupId],
      title: "Golden Path Coastal Tee",
      product_idea: "Visible generated art, visible mockup, Printify catalog selection, and Shopify draft target.",
      description: "Visible generated art, visible mockup, Printify catalog selection, and Shopify draft target.",
      tags: ["coastal", "western"],
      product_type: "tee",
      collection: "Studio Drafts",
      price: 32,
      estimated_cogs: 12,
      estimated_shipping: 5,
      provider_target: "printify_draft",
      shopify_collection_id: "gid://shopify/Collection/999"
    }));
    const draftBody = await draftResponse.json();
    const draftId = String(draftBody.draft.id);
    const selectionResponse = await printifySelectionPost(authedPost("/api/studio/integrations/printify/catalog/selection", {
      productDraftId: draftId,
      blueprintId: "5",
      printProviderId: "99",
      variants: [{ id: "17390", title: "Small Ivory", size: "S", color: "Ivory", cost: 12 }],
      price: 32,
      cost: 12
    }));
    const reviewResponse = await publishReviewPost(authedPost("/api/studio/publish-reviews", { productDraftId: draftId }));
    const updatedDraft = await repos.draft.getById(draftId, workspaceId);
    const variants = await repos.variant.listByDraft(workspaceId, draftId);
    const margins = (await repos.margin.listByWorkspace(workspaceId)).filter((row) => row.product_draft_id === draftId || row.productDraftId === draftId);
    const productBuilderHtml = renderToStaticMarkup(await ProductBuilderPage({ searchParams: Promise.resolve({ draft_id: draftId }) }));
    const publishHtml = renderToStaticMarkup(await PublishReviewPage());

    expect(draftResponse.status).toBe(200);
    expect(draftBody.draft.metadata.product_idea).toContain("Visible generated art");
    expect(selectionResponse.status).toBe(200);
    expect(variants).toHaveLength(1);
    expect(margins[0]).toMatchObject({ margin_ok: true, blocked: false });
    expect(updatedDraft?.metadata).toMatchObject({ printify_blueprint_id: "5", printify_print_provider_id: "99" });
    expect(reviewResponse.status).toBe(200);
    expect(productBuilderHtml).toContain("Golden Path Product Draft");
    expect(productBuilderHtml).toContain(`/api/studio/assets/${assetId}/preview`);
    expect(productBuilderHtml).toContain("https://images.printify.com/golden-draft-front.png");
    expect(publishHtml).toContain("Selected Product Readiness");
    expect(publishHtml).toContain(`/api/studio/assets/${assetId}/preview`);
    expect(publishHtml).toContain("https://images.printify.com/golden-draft-front.png");
    expect(publishHtml).toContain("Generated asset present");
    expect(publishHtml).toContain("Variants selected");
    expect(publishHtml).toContain("Owner approval required");
  });

  it("creates a Shopify draft with approved mockup media and persists collection assignment", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const token = await seedShopifyProvider(repos, "shpat_shopify_draft_secret");
    const suffix = `shopify_${Date.now()}`;
    const assetId = await seedApprovedAsset(repos, suffix);
    const draftId = `draft_${suffix}`;
    const mockupId = `mockup_${suffix}`;
    const variantId = `variant_${suffix}`;
    await repos.draft.create({
      id: draftId,
      workspace_id: workspaceId,
      title: "Golden Path Shopify Tee",
      description: "Approved product draft with real mockup media for Shopify.",
      product_type: "tee",
      brand: "SaltyFactory",
      collection: "Studio Drafts",
      tags: ["coastal", "western"],
      asset_id: assetId,
      mockup_ids: [mockupId],
      variant_ids: [variantId],
      approval_status: "approved",
      status: "approved",
      metadata: {
        shopify_collection_id: "gid://shopify/Collection/999",
        seo_title: "Golden Path Shopify Tee",
        seo_description: "Approved mockup-backed Shopify draft."
      },
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);
    await repos.mockup.create({
      id: mockupId,
      workspace_id: workspaceId,
      asset_id: assetId,
      product_draft_id: draftId,
      status: "approved",
      approved_for_product: true,
      storage_bucket: "local-dev-private-assets",
      file_path: `workspaces/${workspaceId}/private/mockups/${mockupId}.png`,
      mime_type: "image/png",
      metadata: { public_url: "https://cdn.example/mockups/golden-shopify-tee.png" },
      created_by: actorId,
      updated_by: actorId
    } as WorkspaceRow);
    await repos.variant.create({
      id: variantId,
      workspace_id: workspaceId,
      product_draft_id: draftId,
      sku: "GOLDEN-SHOPIFY-S",
      size: "S",
      color: "Ivory",
      price: 32,
      cost: 12,
      printify_variant_id: "17390",
      printify_blueprint_id: "5",
      printify_print_provider_id: "99",
      active: true
    } as WorkspaceRow);
    await repos.publish.create({
      id: `pubrev_${suffix}`,
      workspace_id: workspaceId,
      product_draft_id: draftId,
      gates: allTrueGates,
      all_gates_passed: true,
      shopify_publish_allowed: true,
      printify_sync_allowed: true,
      reviewed_by: actorId,
      reviewed_at: "2026-07-03T00:00:00.000Z",
      notes: [],
      status: "approved_internal_ready",
      created_at: "2026-07-04T00:00:00.000Z",
      updated_at: "2026-07-04T00:00:00.000Z",
      created_by: actorId,
      updated_by: actorId
    } as PublishReview & WorkspaceRow);
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      const text = String(url);
      if (text.endsWith("/products.json")) {
        return Response.json({
          product: {
            id: 9876543210,
            admin_graphql_api_id: "gid://shopify/Product/9876543210",
            handle: "golden-path-shopify-tee",
            variants: [{ id: 111222333 }]
          }
        });
      }
      if (text.endsWith("/collects.json")) {
        return Response.json({ collect: { id: 444555666, product_id: 9876543210, collection_id: "gid://shopify/Collection/999" } });
      }
      return Response.json({ ok: true });
    });

    const response = await publishShopifyPost(authedPost("/api/studio/publish/shopify", { productDraftId: draftId }));
    const body = await response.json();
    const productCall = calls.find((call) => call.url.endsWith("/products.json"));
    const collectionCall = calls.find((call) => call.url.endsWith("/collects.json"));
    const payload = JSON.parse(String(productCall?.init.body ?? "{}"));
    const shopifyRefs = await repos.shopify.listByWorkspace(workspaceId);
    const shopifyRef = shopifyRefs[0]!;
    const updatedDraft = await repos.draft.getById(draftId, workspaceId);
    const publishHtml = renderToStaticMarkup(await PublishReviewPage({ searchParams: Promise.resolve({ product_draft_id: draftId }) } as any));

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "draft_created",
      provider: "shopify",
      mediaCount: 1,
      collectionAssigned: true
    });
    expect((productCall?.init.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe(token);
    expect((collectionCall?.init.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe(token);
    expect(payload.product).toMatchObject({
      title: "Golden Path Shopify Tee",
      body_html: "Approved product draft with real mockup media for Shopify.",
      status: "draft",
      images: [{ src: "https://cdn.example/mockups/golden-shopify-tee.png", alt: "Golden Path Shopify Tee product mockup" }],
      variants: [{ price: "32.00", sku: "GOLDEN-SHOPIFY-S", option1: "S" }]
    });
    expect(shopifyRef).toMatchObject({
      product_draft_id: draftId,
      shopify_product_id: "9876543210",
      shopify_product_gid: "gid://shopify/Product/9876543210",
      shopify_handle: "golden-path-shopify-tee",
      shopify_collection_ids: ["gid://shopify/Collection/999"],
      sync_status: "draft_created"
    });
    expect(shopifyRef.media).toHaveLength(1);
    expect(updatedDraft?.shopify_status).toBe("draft_created");
    expect(publishHtml).toContain("Shopify draft created");
    expect(publishHtml).toContain("9876543210");
    expect(publishHtml).toContain("Shopify media attached");
    expect(publishHtml).toContain("Shopify collection assigned");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("keeps provider creation routes gated and workflow clients away from raw result dumps", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const printifyBlocked = await publishPrintifyPost(authedPost("/api/studio/publish/printify", { productDraftId: "missing_draft" }));
    const shopifyBlocked = await publishShopifyPost(authedPost("/api/studio/publish/shopify", { productDraftId: "missing_draft" }));
    const sources = [
      "apps/studio/app/studio/briefs/BriefWorkflowClient.tsx",
      "apps/studio/app/studio/assets/AssetWorkflowClient.tsx",
      "apps/studio/app/studio/mockups/MockupWorkflowClient.tsx",
      "apps/studio/app/studio/mockups/[id]/page.tsx",
      "apps/studio/app/studio/printify-catalog/PrintifyCatalogClient.tsx",
      "apps/studio/app/studio/product-builder/ProductBuilderClient.tsx",
      "apps/studio/app/studio/publish/PublishWorkflowClient.tsx",
      "apps/studio/app/studio/publish/ProviderPublishActionsClient.tsx",
      "apps/studio/app/studio/_components/PrivateImagePreview.tsx"
    ];
    const { readFileSync } = await import("node:fs");
    const combined = sources.map((file) => readFileSync(path.resolve(process.cwd(), file), "utf8")).join("\n");

    expect(printifyBlocked.status).toBe(409);
    expect(shopifyBlocked.status).toBe(409);
    expect(combined).not.toContain("JSON.stringify(result");
    expect(combined).not.toMatch(/href=.+\/api\/studio/);
    expect(combined).toContain("Developer details");
    expect(combined).toContain("PrivateImagePreview");
    expect(combined).toContain("Private preview could not load");
  });

  it("documents the private-beta truth table and golden-path proof map", async () => {
    const { readFileSync } = await import("node:fs");
    const truthTable = readFileSync(path.resolve(process.cwd(), "docs/feature-truth-table-private-beta.md"), "utf8");
    const proofMap = readFileSync(path.resolve(process.cwd(), "docs/golden-path-proof-map.md"), "utf8");

    expect(truthTable).toContain("Printify image upload | REAL LIVE PATH");
    expect(truthTable).toContain("Shopify draft creation | REAL LIVE PATH");
    expect(truthTable).toContain("Shopify live publish | FUTURE");
    expect(proofMap).toContain("Printify image upload");
    expect(proofMap).toContain("Shopify draft creation");
    expect(proofMap).toContain("Live publish");
  });
});
