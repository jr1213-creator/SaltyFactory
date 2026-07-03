import { describe, expect, it, vi } from "vitest";
import { createFreeImageProvider, createFreeTextProvider } from "@saltyfactory/ai-free";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";

describe("provider guardrails", () => {
  it("disabled providers make no network calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const cfg = parseEnv({ NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com" });
    await createFreeTextProvider(cfg).generatePhrases("brief", 1);
    await createFreeImageProvider(cfg).generateImage("prompt", "negative", {});
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("providers require explicit flag and token", () => {
    const cfg = parseEnv({ AI_IMAGE_ENABLED: "true", NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com" });
    expect(cfg.providers.aiImage.enabled).toBe(false);
    expect(cfg.providers.aiImage.reason).toBe("missing_required_config");
  });

  it("commerce providers stay disabled without server tokens", async () => {
    const providers = createCommerceProviders(parseEnv({ SHOPIFY_ADMIN_ENABLED: "true", PRINTIFY_ENABLED: "true", NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com" }));
    expect(await providers.admin.createProductDraft({})).toMatchObject({ ok: false, error: "shopify_admin_disabled" });
    expect(await providers.printify.createProduct({})).toMatchObject({ ok: false, error: "printify_disabled" });
  });

  it("Shopify Admin can be configured with server-side Client ID and Client Secret", () => {
    const cfg = parseEnv({
      SHOPIFY_ADMIN_ENABLED: "true",
      SHOPIFY_STORE_DOMAIN: "saltycowhide.myshopify.com",
      SHOPIFY_CLIENT_ID: "client_1234",
      SHOPIFY_CLIENT_SECRET: "client_secret_1234",
      NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com"
    });
    expect(cfg.providers.shopifyAdmin.enabled).toBe(true);
  });
});
