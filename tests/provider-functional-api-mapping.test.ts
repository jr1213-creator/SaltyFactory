import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { generateHuggingFaceImage } from "@saltyfactory/ai-free";
import { isShopifyCollectionManuallyAssignable, normalizeShopifyCollectionType, PrintifyProviderLive, ShopifyAdminProviderLive } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { computePerceptualHash, createTransparentPrintPngFromChromaKey, duplicateSimilarity, evaluateAssetQaFromMetadata, generateMockup, inspectImageTransparency, resolvePrintQualityRequirements } from "@saltyfactory/image-pipeline";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { runWorkerOnce } from "../apps/worker/src/index";
import { createAssetDerivatives } from "../apps/studio/app/api/studio/_image-production";
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

  it("Shopify collection discovery separates manual custom collections from rule-managed smart collections", async () => {
    const fetcher = async (url: string | URL | Request) => {
      if (String(url).includes("custom_collections.json")) {
        return jsonResponse({ custom_collections: [{ id: 456, title: "Manual Beach Rodeo" }] });
      }
      if (String(url).includes("smart_collections.json")) {
        return jsonResponse({ smart_collections: [{ id: 789, title: "Rule Managed Best Sellers" }] });
      }
      return jsonResponse({});
    };
    const shopify = new ShopifyAdminProviderLive("saltycowhide.myshopify.com", "shpat_secret", false, fetcher as typeof fetch);
    const collections = await shopify.getCollections();
    const smartAssign = await shopify.assignCollection("123", "789", { collectionType: "smart" });

    expect(collections.ok).toBe(true);
    if (collections.ok) {
      expect(collections.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "456", type: "custom", manually_assignable: true, assignment_mode: "manual_collect" }),
        expect.objectContaining({ id: "789", type: "smart", manually_assignable: false, assignment_mode: "rule_managed" })
      ]));
    }
    expect(normalizeShopifyCollectionType("smart_collection")).toBe("smart");
    expect(isShopifyCollectionManuallyAssignable("smart")).toBe(false);
    expect(smartAssign).toMatchObject({
      ok: false,
      error: "shopify_smart_collection_rule_managed",
      setupRequired: ["Choose a custom Shopify collection for manual draft assignment. Smart collections are rule-managed in Shopify."]
    });
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
    expect(productPayload).toMatchObject({ title: "Coastal Cowhide Tee", blueprint_id: 5, print_provider_id: 99 });
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
    expect(qa.blocked_reasons).toContain("transparent_background_missing");
    expect(qa.warnings).toContain("duplicate_similarity");
  });

  it("Hugging Face image provider forwards supported generation parameters and blocks unsupported capability claims", async () => {
    const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
    const png = await pngBuffer("#1aa6b7", 32, 32);
    const fetcher = async (url: string | URL | Request, init: RequestInit = {}) => {
      fetchCalls.push({ url: String(url), init });
      return new Response(png, { status: 200, headers: { "content-type": "image/png" } });
    };

    const generated = await generateHuggingFaceImage({
      token: "hf_test_token",
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: "centered coastal graphic",
      negativePrompt: "mockup, model",
      parameters: {
        width: 1024,
        height: 1024,
        guidance_scale: 3.5,
        num_inference_steps: 4,
        seed: 1234
      },
      fetcher: fetcher as typeof fetch
    });

    expect(generated.ok).toBe(true);
    const payload = JSON.parse(String(fetchCalls[0]?.init.body));
    expect(payload.parameters).toMatchObject({
      negative_prompt: "mockup, model",
      width: 1024,
      height: 1024,
      guidance_scale: 3.5,
      num_inference_steps: 4,
      seed: 1234
    });

    const unsupported = await generateHuggingFaceImage({
      token: "hf_test_token",
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: "transparent sticker art",
      parameters: { width: 1024, height: 1024, transparent_background: true },
      fetcher: fetcher as typeof fetch
    });

    expect(unsupported).toMatchObject({
      ok: false,
      status: "model_not_supported",
      retryable: false
    });
    expect(fetchCalls).toHaveLength(1);
    expect(JSON.stringify(unsupported)).not.toContain("hf_test_token");
  });

  it("print QA uses product-aware requirements and makes text review gaps explicit", () => {
    const targetRequirements = resolvePrintQualityRequirements({ printTarget: "apparel_front_square" });
    const printifyRequirements = resolvePrintQualityRequirements({
      blueprintId: "12",
      printProviderId: "99",
      variantIds: ["17390"],
      printArea: { width: 4200, height: 4800 }
    });
    const failing = evaluateAssetQaFromMetadata({ width: 3000, height: 3000, format: "png", hasAlpha: false, transparentPixelRatio: 0, nearWhiteOpaquePixelRatio: 0.76 }, targetRequirements.rules);
    const passing = evaluateAssetQaFromMetadata({ width: 4200, height: 4800, format: "png", hasAlpha: true, transparentPixelRatio: 0.34, textExpected: true }, printifyRequirements.rules);

    expect(targetRequirements).toMatchObject({ source: "print_target", evidence: { requiredWidth: 4500, requiredHeight: 4500 } });
    expect(printifyRequirements).toMatchObject({ source: "printify_print_area", evidence: { requiredWidth: 4200, requiredHeight: 4800, blueprintId: "12" } });
    expect(failing.blocked_reasons).toContain("resolution_ok");
    expect(failing.blocked_reasons).toContain("transparent_background_missing");
    expect(passing.blocked_reasons).not.toContain("resolution_ok");
    expect(passing.blocked_reasons).not.toContain("transparent_background_missing");
    expect(passing.warnings).toContain("text_legibility");
    expect((passing.checks.text_legibility as any).message).toContain("Local OCR/text legibility is not implemented");
    expect(passing.checks.spelling_review_required).toBe(true);
  });

  it("passes transparent apparel print readiness only when PNG contains real transparent pixels", () => {
    const requirements = resolvePrintQualityRequirements({ printTarget: "apparel_front_square" });
    const transparent = evaluateAssetQaFromMetadata({
      width: 4500,
      height: 4500,
      density: 300,
      format: "png",
      fileSizeBytes: 4_000_000,
      hasAlpha: true,
      transparentPixelRatio: 0.42,
      nearWhiteOpaquePixelRatio: 0.02
    }, requirements.rules);
    const whiteBackground = evaluateAssetQaFromMetadata({
      width: 4500,
      height: 4500,
      density: 300,
      format: "png",
      fileSizeBytes: 4_000_000,
      hasAlpha: false,
      transparentPixelRatio: 0,
      nearWhiteOpaquePixelRatio: 0.76
    }, requirements.rules);

    expect(transparent.status).toBe("passed");
    expect(whiteBackground.status).toBe("failed");
    expect(whiteBackground.blocked_reasons).toContain("transparent_background_missing");
    expect((whiteBackground.checks.transparent_background_missing as any).message).toContain("opaque white background");
  });

  it("chroma key cleanup turns a flat magenta background into real alpha while preserving foreground pixels", async () => {
    const foreground = await pngBuffer("#0f766e", 96, 96);
    const source = await sharp({ create: { width: 256, height: 256, channels: 4, background: "#ff00ff" } })
      .composite([{ input: foreground, left: 80, top: 80 }])
      .png()
      .toBuffer();
    const cleaned = await createTransparentPrintPngFromChromaKey(source, "#FF00FF", 30);
    const corner = await sharp(cleaned.png).extract({ left: 8, top: 8, width: 1, height: 1 }).ensureAlpha().raw().toBuffer();
    const center = await sharp(cleaned.png).extract({ left: 128, top: 128, width: 1, height: 1 }).ensureAlpha().raw().toBuffer();

    expect(cleaned.evidence).toMatchObject({ keyColor: "#FF00FF", hasAlpha: true, width: 256, height: 256 });
    expect(cleaned.evidence.transparentPixelRatio).toBeGreaterThan(0.75);
    expect(cleaned.evidence.keyedPixelRatio).toBeGreaterThan(0.75);
    expect(corner[3]).toBe(0);
    expect(center[0]).toBeLessThan(40);
    expect(center[1]).toBeGreaterThan(90);
    expect(center[2]).toBeGreaterThan(80);
    expect(center[3]).toBe(255);
  });

  it("chroma key tolerance handles slight key-color variation", async () => {
    const source = await sharp({ create: { width: 160, height: 160, channels: 4, background: "#ff05fa" } })
      .composite([{ input: await pngBuffer("#122a40", 70, 70), left: 45, top: 45 }])
      .png()
      .toBuffer();
    const cleaned = await createTransparentPrintPngFromChromaKey(source, "#FF00FF", 12);

    expect(cleaned.evidence.transparentPixelRatio).toBeGreaterThan(0.7);
    expect(cleaned.evidence.remainingNearKeyPixelRatio).toBeLessThan(0.01);
  });

  it("chroma key evidence warns when cleanup would remove too much artwork", async () => {
    const source = await sharp({ create: { width: 160, height: 160, channels: 4, background: "#ff00ff" } })
      .composite([{ input: await pngBuffer("#122a40", 16, 16), left: 72, top: 72 }])
      .png()
      .toBuffer();
    const cleaned = await createTransparentPrintPngFromChromaKey(source, "#FF00FF", 30);
    const qa = evaluateAssetQaFromMetadata({
      width: 4500,
      height: 4500,
      format: "png",
      hasAlpha: true,
      transparentPixelRatio: cleaned.evidence.transparentPixelRatio,
      keyedPixelRatio: cleaned.evidence.keyedPixelRatio,
      remainingNearKeyPixelRatio: cleaned.evidence.remainingNearKeyPixelRatio,
      chromaKeyApplied: true,
      chromaKeyOvercutDetected: cleaned.evidence.overcutDetected
    }, resolvePrintQualityRequirements({ printTarget: "apparel_front_square" }).rules);

    expect(cleaned.evidence.overcutDetected).toBe(true);
    expect(qa.warnings).toContain("chroma_key_overcut_detected");
  });

  it("print PNG derivative generation preserves alpha when source alpha exists", async () => {
    const repos = createMemoryRepositories();
    const workspaceId = `wks_transparency_${Date.now()}`;
    const actorId = "owner";
    const art = await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } }
    })
      .composite([{ input: await pngBuffer("#ff3f75", 220, 220), left: 146, top: 146 }])
      .png()
      .toBuffer();
    const sourceAsset = await repos.asset.create({
      id: "asset_transparent_source",
      workspace_id: workspaceId,
      brief_id: "brief_transparent_source",
      job_id: "job_transparent_source",
      asset_type: "generated_source_art",
      storage_bucket: "local-dev-private-assets",
      file_path: `workspaces/${workspaceId}/private/assets/asset_transparent_source.png`,
      file_size_bytes: art.byteLength,
      width: 512,
      height: 512,
      dpi: 300,
      transparent_background: true,
      generator: "huggingface",
      model: "fixture",
      qa_status: "pending",
      risk_status: "pending",
      approved_for_mockup: false,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      metadata: { print_target: "apparel_front_square" },
      created_by: actorId,
      updated_by: actorId
    } as any);

    const derivatives = await createAssetDerivatives({
      repos,
      workspaceId,
      sourceAsset,
      imageBytes: art,
      actorId,
      config: parseEnv({ NODE_ENV: "development", APP_ENV: "development" }),
      printTarget: "apparel_front_square",
      forceLocal: true
    });
    const printPng = derivatives.find((asset) => asset.asset_type === "print_png");
    const storageKey = String(printPng?.file_path ?? "");
    const bytes = await readFile(join(process.cwd(), ".saltyfactory-private", "assets", workspaceId, basename(storageKey)));
    const transparency = await inspectImageTransparency(bytes);

    expect(printPng).toBeTruthy();
    expect(printPng?.qa_status).toBe("passed");
    expect(printPng?.metadata).toMatchObject({ transparent_background_ready: true, background_removal_required: false });
    expect(transparency.hasAlpha).toBe(true);
    expect(transparency.transparentPixelRatio).toBeGreaterThan(0.2);
  });

  it("print PNG derivative generation can key controlled chroma backgrounds for apparel", async () => {
    const repos = createMemoryRepositories();
    const workspaceId = `wks_chroma_${Date.now()}`;
    const actorId = "owner";
    const art = await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ff00ff" } })
      .composite([{ input: await pngBuffer("#0f766e", 220, 220), left: 146, top: 146 }])
      .png()
      .toBuffer();
    const sourceAsset = await repos.asset.create({
      id: "asset_chroma_source",
      workspace_id: workspaceId,
      brief_id: "brief_chroma_source",
      job_id: "job_chroma_source",
      asset_type: "generated_source_art",
      storage_bucket: "local-dev-private-assets",
      file_path: `workspaces/${workspaceId}/private/assets/asset_chroma_source.png`,
      file_size_bytes: art.byteLength,
      width: 512,
      height: 512,
      dpi: 300,
      transparent_background: false,
      generator: "huggingface",
      model: "fixture",
      qa_status: "pending",
      risk_status: "pending",
      approved_for_mockup: false,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      metadata: {
        print_target: "apparel_front_square",
        transparent_background_intent: true,
        chroma_key: { enabled: true, keyColor: "#FF00FF", tolerance: 30, edgeSoftness: 0 }
      },
      created_by: actorId,
      updated_by: actorId
    } as any);

    const derivatives = await createAssetDerivatives({
      repos,
      workspaceId,
      sourceAsset,
      imageBytes: art,
      actorId,
      config: parseEnv({ NODE_ENV: "development", APP_ENV: "development" }),
      printTarget: "apparel_front_square",
      forceLocal: true
    });
    const printPng = derivatives.find((asset) => asset.asset_type === "print_png");
    const storageKey = String(printPng?.file_path ?? "");
    const bytes = await readFile(join(process.cwd(), ".saltyfactory-private", "assets", workspaceId, basename(storageKey)));
    const transparency = await inspectImageTransparency(bytes);

    expect(printPng?.qa_status).toBe("passed");
    expect(printPng?.metadata).toMatchObject({
      transparent_background_ready: true,
      background_removal_required: false,
      chroma_key_enabled: true,
      chroma_key_applied: true,
      chroma_key_color: "#FF00FF"
    });
    expect(Number((printPng?.metadata as any).chroma_key_keyed_pixel_ratio)).toBeGreaterThan(0.5);
    expect(transparency.hasAlpha).toBe(true);
    expect(transparency.transparentPixelRatio).toBeGreaterThan(0.5);
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
    const masterAssets = assets.filter((asset) => asset.asset_type === "generated_source_art");
    const derivativeAssets = assets.filter((asset) => ["thumbnail", "web_preview", "print_png"].includes(String(asset.asset_type)));
    expect(masterAssets).toHaveLength(1);
    expect(derivativeAssets.map((asset) => asset.asset_type).sort()).toEqual(["print_png", "thumbnail", "web_preview"]);
    expect(qa).toHaveLength(1);
    expect(job?.status).toBe("completed");
    expect(job?.output_asset_id).toBe(masterAssets[0]?.id);
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
