import { assertPublishAllowedForPrintify, assertPublishAllowedForShopify, type PublishReview } from "@saltyfactory/domain";
import type { RuntimeConfig } from "@saltyfactory/config";
import { sanitizeProviderError } from "@saltyfactory/security";

export type CommerceResult<T> = { ok: true; data: T } | { ok: false; error: string; retryable?: boolean; rateLimited?: boolean; setupRequired?: string[] };

const disabled = <T>(error = "provider_disabled", setupRequired: string[] = []): CommerceResult<T> => ({ ok: false, error, setupRequired });

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function resultFromResponse<T>(response: Response, body: any): CommerceResult<T> {
  if (response.ok) return { ok: true, data: body as T };
  const message = sanitizeProviderError(body?.errors ?? body?.error ?? body?.message ?? `provider_http_${response.status}`);
  return { ok: false, error: message, retryable: response.status >= 500, rateLimited: response.status === 429 };
}

export class ShopifyStorefrontProviderDisabled {
  async getProducts() { return { ok: true as const, data: [] }; }
  async getProduct() { return { ok: true as const, data: null }; }
  async getCollections() { return { ok: true as const, data: [] }; }
  async getCollection() { return { ok: true as const, data: null }; }
  async createCart() { return disabled("shopify_storefront_disabled"); }
  async addToCart() { return disabled("shopify_storefront_disabled"); }
  async getCart() { return { ok: true as const, data: null }; }
}

export class ShopifyStorefrontProviderLive extends ShopifyStorefrontProviderDisabled {
  constructor(public domain: string, public token: string) {
    super();
    if (!domain || !token) throw new Error("Shopify Storefront provider requires domain and token");
  }
}

export type ShopifyDraftPayload = {
  title: string;
  body_html: string;
  status: "draft";
  product_type?: string;
  vendor?: string;
  tags?: string;
  variants?: Array<{ price: string; sku?: string; option1?: string }>;
  images?: Array<{ src: string; alt?: string }>;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
};

export class ShopifyAdminProviderDisabled {
  async testConnection(): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled", ["SHOPIFY_ADMIN_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]); }
  async fetchShopInfo(): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled", ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]); }
  buildProductDraftPayload(product: any): ShopifyDraftPayload {
    const payload: ShopifyDraftPayload = {
      title: String(product.title ?? ""),
      body_html: String(product.description ?? product.body_html ?? ""),
      status: "draft"
    };
    const productType = product.productType ?? product.product_type;
    if (productType) payload.product_type = productType;
    if (product.vendor ?? product.brand) payload.vendor = product.vendor ?? product.brand;
    if (product.tags) payload.tags = Array.isArray(product.tags) ? product.tags.join(",") : product.tags;
    if (Array.isArray(product.variants) && product.variants.length) {
      payload.variants = product.variants.map((variant: any) => ({
        price: String(variant.price ?? product.price ?? "0.00"),
        sku: variant.sku,
        option1: variant.option1 ?? variant.title ?? variant.size ?? "Default"
      }));
    } else if (product.price) {
      payload.variants = [{ price: String(product.price), sku: product.sku, option1: product.option1 ?? "Default" }];
    }
    if (Array.isArray(product.images)) {
      payload.images = product.images
        .filter((image: any) => image?.approved !== false && (image?.src || image?.url))
        .map((image: any) => ({ src: String(image.src ?? image.url), alt: image.alt ? String(image.alt) : undefined }));
    }
    const seoTitle = product.seoTitle ?? product.seo_title;
    const seoDescription = product.seoDescription ?? product.seo_description;
    if (seoTitle) payload.metafields_global_title_tag = String(seoTitle).slice(0, 70);
    if (seoDescription) payload.metafields_global_description_tag = String(seoDescription).slice(0, 320);
    return payload;
  }
  async createProductDraft(_product?: any): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled"); }
  async updateProduct(_id?: string, _updates?: any): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled"); }
  async uploadProductImage(_productId?: string, _imageUrl?: string, _altText?: string): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled"); }
  async assignCollection(_productId?: string, _collectionId?: string): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled"); }
  async publishProductGuarded(_id?: string, _review?: PublishReview, _actor?: string): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled"); }
  async getProduct(_id?: string): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled"); }
  async isHealthy() { return false; }
}

export class ShopifyAdminProviderLive extends ShopifyAdminProviderDisabled {
  constructor(public domain: string, private token: string, private livePublishingEnabled: boolean, private fetcher: typeof fetch = fetch, private apiVersion = "2024-10") {
    super();
    if (!domain || !token) throw new Error("Shopify Admin provider requires server-side domain and token");
  }

