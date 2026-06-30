import { describe, expect, it } from "vitest";
import { ShopifyAdminProviderLive } from "@saltyfactory/commerce";
import { validDomainFixtures } from "./helpers";

describe("publish live guard", () => {
  it("live publishing false creates only Shopify draft status", async () => {
    const provider = new ShopifyAdminProviderLive("shop.example", "server-token", false);
    await expect(provider.publishProductGuarded("shopify_1", validDomainFixtures.publishReview, "user_01")).resolves.toMatchObject({ ok: true, data: { status: "draft" } });
  });

  it("publish actions require an audit actor", async () => {
    const provider = new ShopifyAdminProviderLive("shop.example", "server-token", false);
    await expect(provider.publishProductGuarded("shopify_1", validDomainFixtures.publishReview, "")).resolves.toMatchObject({ ok: false, error: "audit_actor_required" });
  });
});
