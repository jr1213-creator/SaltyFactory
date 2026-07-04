import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { encryptCredential } from "@saltyfactory/security";
import AssetsPage from "../apps/studio/app/studio/assets/page";
import GeneratePage from "../apps/studio/app/studio/image-generation/page";
import MockupsPage from "../apps/studio/app/studio/mockups/page";
import PrintifyCatalogPage from "../apps/studio/app/studio/printify-catalog/page";
import ProductBuilderPage from "../apps/studio/app/studio/product-builder/page";
import PublishReviewPage from "../apps/studio/app/studio/publish-review/page";
import { POST as sendToGenerationPost } from "../apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route";
import { GET as assetPreviewGet } from "../apps/studio/app/api/studio/assets/[id]/preview/route";
import { GET as mockupPreviewGet } from "../apps/studio/app/api/studio/mockups/[id]/preview/route";
import { POST as mockupGeneratePost } from "../apps/studio/app/api/studio/mockups/generate/route";
import { POST as mockupApprovePost } from "../apps/studio/app/api/studio/mockups/[id]/approve/route";
import { POST as draftFromAssetsPost } from "../apps/studio/app/api/studio/drafts/create-from-assets/route";
import { POST as printifySelectionPost } from "../apps/studio/app/api/studio/integrations/printify/catalog/selection/route";
import { GET as printifyBlueprintsGet } from "../apps/studio/app/api/studio/integrations/printify/catalog/blueprints/route";
import { POST as publishReviewPost } from "../apps/studio/app/api/studio/publish-reviews/route";
import { POST as publishPrintifyPost } from "../apps/studio/app/api/studio/publish/printify/route";
import { POST as publishShopifyPost } from "../apps/studio/app/api/studio/publish/shopify/route";

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

async function seedShopifyProvider(repos: RepositoryBundle) {
  await repos.integration.createProviderConnection({
    id: `conn_shopify_golden_${Date.now()}`,
    workspace_id: workspaceId,
    provider_key: "shopify",
    provider_type: "shopify",
    provider_name: "Shopify Admin",
    enabled: true,
    status: "connected",
    configuration: {
      storeDomain: "saltycowhide.myshopify.com",
      selectedCollectionId: "gid://shopify/Collection/999",
      credentialMode: "dev_dashboard_client_credentials"
    },
    created_by: actorId,
    updated_by: actorId
  });
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
      ProductBuilderPage(),
      GeneratePage(),
      AssetsPage(),
      MockupsPage()
    ]);
    const html = pages.map((page) => renderToStaticMarkup(page)).join("\n");

    expect(html).toContain("POD Product Builder");
    expect(html).toContain("Generation Queue");
    expect(html).toContain("Generation Jobs &amp; Assets");
    expect(html).toContain("Mockups");
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

    expect(response.status).toBe(200);
    expect(body.status).toBe("succeeded");
    expect(asset).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/hf_|service_role|token/i);

    const unauthPreview = await assetPreviewGet(new Request(`http://localhost:3001/api/studio/assets/${assetId}/preview`), {
      params: Promise.resolve({ id: assetId })
    });
    const preview = await assetPreviewGet(authedRequest(`/api/studio/assets/${assetId}/preview`), {
      params: Promise.resolve({ id: assetId })
    });
    const assetsHtml = renderToStaticMarkup(await AssetsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));
    const generateHtml = renderToStaticMarkup(await GeneratePage());

    expect(unauthPreview.status).toBe(401);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toContain("image/png");
    expect((await preview.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect(assetsHtml).toContain(`/api/studio/assets/${assetId}/preview`);
    expect(assetsHtml).toContain("Open asset");
    expect(generateHtml).toContain("Generated Artwork");
    expect(generateHtml).toContain(`/api/studio/assets/${assetId}/preview`);
  });

  it("creates and displays a composed mockup from source artwork pixels", async () => {
    authorizeAsOwner();
    setMemoryRuntime();
    const repos = createRepositories();
    const assetId = await seedApprovedAsset(repos, `mockup_${Date.now()}`);

    const response = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, product_type: "tee_front" }));
    const body = await response.json();
    const mockupId = String(body.mockup?.id ?? "");
    await mockupApprovePost(authedPost(`/api/studio/mockups/${mockupId}/approve`), {
      params: Promise.resolve({ id: mockupId })
    });
    const preview = await mockupPreviewGet(authedRequest(`/api/studio/mockups/${mockupId}/preview`), {
      params: Promise.resolve({ id: mockupId })
    });
    const mockupPath = localPrivatePath("mockups", `workspaces/${workspaceId}/private/mockups/${mockupId}.png`);
    const sampled = await sharp(mockupPath).extract({ left: 900, top: 970, width: 1, height: 1 }).raw().toBuffer();
    const html = renderToStaticMarkup(await MockupsPage({ searchParams: Promise.resolve({ asset_id: assetId }) }));

    expect(response.status).toBe(200);
    expect(body.status).toBe("composited_mockup_created");
    expect(preview.status).toBe(200);
    expect(sampled[1]).toBeGreaterThan(80);
    expect(html).toContain(`/api/studio/mockups/${mockupId}/preview`);
    expect(html).toContain("Use in product draft");
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
    expect(html).toContain("Product draft required to save variants");
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
    const mockupResponse = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, product_type: "tee_front" }));
    const mockupBody = await mockupResponse.json();
    const mockupId = String(mockupBody.mockup.id);
    await mockupApprovePost(authedPost(`/api/studio/mockups/${mockupId}/approve`), {
      params: Promise.resolve({ id: mockupId })
    });

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
    expect(productBuilderHtml).toContain(`/api/studio/mockups/${mockupId}/preview`);
    expect(publishHtml).toContain("Selected Product Readiness");
    expect(publishHtml).toContain("Generated asset present");
    expect(publishHtml).toContain("Variants selected");
    expect(publishHtml).toContain("Owner approval required");
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
      "apps/studio/app/studio/printify-catalog/PrintifyCatalogClient.tsx",
      "apps/studio/app/studio/product-builder/ProductBuilderClient.tsx",
      "apps/studio/app/studio/publish/PublishWorkflowClient.tsx",
      "apps/studio/app/studio/publish/ProviderPublishActionsClient.tsx"
    ];
    const { readFileSync } = await import("node:fs");
    const combined = sources.map((file) => readFileSync(path.resolve(process.cwd(), file), "utf8")).join("\n");

    expect(printifyBlocked.status).toBe(409);
    expect(shopifyBlocked.status).toBe(409);
    expect(combined).not.toContain("JSON.stringify(result");
    expect(combined).not.toMatch(/href=.+\/api\/studio/);
    expect(combined).toContain("Developer details");
  });
});
