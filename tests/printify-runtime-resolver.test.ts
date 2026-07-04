import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import {
  publicPrintifyProviderResolution,
  resolvePrintifyProvider
} from "@saltyfactory/commerce";
import { applyPrintifyRuntimeReadiness, buildFeatureReadiness, parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import type { PublishReview } from "@saltyfactory/domain";
import { encryptCredential } from "@saltyfactory/security";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { allTrueGates } from "./helpers";
import { GET as blueprintsGet } from "../apps/studio/app/api/studio/integrations/printify/catalog/blueprints/route";
import { POST as uploadsPost } from "../apps/studio/app/api/studio/integrations/printify/uploads/route";
import { POST as printifyPublishPost } from "../apps/studio/app/api/studio/publish/printify/route";
import { getAccountCenterReadiness } from "../apps/studio/app/studio/account-center/readiness";
import PrintifyCatalogPage from "../apps/studio/app/studio/printify-catalog/page";
import PublishReviewPage from "../apps/studio/app/studio/publish-review/page";

const originalEnv = { ...process.env };
const workspaceId = "wks_default";
const actorId = "printify_runtime_owner";
const encryptionKey = "0123456789abcdef0123456789abcdef";
const shopId = "shop_runtime_123";
const shopName = "Salty Runtime Shop";

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

function authedGet(path: string, token = "valid") {
  return new Request(`http://localhost:3001${path}`, {
    method: "GET",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=${token}` }
  });
}

function authedPost(path: string, body: Record<string, unknown> = {}, token = "valid") {
  return new Request(`http://localhost:3001${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${SUPABASE_ACCESS_COOKIE}=${token}`
    },
    body: JSON.stringify(body)
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function seedConnectedPrintifyProvider(
  repos: RepositoryBundle,
  token: string,
  input: { selectedShopId?: string; selectedShopName?: string; status?: string; enabled?: boolean } = {}
) {
  const selectedShopId = input.selectedShopId ?? shopId;
  const selectedShopName = input.selectedShopName ?? shopName;
  const credentialRef = `cred_printify_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await repos.integration.saveEncryptedCredential({
    id: `ecred_${credentialRef}`,
    workspace_id: workspaceId,
    provider_key: "printify",
    credential_ref: credentialRef,
    encrypted_payload: encryptCredential({
      secret: token,
      key: encryptionKey,
      provider: "printify",
      workspaceId,
      createdBy: actorId
    }),
    status: "active",
    created_by: actorId,
    updated_by: actorId
  });

  const row = {
    id: "conn_printify_runtime",
    workspace_id: workspaceId,
    provider_key: "printify",
    provider_type: "printify",
    provider_name: "Printify",
    enabled: input.enabled ?? true,
    status: input.status ?? "connected",
    secret_ref: credentialRef,
    configuration: {
      selectedShopId,
      selectedShopName,
      maskedDisplayValue: "Saved securely"
    },
    created_by: actorId,
    updated_by: actorId
  };
  const existing = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "printify");
  if (existing) {
    await repos.integration.updateProviderConnectionStatus(workspaceId, "printify", { ...row, id: existing.id });
  } else {
    await repos.integration.createProviderConnection(row);
  }
}

async function seedApprovedPrintifyDraft(repos: RepositoryBundle, suffix: string, input: { gates?: typeof allTrueGates } = {}) {
  const draftId = `draft_printify_${suffix}`;
  const assetId = `asset_printify_${suffix}`;
  const variantId = `variant_printify_${suffix}`;
  await repos.asset.create({
    id: assetId,
    workspace_id: workspaceId,
    brief_id: `brief_${suffix}`,
    storage_bucket: "private-assets",
    file_path: `generated/${assetId}.png`,
    original_filename: `${assetId}.png`,
    qa_status: "passed",
    approved_for_mockup: true,
    generator: "huggingface",
    metadata: { public_url: `https://cdn.example/${assetId}.png` }
  } as WorkspaceRow);
  await repos.draft.create({
    id: draftId,
    workspace_id: workspaceId,
    title: "Runtime Coastal Tee",
    description: "Owner-approved product draft for Printify runtime.",
    product_type: "tee",
    collection: "Runtime",
    tags: ["coastal", "western"],
    asset_id: assetId,
    status: "approved",
    approval_status: "approved",
    printify_status: "not_synced"
  } as WorkspaceRow);
  await repos.variant.create({
    id: variantId,
    workspace_id: workspaceId,
    product_draft_id: draftId,
    sku: `RUNTIME-${suffix}`,
    size: "S",
    color: "Ivory",
    printify_variant_id: "17390",
    printify_blueprint_id: "5",
    printify_print_provider_id: "99",
    cost: 12.5,
    price: 32,
    active: true
  } as WorkspaceRow);
  await repos.publish.create({
    id: `pubrev_printify_${suffix}`,
    workspace_id: workspaceId,
    product_draft_id: draftId,
    gates: input.gates ?? allTrueGates,
    all_gates_passed: Object.values(input.gates ?? allTrueGates).every(Boolean),
    shopify_publish_allowed: true,
    printify_sync_allowed: Object.values(input.gates ?? allTrueGates).every(Boolean),
    reviewed_by: actorId,
    reviewed_at: "2026-07-03T00:00:00.000Z",
    notes: [],
    status: "approved_internal_ready",
    created_at: "2026-07-03T00:00:00.000Z",
    updated_at: "2026-07-03T00:00:00.000Z"
  } as PublishReview & WorkspaceRow);
  return { draftId, assetId, variantId };
}

function printifyFetch(calls: Array<{ url: string; init: RequestInit }>) {
  return vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const text = String(url);
    if (text.includes("/catalog/blueprints.json")) return jsonResponse([{ id: 5, title: "Unisex Jersey Tee" }]);
    if (text.includes("/uploads/images.json")) return jsonResponse({ id: "upload_runtime_1", preview_url: "https://printify.example/upload.png" });
    if (text.includes(`/shops/${shopId}/products/printify_product_runtime.json`)) {
      return jsonResponse({
        id: "printify_product_runtime",
        status: "draft",
        images: [{ src: "https://images.printify.com/runtime-front.png" }]
      });
    }
    if (text.includes(`/shops/${shopId}/products.json`)) return jsonResponse({ id: "printify_product_runtime", status: "draft" });
    return jsonResponse({ ok: true });
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("Printify runtime resolver", () => {
  it("marks Printify readiness ready when the provider is connected through credential storage", async () => {
    const repos = createMemoryRepositories() as unknown as RepositoryBundle;
    const token = "printify_runtime_secret_ready";
    const config = parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      CREDENTIAL_STORAGE_ENABLED: "true",
      CREDENTIAL_ENCRYPTION_KEY: encryptionKey
    });
    await seedConnectedPrintifyProvider(repos, token);

    const runtime = await resolvePrintifyProvider({ workspaceId, repos, config });
    const publicRuntime = publicPrintifyProviderResolution(runtime);
    const report = applyPrintifyRuntimeReadiness(buildFeatureReadiness(config, {}, workspaceId), publicRuntime);
    const printify = report.features.find((feature) => feature.featureKey === "printify")!;

    expect(runtime).toMatchObject({ status: "ready", provider: "printify", credentialSource: "credential_store", shopId, shopName });
    expect(printify.status).toBe("ready");
    expect(printify.requiredEnv).toEqual([]);
    expect(printify.setupRequired).toEqual([]);
    expect(printify.notes.join(" ")).toContain("Printify connected through Launch Setup Concierge.");
    expect(JSON.stringify(runtime)).not.toContain(token);
    expect(JSON.stringify(publicRuntime)).not.toContain(token);
  });

  it("does not require PRINTIFY_API_TOKEN env when the credential-store provider is connected", async () => {
    const repos = createMemoryRepositories() as unknown as RepositoryBundle;
    const token = "printify_runtime_secret_no_env";
    const config = parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      CREDENTIAL_STORAGE_ENABLED: "true",
      CREDENTIAL_ENCRYPTION_KEY: encryptionKey,
      PRINTIFY_ENABLED: "false",
      PRINTIFY_API_TOKEN: "",
      PRINTIFY_SHOP_ID: ""
    });
    await seedConnectedPrintifyProvider(repos, token);

    const runtime = await resolvePrintifyProvider({ workspaceId, repos, config });

    expect(runtime.status).toBe("ready");
    expect(runtime.credentialSource).toBe("credential_store");
    expect(runtime.serverCredential?.token).toBe(token);
    expect(JSON.stringify(publicPrintifyProviderResolution(runtime))).not.toContain(token);
  });

  it("falls back to advanced server env only when no credential-store provider exists", async () => {
    const token = "printify_env_secret_should_not_leak";
    const config = parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      PRINTIFY_ENABLED: "true",
      PRINTIFY_API_TOKEN: token,
      PRINTIFY_SHOP_ID: "shop_env_123"
    });

    const runtime = await resolvePrintifyProvider({
      workspaceId,
      repos: createMemoryRepositories() as unknown as RepositoryBundle,
      config
    });

    expect(runtime).toMatchObject({ status: "ready", provider: "printify", credentialSource: "env", shopId: "shop_env_123" });
    expect(runtime.serverCredential?.token).toBe(token);
    expect(JSON.stringify(runtime)).not.toContain(token);
  });

  it("returns setup_required state with the onboarding link when no provider exists", async () => {
    const runtime = await resolvePrintifyProvider({
      workspaceId,
      repos: createMemoryRepositories() as unknown as RepositoryBundle,
      config: parseEnv({ NODE_ENV: "development", APP_ENV: "development" })
    });

    expect(runtime.status).toBe("config_required");
    expect(runtime.provider).toBe("disabled");
    expect(runtime.setupAction).toBe("/studio/onboarding/providers/printify");
    expect(runtime.setupRequired).toEqual(["Connect Printify", "Validate Printify token", "Select Printify shop"]);
  });

  it("renders Printify Catalog as connected without env-missing setup copy", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    const token = "printify_ui_secret_should_not_leak";
    await seedConnectedPrintifyProvider(createRepositories(), token);

    const html = renderToStaticMarkup(await PrintifyCatalogPage());

    expect(html).toContain("Printify connection");
    expect(html).toContain("secure workspace credential");
    expect(html).toContain(shopName);
    expect(html).not.toMatch(/PRINTIFY_ENABLED=true|PRINTIFY_API_TOKEN|PRINTIFY_SHOP_ID/);
    expect(html).not.toContain(token);
  });

  it("marks Account Center Printify setup connected from guided credentials without env vars", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    vi.stubEnv("PRINTIFY_ENABLED", "false");
    vi.stubEnv("PRINTIFY_API_TOKEN", "");
    vi.stubEnv("PRINTIFY_SHOP_ID", "");
    const token = "printify_account_center_secret";
    await seedConnectedPrintifyProvider(createRepositories(), token);

    const readiness = await getAccountCenterReadiness();

    expect(readiness.printifySetup.connected).toBe(true);
    expect(readiness.printifySetup.setupRequired).toEqual([]);
    expect(readiness.printifySetup.nextOwnerAction).toContain("Review Printify catalog");
    expect(JSON.stringify(readiness.printifySetup)).not.toMatch(/PRINTIFY_API_TOKEN|PRINTIFY_SHOP_ID|PRINTIFY_ENABLED=true/);
    expect(JSON.stringify(readiness)).not.toContain(token);
  });
});

