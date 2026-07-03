import { assertPublishAllowedForPrintify, assertPublishAllowedForShopify, type PublishReview } from "@saltyfactory/domain";
import type { RuntimeConfig } from "@saltyfactory/config";
import { sanitizeProviderError } from "@saltyfactory/security";

export type CommerceResult<T> = { ok: true; data: T } | { ok: false; error: string; retryable?: boolean; rateLimited?: boolean; setupRequired?: string[] };

const disabled = <T>(error = "provider_disabled", setupRequired: string[] = []): CommerceResult<T> => ({ ok: false, error, setupRequired });
export type ShopifyCredentialMode = "legacy_admin_token" | "dev_dashboard_client_credentials";

export type ShopifyAdminAuthConfig = {
  credentialMode?: ShopifyCredentialMode;
  adminToken?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string | number | Date | null;
};

export type ShopifyAdminAuthInput = string | ShopifyAdminAuthConfig;

type ShopifyResolvedToken = {
  token: string;
  expiresAtMs: number | null;
};

function hasText(value: string | undefined | null) {
  return Boolean(value && value.trim().length > 0);
}

function normalizeShopifyAuth(input: ShopifyAdminAuthInput): ShopifyAdminAuthConfig {
  if (typeof input === "string") return { credentialMode: "legacy_admin_token", adminToken: input };
  return {
    ...input,
    credentialMode: input.credentialMode ?? (hasText(input.clientId) && hasText(input.clientSecret) ? "dev_dashboard_client_credentials" : "legacy_admin_token")
  };
}

function hasShopifyAuth(input: ShopifyAdminAuthInput | undefined | null) {
  if (!input) return false;
  const auth = normalizeShopifyAuth(input);
  return Boolean((hasText(auth.clientId) && hasText(auth.clientSecret)) || hasText(auth.adminToken) || hasText(auth.accessToken));
}

