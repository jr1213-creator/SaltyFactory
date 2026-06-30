import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import StudioDashboard from "../apps/studio/app/studio/page";
import TrendsPage from "../apps/studio/app/studio/trends/page";
import BriefsPage from "../apps/studio/app/studio/briefs/page";
import AssetsPage from "../apps/studio/app/studio/assets/page";
import DraftsPage from "../apps/studio/app/studio/drafts/page";
import PublishPage from "../apps/studio/app/studio/publish/page";
import AnalyticsPage from "../apps/studio/app/studio/analytics/page";
import IntegrationsPage from "../apps/studio/app/studio/integrations/page";
import AiEmployeesPage from "../apps/studio/app/studio/ai-employees/page";
import StorefrontHome from "../apps/storefront/app/page";
import ProductPage from "../apps/storefront/app/products/[handle]/page";

describe("production UI routes", () => {
  it("Dashboard page renders key cards", async () => {
    const html = renderToStaticMarkup(await StudioDashboard());
    expect(html).toContain("Designs in pipeline");
    expect(html).toContain("Approved for publish");
    expect(html).toContain("Active AI employees");
  });

  it("Trends page renders filters and queue sections", async () => {
    const html = renderToStaticMarkup(await TrendsPage());
    expect(html).toContain("Trend Intelligence");
    expect(html).toContain("Review backlog");
    expect(html).toContain("AI Trend Analyst");
  });

  it("Brief builder renders form and live preview regions", async () => {
    const html = renderToStaticMarkup(await BriefsPage());
    expect(html).toContain("Brief Essentials");
    expect(html).toContain("AI Brief Pack");
    expect(html).toContain("Live Preview");
  });

  it("Assets page renders QA panel", async () => {
    const html = renderToStaticMarkup(await AssetsPage());
    expect(html).toContain("Asset QA");
    expect(html).toContain("Generated Art");
  });

  it("Product draft editor renders validation sections", async () => {
    const html = renderToStaticMarkup(await DraftsPage());
    expect(html).toContain("Product Draft Editor");
    expect(html).toContain("Validation Checks");
  });

  it("Publish review page renders gate checklist", async () => {
    const html = renderToStaticMarkup(await PublishPage());
    expect(html).toContain("Publish Review");
    expect(html).toContain("Automation cannot publish without human approval");
  });

  it("Analytics page renders provider status panels", () => {
    const html = renderToStaticMarkup(AnalyticsPage());
    expect(html).toContain("Google Analytics 4");
    expect(html).toContain("Google Search Console");
  });

  it("Integrations/AI readiness page renders score cards", () => {
    const html = renderToStaticMarkup(IntegrationsPage());
    expect(html).toContain("Overall AI Readiness Score");
    expect(html).toContain("AI Tools Configuration");
  });

  it("AI employees page renders employee cards", () => {
    const html = renderToStaticMarkup(AiEmployeesPage());
    expect(html).toContain("Trend Analyst");
    expect(html).toContain("No autonomous publish permissions");
  });

  it("Storefront home renders hero and product sections", async () => {
    const html = renderToStaticMarkup(await StorefrontHome());
    expect(html).toContain("Where the sea meets the ranch");
    expect(html).toContain("New Arrivals");
  });

  it("Product detail page renders variant selectors and add-to-cart for available demo handle", async () => {
    const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ handle: "demo-product" }) }));
    expect(html).toContain("Add to Cart");
    expect(html).toContain("Color");
    expect(html).toContain("Size");
  });
});
