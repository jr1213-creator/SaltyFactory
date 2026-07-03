import { describe, expect, it } from "vitest";
import { ShopifyAdminProviderLive } from "@saltyfactory/commerce";
import { validDomainFixtures } from "./helpers";

describe("publish live guard", () => {
  it("live publishing false creates only Shopify draft status", async () => {
    const provider = new ShopifyAdminProviderLive("shop.example", "server-token", false);
    await expect(provider.publishProductGuarded("shopify_1", validDomainFixtures.publishReview, "user_01")).resolves.toMatchObject({ ok: true, data: { status: "draft" } });
  });

  it("generated-token credential mode still stays draft-only when live publishing is disabled", async () => {
    const provider = new ShopifyAdminProviderLive("saltycowhide.myshopify.com", {
      credentialMode: "dev_dashboard_client_credentials",
      clientId: "client_1234",
      clientSecret: "client_secret_1234"
    }, false);
    await expect(provider.publishProductGuarded("shopify_1", validDomainFixtures.publishReview, "user_01")).resolves.toMatchObject({ ok: true, data: { status: "draft", livePublishing: false } });
  });

  it("publish actions require an audit actor", async () => {
    const provider = new ShopifyAdminProviderLive("shop.example", "server-token", false);
    await expect(provider.publishProductGuarded("shopify_1", validDomainFixtures.publishReview, "")).resolves.toMatchObject({ ok: false, error: "audit_actor_required" });
  });
});
