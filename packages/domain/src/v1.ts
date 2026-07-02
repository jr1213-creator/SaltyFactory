import { z } from "zod";

export const sourceLabels = ["model_generated", "rules_based", "manually_entered", "provider_imported"] as const;
export type SourceLabel = (typeof sourceLabels)[number];

export const businessTypes = ["POD", "ecommerce", "handmade", "dropshipping", "local_service", "hybrid", "digital_products", "marketplace_seller"] as const;
export const fulfillmentModels = ["handmade", "POD", "dropship", "hybrid", "digital", "service"] as const;

export const businessProfileSchema = z.object({
  businessName: z.string().trim().min(1),
  legalEntityName: z.string().trim().optional().default(""),
  publicBrandName: z.string().trim().min(1),
  dbaNames: z.array(z.string()).optional().default([]),
  tagline: z.string().trim().optional().default(""),
  shortDescription: z.string().trim().optional().default(""),
  longDescription: z.string().trim().optional().default(""),
  businessType: z.enum(businessTypes).default("hybrid"),
  primaryBusinessModel: z.string().trim().optional().default(""),
  fulfillmentModel: z.enum(fulfillmentModels).default("hybrid"),
  industry: z.string().trim().optional().default(""),
  niche: z.string().trim().optional().default(""),
  targetCustomer: z.string().trim().optional().default(""),
  brandVoice: z.string().trim().optional().default(""),
  brandValues: z.array(z.string()).optional().default([]),
  productCategories: z.array(z.string()).optional().default([]),
  primaryOffer: z.string().trim().optional().default(""),
  secondaryOffers: z.array(z.string()).optional().default([]),
  pricePositioning: z.string().trim().optional().default(""),
  supportEmail: z.string().trim().email().or(z.literal("")).optional().default(""),
  businessPhone: z.string().trim().optional().default(""),
  serviceArea: z.string().trim().optional().default(""),
  country: z.string().trim().min(2).default("US"),
  timezone: z.string().trim().min(1).default("America/New_York"),
  currency: z.string().trim().min(3).max(3).default("USD"),
  shippingRegions: z.array(z.string()).optional().default([]),
  returnsPolicyNotes: z.string().trim().optional().default(""),
  productionPartnerDisclosureNotes: z.string().trim().optional().default(""),
  aiUsageDisclosureNotes: z.string().trim().optional().default(""),
  logoUrl: z.string().trim().optional().default(""),
  alternateLogoUrl: z.string().trim().optional().default(""),
  brandColors: z.array(z.string()).optional().default([]),
  fonts: z.array(z.string()).optional().default([]),
  designStyleNotes: z.string().trim().optional().default(""),
  imageStyleNotes: z.string().trim().optional().default(""),
  bannedWords: z.array(z.string()).optional().default([]),
  preferredPhrases: z.array(z.string()).optional().default([]),
  trademarkCautionList: z.array(z.string()).optional().default([]),
  brandSafetyNotes: z.string().trim().optional().default("")
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

const requiredBusinessProfileFields: Array<keyof BusinessProfileInput> = [
  "businessName",
  "publicBrandName",
  "businessType",
  "fulfillmentModel",
  "targetCustomer",
  "brandVoice",
  "primaryOffer",
  "supportEmail",
  "country",
  "timezone",
  "currency",
  "returnsPolicyNotes"
];

export function scoreBusinessProfile(input: Partial<BusinessProfileInput>) {
  const parsed = businessProfileSchema.partial().parse(input);
  const blockers = requiredBusinessProfileFields
    .filter((field) => {
      const value = parsed[field];
      return Array.isArray(value) ? value.length === 0 : value === undefined || value === null || !String(value).trim();
    })
    .map((field) => `Complete ${String(field)}.`);
  const assetChecks = [
    ["Add at least one brand color.", parsed.brandColors],
    ["Add product categories.", parsed.productCategories],
    ["Add production partner disclosure notes for POD/dropship offers.", parsed.productionPartnerDisclosureNotes]
  ].filter(([, value]) => Array.isArray(value) ? value.length === 0 : value === undefined || value === null || !String(value).trim()).map(([label]) => String(label));
  const total = requiredBusinessProfileFields.length + 3;
  const missing = blockers.length + assetChecks.length;
  return {
    score: Math.max(0, Math.round(((total - missing) / total) * 100)),
    blockers: [...blockers, ...assetChecks],
    status: missing === 0 ? "ready" : "setup_needed"
  };
}

export const channelCatalog = [
  ["instagram", "social", "Instagram"],
  ["facebook_page", "social", "Facebook Page"],
  ["facebook_group", "social", "Facebook Group"],
  ["tiktok", "social", "TikTok"],
  ["pinterest", "social", "Pinterest"],
  ["youtube", "social", "YouTube"],
  ["youtube_shorts", "social", "YouTube Shorts"],
  ["x_twitter", "social", "X / Twitter"],
  ["threads", "social", "Threads"],
  ["linkedin", "social", "LinkedIn"],
  ["bluesky", "social", "Bluesky"],
  ["snapchat", "social", "Snapchat"],
  ["lemon8", "social", "Lemon8"],
  ["reddit", "social", "Reddit"],
  ["tumblr", "social", "Tumblr"],
  ["discord", "social", "Discord"],
  ["telegram", "social", "Telegram"],
  ["whatsapp_business", "social", "WhatsApp Business"],
  ["shopify", "ecommerce", "Shopify"],
  ["etsy", "ecommerce", "Etsy"],
  ["amazon_handmade", "ecommerce", "Amazon Handmade"],
  ["amazon_seller", "ecommerce", "Amazon Seller"],
  ["ebay", "ecommerce", "eBay"],
  ["walmart_marketplace", "ecommerce", "Walmart Marketplace"],
  ["faire", "ecommerce", "Faire"],
  ["whatnot", "ecommerce", "Whatnot"],
  ["poshmark", "ecommerce", "Poshmark"],
  ["mercari", "ecommerce", "Mercari"],
  ["depop", "ecommerce", "Depop"],
  ["woocommerce", "ecommerce", "WooCommerce"],
  ["bigcommerce", "ecommerce", "BigCommerce"],
  ["squarespace_commerce", "ecommerce", "Squarespace Commerce"],
  ["wix_store", "ecommerce", "Wix Store"],
  ["linktree", "link_in_bio", "Linktree"],
  ["beacons", "link_in_bio", "Beacons"],
  ["stan_store", "link_in_bio", "Stan Store"],
  ["ko_fi", "link_in_bio", "Ko-fi"],
  ["gumroad", "link_in_bio", "Gumroad"],
  ["patreon", "link_in_bio", "Patreon"],
  ["substack", "link_in_bio", "Substack"],
  ["custom_landing_page", "link_in_bio", "Custom Landing Page"],
  ["google_business_profile", "local_reputation", "Google Business Profile Public URL"],
  ["yelp", "local_reputation", "Yelp"],
  ["trustpilot", "local_reputation", "Trustpilot"],
  ["better_business_bureau", "local_reputation", "Better Business Bureau"],
  ["nextdoor", "local_reputation", "Nextdoor"],
  ["tripadvisor", "local_reputation", "TripAdvisor"],
  ["angi", "local_reputation", "Angi"],
  ["houzz", "local_reputation", "Houzz"],
  ["blog", "content", "Blog"],
  ["podcast", "content", "Podcast"],
  ["newsletter", "content", "Newsletter"],
  ["custom", "custom", "Custom Channel"]
] as const;

export const channelStatuses = ["missing", "configured", "needs_review", "connected", "disabled"] as const;

export const channelSchema = z.object({
  channelType: z.string().trim().min(1),
  category: z.string().trim().optional(),
  displayName: z.string().trim().min(1),
  url: z.string().trim().optional().default(""),
  handle: z.string().trim().optional().default(""),
  accountId: z.string().trim().optional().default(""),
  status: z.enum(channelStatuses).default("configured"),
  ownerPriority: z.number().int().min(1).max(5).default(3),
  includeInAiRecommendations: z.boolean().default(true),
  notes: z.string().trim().optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
}).superRefine((value, ctx) => {
  if (value.url) {
    try {
      const parsed = new URL(value.url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid_protocol");
    } catch {
      ctx.addIssue({ code: "custom", message: "Channel URL must be a valid http(s) URL." });
    }
  }
});
export type ChannelInput = z.infer<typeof channelSchema>;

export function normalizeChannel(input: unknown): ChannelInput & { category: string } {
  const parsed = channelSchema.parse(input);
  const catalog = channelCatalog.find(([key]) => key === parsed.channelType);
  return { ...parsed, category: parsed.category || catalog?.[1] || "custom" };
}

export function scoreChannelCompleteness(channels: Array<Partial<ChannelInput>>) {
  const priorities = ["shopify", "etsy", "instagram", "facebook_page", "pinterest", "google_business_profile", "newsletter"];
  const configured = new Set(channels.filter((channel) => ["configured", "connected"].includes(String(channel.status))).map((channel) => channel.channelType));
  const missingHighPriority = priorities.filter((key) => !configured.has(key));
  return {
    score: Math.round(((priorities.length - missingHighPriority.length) / priorities.length) * 100),
    missingHighPriority,
    configuredCount: configured.size,
    status: missingHighPriority.length ? "setup_needed" : "ready"
  };
}

export const employeeDefinitions = [
  ["trend_research_analyst", "Trend Research Analyst", ["trend_sources"], ["analyze_trends", "summarize_trend_signals", "flag_issue"]],
  ["trend_report_writer", "Trend Report Writer", ["trend_signals"], ["generate_trend_report_draft", "recommend_next_actions"]],
  ["product_strategy_assistant", "Product Strategy Assistant", ["trend_reports", "business_profile"], ["recommend_product_ideas", "create_product_idea_drafts", "rank_product_ideas"]],
  ["pod_migration_assistant", "POD Product Builder Assistant", ["pod_candidates"], ["analyze", "create_product_idea_drafts", "generate_checklist"]],
  ["design_concept_assistant", "Design Concept Assistant", ["product_ideas", "business_profile"], ["create_design_brief_drafts", "create_image_prompt_drafts"]],
  ["image_generation_assistant", "Image Generation Assistant", ["design_concepts", "image_provider"], ["request_image_generation", "create_internal_artwork_candidates"]],
  ["design_safety_checker", "Design Safety Checker", ["design_assets"], ["flag_issue", "score_readiness", "recommend"]],
  ["product_listing_assistant", "Product Listing Assistant", ["listing_drafts"], ["create_listing_draft", "flag_issue", "recommend"]],
  ["pricing_margin_assistant", "Pricing & Margin Assistant", ["pricing_inputs"], ["analyze", "recommend", "flag_issue", "calculate_margins"]],
  ["mockup_planning_assistant", "Mockup Planning Assistant", ["approved_assets"], ["create_mockup_plan", "create_image_prompt_drafts"]],
  ["shopify_printify_launch_assistant", "Shopify / Printify Launch Assistant", ["approved_listings", "publish_reviews"], ["prepare_export_payloads", "prepare_sync_payloads", "flag_blockers"]],
  ["merchant_center_assistant", "Merchant Center Assistant", ["business_profile", "google_setup"], ["create_launch_checklist", "flag_blockers", "recommend"]],
  ["google_search_analytics_assistant", "Google Search / Analytics Assistant", ["google_metrics"], ["analyze", "summarize", "recommend_next_actions"]],
  ["social_content_assistant", "Social Content Assistant", ["channels"], ["create_social_draft", "recommend"]],
  ["operations_checklist_assistant", "Operations Checklist Assistant", ["business_profile"], ["generate_checklist", "create_task", "flag_issue"]],
  ["content_planner", "Content Planner", ["business_profile", "channels"], ["recommend", "create_social_draft", "create_task"]],
  ["analytics_analyst", "Analytics Analyst", ["baseline", "google_metrics"], ["analyze", "summarize", "compare_baseline", "recommend"]],
  ["ai_migration_guide", "Setup Guide Assistant", ["business_profile", "channels"], ["analyze", "recommend", "generate_checklist", "score_readiness"]],
  ["local_seo_assistant", "Local SEO Assistant", ["business_profile", "google_business_profile"], ["analyze", "recommend", "create_internal_draft"]],
  ["review_summarizer", "Review Summarizer", ["google_business_profile"], ["summarize", "recommend", "create_review_reply_draft"]],
  ["customer_faq_assistant", "Customer FAQ Assistant", ["business_profile"], ["create_internal_draft", "recommend"]],
  ["campaign_assistant", "Campaign Assistant", ["channels", "listing_drafts"], ["create_social_draft", "create_task", "recommend"]],
  ["dropshipping_product_assistant", "Accessory Dropshipping Assistant", ["dropship_candidates"], ["analyze", "create_listing_draft", "flag_issue"]],
  ["marketplace_listing_assistant", "Marketplace Listing Assistant", ["channels", "listing_drafts"], ["create_listing_draft", "recommend"]]
] as const;

export const forbiddenEmployeeActions = [
  "publish_public_content_without_approval",
  "send_customer_message_without_approval",
  "reply_to_review_without_approval",
  "spend_money",
  "sync_live_product_without_approval",
  "change_provider_data_without_approval",
  "delete_provider_data",
  "expose_secrets"
] as const;

export function getEmployeeDefinition(employeeKey: string) {
  const found = employeeDefinitions.find(([key]) => key === employeeKey);
  if (!found) return null;
  const [key, name, requiredDataSources, allowedActions] = found;
  return {
    employeeKey: key,
    name,
    requiredDataSources: [...requiredDataSources],
    allowedActions: [...allowedActions],
    forbiddenActions: [...forbiddenEmployeeActions],
    approvalRequirements: ["Owner approval required before public/provider effects."],
    safetyProfile: "drafts_and_recommendations_only"
  };
}

export function validateEmployeeConfiguration(input: { employeeKey: string; requestedActions?: string[]; availableDataSources?: string[]; supportsRulesOnly?: boolean }) {
  const definition = getEmployeeDefinition(input.employeeKey);
  if (!definition) return { ok: false, status: "setup_needed", blockers: ["Unknown employee type."], definition: null };
  const requested = input.requestedActions ?? definition.allowedActions;
  const forbidden = requested.filter((action) => (forbiddenEmployeeActions as readonly string[]).includes(action));
  const available = new Set(input.availableDataSources ?? []);
  const missing = definition.requiredDataSources.filter((source) => !available.has(source));
  const blockers = [
    ...forbidden.map((action) => `Forbidden action rejected: ${action}.`),
    ...missing.map((source) => `Required data source missing: ${source}.`)
  ];
  const rulesOnlyReady = Boolean(input.supportsRulesOnly && !forbidden.length);
  return {
    ok: blockers.length === 0 || rulesOnlyReady,
    status: blockers.length === 0 ? "ready" : rulesOnlyReady ? "setup_needed" : "blocked",
    blockers,
    definition: { ...definition, allowedActions: requested.filter((action) => !forbidden.includes(action)) }
  };
}

export const pricingSchema = z.object({
  baseProductCost: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  packagingHandlingCost: z.number().min(0).default(0),
  platformFeePercent: z.number().min(0).max(100).default(0),
  paymentFeePercent: z.number().min(0).max(100).default(0),
  fixedTransactionFee: z.number().min(0).default(0),
  adCostEstimate: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  salePrice: z.number().min(0).default(0),
  minimumMarginPercent: z.number().min(0).max(100).default(35)
});
export type PricingInput = z.infer<typeof pricingSchema>;

const roundMoney = (value: number) => Number(value.toFixed(2));

export function calculatePricing(input: Partial<PricingInput>) {
  const data = pricingSchema.parse(input);
  const discountedRevenue = data.salePrice * (1 - data.discountPercent / 100);
  const variableFees = discountedRevenue * ((data.platformFeePercent + data.paymentFeePercent) / 100);
  const fixedCosts = data.baseProductCost + data.shippingCost + data.packagingHandlingCost + data.fixedTransactionFee + data.adCostEstimate;
  const grossProfit = data.salePrice - data.baseProductCost - data.shippingCost;
  const estimatedNetProfit = discountedRevenue - variableFees - fixedCosts;
  const grossMarginPercent = data.salePrice > 0 ? (grossProfit / data.salePrice) * 100 : 0;
  const netMarginPercent = discountedRevenue > 0 ? (estimatedNetProfit / discountedRevenue) * 100 : 0;
  const denominator = 1 - (data.discountPercent + data.platformFeePercent + data.paymentFeePercent + data.minimumMarginPercent) / 100;
  const breakEvenPrice = denominator > 0 ? fixedCosts / (1 - (data.discountPercent + data.platformFeePercent + data.paymentFeePercent) / 100) : fixedCosts;
  const recommendedMinimumPrice = denominator > 0 ? fixedCosts / denominator : fixedCosts * 1.5;
  return {
    grossProfit: roundMoney(grossProfit),
    grossMarginPercent: roundMoney(grossMarginPercent),
    estimatedNetProfit: roundMoney(estimatedNetProfit),
    netMarginPercent: roundMoney(netMarginPercent),
    breakEvenPrice: roundMoney(breakEvenPrice),
    recommendedMinimumPrice: roundMoney(recommendedMinimumPrice),
    recommendedTargetPrice: roundMoney(recommendedMinimumPrice * 1.15),
    marginBelowThreshold: netMarginPercent < data.minimumMarginPercent,
    warnings: netMarginPercent < data.minimumMarginPercent ? [`Net margin ${roundMoney(netMarginPercent)}% is below ${data.minimumMarginPercent}%.`] : []
  };
}

const riskyPhrasePatterns = [/disney/i, /nfl|nba|mlb|ncaa/i, /swiftie|taylor swift/i, /barbie/i, /harley/i, /cowboys|chiefs|yankees/i];

export function detectRiskyPhrases(text: string, customTerms: string[] = []) {
  const hits = riskyPhrasePatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  const customHits = customTerms.filter((term) => term && text.toLowerCase().includes(term.toLowerCase()));
  return [...hits, ...customHits];
}

export const listingDraftSchema = z.object({
  targetChannel: z.string().trim().min(1),
  title: z.string().trim().default(""),
  shortHook: z.string().trim().optional().default(""),
  description: z.string().trim().default(""),
  bulletHighlights: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  seoKeywords: z.array(z.string()).optional().default([]),
  productType: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  materials: z.array(z.string()).optional().default([]),
  productionMethod: z.string().trim().optional().default(""),
  productionPartnerDisclosure: z.string().trim().optional().default(""),
  shippingProcessingNotes: z.string().trim().optional().default(""),
  careInstructions: z.string().trim().optional().default(""),
  returnPolicyNotes: z.string().trim().optional().default(""),
  personalizationNotes: z.string().trim().optional().default(""),
  dimensions: z.string().trim().optional().default(""),
  colorVariantNotes: z.string().trim().optional().default(""),
  assetIds: z.array(z.string()).optional().default([]),
  approvedAssetIds: z.array(z.string()).optional().default([]),
  mockupIds: z.array(z.string()).optional().default([]),
  approvedMockupIds: z.array(z.string()).optional().default([]),
  price: z.number().min(0).optional(),
  source: z.enum(["POD product builder", "POD migration", "dropshipping", "design workflow", "manual"]).default("manual"),
  safetyStatus: z.enum(["not_checked", "passed", "blocked"]).default("not_checked"),
  marginStatus: z.enum(["not_checked", "passed", "critically_low", "owner_override"]).default("not_checked"),
  ownerApproved: z.boolean().default(false),
  bannedTerms: z.array(z.string()).optional().default([])
});
export type ListingDraftInput = z.infer<typeof listingDraftSchema>;

export function validateListingDraft(input: Partial<ListingDraftInput>) {
  const draft = listingDraftSchema.parse(input);
  const blockers: string[] = [];
  if (!draft.title) blockers.push("title_required");
  if (!draft.description) blockers.push("description_required");
  if (!draft.price || draft.price <= 0) blockers.push("price_required");
  if (!draft.targetChannel) blockers.push("target_channel_required");
  const isPod = draft.source === "POD migration" || draft.source === "POD product builder" || /pod/i.test(draft.productionMethod);
  if (isPod && draft.approvedAssetIds.length === 0) blockers.push("approved_asset_required_for_pod");
  if (isPod && draft.approvedMockupIds.length === 0) blockers.push("approved_mockup_required_for_pod");
  if (isPod && /etsy/i.test(draft.targetChannel) && !draft.productionPartnerDisclosure) blockers.push("production_partner_disclosure_required");
  if (draft.safetyStatus !== "passed") blockers.push("safety_check_required");
  if (draft.marginStatus === "critically_low") blockers.push("critical_margin_blocker");
  if (!draft.shippingProcessingNotes) blockers.push("shipping_processing_notes_required");
  if (detectRiskyPhrases(`${draft.title} ${draft.description} ${draft.tags.join(" ")}`, draft.bannedTerms).length) blockers.push("restricted_phrase_detected");
  if (!draft.ownerApproved) blockers.push("owner_approval_required_before_export_or_sync");
  return {
    status: blockers.length ? "blocked" : "ready_for_export",
    blockers,
    exportAllowed: blockers.length === 0,
    syncAllowed: blockers.length === 0 && draft.ownerApproved
  };
}

export function exportListingDraft(input: Partial<ListingDraftInput>) {
  const draft = listingDraftSchema.parse(input);
  const validation = validateListingDraft(draft);
  return {
    validation,
    json: {
      title: draft.title,
      description: draft.description,
      tags: draft.tags,
      price: draft.price ?? null,
      channel: draft.targetChannel,
      productionPartnerDisclosure: draft.productionPartnerDisclosure || null
    },
    csvRow: [draft.title, draft.description, draft.tags.join("|"), String(draft.price ?? ""), draft.targetChannel, draft.productionPartnerDisclosure].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
  };
}

export function evaluatePodCandidate(input: { designFileStatus?: string; targetProductTypes?: string[]; safetyFlags?: string[]; pricing?: Partial<PricingInput>; listingReady?: boolean; mockupsApproved?: boolean; ownerApproved?: boolean }) {
  const blockers: string[] = [];
  if (input.designFileStatus !== "ready") blockers.push("design_file_not_ready");
  if (!input.targetProductTypes?.length) blockers.push("target_product_missing");
  if (input.safetyFlags?.length) blockers.push("safety_flags_require_review");
  const pricing = calculatePricing(input.pricing ?? {});
  if (pricing.marginBelowThreshold) blockers.push("margin_below_threshold");
  if (!input.mockupsApproved) blockers.push("mockups_not_approved");
  if (!input.listingReady) blockers.push("listing_not_ready");
  if (!input.ownerApproved) blockers.push("owner_approval_required");
  return { status: blockers.length ? "blocked_by_guardrail" : "ready_for_review", blockers, pricing };
}

export function evaluateDropshipCandidate(input: { supplierUrl?: string; salePrice?: number; supplierCost?: number; shippingCost?: number; deliveryEstimateDays?: number; brandFitScore?: number; ownerApproved?: boolean }) {
  const pricing = calculatePricing({ salePrice: input.salePrice ?? 0, baseProductCost: input.supplierCost ?? 0, shippingCost: input.shippingCost ?? 0, platformFeePercent: 6.5, paymentFeePercent: 3, fixedTransactionFee: 0.3 });
  const flags: string[] = [];
  if (!input.supplierUrl) flags.push("supplier_url_missing");
  if ((input.deliveryEstimateDays ?? 0) > 14) flags.push("long_shipping_time");
  if (pricing.marginBelowThreshold) flags.push("low_margin");
  if ((input.brandFitScore ?? 0) < 60) flags.push("brand_mismatch");
  if (!input.ownerApproved) flags.push("owner_approval_required_before_sync");
  return { status: flags.length ? "needs_review" : "ready_for_listing", flags, pricing };
}

export function buildMigrationRecommendations(input: { businessProfileReady?: boolean; channelScore?: number; googleConnected?: boolean; baselineExists?: boolean; podCandidates?: number; aiProviderConfigured?: boolean }) {
  const sourceLabel: SourceLabel = input.aiProviderConfigured ? "model_generated" : "rules_based";
  const recommendations = [
    !input.businessProfileReady && { action: "Complete Business Profile", href: "/studio/settings/business-profile", priority: 1 },
    (input.channelScore ?? 0) < 80 && { action: "Add priority social and sales channels", href: "/studio/channels", priority: 2 },
    !input.googleConnected && { action: "Connect Google data sources", href: "/studio/integrations", priority: 3 },
    !input.baselineExists && { action: "Create Baseline & Impact snapshot", href: "/studio/baseline", priority: 4 },
    !input.podCandidates && { action: "Create first POD product idea", href: "/studio/pod-migration", priority: 5 }
  ].filter(Boolean) as Array<{ action: string; href: string; priority: number }>;
  return {
    sourceLabel,
    migrationReadinessScore: Math.max(0, 100 - recommendations.length * 15),
    recommendations,
    firstThirtyDayPlan: recommendations.slice(0, 5).map((item, index) => ({ dayRange: index < 2 ? "days_1_7" : index < 4 ? "days_8_21" : "days_22_30", ...item })),
    approvalRules: {
      publishPublicContent: "owner_approval_required",
      syncLiveProduct: "owner_approval_required_and_publish_gates_passed",
      sendCustomerMessage: "owner_approval_required",
      spendMoney: "forbidden"
    }
  };
}

export function createBaselineMetrics(input: { workspaceMetrics?: Array<Record<string, unknown>>; businessProfileScore?: number; channelScore?: number; counts?: Record<string, number>; activeAiEmployees?: number }) {
  const metrics: Record<string, number> = {
    business_profile_completeness: input.businessProfileScore ?? 0,
    channel_completeness: input.channelScore ?? 0,
    active_ai_employees: input.activeAiEmployees ?? 0,
    ...(input.counts ?? {})
  };
  for (const metric of input.workspaceMetrics ?? []) {
    const key = String(metric.metric_key ?? metric.metricKey ?? "");
    const value = Number(metric.metric_value ?? metric.metricValue ?? 0);
    if (key) metrics[key] = value;
  }
  const insufficientData = [
    !Object.keys(metrics).some((key) => key.startsWith("ga4.")) && "GA4 metrics not imported.",
    !Object.keys(metrics).some((key) => key.startsWith("gsc.")) && "Search Console metrics not imported.",
    !Object.keys(metrics).some((key) => key.startsWith("gbp.")) && "Google Business Profile metrics not imported."
  ].filter(Boolean) as string[];
  return { metrics, insufficientData, status: insufficientData.length ? "insufficient_data" : "captured" };
}

export function compareBaseline(baseline: Record<string, number>, current: Record<string, number>) {
  return Object.fromEntries(Object.keys({ ...baseline, ...current }).map((key) => {
    const start = Number(baseline[key] ?? 0);
    const now = Number(current[key] ?? 0);
    return [key, { baseline: start, current: now, delta: roundMoney(now - start), percentChange: start > 0 ? roundMoney(((now - start) / start) * 100) : null }];
  }));
}

export function createSocialDraft(input: { channelType: string; businessName?: string | undefined; productTitle?: string | undefined; idea?: string | undefined; sourceLabel?: SourceLabel | undefined }) {
  const constraints: Record<string, unknown> = {
    instagram: { maxLength: 2200, mediaRecommended: true },
    tiktok: { maxLength: 2200, videoRecommended: true },
    x_twitter: { maxLength: 280 },
    pinterest: { maxLength: 500, imageRequired: true },
    linkedin: { maxLength: 3000 },
    newsletter: { subjectRequired: true }
  };
  const title = input.idea || `Feature ${input.productTitle || input.businessName || "new offer"}`;
  return {
    title,
    body: `${title}\n\nDraft for owner review. Publish manually only after approval.`,
    sourceLabel: input.sourceLabel ?? "rules_based",
    status: "draft",
    approvalStatus: "draft",
    constraints: constraints[input.channelType] ?? { customChannel: true },
    autoPosting: false
  };
}

export const agenticRunModes = ["daily_pod_planning", "trend_report_generation", "product_idea_generation", "listing_draft_generation", "launch_readiness_check", "marketing_draft_generation"] as const;
export type AgenticRunMode = (typeof agenticRunModes)[number];

export type AgenticOutput = {
  outputType: string;
  title: string;
  body: string;
  status: string;
  sourceLabel: SourceLabel;
  employeeKey: string;
  requiresHumanReview: boolean;
  approvalRequired: boolean;
  blockers: string[];
  riskFlags: string[];
  nextAction: string;
  data: Record<string, unknown>;
};

export type ApprovalQueueItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  sourceLabel: SourceLabel;
  createdBy: string;
  riskFlags: string[];
  preview: string;
  nextAction: string;
};

const asText = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const asArray = (value: unknown) => Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
const rowStatus = (row: Record<string, unknown>) => String(row.status ?? row.approval_status ?? row.approvalStatus ?? "");

export function createTrendReportDraft(input: {
  trends?: Array<Record<string, unknown>> | undefined;
  clusters?: Array<Record<string, unknown>> | undefined;
  businessProfile?: Partial<BusinessProfileInput> | null | undefined;
  sourceLabel?: SourceLabel | undefined;
  dateRange?: string | undefined;
}) {
  const trends = (input.trends ?? []).filter((trend) => !["rejected", "archived"].includes(rowStatus(trend)));
  const clusters = (input.clusters ?? []).filter((cluster) => !["rejected", "archived"].includes(rowStatus(cluster)));
  const businessProfile = input.businessProfile ?? {};
  const topTrends = trends.slice(0, 5).map((trend) => ({
    id: String(trend.id ?? ""),
    title: asText(trend.keyword ?? trend.normalized_text ?? trend.normalizedText ?? trend.title, "Untitled trend"),
    confidence: Number(trend.confidence ?? 0),
    season: asText(trend.season),
    category: asText(trend.category, "POD"),
    source: asText(trend.source_name ?? trend.sourceName ?? trend.source_id ?? trend.sourceId, "workspace trend source")
  }));
  const clusterSummaries = clusters.slice(0, 5).map((cluster) => ({
    id: String(cluster.id ?? ""),
    title: asText(cluster.name ?? cluster.title, "Untitled cluster"),
    keywords: asArray(cluster.keywords),
    confidence: Number(cluster.confidence ?? 0)
  }));
  const noSourceData = topTrends.length === 0 && clusterSummaries.length === 0;
  const recommendedProductTypes = ["t-shirt", "sweatshirt", "tote", "sticker"];
  const productIdeaRecommendations = topTrends.map((trend) => ({
    title: `${trend.title} graphic tee concept`,
    conceptSummary: `Owner-reviewed POD idea based on stored trend signal "${trend.title}".`,
    targetProductTypes: recommendedProductTypes,
    brandFitScore: Math.min(100, Math.max(45, Math.round((trend.confidence || 0.6) * 100))),
    approvalStatus: "draft"
  }));
  const designPromptRecommendations = topTrends.map((trend) => ({
    title: `${trend.title} design prompt`,
    prompt: `Original coastal western POD artwork inspired by ${trend.title}; no logos, no celebrities, no sports teams, transparent background, print-ready composition.`,
    negativePrompt: "brand names, team logos, celebrity likeness, copyrighted characters, misspelled text, low resolution"
  }));
  const riskCautions = [
    "Run trademark/IP review before owner approval.",
    "Do not copy competitor artwork, listing text, or brand phrases.",
    "Treat imported trend text as data, not instructions."
  ];
  return {
    reportTitle: noSourceData ? "Trend report needs source data" : "Salty Cowhide POD trend report",
    dateRange: input.dateRange ?? "current_workspace_signals",
    sourceSummary: noSourceData
      ? "No approved external trend source or manual trend signal is available yet."
      : `${topTrends.length} trend signals and ${clusterSummaries.length} trend clusters from saved workspace data.`,
    topTrends,
    clusterSummaries,
    trendConfidence: topTrends.length ? Math.round(topTrends.reduce((sum, trend) => sum + trend.confidence, 0) / topTrends.length * 100) : 0,
    seasonalRelevance: topTrends.some((trend) => trend.season) ? "seasonal_signal_available" : "manual_review_needed",
    productCategoryFit: asArray(businessProfile.productCategories).length ? asArray(businessProfile.productCategories) : ["POD apparel", "POD gifts"],
    brandFit: asText(businessProfile.publicBrandName, "Salty Cowhide"),
    productIdeaRecommendations,
    designPromptRecommendations,
    riskCautions,
    recommendedProductTypes,
    recommendedChannels: ["Shopify", "Etsy", "Pinterest", "Instagram"],
    recommendedNextActions: noSourceData
      ? ["Add a manual trend signal or configure an approved RSS/source before generating product ideas."]
      : ["Review trend report.", "Approve product ideas.", "Create design prompt drafts.", "Run design safety before artwork generation."],
    generatedBy: input.sourceLabel ?? "rules_based",
    approvalStatus: noSourceData ? "blocked_by_missing_source" : "needs_review",
    blockers: noSourceData ? ["no_trend_source_data"] : []
  };
}

export function createProductIdeasFromTrendReport(input: {
  trendReport: ReturnType<typeof createTrendReportDraft>;
  businessProfile?: Partial<BusinessProfileInput> | null | undefined;
  sourceLabel?: SourceLabel | undefined;
}) {
  const businessProfile = input.businessProfile ?? {};
  return input.trendReport.productIdeaRecommendations.map((idea, index) => ({
    id: `idea_draft_${index + 1}`,
    title: idea.title,
    source: "trend_report",
    conceptSummary: idea.conceptSummary,
    targetCustomer: asText(businessProfile.targetCustomer, "Salty Cowhide shoppers"),
    targetProductTypes: idea.targetProductTypes,
    targetChannels: ["Shopify", "Etsy", "manual export"],
    seasonalRelevance: input.trendReport.seasonalRelevance,
    brandFitScore: idea.brandFitScore,
    marginPotential: "manual_or_provider_cost_required",
    designComplexity: "moderate",
    riskFlags: detectRiskyPhrases(`${idea.title} ${idea.conceptSummary}`, businessProfile.trademarkCautionList ?? []),
    approvalStatus: "draft",
    sourceLabel: input.sourceLabel ?? input.trendReport.generatedBy,
    nextRecommendedAction: "Owner review, then create design concept."
  }));
}

export function createDesignConceptDraft(input: {
  productIdea?: Record<string, unknown> | null | undefined;
  businessProfile?: Partial<BusinessProfileInput> | null | undefined;
  sourceLabel?: SourceLabel | undefined;
}) {
  const ideaTitle = asText(input.productIdea?.title, "Salty Cowhide product idea");
  const profile = input.businessProfile ?? {};
  const colors = asArray(profile.brandColors);
  const prompt = `Original Salty Cowhide coastal western POD artwork for "${ideaTitle}", ${colors.length ? `use brand colors ${colors.join(", ")}, ` : ""}clean print-ready design, transparent background, no copied logos, no celebrity likeness, no sports team references.`;
  const riskFlags = detectRiskyPhrases(prompt, profile.trademarkCautionList ?? []);
  return {
    conceptTitle: `${ideaTitle} design concept`,
    productIdeaId: String(input.productIdea?.id ?? ""),
    prompt,
    negativePrompt: "brand names, team logos, copyrighted characters, celebrity faces, misspelled text, low resolution, watermarks",
    styleNotes: asText(profile.designStyleNotes, "coastal western, boutique POD, clean printable composition"),
    brandColors: colors,
    targetProductTypes: asArray(input.productIdea?.targetProductTypes).length ? asArray(input.productIdea?.targetProductTypes) : ["t-shirt", "tote", "sticker"],
    imageDimensions: { width: 4500, height: 5400, dpi: 300 },
    transparentBackgroundRequired: true,
    printFileRequirements: ["300 DPI target", "transparent PNG preferred", "safe margins reviewed", "owner approval required"],
    sourceLabel: input.sourceLabel ?? "rules_based",
    provider: "prompt_draft_only",
    generationStatus: riskFlags.length ? "blocked_by_guardrail" : "prompt_draft",
    safetyStatus: riskFlags.length ? "blocked" : "not_checked",
    approvalStatus: "needs_review",
    riskFlags
  };
}

export function createImageGenerationPlan(input: {
  designConcept: ReturnType<typeof createDesignConceptDraft>;
  imageProviderConfigured?: boolean | undefined;
}) {
  if (input.designConcept.riskFlags.length) {
    return {
      status: "blocked_by_guardrail",
      providerStatus: "not_called",
      generatedAssetCreated: false,
      message: "Image generation is blocked until risky prompt terms are reviewed.",
      prompt: input.designConcept.prompt
    };
  }
  if (!input.imageProviderConfigured) {
    return {
      status: "provider_not_configured",
      providerStatus: "disabled",
      generatedAssetCreated: false,
      message: "Image provider is disabled. The assistant created an owner-reviewed prompt draft only.",
      prompt: input.designConcept.prompt
    };
  }
  return {
    status: "approval_required",
    providerStatus: "configured_not_called",
    generatedAssetCreated: false,
    message: "Image provider is configured, but generation still requires explicit owner run approval.",
    prompt: input.designConcept.prompt
  };
}

export function createMockupPlanDraft(input: {
  productIdea?: Record<string, unknown> | null | undefined;
  approvedAssets?: number | undefined;
  sourceLabel?: SourceLabel | undefined;
}) {
  const productTypes = asArray(input.productIdea?.targetProductTypes).length ? asArray(input.productIdea?.targetProductTypes) : ["t-shirt", "tote", "sticker"];
  const hasApprovedAssets = (input.approvedAssets ?? 0) > 0;
  return {
    status: hasApprovedAssets ? "needs_review" : "setup_needed",
    sourceLabel: input.sourceLabel ?? "rules_based",
    approvalStatus: "needs_review",
    blockers: hasApprovedAssets ? [] : ["approved_artwork_required_before_mockup"],
    plans: productTypes.map((productType) => ({
      productType,
      mockupStyle: "clean boutique ecommerce mockup",
      placement: "front center print area",
      requiredViews: ["front", "detail", "lifestyle or flat lay"],
      provider: "manual_or_configured_mockup_provider",
      approvalStatus: "draft"
    }))
  };
}

export function createListingDraftFromProductIdea(input: {
  productIdea?: Record<string, unknown> | null | undefined;
  businessProfile?: Partial<BusinessProfileInput> | null | undefined;
  approvedAssets?: number | undefined;
  approvedMockups?: number | undefined;
  sourceLabel?: SourceLabel | undefined;
}) {
  const profile = input.businessProfile ?? {};
  const title = asText(input.productIdea?.title, "Salty Cowhide POD product draft");
  const draft: Partial<ListingDraftInput> = {
    targetChannel: "Shopify",
    title,
    shortHook: "Owner-reviewed POD launch draft.",
    description: `${title} prepared for Salty Cowhide owner review. Final copy, safety review, mockups, pricing, and approval are required before export or sync.`,
    bulletHighlights: ["Original Salty Cowhide concept", "POD workflow draft", "Owner approval required"],
    tags: ["salty cowhide", "coastal western", "pod gift"],
    seoKeywords: ["coastal western gift", "Salty Cowhide"],
    productType: asArray(input.productIdea?.targetProductTypes)[0] ?? "t-shirt",
    category: "POD apparel and gifts",
    productionMethod: "POD",
    productionPartnerDisclosure: asText(profile.productionPartnerDisclosureNotes),
    shippingProcessingNotes: asText(profile.returnsPolicyNotes) ? "Shipping and processing require final provider settings before launch." : "",
    returnPolicyNotes: asText(profile.returnsPolicyNotes),
    approvedAssetIds: (input.approvedAssets ?? 0) > 0 ? ["approved_asset_available"] : [],
    approvedMockupIds: (input.approvedMockups ?? 0) > 0 ? ["approved_mockup_available"] : [],
    price: 0,
    source: "POD product builder",
    safetyStatus: "not_checked",
    marginStatus: "not_checked",
    ownerApproved: false,
    bannedTerms: profile.trademarkCautionList ?? []
  };
  const validation = validateListingDraft(draft);
  return {
    draft,
    validation,
    sourceLabel: input.sourceLabel ?? "rules_based",
    status: "draft_created",
    approvalStatus: "needs_review"
  };
}

export function createAgenticApprovalQueue(input: {
  agentOutputs?: AgenticOutput[] | undefined;
  aiOutputs?: Array<Record<string, unknown>> | undefined;
  podCandidates?: Array<Record<string, unknown>> | undefined;
  listingDrafts?: Array<Record<string, unknown>> | undefined;
  assets?: Array<Record<string, unknown>> | undefined;
  mockups?: Array<Record<string, unknown>> | undefined;
  publishReviews?: Array<Record<string, unknown>> | undefined;
}) {
  const items: ApprovalQueueItem[] = [];
  for (const [index, output] of (input.agentOutputs ?? []).entries()) {
    if (output.approvalRequired || output.requiresHumanReview) {
      items.push({
        id: `agent_output_${index + 1}`,
        type: output.outputType,
        title: output.title,
        status: output.status,
        sourceLabel: output.sourceLabel,
        createdBy: output.employeeKey,
        riskFlags: output.riskFlags,
        preview: output.body.slice(0, 180),
        nextAction: output.nextAction
      });
    }
  }
  for (const row of input.aiOutputs ?? []) {
    if (["draft", "pending_review", "needs_review"].includes(rowStatus(row))) {
      const json = (row.output_json ?? row.outputJson ?? {}) as Record<string, unknown>;
      items.push({
        id: String(row.id),
        type: asText(row.output_type ?? row.outputType, "ai_employee_output"),
        title: asText(json.title ?? row.title, "AI employee output"),
        status: rowStatus(row),
        sourceLabel: (json.sourceLabel as SourceLabel) ?? "rules_based",
        createdBy: asText(row.employee_type ?? row.employeeType, "ai_employee"),
        riskFlags: asArray(json.riskFlags),
        preview: asText(json.body ?? json.summary ?? row.notes, "Draft output awaiting owner review.").slice(0, 180),
        nextAction: asText(json.nextAction, "Approve, reject, or request changes.")
      });
    }
  }
  for (const row of input.podCandidates ?? []) {
    if (!["approved", "archived", "synced", "exported"].includes(rowStatus(row))) {
      items.push({
        id: String(row.id),
        type: "product_idea",
        title: asText(row.design_name ?? row.designName ?? row.title, "POD product idea"),
        status: rowStatus(row) || "needs_review",
        sourceLabel: "manually_entered",
        createdBy: "workspace",
        riskFlags: asArray(row.legal_safety_flags ?? row.legalSafetyFlags),
        preview: asText(row.notes, "Product idea awaiting owner review."),
        nextAction: "Review product idea and approve the next design step."
      });
    }
  }
  for (const row of input.assets ?? []) {
    if (row.approved_for_mockup !== true && row.approvedForMockup !== true) {
      items.push({
        id: String(row.id),
        type: "artwork_asset",
        title: asText(row.title ?? row.file_path ?? row.filePath, "Artwork asset"),
        status: asText(row.qa_status ?? row.qaStatus ?? rowStatus(row), "needs_review"),
        sourceLabel: asText(row.generator) ? "model_generated" : "manually_entered",
        createdBy: "asset_workflow",
        riskFlags: asText(row.risk_status ?? row.riskStatus) === "blocked" ? ["risk_review_required"] : [],
        preview: "Asset requires QA and owner approval before mockups or listings.",
        nextAction: "Run QA and approve or reject artwork."
      });
    }
  }
  for (const row of input.mockups ?? []) {
    if (row.approved_for_product !== true && row.approvedForProduct !== true) {
      items.push({
        id: String(row.id),
        type: "mockup",
        title: asText(row.title ?? row.file_path ?? row.filePath, "Mockup"),
        status: rowStatus(row) || "needs_review",
        sourceLabel: "provider_imported",
        createdBy: "mockup_workflow",
        riskFlags: [],
        preview: "Mockup requires owner approval before listing readiness.",
        nextAction: "Approve or reject mockup."
      });
    }
  }
  for (const row of input.listingDrafts ?? []) {
    if (!["approved", "archived", "synced", "exported"].includes(rowStatus(row))) {
      items.push({
        id: String(row.id),
        type: "listing_draft",
        title: asText(row.title ?? row.product_title ?? row.productTitle, "Listing draft"),
        status: rowStatus(row) || "needs_review",
        sourceLabel: "manually_entered",
        createdBy: "listing_workflow",
        riskFlags: asArray(row.validation_blockers ?? row.validationBlockers),
        preview: asText(row.description, "Listing draft requires owner review."),
        nextAction: "Validate listing, review pricing, and approve export."
      });
    }
  }
  for (const row of input.publishReviews ?? []) {
    const gates = (row.gates ?? {}) as Record<string, unknown>;
    if (gates.human_approved !== true) {
      items.push({
        id: String(row.id),
        type: "publish_review",
        title: `Publish review ${String(row.product_draft_id ?? row.productDraftId ?? row.id)}`,
        status: rowStatus(row) || "approval_required",
        sourceLabel: "rules_based",
        createdBy: "publish_guardrails",
        riskFlags: [],
        preview: "Publish or sync remains blocked until owner approval and every gate passes.",
        nextAction: "Review gates before export or guarded sync."
      });
    }
  }
  return items.slice(0, 25);
}

export function runAgenticPodWorkflow(input: {
  runMode?: AgenticRunMode | undefined;
  trends?: Array<Record<string, unknown>> | undefined;
  clusters?: Array<Record<string, unknown>> | undefined;
  businessProfile?: Partial<BusinessProfileInput> | null | undefined;
  channels?: Array<Record<string, unknown>> | undefined;
  podCandidates?: Array<Record<string, unknown>> | undefined;
  listingDrafts?: Array<Record<string, unknown>> | undefined;
  assets?: Array<Record<string, unknown>> | undefined;
  mockups?: Array<Record<string, unknown>> | undefined;
  publishReviews?: Array<Record<string, unknown>> | undefined;
  aiOutputs?: Array<Record<string, unknown>> | undefined;
  aiProviderConfigured?: boolean | undefined;
  imageProviderConfigured?: boolean | undefined;
  shopifyStatus?: string | undefined;
  printifyStatus?: string | undefined;
  googleStatus?: string | undefined;
  merchantStatus?: string | undefined;
}) {
  const sourceLabel: SourceLabel = "rules_based";
  const approvedAssets = (input.assets ?? []).filter((asset) => asset.approved_for_mockup === true || asset.approvedForMockup === true).length;
  const approvedMockups = (input.mockups ?? []).filter((mockup) => mockup.approved_for_product === true || mockup.approvedForProduct === true).length;
  const trendReport = createTrendReportDraft({ trends: input.trends, clusters: input.clusters, businessProfile: input.businessProfile, sourceLabel });
  const productIdeas = createProductIdeasFromTrendReport({ trendReport, businessProfile: input.businessProfile, sourceLabel });
  const firstIdea = productIdeas[0] ?? (input.podCandidates?.[0] as Record<string, unknown> | undefined);
  const designConcept = createDesignConceptDraft({ productIdea: firstIdea, businessProfile: input.businessProfile, sourceLabel });
  const imagePlan = createImageGenerationPlan({ designConcept, imageProviderConfigured: input.imageProviderConfigured });
  const mockupPlan = createMockupPlanDraft({ productIdea: firstIdea, approvedAssets, sourceLabel });
  const listingDraft = createListingDraftFromProductIdea({ productIdea: firstIdea, businessProfile: input.businessProfile, approvedAssets, approvedMockups, sourceLabel });
  const pricingReport = calculatePricing({ salePrice: 0, baseProductCost: 0, shippingCost: 0, platformFeePercent: 6.5, paymentFeePercent: 3, fixedTransactionFee: 0.3 });
  const socialDraft = createSocialDraft({
    channelType: asText(input.channels?.[0]?.channel_type ?? input.channels?.[0]?.channelType, "instagram"),
    businessName: input.businessProfile?.publicBrandName,
    productTitle: asText(firstIdea?.title, "Salty Cowhide POD product"),
    sourceLabel
  });
  const launchBlockers = [
    input.shopifyStatus !== "connected" && "Shopify is not verified.",
    input.printifyStatus !== "connected" && "Printify is not verified.",
    input.googleStatus !== "connected" && "Google data sources need sync/test before connected status.",
    input.merchantStatus !== "connected" && "Merchant Center setup needs owner verification before feed actions."
  ].filter(Boolean) as string[];
  const outputs: AgenticOutput[] = [
    {
      outputType: "trend_report",
      title: trendReport.reportTitle,
      body: trendReport.sourceSummary,
      status: trendReport.approvalStatus,
      sourceLabel: trendReport.generatedBy,
      employeeKey: "trend_report_writer",
      requiresHumanReview: true,
      approvalRequired: trendReport.blockers.length === 0,
      blockers: trendReport.blockers,
      riskFlags: trendReport.riskCautions,
      nextAction: trendReport.blockers.length ? "Add manual or approved trend source data." : "Approve, reject, or request changes.",
      data: trendReport
    },
    {
      outputType: "product_idea_recommendations",
      title: productIdeas.length ? "Product ideas from trend report" : "Product ideas need trend inputs",
      body: productIdeas.length ? `${productIdeas.length} POD product idea drafts are ready for owner review.` : "No product ideas were generated because no trend report data is available.",
      status: productIdeas.length ? "needs_review" : "setup_needed",
      sourceLabel,
      employeeKey: "product_strategy_assistant",
      requiresHumanReview: true,
      approvalRequired: productIdeas.length > 0,
      blockers: productIdeas.length ? [] : ["trend_report_required"],
      riskFlags: productIdeas.flatMap((idea) => idea.riskFlags),
      nextAction: productIdeas.length ? "Approve product ideas before design concepts." : "Generate or import a trend report first.",
      data: { productIdeas }
    },
    {
      outputType: "design_concept",
      title: designConcept.conceptTitle,
      body: designConcept.prompt,
      status: designConcept.generationStatus,
      sourceLabel: designConcept.sourceLabel,
      employeeKey: "design_concept_assistant",
      requiresHumanReview: true,
      approvalRequired: designConcept.riskFlags.length === 0,
      blockers: designConcept.riskFlags.length ? ["design_prompt_risk_review_required"] : [],
      riskFlags: designConcept.riskFlags,
      nextAction: "Review prompt and approve before image generation.",
      data: designConcept
    },
    {
      outputType: "image_generation_request",
      title: "Image generation prompt draft",
      body: imagePlan.message,
      status: imagePlan.status,
      sourceLabel,
      employeeKey: "image_generation_assistant",
      requiresHumanReview: true,
      approvalRequired: imagePlan.status === "approval_required",
      blockers: imagePlan.status === "provider_not_configured" ? ["image_provider_not_configured"] : imagePlan.status === "blocked_by_guardrail" ? ["prompt_blocked"] : [],
      riskFlags: designConcept.riskFlags,
      nextAction: imagePlan.status === "provider_not_configured" ? "Configure image provider or upload artwork manually." : "Owner must approve a generation request.",
      data: imagePlan
    },
    {
      outputType: "mockup_plan",
      title: "Mockup plan",
      body: `${mockupPlan.plans.length} mockup plan drafts prepared. Images are not generated unless a provider/manual upload path is used.`,
      status: mockupPlan.status,
      sourceLabel: mockupPlan.sourceLabel,
      employeeKey: "mockup_planning_assistant",
      requiresHumanReview: true,
      approvalRequired: true,
      blockers: mockupPlan.blockers,
      riskFlags: [],
      nextAction: "Approve artwork, then create or upload mockups.",
      data: mockupPlan
    },
    {
      outputType: "listing_draft",
      title: asText((listingDraft.draft as Record<string, unknown>).title, "Listing draft"),
      body: asText((listingDraft.draft as Record<string, unknown>).description, "Listing draft created for review."),
      status: listingDraft.validation.status,
      sourceLabel: listingDraft.sourceLabel,
      employeeKey: "product_listing_assistant",
      requiresHumanReview: true,
      approvalRequired: true,
      blockers: listingDraft.validation.blockers,
      riskFlags: listingDraft.validation.blockers.filter((blocker) => /safety|restricted|disclosure|asset|mockup/i.test(blocker)),
      nextAction: "Resolve blockers before export or guarded sync.",
      data: listingDraft
    },
    {
      outputType: "pricing_margin_report",
      title: "Pricing and margin check",
      body: "Manual or provider-imported cost inputs are required before pricing can be accepted.",
      status: "manual_input_required",
      sourceLabel: "rules_based",
      employeeKey: "pricing_margin_assistant",
      requiresHumanReview: true,
      approvalRequired: true,
      blockers: ["manual_or_provider_cost_required"],
      riskFlags: pricingReport.warnings,
      nextAction: "Enter Printify/manual base cost, shipping, and sale price.",
      data: { pricingReport, costSource: "manual_estimate_required" }
    },
    {
      outputType: "social_content_draft",
      title: socialDraft.title,
      body: socialDraft.body,
      status: socialDraft.status,
      sourceLabel: socialDraft.sourceLabel,
      employeeKey: "social_content_assistant",
      requiresHumanReview: true,
      approvalRequired: true,
      blockers: [],
      riskFlags: [],
      nextAction: "Owner review required before manual publishing.",
      data: socialDraft
    },
    {
      outputType: "launch_readiness_check",
      title: "Launch infrastructure readiness",
      body: launchBlockers.length ? launchBlockers.join(" ") : "Configured providers still require approval gates before any provider write.",
      status: launchBlockers.length ? "setup_needed" : "ready_for_owner_review",
      sourceLabel: "rules_based",
      employeeKey: "operations_checklist_assistant",
      requiresHumanReview: true,
      approvalRequired: false,
      blockers: launchBlockers,
      riskFlags: [],
      nextAction: "Resolve setup blockers; do not publish, sync, submit feeds, or change DNS without owner approval.",
      data: {
        shopifyStatus: input.shopifyStatus ?? "not_configured",
        printifyStatus: input.printifyStatus ?? "not_configured",
        googleStatus: input.googleStatus ?? "not_configured",
        merchantStatus: input.merchantStatus ?? "not_configured",
        forbiddenProviderActions: ["publish_products", "create_printify_products", "submit_merchant_feeds", "post_social_content", "spend_money", "change_dns_records"]
      }
    }
  ];
  return {
    runMode: input.runMode ?? "daily_pod_planning",
    sourceLabel,
    status: "draft_outputs_created",
    forbiddenActions: [...forbiddenEmployeeActions],
    costGuardrails: {
      modelProviderConfigured: Boolean(input.aiProviderConfigured),
      imageProviderConfigured: Boolean(input.imageProviderConfigured),
      repeatedProviderLoopsAllowed: false,
      paidProviderCallsRequireExplicitOwnerRun: true
    },
    outputs,
    approvalQueue: createAgenticApprovalQueue({
      agentOutputs: outputs,
      aiOutputs: input.aiOutputs,
      podCandidates: input.podCandidates,
      listingDrafts: input.listingDrafts,
      assets: input.assets,
      mockups: input.mockups,
      publishReviews: input.publishReviews
    })
  };
}

export function validateGoogleConfiguration(input: { ga4PropertyId?: string; searchConsoleSiteUrl?: string; gbpAccountId?: string; gbpLocationId?: string }) {
  const blockers: string[] = [];
  if (input.ga4PropertyId && !/^\d+$/.test(input.ga4PropertyId)) blockers.push("ga4_property_id_must_be_numeric");
  const gsc = input.searchConsoleSiteUrl ?? "";
  if (gsc && !gsc.startsWith("sc-domain:")) {
    try {
      const parsed = new URL(gsc);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid");
    } catch {
      blockers.push("search_console_property_must_be_url_or_sc_domain");
    }
  }
  for (const [key, value] of Object.entries({ gbpAccountId: input.gbpAccountId, gbpLocationId: input.gbpLocationId })) {
    if (value && /123456789|987654321|example|placeholder/i.test(value)) blockers.push(`${key}_placeholder_rejected`);
  }
  return { ok: blockers.length === 0, blockers };
}

export function deriveNextBestActions(input: { businessProfileScore?: number; channelScore?: number; googleStatus?: string; baselineStatus?: string; podCandidates?: number; listingDrafts?: number; storageStatus?: string; shopifyStatus?: string; printifyStatus?: string; pendingMockups?: number; assets?: number; mockups?: number; approvedProducts?: number; readyDrafts?: number; trendReports?: number; designConcepts?: number; approvalQueueItems?: number }) {
  const commerceConfigured = input.shopifyStatus === "connected" && input.printifyStatus === "connected";
  return [
    !input.trendReports && { title: "Generate or approve trend report", href: "/studio/trends", reason: "AI employees need owner-reviewed trend direction before product strategy." },
    !input.podCandidates && { title: "Create or approve product ideas", href: "/studio/pod-migration", reason: "No POD product ideas are ready for the builder yet." },
    !input.designConcepts && { title: "Generate or approve design concepts", href: "/studio/briefs", reason: "Approved concepts unlock image prompts and artwork workflows." },
    !input.assets && { title: "Generate or upload artwork", href: "/studio/assets", reason: input.storageStatus === "connected" ? "Artwork is required before mockups and product drafts." : "Artwork is required; private storage must be configured for live uploads." },
    !input.mockups && { title: "Approve assets and mockups", href: "/studio/mockups", reason: "Approved mockups are required before POD listing review." },
    !input.listingDrafts && { title: "Create listing draft", href: "/studio/listing-drafts", reason: "No export-ready listing drafts exist." },
    { title: "Check margin", href: "/studio/pricing", reason: "Pricing and margin must be reviewed before owner approval." },
    !commerceConfigured && { title: "Configure Shopify / Printify / Google / Merchant", href: "/studio/integrations", reason: "Guarded export, analytics, and launch infrastructure need verified providers." },
    !input.approvedProducts && { title: "Approve exports or guarded syncs", href: "/studio/publish", reason: "Owner approval gates must pass before export or sync." },
    commerceConfigured && (input.readyDrafts ?? input.listingDrafts ?? 0) > 0 && { title: "Export or sync approved draft", href: "/studio/publish", reason: "Provider sync remains guarded by approval gates." },
    input.baselineStatus !== "captured" && { title: "Track impact", href: "/studio/baseline", reason: "Baseline & Impact needs a starting snapshot." },
    (input.approvalQueueItems ?? 0) > 0 && { title: "Review AI approval queue", href: "/studio/ai-employees", reason: "AI employee outputs are waiting for approve, reject, or request changes." },
    (input.businessProfileScore ?? 0) < 90 && { title: "Complete Business Profile", href: "/studio/settings/business-profile", reason: "Business readiness is incomplete." },
    (input.channelScore ?? 0) < 80 && { title: "Add social and sales channels", href: "/studio/channels", reason: "Channel completeness is below target." },
    input.googleStatus !== "connected" && { title: "Connect Google Data", href: "/studio/integrations", reason: "Google data sources are not verified." },
    (input.pendingMockups ?? 0) > 0 && { title: "Approve pending mockups", href: "/studio/mockups", reason: "Mockups are waiting for owner review." }
  ].filter(Boolean) as Array<{ title: string; href: string; reason: string }>;
}
