import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PurchasePage from "../apps/storefront/app/store/custom/purchase/[handle]/page";

describe("customer design storefront UI", () => {
  it("exposes the custom concierge UI without client-side Admin token usage", async () => {
    const component = await readFile("apps/storefront/app/store/custom/CustomerDesignConcierge.tsx", "utf8");
    const page = await readFile("apps/storefront/app/store/page.tsx", "utf8");

    expect(component).toContain("/api/store/customer-design/message");
    expect(component).toContain("/api/store/customer-design/publish/request");
    expect(component).toContain("Approve for private purchase link");
    expect(page).toContain("CustomerDesignConcierge");
    expect(component).not.toContain("SHOPIFY_ADMIN_TOKEN");
    expect(component).not.toContain("SHOPIFY_STOREFRONT_TOKEN");
    expect(component).not.toContain("localStorage");
    expect(component).not.toContain("sessionToken=");
  });

  it("does not reveal customer-specific purchase details without an access token", async () => {
    const html = renderToStaticMarkup(await PurchasePage({
      params: Promise.resolve({ handle: "custom-private" }),
      searchParams: Promise.resolve({})
    }));
    expect(html).toContain("Access required");
    expect(html).toContain("No customer-specific product details");
  });
});
