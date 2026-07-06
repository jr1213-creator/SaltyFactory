import { afterEach, describe, expect, it, vi } from "vitest";
import { readStorefrontProducts, syncStorefrontProductsFromShopify } from "@saltyfactory/ai-free";
import { createCustomerDesignRepos, customerDesignWorkspaceId, seedStorefrontProduct } from "./customer-design-test-helpers";

type StorefrontProduct = { title: string; handle: string };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("customer design custom storefront", () => {
  it("renders product listing data from Shopify read/cache fixtures without Admin token exposure", async () => {
    const repos = createCustomerDesignRepos();
    await seedStorefrontProduct(repos);
    vi.stubEnv("SHOPIFY_ADMIN_TOKEN", "shpat_secret_admin_token_should_not_render");

    const result = await readStorefrontProducts({ repos, workspaceId: customerDesignWorkspaceId });

    const products = result.products as StorefrontProduct[];
    expect(products).toHaveLength(1);
    expect(products[0]!.title).toBe("Redfish Trip Shirt");
    expect(JSON.stringify(result)).not.toContain("shpat_secret_admin_token_should_not_render");
  });

  it("syncs Shopify Storefront/read product data into cache and fails gracefully when config is missing", async () => {
    const repos = createCustomerDesignRepos();
    const synced = await syncStorefrontProductsFromShopify({
      repos,
      workspaceId: customerDesignWorkspaceId,
      products: [{
        id: "gid://shopify/Product/2",
        handle: "snook-charter-tee",
        title: "Snook Charter Tee",
        description: "Read-only Shopify product data.",
        tags: ["snook", "charter"],
        images: [],
        variants: [],
        price_min: "32.00",
        price_max: "32.00",
        currency: "USD",
        available_for_sale: true
      }]
    });
    expect(synced.ok).toBe(true);

    const products = await readStorefrontProducts({ repos, workspaceId: customerDesignWorkspaceId });
    expect((products.products as StorefrontProduct[]).map((product) => product.handle)).toContain("snook-charter-tee");

    const emptyRepos = createCustomerDesignRepos();
    const missing = await readStorefrontProducts({ repos: emptyRepos, workspaceId: customerDesignWorkspaceId });
    expect(missing.products).toEqual([]);
    expect(missing.source).toBe("not_configured");
  });

  it("requires an explicit storefront workspace in production while allowing dev/test fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("STOREFRONT_WORKSPACE_ID", "");
    const { getProducts } = await import("../apps/storefront/src/data");
    await expect(getProducts()).resolves.toEqual([]);

    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    await expect(getProducts()).resolves.toBeDefined();
  });
});
