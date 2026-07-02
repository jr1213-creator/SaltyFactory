export const secretKeyPattern = /access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?token|database_url|service_role|shopify_admin_token|printify_api_token|shpat_|sk_live_/i;

export type FeatureClassification =
  | "fully_functional_v1"
  | "honest_foundation_feature"
  | "manual_export_ready_feature"
  | "future_integration_placeholder";

export type SharedWorkspaceRow = {
  id: string;
  workspace_id?: string;
  workspaceId?: string;
  status?: string;
  [key: string]: unknown;
};

export function sanitizeKernelPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeKernelPayload);
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (secretKeyPattern.test(key) || (typeof raw === "string" && secretKeyPattern.test(raw))) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = sanitizeKernelPayload(raw);
  }
  return output;
}

export function safeKernelRecordForClient<T extends Record<string, unknown>>(row: T): T | Pick<T, "id"> & Record<string, unknown> {
  const sanitized = sanitizeKernelPayload(row) as T;
  if (JSON.stringify(sanitized).includes("[redacted]")) {
    return {
      id: row.id,
      workspace_id: row.workspace_id ?? row.workspaceId,
      status: row.status ?? "redacted",
      source_label: row.source_label ?? row.sourceLabel,
      provider: row.provider
    } as Pick<T, "id"> & Record<string, unknown>;
  }
  return sanitized;
}

export function sourceLabelForOrigin(origin: unknown) {
  const labels: Record<string, string> = {
    manual: "Manual entry",
    import: "Imported",
    provider_verified: "Provider verified",
    provider_reported: "Provider reported",
    system_generated: "System-generated",
    rule_based: "Rule-based",
    ai_generated: "AI-generated",
    owner_verified: "Owner verified"
  };
  return labels[String(origin || "manual")] ?? "Manual entry";
}

export const verticalPackDefinitions = [
  {
    id: "vp_pod_boutique",
    key: "pod_boutique",
    name: "POD Boutique",
    description: "Print-on-demand boutique launch and growth operating model.",
    config: {
      terminology: ["product drop", "collection", "buyer", "boutique", "pin", "launch"],
      providers: ["shopify", "printify", "pinterest", "email", "dns", "analytics", "search_console", "google_business_profile_optional"],
      campaignTemplates: [
        "Product Drop Launch",
        "Pinterest Product Push",
        "Jewelry Stack Campaign",
        "Digital Product Upsell",
        "Holiday Ornament Campaign",
        "Coastal Cowgirl Collection Launch",
        "Free Shipping Threshold Campaign",
        "B2G1 Campaign"
      ],
      segmentPresets: ["New Customers", "Repeat Buyers", "VIP Customers", "Jewelry Buyers", "Digital Product Buyers", "Holiday Buyers", "No Purchase Yet", "Wholesale/Boutique Leads"],
      readinessCriteria: ["product page ready", "mockups ready", "offer clear", "shipping threshold clear", "provider configured", "UTM generated", "asset specs complete", "SEO/AEO/GEO basics complete"],
      noAdGrowthPlan: ["Pinterest organic", "SEO/AEO/GEO", "customer email", "social cadence", "review request", "wholesale outreach"]
    }
  },
  {
    id: "vp_ai_readiness_consulting",
    key: "ai_readiness_consulting",
    name: "AI Readiness Consulting",
    description: "Local and small-business AI readiness consulting operating model.",
    config: {
      terminology: ["service", "assessment", "client", "lead", "consultation", "report", "readiness score"],
      providers: ["website", "email", "calendar", "analytics", "search_console", "google_business_profile_optional"],
      campaignTemplates: ["AI Readiness Report Campaign", "Local Business Outreach Campaign", "Consultation Booking Campaign", "Case Study Campaign", "No-Ad Local Trust Campaign", "SEO/AEO/GEO Authority Campaign"],
      segmentPresets: ["New Leads", "Consultation Requests", "Report Buyers", "High-Intent Local Businesses", "Follow-Up Needed", "Past Clients"],
      readinessCriteria: ["landing page clear", "offer clear", "intake form ready", "consultation flow ready", "proof/case study ready", "tracking readiness", "compliance/disclaimer present"],
      noAdGrowthPlan: ["local SEO", "Google Business posts", "email outreach", "referral request", "educational content", "case study proof pack"]
    }
  }
] as const;

export function createVerticalPackSeedRows() {
  return verticalPackDefinitions.map((pack) => ({
    id: pack.id,
    key: pack.key,
    name: pack.name,
    description: pack.description,
    config: pack.config,
    status: "active"
  }));
}

