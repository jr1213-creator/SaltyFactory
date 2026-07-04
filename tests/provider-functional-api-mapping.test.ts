import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { PrintifyProviderLive, ShopifyAdminProviderLive } from "@saltyfactory/commerce";
import { computePerceptualHash, duplicateSimilarity, evaluateAssetQaFromMetadata, generateMockup } from "@saltyfactory/image-pipeline";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { runWorkerOnce } from "../apps/worker/src/index";
import { extractProviderProductId, fetchPrintifyProductWithMockupRetry, getApprovedMockupMedia } from "../apps/studio/app/api/studio/publish/_provider-workflow";

async function pngBuffer(color: string, width = 256, height = 256) {
  return sharp({ create: { width, height, channels: 4, background: color } }).png().toBuffer();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("provider-backed POD functional API mapping", () => {
  it("Shopify live adapter creates drafts with media, variants, SEO, update, collection assign, and getProduct support", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes("/images.json")) return jsonResponse({ image: { id: 99, src: "https://cdn.example/mockup.png" } });
      if (String(url).includes("/collects.json")) return jsonResponse({ collect: { id: 88 } });
      if (String(url).includes("/products/123.json") && init.method === "GET") return jsonResponse({ product: { id: 123, status: "draft" } });
      if (String(url).includes("/products/123.json") && init.method === "PUT") return jsonResponse({ product: { id: 123, status: "draft" } });
      return jsonResponse({ product: { id: 123, admin_graphql_api_id: "gid://shopify/Product/123", handle: "coastal-tee", status: "draft" } });
    };
    const shopify = new ShopifyAdminProviderLive("saltycowhide.myshopify.com", "shpat_secret", false, fetcher as typeof fetch);
    const created = await shopify.createProductDraft({
      title: "Coastal Cowhide Tee",
      description: "Owner-approved draft product.",
      vendor: "Salty Cowhide Co.",
      productType: "Tee",
      tags: ["coastal", "western"],
      seoTitle: "Coastal Cowhide Tee",
      seoDescription: "A western coastal tee.",
      variants: [{ price: "32.00", sku: "SC-TEE-S", size: "S" }],
      images: [{ src: "https://cdn.example/mockup.png", alt: "Coastal tee mockup" }]
    });
    await shopify.uploadProductImage("123", "https://cdn.example/mockup-2.png", "Second mockup");
    await shopify.assignCollection("123", "456");
    await shopify.updateProduct("123", { title: "Coastal Cowhide Tee Updated", description: "Still draft.", status: "draft" });
    await shopify.getProduct("123");

    expect(created.ok).toBe(true);
    const createPayload = JSON.parse(String(calls[0]?.init.body));
    expect(createPayload.product).toMatchObject({
      title: "Coastal Cowhide Tee",
      status: "draft",
      vendor: "Salty Cowhide Co.",
      product_type: "Tee",
      metafields_global_title_tag: "Coastal Cowhide Tee"
    });
    expect(createPayload.product.images[0]).toMatchObject({ src: "https://cdn.example/mockup.png", alt: "Coastal tee mockup" });
    expect(createPayload.product.variants[0]).toMatchObject({ price: "32.00", sku: "SC-TEE-S", option1: "S" });
    expect(calls.map((call) => call.url)).toEqual(expect.arrayContaining([
      "https://saltycowhide.myshopify.com/admin/api/2024-10/products.json",
      "https://saltycowhide.myshopify.com/admin/api/2024-10/products/123/images.json",
      "https://saltycowhide.myshopify.com/admin/api/2024-10/collects.json",
      "https://saltycowhide.myshopify.com/admin/api/2024-10/products/123.json"
    ]));
    expect(JSON.stringify(created)).not.toContain("shpat_secret");
  });

  it("Shopify live adapter exchanges Dev Dashboard Client ID/Secret and uses the generated token for Admin calls", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/admin/oauth/access_token")) {
        return jsonResponse({ access_token: "generated_admin_access_token", expires_in: 3600 });
      }
      return jsonResponse({ shop: { name: "Salty Cowhide" } });
    };
    const shopify = new ShopifyAdminProviderLive("saltycowhide.myshopify.com", {
      credentialMode: "dev_dashboard_client_credentials",
      clientId: "client_1234",
      clientSecret: "client_secret_1234"
    }, false, fetcher as typeof fetch);

    const result = await shopify.fetchShopInfo();

    expect(result).toMatchObject({ ok: true, data: { shop: { name: "Salty Cowhide" } } });
    expect(calls[0]?.url).toBe("https://saltycowhide.myshopify.com/admin/oauth/access_token");
    expect(String(calls[0]?.init.body)).toContain("grant_type=client_credentials");
    expect(calls[1]?.url).toBe("https://saltycowhide.myshopify.com/admin/api/2024-10/shop.json");
    expect((calls[1]?.init.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe("generated_admin_access_token");
    expect(JSON.stringify(result)).not.toMatch(/client_secret_1234|generated_admin_access_token/);
  });

  it("Printify live adapter uploads generated art and creates product payload with upload id, variants, and print areas", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes("/uploads/images.json")) return jsonResponse({ id: "upload_real_1", preview_url: "https://printify.example/preview.png" });
      if (String(url).includes("/shipping.json")) return jsonResponse([{ country: "US", price: 499, currency: "USD" }]);
      if (String(url).includes("/products/printify_product_1.json")) return jsonResponse({ id: "printify_product_1", images: [] });
      if (String(url).includes("/products.json")) return jsonResponse({ id: "printify_product_1", status: "draft" });
      return jsonResponse([{ id: 101, title: "Variant" }]);
    };
    const printify = new PrintifyProviderLive("printify_token", "shop_123", fetcher as typeof fetch);
    const upload = await printify.uploadImage({ fileName: "art.png", contents: Buffer.from("real-art").toString("base64") });
    const created = await printify.createProduct({
      title: "Coastal Cowhide Tee",
      description: "Owner-approved product draft.",
      blueprintId: "5",
      printProviderId: "99",
      variants: [{ id: 17390, price: 3200, is_enabled: true }],
      printAreas: [{ variant_ids: [17390], placeholders: [{ position: "front", images: [{ id: "upload_real_1", x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }]
    });
    await printify.getShipping("5", "99");
    await printify.getProduct("printify_product_1");

    expect(upload).toMatchObject({ ok: true, data: { id: "upload_real_1" } });
    expect(created).toMatchObject({ ok: true, data: { id: "printify_product_1" } });
    const createCall = calls.find((call) => call.url.endsWith("/shops/shop_123/products.json"));
    expect(createCall).toBeTruthy();
    const productPayload = JSON.parse(String(createCall?.init.body));
    expect(productPayload).toMatchObject({ title: "Coastal Cowhide Tee", blueprint_id: "5", print_provider_id: "99" });
    expect(productPayload.variants[0]).toMatchObject({ id: 17390, price: 3200, is_enabled: true });
    expect(productPayload.print_areas[0].placeholders[0].images[0]).toMatchObject({ id: "upload_real_1", x: 0.5, y: 0.5, scale: 1, angle: 0 });
    expect(JSON.stringify(created)).not.toContain("printify_token");
  });

  it("Printify product sync polls for real provider mockup URLs without fabricating media", async () => {
    const calls: string[] = [];
    const fetcher = async (url: string | URL | Request) => {
      calls.push(String(url));
      if (calls.length === 1) return jsonResponse({ id: "printify_product_1", images: [] });
      return jsonResponse({
        id: "printify_product_1",
        status: "draft",
        images: [
          { src: "https://images.printify.com/mockup-front.png" },
          { preview_url: "https://images.printify.com/mockup-back.png" }
        ]
      });
    };
    const printify = new PrintifyProviderLive("printify_token", "shop_123", fetcher as typeof fetch);
    const sync = await fetchPrintifyProductWithMockupRetry(printify, "printify_product_1", {
      attempts: 2,
      delaysMs: [0],
      wait: async () => undefined
    });

    expect(sync).toMatchObject({
      ok: true,
      status: "mockups_synced",
      mockupUrls: [
        "https://images.printify.com/mockup-front.png",
        "https://images.printify.com/mockup-back.png"
      ],
      attempts: 2
    });
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(sync)).not.toContain("printify_token");
  });

  it("Printify provider refs require a real product id from the provider response", () => {
    expect(extractProviderProductId({ id: "printify_product_1" })).toBe("printify_product_1");
    expect(extractProviderProductId({ product_id: "printify_product_2" })).toBe("printify_product_2");
    expect(extractProviderProductId({ productId: "printify_product_3" })).toBe("printify_product_3");
    expect(extractProviderProductId({ status: "draft" })).toBe("");
    expect(extractProviderProductId(null)).toBe("");
  });

  it("Shopify media selection can read persisted Printify mockup URLs as next-stage media", async () => {
    const repos = createMemoryRepositories();
    const draft = await repos.draft.create({
      id: "draft_printify_media",
      workspace_id: "wks_default",
      title: "Coastal Cowhide Tee",
      description: "Owner-approved product draft.",
      mockup_ids: []
    });
    await repos.printify.create({
      id: "ptyref_media",
      workspace_id: "wks_default",
      product_draft_id: draft.id,
      printify_product_id: "printify_product_1",
      printify_shop_id: "shop_123",
      printify_blueprint_id: "5",
      printify_print_provider_id: "99",
      printify_variant_ids: ["17390"],
      print_areas: [],
      mockup_urls: ["https://images.printify.com/mockup-front.png"],
      sync_status: "draft_created_mockups_synced"
    });

    const media = await getApprovedMockupMedia({ repos, workspaceId: "wks_default", draft, config: {} as any });

    expect(media).toMatchObject({
      ok: true,
      media: [
        {
          mockupId: "printify:ptyref_media:0",
          url: "https://images.printify.com/mockup-front.png"
        }
      ]
    });
  });

  it("Sharp mockup compositor writes artwork pixels into product template output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "saltyfactory-mockup-"));
    try {
      const art = await pngBuffer("#ff3f75", 128, 128);
      const out = join(dir, "mockup.png");
      await generateMockup(art, "", out, { canvas: { width: 500, height: 500, art_zone: { x: 150, y: 150, width: 200, height: 200 } } });
      const output = await readFile(out);
      const pixel = await sharp(output).extract({ left: 250, top: 250, width: 1, height: 1 }).raw().toBuffer();
      expect(pixel[0]).toBeGreaterThan(230);
      expect(pixel[1]).toBeLessThan(90);
      expect(pixel[2]).toBeGreaterThan(90);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("perceptual hash catches duplicate generated art without equating different art", async () => {
    const red = await pngBuffer("#ff3f75", 128, 128);
    const redCopy = await pngBuffer("#ff3f75", 128, 128);
    const blue = await pngBuffer("#1aa6b7", 128, 128);
    const redHash = await computePerceptualHash(red);
    const redCopyHash = await computePerceptualHash(redCopy);
    const blueHash = await computePerceptualHash(blue);
    expect(duplicateSimilarity(redHash, redCopyHash)).toBe(1);
    expect(duplicateSimilarity(redHash, blueHash)).toBeLessThan(0.95);
    const qa = evaluateAssetQaFromMetadata({ width: 400, height: 400, format: "png", hasAlpha: false, perceptualHash: redHash }, undefined, [redCopyHash]);
    expect(qa.blocked_reasons).toContain("resolution_ok");
    expect(qa.blocked_reasons).toContain("transparent_background_ok");
    expect(qa.warnings).toContain("duplicate_similarity");
  });

  it("worker generation persists generated bytes, creates asset and QA rows, then completes the job", async () => {
    const repos = createMemoryRepositories();
    const bytes = await pngBuffer("#ff3f75", 512, 512);
    await repos.job.create({
      id: "genjob_success",
      workspace_id: "wks_default",
      brief_id: "brief_1",
      provider: "test_provider",
      model: "test_model",
      prompt: "coastal western badge",
      negative_prompt: "logos",
      parameters: { width: 512 },
      status: "queued",
      retry_count: 0,
      max_retries: 3,
      created_by: "owner"
    });
    const imageProvider = {
      enabled: true,
      providerId: "test_image_provider",
      generateImage: async () => ({ ok: true as const, data: { bytes }, modelUsed: "test_sdxl", sourceLabel: "model_generated" as const }),
      getJobStatus: async () => ({ ok: true as const, data: { status: "completed" }, sourceLabel: "model_generated" as const }),
      isHealthy: async () => true
    };
    const storage = {
      uploadPrivateAsset: async (path: string) => ({ ok: true as const, path }),
      downloadPrivateAsset: async () => ({ ok: true as const, bytes, contentType: "image/png" }),
      createSignedPrivateUrl: async (path: string) => ({ ok: true as const, url: `https://signed.example/${encodeURIComponent(path)}` }),
      moveApprovedAssetToPublic: async (_privatePath: string, publicPath: string) => ({ ok: true as const, path: publicPath }),
      createPublicApprovedUrl: (path: string, approved: boolean) => approved ? { ok: true as const, url: `https://public.example/${path}` } : { ok: false as const, error: "asset_not_approved_for_public_url" },
      deletePrivateTemporaryAsset: async (path: string) => ({ ok: true as const, path })
    };
    const result = await runWorkerOnce(undefined, { repos, imageProvider: imageProvider as any, storage, actorId: "worker_test" });
    const assets = await repos.asset.listByWorkspace("wks_default");
    const qa = await repos.qa.listByWorkspace("wks_default");
    const job = await repos.job.getById("genjob_success", "wks_default");

    expect(result).toMatchObject({ ok: true, processed: 1 });
    expect(assets).toHaveLength(1);
    expect(qa).toHaveLength(1);
    expect(job?.status).toBe("completed");
    expect(job?.output_asset_id).toBe(assets[0]?.id);
  });

  it("batch repository workflow creates 15 independent items and allows partial failure without marking the batch published", async () => {
    const repos = createMemoryRepositories();
    const batch = await repos.productBatch.create({ id: "batch_15", workspace_id: "wks_default", name: "15 item drop", target_count: 15, status: "idea", metadata: { noAutomaticPublish: true } });
    for (let index = 1; index <= 15; index++) {
      await repos.draft.create({ id: `draft_${index}`, workspace_id: "wks_default", title: `Drop item ${index}`, status: "draft", shopify_status: "not_created", printify_status: "not_created" });
      await repos.productBatchItem.create({ id: `item_${index}`, workspace_id: "wks_default", batch_id: batch.id, product_draft_id: `draft_${index}`, sequence: index, stage: "idea", status: "idea", blockers: [] });
    }
    await repos.productBatchItem.update("item_3", { status: "failed", stage: "image_generated", blockers: ["image_provider_rate_limited"] });
    await repos.productBatchItem.update("item_7", { status: "failed", stage: "printify_created", blockers: ["printify_variant_required"] });
    const items = await repos.productBatchItem.listByWorkspace("wks_default");
    expect(items).toHaveLength(15);
    expect(items.filter((item) => item.status === "failed")).toHaveLength(2);
    expect(items.filter((item) => item.status !== "failed")).toHaveLength(13);
    expect(batch.status).not.toBe("published");
  });

  it("Studio provider buttons call real backend routes instead of orphaning publish APIs", () => {
    const publishClient = String(readFileSync(join(process.cwd(), "apps/studio/app/studio/publish/ProviderPublishActionsClient.tsx")));
    const printifyClient = String(readFileSync(join(process.cwd(), "apps/studio/app/studio/printify-catalog/PrintifyCatalogClient.tsx")));
    const shopifyClient = String(readFileSync(join(process.cwd(), "apps/studio/app/studio/shopify-products/ShopifyProductsClient.tsx")));
    const navigation = String(readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx")));

    expect(publishClient).toContain("/api/studio/publish/printify");
    expect(publishClient).toContain("/api/studio/publish/shopify");
    expect(publishClient).toContain("Send to Printify");
    expect(publishClient).toContain("Create Shopify Draft");
    expect(printifyClient).toContain("/api/studio/integrations/printify/shops");
    expect(printifyClient).toContain("/api/studio/integrations/printify/shops/select");
    expect(printifyClient).toContain("/api/studio/integrations/printify/catalog/blueprints");
    expect(printifyClient).toContain("/api/studio/integrations/printify/catalog/selection");
    expect(printifyClient).toContain("/api/studio/integrations/printify/uploads");
    expect(shopifyClient).toContain("/api/studio/integrations/shopify/media");
    expect(navigation).toContain("/studio/pod-launch-studio");
    expect(navigation).toContain("/studio/printify-catalog");
    expect(navigation).toContain("/studio/shopify-products");
    expect(navigation).toContain("/studio/pod-batches");
  });
});
