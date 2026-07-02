import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import BusinessProfilePage from "../apps/studio/app/studio/settings/business-profile/page";
import SettingsSetupPage from "../apps/studio/app/studio/settings/setup/page";
import PodBuilderPage from "../apps/studio/app/studio/pod-migration/page";
import SetupGuidePage from "../apps/studio/app/studio/migration-guide/page";
import BaselineImpactPage from "../apps/studio/app/studio/baseline/page";
import AccessoryDropshippingPage from "../apps/studio/app/studio/dropshipping/page";
import PricingPage from "../apps/studio/app/studio/pricing/page";
import StorefrontHome from "../apps/storefront/app/page";
import ProductPage from "../apps/storefront/app/products/[handle]/page";
import {
  STUDIO_NAV_SECTIONS,
  activeStudioNavSectionIds,
  parseStoredStudioNavSections,
  resolveExpandedStudioNavSections,
  visibleStudioNavLinks
} from "../apps/studio/app/studio/StudioNavigation";

describe("production UI routes", () => {
  it("Studio navigation is grouped around the POD launch workflow", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(source).toContain('label: "POD Studio"');
    expect(source).toContain('["Product Builder", "/studio/pod-migration"]');
    expect(source).toContain('["Pricing & Margins", "/studio/pricing"]');
    expect(source).toContain('label: "Expansion"');
    expect(source).toContain('["Accessory Dropshipping", "/studio/dropshipping"]');
    expect(source).not.toContain('"POD Migration"');
    expect(source).not.toContain('"Migration Guide"');
  });

  it("Studio navigation sections default collapsed and active sections auto-expand", () => {
    expect(resolveExpandedStudioNavSections({ pathname: "/studio", storedValue: null })).toEqual([]);
    expect(activeStudioNavSectionIds("/studio/pod-migration")).toEqual(["pod-studio"]);
    expect(resolveExpandedStudioNavSections({ pathname: "/studio/pod-migration", storedValue: null })).toEqual(["pod-studio"]);
    expect(visibleStudioNavLinks({ pathname: "/studio", expandedIds: [] })).not.toContain("Product Builder");
    expect(visibleStudioNavLinks({ pathname: "/studio/pod-migration", expandedIds: [] })).toContain("Product Builder");
  });

  it("Studio navigation respects persisted localStorage state and exposes accordion accessibility attributes", () => {
    expect(parseStoredStudioNavSections(JSON.stringify(["operations", "bad-id"]))).toEqual(["operations"]);
    expect(resolveExpandedStudioNavSections({ pathname: "/studio/channels", storedValue: JSON.stringify(["operations"]) }).sort()).toEqual(["marketing", "operations"]);
    expect(visibleStudioNavLinks({ pathname: "/studio", expandedIds: ["operations"] })).toEqual(["Business Profile", "Integrations", "Setup Guide", "Settings", "Billing"]);
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(source).toContain("aria-expanded");
    expect(source).toContain("aria-controls");
    expect(source).toContain("STUDIO_NAV_STORAGE_KEY");
  });

  it("Studio navigation primary links point at existing Studio routes", () => {
    const routeFiles = new Set([
      "/studio",
      "/studio/pod-migration",
      "/studio/designs",
      "/studio/assets",
      "/studio/mockups",
      "/studio/listing-drafts",
      "/studio/pricing",
      "/studio/publish",
      "/studio/ai-employees",
      "/studio/products",
      "/studio/integrations",
      "/studio/drafts",
      "/studio/social-planner",
      "/studio/channels",
      "/studio/trends",
      "/studio/baseline",
      "/studio/settings/business-profile",
      "/studio/migration-guide",
      "/studio/settings",
      "/studio/billing",
      "/studio/dropshipping"
    ]);
    for (const section of STUDIO_NAV_SECTIONS) {
      for (const [, href] of section.links) expect(routeFiles.has(href)).toBe(true);
    }
  });

  it("Dashboard page renders key cards", async () => {
    const html = renderToStaticMarkup(await StudioDashboard());
    expect(html).toContain("Salty Cowhide POD Launch Command Center");
    expect(html).toContain("Product ideas");
    expect(html).toContain("Approved for publish");
    expect(html).toContain("Active AI employees");
    expect(html).toContain("Create first product idea");
  });

  it("Trends page renders filters and queue sections", async () => {
    const html = renderToStaticMarkup(await TrendsPage());
    expect(html).toContain("Trend Intelligence");
    expect(html).toContain("Review backlog");
    expect(html).toContain("AI Trend Analyst");
  });

  it("Brief builder renders saved workflow regions", async () => {
    const html = renderToStaticMarkup(await BriefsPage());
    expect(html).toContain("Saved Brief Workflow");
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
    expect(html).toContain("Auto-detect Google setup");
    expect(html).toContain("optional for online-only Salty Cowhide POD launch readiness");
    expect(html).toContain("Create Google setup for SaltyCowhide.com");
    expect(html).toContain("Create GA4 setup for SaltyCowhide.com");
    expect(html).toContain("Add SaltyCowhide.com to Search Console");
    expect(html).toContain("Set up Merchant Center for SaltyCowhide.com");
    expect(html).toContain("Check Business Profile eligibility");
    expect(readFileSync(join(process.cwd(), "apps/studio/app/studio/integrations/IntegrationActionsClient.tsx"), "utf8")).toContain("This property does not appear to match Salty Cowhide");
  });

  it("AI employees page renders employee cards", async () => {
    const html = renderToStaticMarkup(await AiEmployeesPage());
    expect(html).toContain("POD Product Builder Assistant");
    expect(html).toContain("Pricing &amp; Margin Assistant");
    expect(html).toContain("Drafts and recommendations only");
  });

  it("POD Product Builder page uses product launch terminology", async () => {
    const html = renderToStaticMarkup(await PodBuilderPage());
    expect(html).toContain("POD Product Builder");
    expect(html).toContain("Create Product Idea");
    expect(html).toContain("Product ideas");
    expect(html).not.toContain("Add Migration Candidate");
  });

  it("Setup Guide and Baseline pages use launch-focused labels", async () => {
    const setupHtml = renderToStaticMarkup(await SetupGuidePage());
    const baselineHtml = renderToStaticMarkup(await BaselineImpactPage());
    const settingsSetupHtml = renderToStaticMarkup(await SettingsSetupPage());
    expect(setupHtml).toContain("Setup Guide");
    expect(setupHtml).not.toContain("AI Migration Guide");
    expect(baselineHtml).toContain("Baseline &amp; Impact");
    expect(baselineHtml).not.toContain("Baseline + Impact");
    expect(settingsSetupHtml).toContain("Auto-detect Google setup");
    expect(settingsSetupHtml).toContain("Optional for online-only Salty Cowhide POD launch");
    expect(settingsSetupHtml).toContain("Merchant Center");
    expect(settingsSetupHtml).toContain("product feeds remain disabled until approval gates pass");
  });

  it("Expansion and pricing pages render POD workflow labels", async () => {
    const dropshippingHtml = renderToStaticMarkup(await AccessoryDropshippingPage());
    const pricingHtml = renderToStaticMarkup(await PricingPage());
    expect(dropshippingHtml).toContain("Accessory Dropshipping");
    expect(dropshippingHtml).toContain("Add Accessory Product Idea");
    expect(pricingHtml).toContain("Pricing &amp; Margins");
    expect(pricingHtml).toContain("Calculate Margin");
  });

  it("Business Profile page renders without schema warning when scoped repository is available", async () => {
    const html = renderToStaticMarkup(await BusinessProfilePage());
    expect(html).toContain("Business Profile");
    expect(html).toContain("Save Business Profile");
    expect(html).not.toContain("Database schema incomplete");
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