  private endpoint(path: string) {
    const cleanDomain = this.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${cleanDomain}/admin/api/${this.apiVersion}/${path.replace(/^\//, "")}`;
  }

  private headers() {
    return { "X-Shopify-Access-Token": this.token, "content-type": "application/json" };
  }

  async testConnection() {
    return this.fetchShopInfo();
  }

  async fetchShopInfo() {
    const response = await this.fetcher(this.endpoint("shop.json"), { method: "GET", headers: this.headers() });
    return resultFromResponse<{ shop: Record<string, unknown> }>(response, await readJson(response));
  }

  async createProductDraft(product: any = {}) {
    const payload = { product: this.buildProductDraftPayload(product) };
    if (!payload.product.title || !payload.product.body_html) return disabled("listing_validation_required", ["title", "description"]);
    const response = await this.fetcher(this.endpoint("products.json"), { method: "POST", headers: this.headers(), body: JSON.stringify(payload) });
    return resultFromResponse<{ product: Record<string, unknown> }>(response, await readJson(response));
  }

  async updateProduct(id = "", updates: any = {}) {
    if (!id) return disabled("shopify_product_id_required", ["shopify_product_id"]);
    const payload = { product: { id, ...this.buildProductDraftPayload(updates), status: updates.status ?? "draft" } };
    const response = await this.fetcher(this.endpoint(`products/${encodeURIComponent(id)}.json`), { method: "PUT", headers: this.headers(), body: JSON.stringify(payload) });
    return resultFromResponse<{ product: Record<string, unknown> }>(response, await readJson(response));
  }

  async uploadProductImage(productId = "", imageUrl = "", altText = "") {
    if (!productId || !imageUrl) return disabled("shopify_product_image_payload_incomplete", ["shopify_product_id", "image_url"]);
    const response = await this.fetcher(this.endpoint(`products/${encodeURIComponent(productId)}/images.json`), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ image: { src: imageUrl, alt: altText || undefined } })
    });
    return resultFromResponse<{ image: Record<string, unknown> }>(response, await readJson(response));
  }

  async assignCollection(productId = "", collectionId = "") {
    if (!productId || !collectionId) return disabled("shopify_collection_assignment_incomplete", ["shopify_product_id", "shopify_collection_id"]);
    const response = await this.fetcher(this.endpoint("collects.json"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ collect: { product_id: productId, collection_id: collectionId } })
    });
    return resultFromResponse<{ collect: Record<string, unknown> }>(response, await readJson(response));
  }

  async getProduct(id = "") {
    if (!id) return disabled("shopify_product_id_required", ["shopify_product_id"]);
    const response = await this.fetcher(this.endpoint(`products/${encodeURIComponent(id)}.json`), { method: "GET", headers: this.headers() });
    return resultFromResponse<{ product: Record<string, unknown> }>(response, await readJson(response));
  }

  async publishProductGuarded(id = "", review?: PublishReview, actor = "") {
    if (!review) return disabled("publish_review_required");
    assertPublishAllowedForShopify(review);
    if (!actor) return disabled("audit_actor_required");
    if (!this.livePublishingEnabled) return { ok: true as const, data: { id, status: "draft", livePublishing: false } };
    const response = await this.fetcher(this.endpoint(`products/${encodeURIComponent(id)}.json`), { method: "PUT", headers: this.headers(), body: JSON.stringify({ product: { id, status: "active" } }) });
    return resultFromResponse(response, await readJson(response));
  }
}

export class PrintifyProviderDisabled {
  async testConnection(): Promise<CommerceResult<any>> { return disabled("printify_disabled", ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]); }
  async getShops(): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async getCatalog(): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async getBlueprint(_id?: string): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async getPrintProviders(_blueprintId?: string): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async getVariants(_blueprintId?: string, _providerId?: string): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async getShipping(_blueprintId?: string, _providerId?: string): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async uploadImage(_image?: any): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  buildProductDraftPayload(product: any) {
    const variants = Array.isArray(product.variants)
      ? product.variants.map((variant: any) => ({
        id: Number(variant.id ?? variant.printify_variant_id ?? variant.printifyVariantId),
        price: Number(variant.price ?? variant.price_cents ?? variant.priceCents ?? 0),
        is_enabled: variant.is_enabled ?? variant.isEnabled ?? true
      })).filter((variant: any) => Number.isFinite(variant.id) && variant.id > 0)
      : [];
    return {
      title: String(product.title ?? ""),
      description: String(product.description ?? ""),
      blueprint_id: product.blueprintId ?? product.blueprint_id,
      print_provider_id: product.printProviderId ?? product.print_provider_id,
      variants,
      print_areas: product.printAreas ?? product.print_areas ?? []
    };
  }
  async createProduct(_product?: any): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async publishProductGuarded(_id?: string, _review?: PublishReview, _actor?: string): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async getProduct(_id?: string): Promise<CommerceResult<any>> { return disabled("printify_disabled"); }
  async handleFulfillmentWebhook(payload: unknown) { return { ok: true as const, data: { payload, status: "received_disabled" } }; }
  async isHealthy() { return false; }
}

export class PrintifyProviderLive extends PrintifyProviderDisabled {
  constructor(private token: string, public shopId: string, private fetcher: typeof fetch = fetch) {
    super();
    if (!token || !shopId) throw new Error("Printify provider requires token and shop id");
  }

  private endpoint(path: string) {
    return `https://api.printify.com/v1/${path.replace(/^\//, "")}`;
  }

  private headers() {
    return { authorization: `Bearer ${this.token}`, "content-type": "application/json" };
  }

  async testConnection() {
    return this.getShops();
  }

