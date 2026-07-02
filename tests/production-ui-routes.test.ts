import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import StudioDashboard from "../apps/studio/app/studio/page";
import TrendsPage from "../apps/studio/app/studio/trends/page";
import BriefsPage from "../apps/studio/app/studio/briefs/page";
import AssetsPage from "../apps/studio/app/studio/assets/page";
import DraftsPage from "../apps/studio/app/studio/drafts/page";
import PublishPage from "../apps/studio/app/studio/publish/page";
import AnalyticsPage from "../apps/studio/app/studio/analytics/page";
import GeneratePage from "../apps/studio/app/studio/generate/page";
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

  it("Brief builder renders repository-backed workflow regions", async () => {
    const html = renderToStaticMarkup(await BriefsPage());
    expect(html).toContain("Repository-backed Brief Workflow");
    expect(html).toContain("Create Manual Brief");
    expect(html).toContain("Brief Records");
  });

  it("Assets page renders QA panel", async () => {
    const html = renderToStaticMarkup(await AssetsPage());
    expect(html).toContain("Asset QA");
    expect(html).toContain("Generated Art");
  });

  it("Assets page does not expose active summary-only QA actions", async () => {
    const html = renderToStaticMarkup(await AssetsPage());
    expect(html).toContain("View Full Report");
    expect(html).toContain("Approve Asset");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain("aria-disabled");
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

  it("Publish summary panel does not expose an active publish-looking action", async () => {
    const html = renderToStaticMarkup(await PublishPage());
    expect(html).not.toContain("Approve & Publish");
    expect(html).toContain("Use Review Workflow Below");
  });

  it("Analytics page renders provider status panels", async () => {
    const html = renderToStaticMarkup(await AnalyticsPage());
    expect(html).toContain("Google Analytics 4");
    expect(html).toContain("Google Search Console");
    expect(html).toContain("Analytics export is disabled until real provider data is imported.");
  });

  it("Generation queue routes users through approved briefs instead of a context-free submit button", async () => {
    const html = renderToStaticMarkup(await GeneratePage());
    expect(html).toContain("Send Approved Brief");
    expect(html).not.toContain("Submit Generation");
  });

  it("Integrations/AI readiness page renders score cards", async () => {
    const html = renderToStaticMarkup(await IntegrationsPage());
    expect(html).toContain("Overall AI Readiness Score");
    expect(html).toContain("AI Tools Configuration");
  });

  it("AI employees page renders employee cards", async () => {
    const html = renderToStaticMarkup(await AiEmployeesPage());
    expect(html).toContain("AI Migration Guide");
    expect(html).toContain("Drafts and recommendations only");
  });

  it("Storefront home renders hero and product sections", async () => {
    const html = renderToStaticMarkup(await StorefrontHome());
    expect(html).toContain("Where the sea meets the ranch");
    expect(html).toContain("New Arrivals");
  });

  it("Product detail page renders variant selectors and add-to-cart for available demo handle", async () => {
    const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ handle: "demo-product" }) }));
    expect(html).toContain("Checkout unavailable");
    expect(html).toContain("Color");
    expect(html).toContain("Size");
    expect(html).toContain("Variant selection is disabled until checkout is configured.");
  });
});
