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
  ["ai_migration_guide", "AI Migration Guide", ["business_profile", "channels"], ["analyze", "recommend", "generate_checklist", "score_readiness"]],
  ["analytics_analyst", "Analytics Analyst", ["baseline", "google_metrics"], ["analyze", "summarize", "compare_baseline", "recommend"]],
  ["local_seo_assistant", "Local SEO Assistant", ["business_profile", "google_business_profile"], ["analyze", "recommend", "create_internal_draft"]],
  ["content_planner", "Content Planner", ["business_profile", "channels"], ["recommend", "create_social_draft", "create_task"]],
  ["review_summarizer", "Review Summarizer", ["google_business_profile"], ["summarize", "recommend", "create_review_reply_draft"]],
  ["product_listing_assistant", "Product Listing Assistant", ["listing_drafts"], ["create_listing_draft", "flag_issue", "recommend"]],
  ["pod_migration_assistant", "POD Migration Assistant", ["pod_candidates"], ["analyze", "create_listing_draft", "generate_checklist"]],
  ["design_safety_checker", "Design Safety Checker", ["design_assets"], ["flag_issue", "score_readiness", "recommend"]],
  ["pricing_margin_assistant", "Pricing / Margin Assistant", ["pricing_inputs"], ["analyze", "recommend", "flag_issue"]],
  ["social_content_assistant", "Social Content Assistant", ["channels"], ["create_social_draft", "recommend"]],
  ["customer_faq_assistant", "Customer FAQ Assistant", ["business_profile"], ["create_internal_draft", "recommend"]],
  ["campaign_assistant", "Campaign Assistant", ["channels", "listing_drafts"], ["create_social_draft", "create_task", "recommend"]],
  ["dropshipping_product_assistant", "Dropshipping Product Assistant", ["dropship_candidates"], ["analyze", "create_listing_draft", "flag_issue"]],
  ["marketplace_listing_assistant", "Marketplace Listing Assistant", ["channels", "listing_drafts"], ["create_listing_draft", "recommend"]],
  ["operations_checklist_assistant", "Operations Checklist Assistant", ["business_profile"], ["generate_checklist", "create_task", "flag_issue"]]
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
  source: z.enum(["POD migration", "dropshipping", "design workflow", "manual"]).default("manual"),
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
  const isPod = draft.source === "POD migration" || /pod/i.test(draft.productionMethod);
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
    !input.baselineExists && { action: "Create baseline snapshot", href: "/studio/baseline", priority: 4 },
    !input.podCandidates && { action: "Add first POD migration candidate", href: "/studio/pod-migration", priority: 5 }
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

export function createSocialDraft(input: { channelType: string; businessName?: string; productTitle?: string; idea?: string; sourceLabel?: SourceLabel }) {
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

export function deriveNextBestActions(input: { businessProfileScore?: number; channelScore?: number; googleStatus?: string; baselineStatus?: string; podCandidates?: number; listingDrafts?: number; storageStatus?: string; shopifyStatus?: string; printifyStatus?: string; pendingMockups?: number }) {
  return [
    (input.businessProfileScore ?? 0) < 90 && { title: "Complete Business Profile", href: "/studio/settings/business-profile", reason: "Business readiness is incomplete." },
    (input.channelScore ?? 0) < 80 && { title: "Add social and sales channels", href: "/studio/channels", reason: "Channel completeness is below target." },
    input.googleStatus !== "connected" && { title: "Connect Google", href: "/studio/integrations", reason: "Google data sources are not verified." },
    input.baselineStatus !== "captured" && { title: "Create baseline", href: "/studio/baseline", reason: "Impact tracking needs a starting snapshot." },
    !input.podCandidates && { title: "Add POD migration candidate", href: "/studio/pod-migration", reason: "No existing designs are queued for POD migration." },
    !input.listingDrafts && { title: "Create first listing draft", href: "/studio/listing-drafts", reason: "No export-ready listing drafts exist." },
    input.storageStatus !== "connected" && { title: "Configure Supabase Storage", href: "/studio/integrations", reason: "Private asset storage is not verified." },
    input.shopifyStatus !== "connected" && { title: "Configure Shopify", href: "/studio/integrations", reason: "Shopify draft sync is unavailable." },
    input.printifyStatus !== "connected" && { title: "Configure Printify", href: "/studio/integrations", reason: "Printify draft sync is unavailable." },
    (input.pendingMockups ?? 0) > 0 && { title: "Approve pending mockups", href: "/studio/mockups", reason: "Mockups are waiting for owner review." }
  ].filter(Boolean) as Array<{ title: string; href: string; reason: string }>;
}