function tokenExpiryMs(value: string | number | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function secondsFromNow(seconds: unknown) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Date.now() + Math.max(value - 60, 1) * 1000;
}

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
  async testConnection(): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled", ["Connect Shopify in Studio onboarding or configure protected Shopify Admin credentials"]); }
  async fetchShopInfo(): Promise<CommerceResult<any>> { return disabled("shopify_admin_disabled", ["Shopify store domain", "Shopify Client ID/Secret or legacy Admin token"]); }
  async getCollections(): Promise<CommerceResult<any[]>> { return disabled("shopify_admin_disabled", ["Shopify Admin credentials with product/collection access"]); }
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
  private readonly auth: ShopifyAdminAuthConfig;
  private cachedToken: ShopifyResolvedToken | null;

  constructor(public domain: string, auth: ShopifyAdminAuthInput, private livePublishingEnabled: boolean, private fetcher: typeof fetch = fetch, private apiVersion = "2024-10") {
    super();
    this.auth = normalizeShopifyAuth(auth);
    this.cachedToken = this.auth.accessToken ? { token: this.auth.accessToken, expiresAtMs: tokenExpiryMs(this.auth.accessTokenExpiresAt) } : null;
    if (!domain || !hasShopifyAuth(this.auth)) throw new Error("Shopify Admin provider requires server-side domain and credentials");
  }

  private endpoint(path: string) {
    const cleanDomain = this.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${cleanDomain}/admin/api/${this.apiVersion}/${path.replace(/^\//, "")}`;
  }

  private oauthEndpoint() {
    const cleanDomain = this.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${cleanDomain}/admin/oauth/access_token`;
  }

  private headers(token: string) {
    return { "X-Shopify-Access-Token": token, "content-type": "application/json" };
  }

  private async resolveAccessToken(): Promise<CommerceResult<ShopifyResolvedToken>> {
    if (this.cachedToken && (!this.cachedToken.expiresAtMs || this.cachedToken.expiresAtMs > Date.now())) {
      return { ok: true, data: this.cachedToken };
    }
    if (hasText(this.auth.clientId) && hasText(this.auth.clientSecret)) {
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: String(this.auth.clientId),
        client_secret: String(this.auth.clientSecret)
      });
      const response = await this.fetcher(this.oauthEndpoint(), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: body.toString()
      });
      const data = await readJson(response);
      if (!response.ok) {
        const error = sanitizeProviderError(data?.error_description ?? data?.error ?? data?.message ?? `shopify_token_exchange_failed_${response.status}`);
        return { ok: false, error, retryable: response.status >= 500, rateLimited: response.status === 429, setupRequired: ["Valid Shopify Client ID", "Valid Shopify Client Secret", "Matching .myshopify.com store domain"] };
      }
      const token = String(data?.access_token ?? "");
      if (!token) return disabled("shopify_token_exchange_missing_access_token", ["Valid Shopify Client ID and Secret"]);
      this.cachedToken = { token, expiresAtMs: secondsFromNow(data?.expires_in) };
      return { ok: true, data: this.cachedToken };
    }
    if (hasText(this.auth.adminToken)) {
      this.cachedToken = { token: String(this.auth.adminToken), expiresAtMs: null };
      return { ok: true, data: this.cachedToken };
    }
    if (hasText(this.auth.accessToken)) {
      this.cachedToken = { token: String(this.auth.accessToken), expiresAtMs: tokenExpiryMs(this.auth.accessTokenExpiresAt) };
      return { ok: true, data: this.cachedToken };
    }
    return disabled("shopify_admin_credentials_missing", ["Shopify Client ID/Secret or legacy Admin token"]);
  }

  private async adminFetch<T>(path: string, init: RequestInit = {}): Promise<CommerceResult<T>> {
    const token = await this.resolveAccessToken();
    if (!token.ok) return token as CommerceResult<T>;
    const response = await this.fetcher(this.endpoint(path), {
      ...init,
      headers: { ...this.headers(token.data.token), ...(init.headers ?? {}) }
    });
    return resultFromResponse<T>(response, await readJson(response));
  }

  async testConnection() {
    return this.fetchShopInfo();
  }

  async fetchShopInfo() {
    return this.adminFetch<{ shop: Record<string, unknown> }>("shop.json", { method: "GET" });
  }

  async getCollections() {
    const [custom, smart] = await Promise.all([
      this.adminFetch<{ custom_collections?: Array<Record<string, unknown>> }>("custom_collections.json?limit=250", { method: "GET" }),
      this.adminFetch<{ smart_collections?: Array<Record<string, unknown>> }>("smart_collections.json?limit=250", { method: "GET" })
    ]);
    if (!custom.ok && !smart.ok) {
      return {
        ok: false as const,
        error: sanitizeProviderError(custom.error || smart.error || "shopify_collection_discovery_failed"),
        retryable: Boolean((custom as any).retryable || (smart as any).retryable),
        rateLimited: Boolean((custom as any).rateLimited || (smart as any).rateLimited),
        setupRequired: ["read_products/write_products Shopify Admin access"]
      };
    }
    const collections = [
      ...(custom.ok && Array.isArray(custom.data.custom_collections) ? custom.data.custom_collections.map((collection) => ({ ...collection, collection_type: "custom" })) : []),
      ...(smart.ok && Array.isArray(smart.data.smart_collections) ? smart.data.smart_collections.map((collection) => ({ ...collection, collection_type: "smart" })) : [])
    ].map((collection: any) => ({
      id: String(collection.id ?? ""),
      title: String(collection.title ?? "Shopify collection"),
      type: String(collection.collection_type ?? "collection")
    })).filter((collection) => collection.id);
    return { ok: true as const, data: collections };
  }

  async createProductDraft(product: any = {}) {
    const payload = { product: this.buildProductDraftPayload(product) };
    if (!payload.product.title || !payload.product.body_html) return disabled("listing_validation_required", ["title", "description"]);
    return this.adminFetch<{ product: Record<string, unknown> }>("products.json", { method: "POST", body: JSON.stringify(payload) });
  }

  async updateProduct(id = "", updates: any = {}) {
    if (!id) return disabled("shopify_product_id_required", ["shopify_product_id"]);
    const payload = { product: { id, ...this.buildProductDraftPayload(updates), status: updates.status ?? "draft" } };
    return this.adminFetch<{ product: Record<string, unknown> }>(`products/${encodeURIComponent(id)}.json`, { method: "PUT", body: JSON.stringify(payload) });
  }

  async uploadProductImage(productId = "", imageUrl = "", altText = "") {
    if (!productId || !imageUrl) return disabled("shopify_product_image_payload_incomplete", ["shopify_product_id", "image_url"]);
    return this.adminFetch<{ image: Record<string, unknown> }>(`products/${encodeURIComponent(productId)}/images.json`, {
      method: "POST",
      body: JSON.stringify({ image: { src: imageUrl, alt: altText || undefined } })
    });
  }

  async assignCollection(productId = "", collectionId = "") {
    if (!productId || !collectionId) return disabled("shopify_collection_assignment_incomplete", ["shopify_product_id", "shopify_collection_id"]);
    return this.adminFetch<{ collect: Record<string, unknown> }>("collects.json", {
      method: "POST",
      body: JSON.stringify({ collect: { product_id: productId, collection_id: collectionId } })
    });
  }

  async getProduct(id = "") {
    if (!id) return disabled("shopify_product_id_required", ["shopify_product_id"]);
    return this.adminFetch<{ product: Record<string, unknown> }>(`products/${encodeURIComponent(id)}.json`, { method: "GET" });
  }

  async publishProductGuarded(id = "", review?: PublishReview, actor = "") {
    if (!review) return disabled("publish_review_required");
    assertPublishAllowedForShopify(review);
    if (!actor) return disabled("audit_actor_required");
    if (!this.livePublishingEnabled) return { ok: true as const, data: { id, status: "draft", livePublishing: false } };
    return this.adminFetch(`products/${encodeURIComponent(id)}.json`, { method: "PUT", body: JSON.stringify({ product: { id, status: "active" } }) });
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

export type CommerceProviderOverrides = {
  admin?: ShopifyAdminProviderDisabled;
};

export const createCommerceProviders = (c: RuntimeConfig, fetcher?: typeof fetch, overrides: CommerceProviderOverrides = {}) => ({
  storefront: c.providers.shopifyStorefront.enabled ? new ShopifyStorefrontProviderLive(c.SHOPIFY_STORE_DOMAIN, c.SHOPIFY_STOREFRONT_TOKEN) : new ShopifyStorefrontProviderDisabled(),
  admin: overrides.admin ?? (c.providers.shopifyAdmin.enabled ? new ShopifyAdminProviderLive(c.SHOPIFY_STORE_DOMAIN, {
    credentialMode: c.SHOPIFY_CLIENT_ID && c.SHOPIFY_CLIENT_SECRET ? "dev_dashboard_client_credentials" : "legacy_admin_token",
    adminToken: c.SHOPIFY_ADMIN_TOKEN,
    clientId: c.SHOPIFY_CLIENT_ID,
    clientSecret: c.SHOPIFY_CLIENT_SECRET
  }, c.LIVE_PUBLISHING_ENABLED, fetcher) : new ShopifyAdminProviderDisabled()),
  printify: c.providers.printify.enabled ? new PrintifyProviderLive(c.PRINTIFY_API_TOKEN, c.PRINTIFY_SHOP_ID, fetcher) : new PrintifyProviderDisabled()
});

export const safeProductProjection = (p: any) => ({ id: p.id, handle: p.handle, title: p.title, description: p.description, images: p.images ?? [], variants: p.variants ?? [] });
export const structuredDataProductProjection = (p: any) => ({ "@context": "https://schema.org", "@type": "Product", name: p.title, description: p.description, brand: { "@type": "Brand", name: "Salty Cowhide Co." } });
