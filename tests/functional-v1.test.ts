import { describe, expect, it } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import {
  buildMigrationRecommendations,
  calculatePricing,
  channelSchema,
  compareBaseline,
  createAgenticApprovalQueue,
  createBaselineMetrics,
  createDesignConceptDraft,
  createImageGenerationPlan,
  createProductIdeasFromTrendReport,
  createSocialDraft,
  createTrendReportDraft,
  deriveNextBestActions,
  evaluateDropshipCandidate,
  evaluatePodCandidate,
  exportListingDraft,
  runAgenticPodWorkflow,
  scoreBusinessProfile,
  scoreChannelCompleteness,
  validateEmployeeConfiguration,
  validateGoogleConfiguration,
  validateListingDraft
} from "@saltyfactory/domain";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { createFreeTextProvider, detectPromptSafetyIssues } from "@saltyfactory/ai-free";
import { createStorageProvider, storageStatusFromConfig } from "@saltyfactory/storage";

const workspaceId = "wks_default";
const actorId = "usr_owner";

describe("functional complete v1 domain rules", () => {
  it("validates and scores business profile persistence inputs", async () => {
    const repos = createMemoryRepositories();
    const readiness = scoreBusinessProfile({ businessName: "Salty", publicBrandName: "Salty Cowhide", businessType: "hybrid", fulfillmentModel: "hybrid", supportEmail: "owner@example.com", targetCustomer: "coastal western shoppers", brandVoice: "warm", primaryOffer: "POD gifts", returnsPolicyNotes: "Returns accepted." });
    const row = await repos.businessProfileV1.create({ id: "bizprof_1", workspace_id: workspaceId, business_name: "Salty", public_brand_name: "Salty Cowhide", readiness_score: readiness.score, readiness_blockers: readiness.blockers, profile_json: {}, status: readiness.status, created_by: actorId });
    expect(row.workspace_id).toBe(workspaceId);
    expect(readiness.score).toBeLessThan(100);
    expect(readiness.blockers).toContain("Add at least one brand color.");
  });

  it("saves and reloads a Business Profile record", async () => {
    const repos = createMemoryRepositories();
    await repos.businessProfileV1.create({
      id: "bizprof_reload",
      workspace_id: workspaceId,
      business_name: "Salty Factory",
      public_brand_name: "Salty Cowhide",
      business_type: "hybrid",
      fulfillment_model: "POD",
      profile_json: { businessName: "Salty Factory", publicBrandName: "Salty Cowhide" },
      status: "draft",
      created_by: actorId
    });
    await repos.businessProfileV1.update("bizprof_reload", {
      public_brand_name: "Salty Cowhide Studio",
      profile_json: { businessName: "Salty Factory", publicBrandName: "Salty Cowhide Studio" },
      updated_by: actorId
    });

    const [saved] = await repos.businessProfileV1.listByWorkspace(workspaceId);
    if (!saved) throw new Error("Business Profile record was not persisted");
    expect(saved.public_brand_name).toBe("Salty Cowhide Studio");
    expect((saved.profile_json as any).publicBrandName).toBe("Salty Cowhide Studio");
  });

  it("validates channel URLs, custom channels, and completeness", () => {
    expect(() => channelSchema.parse({ channelType: "instagram", displayName: "IG", url: "javascript:bad" })).toThrow();
    const score = scoreChannelCompleteness([{ channelType: "shopify", status: "configured" }, { channelType: "custom", displayName: "Pop-up", status: "configured" }]);
    expect(score.configuredCount).toBe(2);
    expect(score.missingHighPriority).toContain("instagram");
  });

  it("creates rules-based migration recommendations without fake AI labeling", () => {
    const plan = buildMigrationRecommendations({ businessProfileReady: false, channelScore: 20, googleConnected: false, baselineExists: false, podCandidates: 0, aiProviderConfigured: false });
    expect(plan.sourceLabel).toBe("rules_based");
    expect(plan.approvalRules.spendMoney).toBe("forbidden");
    expect(plan.recommendations[0]?.href).toBe("/studio/settings/business-profile");
  });

  it("rejects forbidden AI employee actions and enforces setup blockers", () => {
    const result = validateEmployeeConfiguration({ employeeKey: "social_content_assistant", requestedActions: ["create_social_draft", "spend_money"], availableDataSources: [] });
    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("Forbidden action rejected");
    expect(result.blockers.join(" ")).toContain("Required data source missing");
  });

  it("captures baseline metrics and reports insufficient provider data honestly", () => {
    const baseline = createBaselineMetrics({ workspaceMetrics: [], businessProfileScore: 80, channelScore: 40, counts: { product_count: 2 } });
    expect(baseline.status).toBe("insufficient_data");
    expect(baseline.insufficientData).toEqual(expect.arrayContaining(["GA4 metrics not imported.", "Search Console metrics not imported.", "Google Business Profile metrics not imported."]));
    expect(compareBaseline({ product_count: 1 }, { product_count: 3 }).product_count).toMatchObject({ delta: 2 });
  });

  it("evaluates POD and dropshipping candidates without live sync claims", () => {
    const pod = evaluatePodCandidate({ designFileStatus: "ready", targetProductTypes: ["t-shirt"], safetyFlags: [], pricing: { salePrice: 30, baseProductCost: 10, shippingCost: 4 }, listingReady: true, mockupsApproved: true, ownerApproved: false });
    expect(pod.blockers).toContain("owner_approval_required");
    const dropship = evaluateDropshipCandidate({ supplierUrl: "https://supplier.example/item", salePrice: 20, supplierCost: 15, shippingCost: 3, deliveryEstimateDays: 21, brandFitScore: 50 });
    expect(dropship.flags).toEqual(expect.arrayContaining(["long_shipping_time", "brand_mismatch"]));
  });

  it("calculates margin edge cases", () => {
    const pricing = calculatePricing({ salePrice: 35, baseProductCost: 12, shippingCost: 5, platformFeePercent: 6.5, paymentFeePercent: 3, fixedTransactionFee: 0.3, minimumMarginPercent: 35 });
    expect(pricing.estimatedNetProfit).toBeGreaterThan(0);
    expect(pricing.recommendedTargetPrice).toBeGreaterThan(pricing.breakEvenPrice);
  });

  it("blocks listing drafts missing Etsy POD disclosure, approved assets, mockups, safety, and owner approval", () => {
    const validation = validateListingDraft({ targetChannel: "Etsy", source: "POD migration", title: "Coastal Tee", description: "A shirt.", price: 30, productionMethod: "POD", shippingProcessingNotes: "Ships in 3-5 business days." });
    expect(validation.blockers).toEqual(expect.arrayContaining(["approved_asset_required_for_pod", "approved_mockup_required_for_pod", "production_partner_disclosure_required", "safety_check_required", "owner_approval_required_before_export_or_sync"]));
    expect(exportListingDraft({ targetChannel: "manual", title: "Safe", description: "Ready", price: 20, shippingProcessingNotes: "Ships soon.", safetyStatus: "passed", ownerApproved: true }).json.title).toBe("Safe");
  });

  it("validates Google configuration polish", () => {
    expect(validateGoogleConfiguration({ ga4PropertyId: "properties/123" }).blockers).toContain("ga4_property_id_must_be_numeric");
    expect(validateGoogleConfiguration({ searchConsoleSiteUrl: "sc-domain:example.com" }).ok).toBe(true);
    expect(validateGoogleConfiguration({ gbpAccountId: "accounts/123456789", gbpLocationId: "locations/987654321" }).blockers).toEqual(expect.arrayContaining(["gbpAccountId_placeholder_rejected", "gbpLocationId_placeholder_rejected"]));
  });

  it("keeps social planner drafts owner-reviewed and non-posting", () => {
    const draft = createSocialDraft({ channelType: "instagram", productTitle: "Cowhide Tote" });
    expect(draft.autoPosting).toBe(false);
    expect(draft.sourceLabel).toBe("rules_based");
  });

  it("derives dashboard next best actions from honest missing setup", () => {
    const actions = deriveNextBestActions({ businessProfileScore: 10, channelScore: 10, googleStatus: "not_configured", baselineStatus: "missing", podCandidates: 0, listingDrafts: 0, storageStatus: "not_configured", shopifyStatus: "not_configured", printifyStatus: "not_configured", assets: 0, mockups: 0, approvedProducts: 0 });
    expect(actions.slice(0, 9).map((action) => action.title)).toEqual([
      "Generate or approve trend report",
      "Create or approve product ideas",
      "Generate or approve design concepts",
      "Generate or upload artwork",
      "Approve assets and mockups",
      "Create listing draft",
      "Check margin",
      "Configure Shopify / Printify / Google / Merchant",
      "Approve exports or guarded syncs"
    ]);
    expect(actions.map((action) => action.href)).toEqual(expect.arrayContaining(["/studio/trends", "/studio/pod-migration", "/studio/briefs", "/studio/assets", "/studio/mockups", "/studio/listing-drafts", "/studio/pricing", "/studio/integrations", "/studio/publish", "/studio/baseline"]));
  });

  it("creates trend reports only from stored trend data", () => {
    const emptyReport = createTrendReportDraft({ trends: [], clusters: [], businessProfile: { publicBrandName: "Salty Cowhide" } });
    expect(emptyReport.approvalStatus).toBe("blocked_by_missing_source");
    expect(emptyReport.blockers).toContain("no_trend_source_data");
    const report = createTrendReportDraft({
      trends: [{ id: "tsig_1", keyword: "coastal cowgirl", confidence: 0.72, status: "new", category: "fashion_pod" }],
      businessProfile: { publicBrandName: "Salty Cowhide", productCategories: ["tees"] }
    });
    expect(report.approvalStatus).toBe("needs_review");
    expect(report.generatedBy).toBe("rules_based");
    expect(report.productIdeaRecommendations[0]?.title).toContain("coastal cowgirl");
  });

  it("feeds trend reports into product ideas and design prompt drafts", () => {
    const report = createTrendReportDraft({
      trends: [{ id: "tsig_1", keyword: "turquoise rodeo", confidence: 0.8, status: "reviewed" }],
      businessProfile: { publicBrandName: "Salty Cowhide", targetCustomer: "coastal western shoppers" }
    });
    const ideas = createProductIdeasFromTrendReport({ trendReport: report, businessProfile: { targetCustomer: "coastal western shoppers" } });
    const concept = createDesignConceptDraft({ productIdea: ideas[0], businessProfile: { brandColors: ["teal"], designStyleNotes: "coastal western" } });
    expect(ideas[0]?.approvalStatus).toBe("draft");
    expect(concept.generationStatus).toBe("prompt_draft");
    expect(concept.approvalStatus).toBe("needs_review");
    expect(concept.prompt).not.toMatch(/access_token|refresh_token|client_secret/i);
  });

  it("does not fake image generation when provider is disabled", () => {
    const concept = createDesignConceptDraft({ productIdea: { title: "Coastal tote", targetProductTypes: ["tote"] } });
    const plan = createImageGenerationPlan({ designConcept: concept, imageProviderConfigured: false });
    expect(plan.status).toBe("provider_not_configured");
    expect(plan.generatedAssetCreated).toBe(false);
  });

  it("creates agentic POD draft outputs and approval queue without live actions", () => {
    const workflow = runAgenticPodWorkflow({
      trends: [{ id: "tsig_1", keyword: "beach rodeo", confidence: 0.7, status: "new" }],
      businessProfile: { publicBrandName: "Salty Cowhide", targetCustomer: "coastal western shoppers", productionPartnerDisclosureNotes: "POD partner disclosure required." },
      channels: [{ channelType: "instagram", status: "configured" }],
      shopifyStatus: "not_configured",
      printifyStatus: "not_configured",
      googleStatus: "configured_not_verified",
      imageProviderConfigured: false
    });
    expect(workflow.status).toBe("draft_outputs_created");
    expect(workflow.outputs.map((output) => output.outputType)).toEqual(expect.arrayContaining(["trend_report", "product_idea_recommendations", "design_concept", "image_generation_request", "listing_draft", "launch_readiness_check"]));
    expect(workflow.outputs.find((output) => output.outputType === "image_generation_request")?.status).toBe("provider_not_configured");
    expect(workflow.approvalQueue.length).toBeGreaterThan(0);
    expect(workflow.forbiddenActions).toContain("spend_money");
    expect(JSON.stringify(workflow)).not.toMatch(/access_token|refresh_token|client_secret/i);
  });

  it("derives central approval queue items from persisted AI outputs", () => {
    const queue = createAgenticApprovalQueue({
      aiOutputs: [{
        id: "aiout_1",
        output_type: "trend_report",
        status: "pending_review",
        output_json: { title: "Trend report", body: "Review me", sourceLabel: "rules_based", nextAction: "Approve or reject." }
      }]
    });
    expect(queue[0]).toMatchObject({ id: "aiout_1", type: "trend_report", sourceLabel: "rules_based" });
  });
});