  async getShops() {
    const response = await this.fetcher(this.endpoint("shops.json"), { method: "GET", headers: this.headers() });
    return resultFromResponse<Array<Record<string, unknown>>>(response, await readJson(response));
  }

  async getCatalog() {
    const response = await this.fetcher(this.endpoint("catalog/blueprints.json"), { method: "GET", headers: this.headers() });
    return resultFromResponse<Array<Record<string, unknown>>>(response, await readJson(response));
  }

  async getBlueprint(id = "") {
    const response = await this.fetcher(this.endpoint(`catalog/blueprints/${encodeURIComponent(id)}.json`), { method: "GET", headers: this.headers() });
    return resultFromResponse<Record<string, unknown>>(response, await readJson(response));
  }

  async getPrintProviders(blueprintId = "") {
    const response = await this.fetcher(this.endpoint(`catalog/blueprints/${encodeURIComponent(blueprintId)}/print_providers.json`), { method: "GET", headers: this.headers() });
    return resultFromResponse<Array<Record<string, unknown>>>(response, await readJson(response));
  }

  async getVariants(blueprintId = "", providerId = "") {
    const response = await this.fetcher(this.endpoint(`catalog/blueprints/${encodeURIComponent(blueprintId)}/print_providers/${encodeURIComponent(providerId)}/variants.json`), { method: "GET", headers: this.headers() });
    return resultFromResponse<Array<Record<string, unknown>>>(response, await readJson(response));
  }

  async getShipping(blueprintId = "", providerId = "") {
    const response = await this.fetcher(this.endpoint(`catalog/blueprints/${encodeURIComponent(blueprintId)}/print_providers/${encodeURIComponent(providerId)}/shipping.json`), { method: "GET", headers: this.headers() });
    return resultFromResponse<Array<Record<string, unknown>>>(response, await readJson(response));
  }

  async uploadImage(image: { fileName?: string; contents?: string; url?: string } = {}) {
    const fileName = String(image.fileName ?? "saltyfactory-artwork.png");
    const body = image.url
      ? { file_name: fileName, url: image.url }
      : { file_name: fileName, contents: image.contents };
    if (!body.url && !body.contents) return disabled("printify_image_upload_payload_incomplete", ["file_name", "contents_or_url"]);
    const response = await this.fetcher(this.endpoint("uploads/images.json"), { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
    return resultFromResponse<Record<string, unknown>>(response, await readJson(response));
  }

  async createProduct(product: any = {}) {
    const payload = this.buildProductDraftPayload(product);
    if (!payload.title || !payload.description || !payload.blueprint_id || !payload.print_provider_id || !payload.variants.length || !payload.print_areas.length) {
      return disabled("printify_product_payload_incomplete", ["title", "description", "blueprint_id", "print_provider_id", "variants", "print_areas"]);
    }
    const response = await this.fetcher(this.endpoint(`shops/${encodeURIComponent(this.shopId)}/products.json`), { method: "POST", headers: this.headers(), body: JSON.stringify(payload) });
    return resultFromResponse<Record<string, unknown>>(response, await readJson(response));
  }

  async publishProductGuarded(productId = "", review?: PublishReview, actor = "") {
    if (!review) return disabled("publish_review_required");
    assertPublishAllowedForPrintify(review);
    if (!actor) return disabled("audit_actor_required");
    return { ok: true as const, data: { productId, status: "draft_created_not_published" } };
  }

  async getProduct(id = "") {
    if (!id) return disabled("printify_product_id_required", ["printify_product_id"]);
    const response = await this.fetcher(this.endpoint(`shops/${encodeURIComponent(this.shopId)}/products/${encodeURIComponent(id)}.json`), { method: "GET", headers: this.headers() });
    return resultFromResponse<Record<string, unknown>>(response, await readJson(response));
  }
}

export const createCommerceProviders = (c: RuntimeConfig, fetcher?: typeof fetch) => ({
  storefront: c.providers.shopifyStorefront.enabled ? new ShopifyStorefrontProviderLive(c.SHOPIFY_STORE_DOMAIN, c.SHOPIFY_STOREFRONT_TOKEN) : new ShopifyStorefrontProviderDisabled(),
  admin: c.providers.shopifyAdmin.enabled ? new ShopifyAdminProviderLive(c.SHOPIFY_STORE_DOMAIN, c.SHOPIFY_ADMIN_TOKEN, c.LIVE_PUBLISHING_ENABLED, fetcher) : new ShopifyAdminProviderDisabled(),
  printify: c.providers.printify.enabled ? new PrintifyProviderLive(c.PRINTIFY_API_TOKEN, c.PRINTIFY_SHOP_ID, fetcher) : new PrintifyProviderDisabled()
});

export const safeProductProjection = (p: any) => ({ id: p.id, handle: p.handle, title: p.title, description: p.description, images: p.images ?? [], variants: p.variants ?? [] });
export const structuredDataProductProjection = (p: any) => ({ "@context": "https://schema.org", "@type": "Product", name: p.title, description: p.description, brand: { "@type": "Brand", name: "Salty Cowhide Co." } });
