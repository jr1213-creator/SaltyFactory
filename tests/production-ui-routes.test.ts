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
import AccountCenterPage from "../apps/studio/app/studio/account-center/page";
import CustomerCommandCenterPage from "../apps/studio/app/studio/customer-command-center/page";
import CustomersPage from "../apps/studio/app/studio/customers/page";
import CustomerSegmentsPage from "../apps/studio/app/studio/customer-segments/page";
import CustomerCapturePage from "../apps/studio/app/studio/customer-capture/page";
import CustomerInboxPage from "../apps/studio/app/studio/customer-inbox/page";
import CustomerCampaignsPage from "../apps/studio/app/studio/customer-campaigns/page";
import CustomerIntelligencePage from "../apps/studio/app/studio/customer-intelligence/page";
import CustomerSchedulingPage from "../apps/studio/app/studio/customer-scheduling/page";
import MarketingCommandCenterPage from "../apps/studio/app/studio/marketing-command-center/page";
import MarketingCampaignsPage from "../apps/studio/app/studio/marketing-campaigns/page";
import LaunchCampaignWorkflowPage from "../apps/studio/app/studio/marketing-command-center/launch-campaign/page";
import PinterestPinFactoryPage from "../apps/studio/app/studio/marketing/pinterest/page";
import SocialDraftQueuePage from "../apps/studio/app/studio/marketing/social/page";
import EmailDraftStudioPage from "../apps/studio/app/studio/marketing/email/page";
import AdsHubPage from "../apps/studio/app/studio/marketing/ads/page";
import GoogleAdsDraftStudioPage from "../apps/studio/app/studio/marketing/ads/google/page";
import MetaAdsDraftStudioPage from "../apps/studio/app/studio/marketing/ads/meta/page";
import SearchVisibilityPage from "../apps/studio/app/studio/marketing/search-visibility/page";
import CampaignAssetStudioPage from "../apps/studio/app/studio/marketing/assets/page";
import MarketingTrackingPage from "../apps/studio/app/studio/marketing/tracking/page";
import VoiceOfMarketResearchPage from "../apps/studio/app/studio/marketing/research/page";
import SocialCareOpportunitiesPage from "../apps/studio/app/studio/marketing/social-care/page";
import MarketingApprovalsPage from "../apps/studio/app/studio/marketing/approvals/page";
import MarketingSetupPage from "../apps/studio/app/studio/marketing/setup/page";
import VerticalPackSettingsPage from "../apps/studio/app/studio/settings/vertical-pack/page";
import LeadsPage from "../apps/studio/app/studio/leads/page";
import OpportunitiesPage from "../apps/studio/app/studio/opportunities/page";
import ServiceCasesPage from "../apps/studio/app/studio/service-cases/page";
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
    expect(source).toContain('label: "Customer"');
    expect(source).toContain('["Customer Command Center", "/studio/customer-command-center"]');
    expect(source).toContain('["Customer Intelligence", "/studio/customer-intelligence"]');
    expect(source).toContain('["Marketing Command Center", "/studio/marketing-command-center"]');
    expect(source).toContain('["Pinterest Pin Factory", "/studio/marketing/pinterest"]');
    expect(source).toContain('["Search Visibility", "/studio/marketing/search-visibility"]');
    expect(source).toContain('["Social Care", "/studio/marketing/social-care"]');
    expect(source).toContain('["Account Center", "/studio/account-center"]');
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
    expect(visibleStudioNavLinks({ pathname: "/studio", expandedIds: ["operations"] })).toEqual(["Account Center", "Business Profile", "Integrations", "Setup Guide", "Vertical Pack", "Settings", "Billing"]);
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
      "/studio/customer-command-center",
      "/studio/customers",
      "/studio/customer-segments",
      "/studio/customer-capture",
      "/studio/customer-inbox",
      "/studio/customer-campaigns",
      "/studio/customer-intelligence",
      "/studio/customer-scheduling",
      "/studio/marketing-command-center",
      "/studio/marketing-campaigns",
      "/studio/marketing/pinterest",
      "/studio/marketing/social",
      "/studio/marketing/email",
      "/studio/marketing/ads",
      "/studio/marketing/ads/google",
      "/studio/marketing/ads/meta",
      "/studio/marketing/search-visibility",
      "/studio/marketing/assets",
      "/studio/marketing/tracking",
      "/studio/marketing/research",
      "/studio/marketing/social-care",
      "/studio/marketing/setup",
      "/studio/products",
      "/studio/integrations",
      "/studio/drafts",
      "/studio/social-planner",
      "/studio/channels",
      "/studio/trends",
      "/studio/baseline",
      "/studio/account-center",
      "/studio/settings/business-profile",
      "/studio/migration-guide",
      "/studio/settings/vertical-pack",
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
    expect(html).toContain("Salty Cowhide AI POD Business Command Center");
    expect(html).toContain("Product ideas");
    expect(html).toContain("Approved for publish");
    expect(html).toContain("Active AI employees");
    expect(html).toContain("Generate or approve trend report");
    expect(html).toContain("Approval queue");
  });

  it("Account Center renders production launch readiness without fake provider success", async () => {
    const html = renderToStaticMarkup(await AccountCenterPage());
    expect(html).toContain("Salty Cowhide Launch Command Center");
    expect(html).toContain("Printify Fulfillment");
    expect(html).toContain("Create or open Printify account");
    expect(html).toContain("Discover Printify shops");
    expect(html).toContain("Shopify Store");
    expect(html).toContain("Create or open Shopify store");
    expect(html).toContain("Domain &amp; DNS");
    expect(html).toContain("Email Domain Readiness");
    expect(html).toContain("Merchant Product Feed");
    expect(html).toContain("Approval Queue");
    expect(html).toContain("Product creation blockers");
    expect(html).not.toMatch(/access_token|refresh_token|client_secret|postgres:\/\/|shpat_|sk_live_/i);
    expect(html).not.toContain("fake");
  });

  it("Customer Command Center renders premium empty states without fake data", async () => {
    const html = renderToStaticMarkup(await CustomerCommandCenterPage());
    expect(html).toContain("Customer Command Center");
    expect(html).toContain("Connect Shopify, import customers, or turn on capture widgets");
    expect(html).toContain("Today&#x27;s Customer Actions");
    expect(html).toContain("Customer Capture Readiness");
    expect(html).toContain("Segments &amp; Audiences");
    expect(html).toContain("No fake intent scoring");
    expect(html).toContain("No live email sending is implemented");
    expect(html).not.toMatch(/access_token|refresh_token|client_secret|DATABASE_URL|shpat_|printify_/i);
  });

  it("Customer success pages render honest foundation states", async () => {
    const customersHtml = renderToStaticMarkup(await CustomersPage());
    const segmentsHtml = renderToStaticMarkup(await CustomerSegmentsPage());
    const captureHtml = renderToStaticMarkup(await CustomerCapturePage());
    const inboxHtml = renderToStaticMarkup(await CustomerInboxPage());
    const campaignsHtml = renderToStaticMarkup(await CustomerCampaignsPage());
    const intelligenceHtml = renderToStaticMarkup(await CustomerIntelligencePage());
    const schedulingHtml = renderToStaticMarkup(await CustomerSchedulingPage());
    const leadsHtml = renderToStaticMarkup(await LeadsPage());
    const opportunitiesHtml = renderToStaticMarkup(await OpportunitiesPage());
    const serviceCasesHtml = renderToStaticMarkup(await ServiceCasesPage());

    expect(customersHtml).toContain("No customers yet");
    expect(segmentsHtml).toContain("Abandoned Cart Candidates");
    expect(segmentsHtml).toContain("Needs Shopify/cart event data");
    expect(captureHtml).toContain("Embed code generation is a future integration");
    expect(inboxHtml).toContain("Website chat");
    expect(inboxHtml).toContain("not configured");
    expect(campaignsHtml).toContain("No live emails are sent");
    expect(campaignsHtml).toContain("disabled");
    expect(intelligenceHtml).toContain("Website/customer behavior tracking is not configured yet");
    expect(intelligenceHtml).toContain("No fake analytics");
    expect(schedulingHtml).toContain("Calendar sync is not configured");
    expect(leadsHtml).toContain("Manual/imported only");
    expect(opportunitiesHtml).toContain("No fake revenue");
    expect(serviceCasesHtml).toContain("No fake support data");
  });

  it("Customer success pages surface saved CRM records instead of hardcoded empty states", () => {
    const captureSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/customer-capture/forms/page.tsx"), "utf8");
    const campaignsSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/customer-campaigns/page.tsx"), "utf8");
    const opportunitiesSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/opportunities/page.tsx"), "utf8");
    const serviceCasesSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/service-cases/page.tsx"), "utf8");
    const schedulingSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/customer-scheduling/page.tsx"), "utf8");
    const dataSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/customer-command-center/data.ts"), "utf8");

    expect(dataSource).toContain("repos.crm.opportunities.listByWorkspace");
    expect(dataSource).toContain("repos.crm.serviceCases.listByWorkspace");
    expect(dataSource).toContain("repos.crm.bookingRequests.listByWorkspace");
    expect(captureSource).toContain("data.forms.length ? data.forms : data.defaultCaptureForms");
    expect(campaignsSource).toContain("Saved Campaign Drafts");
    expect(opportunitiesSource).toContain("data.opportunities");
    expect(opportunitiesSource).not.toContain('MetricCard title="Opportunities" value="0"');
    expect(serviceCasesSource).toContain("data.serviceCases");
    expect(serviceCasesSource).not.toContain('MetricCard title="Cases" value="0"');
    expect(schedulingSource).toContain("data.bookingRequests.length");
  });

  it("Marketing Command Center pages render manual/export-ready workflows without live execution claims", async () => {
    const commandHtml = renderToStaticMarkup(await MarketingCommandCenterPage());
    const campaignsHtml = renderToStaticMarkup(await MarketingCampaignsPage());
    const launchHtml = renderToStaticMarkup(await LaunchCampaignWorkflowPage());
    const pinterestHtml = renderToStaticMarkup(await PinterestPinFactoryPage());
    const socialHtml = renderToStaticMarkup(await SocialDraftQueuePage());
    const emailHtml = renderToStaticMarkup(await EmailDraftStudioPage());
    const adsHtml = renderToStaticMarkup(await AdsHubPage());
    const googleHtml = renderToStaticMarkup(await GoogleAdsDraftStudioPage());
    const metaHtml = renderToStaticMarkup(await MetaAdsDraftStudioPage());
    const searchHtml = renderToStaticMarkup(await SearchVisibilityPage());
    const assetsHtml = renderToStaticMarkup(await CampaignAssetStudioPage());
    const trackingHtml = renderToStaticMarkup(await MarketingTrackingPage());
    const researchHtml = renderToStaticMarkup(await VoiceOfMarketResearchPage());
    const socialCareHtml = renderToStaticMarkup(await SocialCareOpportunitiesPage());
    const approvalsHtml = renderToStaticMarkup(await MarketingApprovalsPage());
    const setupHtml = renderToStaticMarkup(await MarketingSetupPage());
    const verticalHtml = renderToStaticMarkup(await VerticalPackSettingsPage());
    const combined = [commandHtml, campaignsHtml, launchHtml, pinterestHtml, socialHtml, emailHtml, adsHtml, googleHtml, metaHtml, searchHtml, assetsHtml, trackingHtml, researchHtml, socialCareHtml, approvalsHtml, setupHtml, verticalHtml].join("\n");

    expect(commandHtml).toContain("Marketing Command Center");
    expect(commandHtml).toContain("manual/export-ready");
    expect(launchHtml).toContain("Generate Campaign Packet");
    expect(pinterestHtml).toContain("No Pinterest API publishing");
    expect(socialHtml).toContain("No live social posting");
    expect(emailHtml).toContain("No email provider sending");
    expect(adsHtml).toContain("No ad APIs or spend");
    expect(googleHtml).toContain("No Google Ads API calls");
    expect(metaHtml).toContain("No Meta API calls");
    expect(searchHtml).toContain("No ranking or AI-visibility guarantees");
    expect(assetsHtml).toContain("No generated creative claimed");
    expect(trackingHtml).toContain("No fake campaign performance");
    expect(researchHtml).toContain("No scraping");
    expect(socialCareHtml).toContain("No live social inbox is connected");
    expect(socialCareHtml).toContain("Save Opportunity");
    expect(approvalsHtml).toContain("Approval does not publish");
    expect(setupHtml).toContain("Seed Vertical Packs");
    expect(verticalHtml).toContain("Vertical Pack");
    expect(combined).not.toMatch(/access_token|refresh_token|client_secret|DATABASE_URL|shpat_|printify_/i);
  });

  it("Marketing routes are backed by shared-kernel repositories, not static placeholder-only pages", () => {
    const dataSource = readFileSync(join(process.cwd(), "apps/studio/app/studio/marketing-command-center/data.ts"), "utf8");
    const workflowRoute = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/marketing/launch-campaign/route.ts"), "utf8");
    const utmRoute = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/marketing/utm-links/route.ts"), "utf8");
    const searchRoute = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/marketing/search-visibility/audit/route.ts"), "utf8");
    const socialCareRoute = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/marketing/social-care/route.ts"), "utf8");

    expect(dataSource).toContain("repos.shared.campaigns.listByWorkspace");
    expect(dataSource).toContain("repos.shared.campaignChannels.listByWorkspace");
    expect(dataSource).toContain("repos.shared.exportPackages.listByWorkspace");
    expect(workflowRoute).toContain("requireDraftMutationPermission");
    expect(workflowRoute).toContain("buildCampaignProofPackContent");
    expect(workflowRoute).toContain("buildNoAdGrowthPlanContent");
    expect(workflowRoute).toContain("buildReadinessScore");
    expect(workflowRoute).toContain("const thesis =");
    expect(workflowRoute).toContain("audience,");
    expect(workflowRoute).toContain("offer,");
    expect(workflowRoute).toContain("landingUrl,");
    expect(utmRoute).toContain("buildUtmUrl");
    expect(searchRoute).toContain("No ranking guarantees.");
    expect(socialCareRoute).toContain("repos.shared.sourceRecords.create");
    expect(socialCareRoute).toContain("repos.shared.notes.create");
    expect(socialCareRoute).toContain("repos.shared.tasks.create");
    expect(socialCareRoute).toContain("social_care_opportunity_created");
    expect(workflowRoute).not.toMatch(/googleads\.googleapis\.com|graph\.facebook\.com|sendgrid|mailgun|pinterest\.com\/v5/i);
    expect(socialCareRoute).not.toMatch(/graph\.facebook\.com|pinterest\.com\/v5|tiktokapis|sendgrid|mailgun/i);
  });

  it("Trends page renders filters and queue sections", async () => {
    const html = renderToStaticMarkup(await TrendsPage());
    expect(html).toContain("Trend Intelligence");
    expect(html).toContain("Trend Report Workflow");
    expect(html).toContain("Review backlog");
    expect(html).toContain("Trend Research Analyst");
    expect(html).toContain("will not invent trend data");
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
    expect(html).toContain("Run AI Employees");
    expect(html).toContain("Approval Queue");
    expect(html).toContain("AI Work Queue");
    expect(html).toContain("Trend Research Analyst");
    expect(html).toContain("POD Product Builder Assistant");
    expect(html).toContain("Pricing &amp; Margin Assistant");
    expect(html).toContain("Drafts and recommendations only");
    expect(html).not.toContain("Run Deterministic Worker");
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