describe("Printify runtime routes", () => {
  it("requires Studio auth before catalog browsing", async () => {
    const response = await blueprintsGet(new Request("http://localhost:3001/api/studio/integrations/printify/catalog/blueprints"));

    expect(response.status).toBe(401);
  });

  it("catalog route uses the credential-store token and never echoes it", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    const repos = createRepositories();
    const token = "printify_catalog_secret_credential_store";
    await seedConnectedPrintifyProvider(repos, token);
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", printifyFetch(calls));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await blueprintsGet(authedGet("/api/studio/integrations/printify/catalog/blueprints"));
    const body = await response.json();
    const catalogCall = calls.find((call) => call.url.includes("/catalog/blueprints.json"));

    expect(response.status).toBe(200);
    expect(catalogCall).toBeTruthy();
    expect((catalogCall?.init.headers as Record<string, string>).authorization).toBe(`Bearer ${token}`);
    expect(body).toMatchObject({ ok: true, provider: "printify", tokenExposed: false });
    expect(JSON.stringify(body)).not.toContain(token);
    expect(logSpy.mock.calls.flat().join(" ")).not.toContain(token);
    expect(warnSpy.mock.calls.flat().join(" ")).not.toContain(token);
  });

  it("upload route uses the credential-store token when approved artwork exists", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    const repos = createRepositories();
    const token = "printify_upload_secret_credential_store";
    await seedConnectedPrintifyProvider(repos, token);
    const { draftId, assetId } = await seedApprovedPrintifyDraft(repos, `upload_${Date.now()}`);
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", printifyFetch(calls));

    const response = await uploadsPost(authedPost("/api/studio/integrations/printify/uploads", { productDraftId: draftId }));
    const body = await response.json();
    const uploadCall = calls.find((call) => call.url.includes("/uploads/images.json"));

    expect(response.status).toBe(200);
    expect(uploadCall).toBeTruthy();
    expect((uploadCall?.init.headers as Record<string, string>).authorization).toBe(`Bearer ${token}`);
    expect(body).toMatchObject({ ok: true, status: "printify_image_uploaded", provider: "printify", uploadId: "upload_runtime_1", tokenExposed: false });
    expect(body.asset).toMatchObject({ id: assetId, printifyUploadId: "upload_runtime_1" });
    expect(body.asset).not.toHaveProperty("file_path");
    expect(body.asset).not.toHaveProperty("storage_bucket");
    expect(body.asset).not.toHaveProperty("storagePath");
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain("private-assets");
    expect((await repos.asset.getById(assetId, workspaceId))?.metadata).toMatchObject({ printify_upload_id: "upload_runtime_1" });
  });

  it("product creation route uses credential-store token and remains draft-only", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    const repos = createRepositories();
    const token = "printify_product_secret_credential_store";
    await seedConnectedPrintifyProvider(repos, token);
    const { draftId } = await seedApprovedPrintifyDraft(repos, `product_${Date.now()}`);
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", printifyFetch(calls));

    const response = await printifyPublishPost(authedPost("/api/studio/publish/printify", { productDraftId: draftId }));
    const body = await response.json();
    const providerCalls = calls.filter((call) => call.url.includes("api.printify.com"));
    const refs = await repos.printify.listByWorkspace(workspaceId);
    const ref = refs[0]!;
    const sourceRecords = await repos.shared.sourceRecords.listByWorkspace(workspaceId);
    const updatedDraft = await repos.draft.getById(draftId, workspaceId);
    const publishHtml = renderToStaticMarkup(await PublishReviewPage({ searchParams: Promise.resolve({ product_draft_id: draftId }) } as any));

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      provider: "printify",
      uploadId: "upload_runtime_1",
      reference: {
        printify_product_id: "printify_product_runtime",
        printify_shop_id: shopId,
        printify_published: false
      }
    });
    expect(providerCalls.length).toBeGreaterThanOrEqual(3);
    expect(providerCalls.every((call) => (call.init.headers as Record<string, string>).authorization === `Bearer ${token}`)).toBe(true);
    expect(providerCalls.some((call) => /publish\.json/i.test(call.url))).toBe(false);
    expect(ref).toMatchObject({
      product_draft_id: draftId,
      printify_product_id: "printify_product_runtime",
      printify_upload_id: "upload_runtime_1",
      printify_published: false
    });
    expect(JSON.stringify(ref.print_areas ?? ref.printAreas)).toContain("upload_runtime_1");
    expect(sourceRecords.some((record) => record.provider_key === "printify" && record.entity_id === draftId && record.status === "completed")).toBe(true);
    expect(String(updatedDraft?.printify_status ?? "")).toContain("draft_created");
    expect(publishHtml).toContain("Printify image uploaded");
    expect(publishHtml).toContain("upload_runtime_1");
    expect(publishHtml).toContain("Printify product created");
    expect(publishHtml).toContain("printify_product_runtime");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("product creation remains owner-gated before provider calls", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    const repos = createRepositories();
    await seedConnectedPrintifyProvider(repos, "printify_gate_secret_should_not_be_used");
    const gates = { ...allTrueGates, human_approved: false };
    const { draftId } = await seedApprovedPrintifyDraft(repos, `blocked_${Date.now()}`, { gates });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await printifyPublishPost(authedPost("/api/studio/publish/printify", { productDraftId: draftId }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ ok: false, status: "blocked_by_guardrail" });
    expect(body.blockingReasons).toContain("human_approval_required");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns setup_required with onboarding action when no Printify provider is available", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);

    const response = await blueprintsGet(authedGet("/api/studio/integrations/printify/catalog/blueprints"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      status: "setup_required",
      provider: "printify",
      setupAction: "/studio/onboarding/providers/printify"
    });
  });

  it("uses advanced env fallback only when no credential-store provider exists", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("PRINTIFY_ENABLED", "true");
    vi.stubEnv("PRINTIFY_API_TOKEN", "printify_env_route_secret");
    vi.stubEnv("PRINTIFY_SHOP_ID", "shop_env_route");
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return jsonResponse([{ id: 7, title: "Env fallback blueprint" }]);
    }));

    const response = await blueprintsGet(authedGet("/api/studio/integrations/printify/catalog/blueprints"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe("Bearer printify_env_route_secret");
    expect(JSON.stringify(body)).not.toContain("printify_env_route_secret");
  });

  it("does not return token values from Printify runtime source", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/integrations/printify/_runtime.ts"), "utf8");
    expect(source).toContain("publicPrintifyProviderResolution");
    expect(source).not.toMatch(/serverCredential|PRINTIFY_API_TOKEN/);
  });
});
