import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import type { PublishReview } from "@saltyfactory/domain";
import { allTrueGates } from "./helpers";
import { POST as goLivePost } from "../apps/studio/app/api/studio/publish/shopify/[refId]/go-live/route";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspaceId = "wks_default";
const originalEnv = { ...process.env };
const timestamp = "2026-07-03T00:00:00.000Z";

function authorizeOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "owner_user", email: "owner@example.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, workspace) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: workspace,
    supabaseUserId: user.id
  }));
}

function authedRequest(body: Record<string, unknown> = {}, refId = "shopref_go_live") {
  return new Request(`http://localhost:3001/api/studio/publish/shopify/${refId}/go-live`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`
    },
    body: JSON.stringify(body)
  });
}

async function seedGoLiveRecords(refId = "shopref_go_live") {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("REPOSITORY_ADAPTER", "memory");
  const repos = createRepositories();
  await repos.draft.create({
    id: `draft_${refId}`,
    workspace_id: workspaceId,
    title: "Beach Rodeo Tee",
    description: "Western coastal tee",
    status: "approved",
    shopify_status: "draft_created"
  } as WorkspaceRow);
  await repos.publish.create({
    id: `pubrev_${refId}`,
    workspace_id: workspaceId,
    product_draft_id: `draft_${refId}`,
    gates: allTrueGates,
    all_gates_passed: true,
    shopify_publish_allowed: true,
    printify_sync_allowed: true,
    status: "approved_internal_ready",
    reviewed_by: "owner_user",
    reviewed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    notes: []
  } as PublishReview & WorkspaceRow);
  await repos.shopify.create({
    id: refId,
    workspace_id: workspaceId,
    product_draft_id: `draft_${refId}`,
    shopify_product_id: "8123456789",
    shopify_product_gid: "gid://shopify/Product/8123456789",
    shopify_handle: "beach-rodeo-tee",
    shopify_status: "draft",
    sync_status: "draft_created",
    admin_url: "https://shop.example/admin/products/8123456789",
    storefront_url: null,
    media: [],
    seo: {}
  } as WorkspaceRow);
  return repos;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("Shopify go-live route", () => {
  it("requires Studio publish auth", async () => {
    const response = await goLivePost(new Request("http://localhost:3001/api/studio/publish/shopify/shopref/go-live"), {
      params: Promise.resolve({ refId: "shopref" })
    });
    expect(response.status).toBe(401);
  });

  it("blocks before provider calls when live publishing flags are disabled", async () => {
    authorizeOwner();
    await seedGoLiveRecords();
    const response = await goLivePost(authedRequest({ ownerConfirmed: true, confirmationText: "PUBLISH LIVE" }), {
      params: Promise.resolve({ refId: "shopref_go_live" })
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      status: "owner_gated",
      setupRequired: ["LIVE_PUBLISHING_ENABLED=true", "SHOPIFY_ALLOW_PRODUCT_PUBLISH=true"]
    });
  });

  it("requires an explicit owner confirmation phrase after flags are enabled", async () => {
    authorizeOwner();
    vi.stubEnv("LIVE_PUBLISHING_ENABLED", "true");
    vi.stubEnv("SHOPIFY_ALLOW_PRODUCT_PUBLISH", "true");
    await seedGoLiveRecords("shopref_confirm");
    const response = await goLivePost(authedRequest({ ownerConfirmed: true, confirmationText: "WRONG" }, "shopref_confirm"), {
      params: Promise.resolve({ refId: "shopref_confirm" })
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      status: "confirmation_required",
      blockingReasons: ["explicit_owner_confirmation_required"]
    });
  });

  it("publishes through Shopify provider and persists the live refs when fully configured", async () => {
    authorizeOwner();
    vi.stubEnv("LIVE_PUBLISHING_ENABLED", "true");
    vi.stubEnv("SHOPIFY_ALLOW_PRODUCT_PUBLISH", "true");
    vi.stubEnv("SHOPIFY_ADMIN_ENABLED", "true");
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "saltycowhide.myshopify.com");
    vi.stubEnv("SHOPIFY_ADMIN_TOKEN", "server-token");
    vi.stubEnv("NEXT_PUBLIC_STOREFRONT_BASE_URL", "https://saltycowhide.com");
    const repos = await seedGoLiveRecords("shopref_success");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ product: { id: 8123456789, status: "active" } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    const response = await goLivePost(authedRequest({ ownerConfirmed: true, confirmationText: "PUBLISH LIVE" }, "shopref_success"), {
      params: Promise.resolve({ refId: "shopref_success" })
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "published_live",
      storefrontUrl: "https://saltycowhide.com/products/beach-rodeo-tee"
    });
    await expect(repos.shopify.getById("shopref_success", workspaceId)).resolves.toMatchObject({
      shopify_status: "active",
      sync_status: "published_live",
      storefront_url: "https://saltycowhide.com/products/beach-rodeo-tee"
    });
    await expect(repos.draft.getById("draft_shopref_success", workspaceId)).resolves.toMatchObject({
      shopify_status: "published_live",
      status: "published"
    });
  });

  it("has a real Studio UI caller", () => {
    const client = readFileSync(join(process.cwd(), "apps/studio/app/studio/shopify-products/ShopifyProductsClient.tsx"), "utf8");
    expect(client).toContain("/api/studio/publish/shopify/");
    expect(client).toContain("/go-live");
    expect(client).toContain("PUBLISH LIVE");
  });
});