describe("functional complete v1 providers", () => {
  it("reports storage setup requirements and blocks public URLs for unapproved assets", async () => {
    expect(storageStatusFromConfig({}).setupRequired).toEqual(expect.arrayContaining(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]));
    const disabled = createStorageProvider({});
    expect((await disabled.uploadPrivateAsset("x", new Uint8Array(), "image/png")).ok).toBe(false);
    expect(disabled.createPublicApprovedUrl("x.png", false)).toMatchObject({ ok: false, error: "storage_provider_disabled" });
  });

  it("keeps Shopify disabled without credentials and builds draft payload without publishing", () => {
    const providers = createCommerceProviders(parseEnv({ APP_ENV: "development" }));
    const payload = providers.admin.buildProductDraftPayload({ title: "Draft", description: "Body", price: 25, tags: ["western"] });
    expect(payload.status).toBe("draft");
    expect(payload.tags).toBe("western");
  });

  it("keeps Printify disabled without credentials and validates draft payload requirements", async () => {
    const providers = createCommerceProviders(parseEnv({ APP_ENV: "development" }));
    const result = await providers.printify.createProduct({ title: "Draft" });
    if (result.ok) throw new Error("Printify should be disabled without credentials");
    expect(result.error).toBe("printify_disabled");
  });

  it("uses rules-based AI fallback and blocks prompt secrets", async () => {
    const provider = createFreeTextProvider(parseEnv({ APP_ENV: "development" }));
    const result = await provider.generatePhrases("western tote", 2);
    expect(result.ok).toBe(true);
    expect(result.sourceLabel).toBe("rules_based");
    expect(detectPromptSafetyIssues("please include access_token abc")).toContain("blocked_pattern:access[_-]?token");
  });
});