export function createVerticalPackTemplateRows(workspaceId: string, verticalPackKey?: string) {
  return verticalPackDefinitions
    .filter((pack) => !verticalPackKey || pack.key === verticalPackKey)
    .flatMap((pack) => {
      const templates = (pack.config.campaignTemplates as readonly string[]).map((name) => ({
        id: `tpl_${pack.key}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
        workspace_id: workspaceId,
        vertical_pack_id: pack.id,
        template_type: "campaign_template",
        name,
        description: `${name} template for ${pack.name}.`,
        content: { verticalPack: pack.key, sections: ["thesis", "audience", "channels", "proof", "manual_export"] },
        status: "active"
      }));
      const segments = (pack.config.segmentPresets as readonly string[]).map((name) => ({
        id: `seg_${pack.key}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
        workspace_id: workspaceId,
        vertical_pack_id: pack.id,
        name,
        description: `${name} segment preset for ${pack.name}.`,
        entity_type: pack.key === "pod_boutique" ? "customer" : "lead",
        query_definition: { preset: name, dataRequired: name.match(/Buyer|Customer|VIP|Repeat/) ? ["real_customer_or_order_data"] : ["manual_or_form_data"] }
      }));
      return [...templates, ...segments];
    });
}

export function createVerticalPackAutomationRuleRows(workspaceId: string, verticalPackKey?: string) {
  return verticalPackDefinitions
    .filter((pack) => !verticalPackKey || pack.key === verticalPackKey)
    .flatMap((pack) => (pack.config.readinessCriteria as readonly string[]).map((criterion) => ({
      id: `rule_${pack.key}_${criterion.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
      workspace_id: workspaceId,
      vertical_pack_id: pack.id,
      name: `${pack.name}: ${criterion}`,
      trigger: "readiness_check",
      condition: { criterion },
      action: { createRecommendation: true, createTaskWhenBlocked: true },
      active: true
    })));
}

export function buildReadinessScore(input: {
  id?: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  scoreType: string;
  criteria: Array<{ key: string; label: string; passed: boolean; blocker?: string }>;
}) {
  const passed = input.criteria.filter((criterion) => criterion.passed).length;
  const scoreValue = input.criteria.length ? Math.round((passed / input.criteria.length) * 100) : 0;
  const blockers = input.criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.blocker ?? criterion.label);
  return {
    id: input.id ?? `score_${input.scoreType}_${input.entityId}`,
    workspace_id: input.workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    score_type: input.scoreType,
    score_value: scoreValue,
    max_score: 100,
    status: blockers.length ? "setup_needed" : "ready",
    criteria: input.criteria,
    blockers,
    calculated_at: new Date().toISOString()
  };
}

export function buildUtmUrl(input: { baseUrl: string; source: string; medium: string; campaignName: string; term?: string; content?: string }) {
  const url = new URL(input.baseUrl || "https://saltycowhide.com/");
  url.searchParams.set("utm_source", input.source);
  url.searchParams.set("utm_medium", input.medium);
  url.searchParams.set("utm_campaign", input.campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  if (input.term) url.searchParams.set("utm_term", input.term);
  if (input.content) url.searchParams.set("utm_content", input.content);
  return url.toString();
}

export function buildCampaignProofPackContent(input: { campaign: Record<string, unknown>; channels?: Record<string, unknown>[]; readiness?: Record<string, unknown>[]; sourceLabel?: string }) {
  return {
    featureClassification: "manual_export_ready_feature" satisfies FeatureClassification,
    campaignThesis: input.campaign.goal ?? "Create a proof-backed campaign before publishing.",
    productDropOffer: input.campaign.offer ?? input.campaign.manual_offer ?? "Manual offer required.",
    targetAudience: input.campaign.audience ?? "Owner-defined audience required.",
    sourceInputs: [{ label: input.sourceLabel ?? "System-generated", confidence: "rules_based" }],
    noAdPath: ["Pinterest organic", "SEO/AEO/GEO improvements", "email/customer segment", "social cadence"],
    paidAdReadiness: input.readiness ?? [],
    channelPlan: input.channels ?? [],
    manualPublishingChecklist: ["Owner approval", "Provider readiness confirmed", "Assets reviewed", "UTM link copied", "No live API publish in this pass"],
    providerBlockers: ["Live ad/social/email provider execution is intentionally not implemented."],
    ownerReviewNotes: ""
  };
}

export function buildNoAdGrowthPlanContent(campaign: Record<string, unknown>) {
  return {
    featureClassification: "manual_export_ready_feature" satisfies FeatureClassification,
    campaignId: campaign.id,
    title: `${campaign.name ?? "Campaign"} No-Ad Growth Plan`,
    sections: [
      "Pinterest organic",
      "SEO/AEO/GEO",
      "email/customer segment",
      "review/referral",
      "social cadence",
      "wholesale/outreach",
      "content repurposing",
      "landing page fixes",
      "tracking fixes",
      "asset fixes",
      "when to revisit ads"
    ],
    recommendation: "Use this plan before paid ads when tracking, offer clarity, or creative readiness is incomplete."
  };
}

export function buildRecommendationTask(recommendation: Record<string, unknown>, workspaceId: string, actorId?: string) {
  return {
    id: `task_from_${recommendation.id ?? Date.now()}`,
    workspace_id: workspaceId,
    entity_type: String(recommendation.entity_type ?? recommendation.entityType ?? "recommendation"),
    entity_id: String(recommendation.entity_id ?? recommendation.entityId ?? recommendation.id ?? "unknown"),
    title: String(recommendation.title ?? "Review recommendation"),
    description: String(recommendation.body ?? "Converted from recommendation."),
    status: "pending",
    priority: "normal",
    recommendation_id: recommendation.id,
    created_by: actorId
  };
}
