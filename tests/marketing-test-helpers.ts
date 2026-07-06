import type {
  ModelRuntimeProvider,
  ModelStructuredInput,
  ModelStructuredResult,
  ModelTextInput,
  ModelTextResult,
  ProviderCheck
} from "@saltyfactory/ai-free";
import { createMarketingLaunchPlan, ensureSaltyCowhideBrandVoiceProfile } from "@saltyfactory/ai-free";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { ensureSaltyCowhideTrendProfile } from "@saltyfactory/integrations";

export const marketingWorkspaceId = "wks_default";
export const marketingActorId = "marketing_owner";

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export async function seedApprovedMarketingConcept(input: {
  repos: RepositoryBundle;
  workspaceId?: string;
  actorId?: string;
  title?: string;
}) {
  const workspaceId = input.workspaceId ?? marketingWorkspaceId;
  const actorId = input.actorId ?? marketingActorId;
  const profile = await ensureSaltyCowhideTrendProfile({
    repos: input.repos,
    workspaceId,
    actorId
  });
  const clusterId = "tcluster_marketing_seed";
  const scoreId = "tscore_marketing_seed";
  const citationId = "citation_marketing_seed";
  const conceptId = "concept_marketing_seed";

  await input.repos.trendIntelligence.citations.create({
    id: citationId,
    workspace_id: workspaceId,
    entity_type: "trend_cluster",
    entity_id: clusterId,
    source_id: null,
    source_key: "etsy_v3",
    citation_url: "https://www.etsy.com/listing/marketing-seed",
    captured_at: new Date().toISOString(),
    raw_snapshot: {
      title: "Coastal Cowgirl Pearl Car Charm",
      sourceKey: "etsy_v3"
    },
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await input.repos.trendIntelligence.clusters.create({
    id: clusterId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    label: "Coastal Cowgirl Pearl Charm",
    name: "Coastal Cowgirl Pearl Charm",
    summary: "Cross-signal coastal cowgirl charm and gifting direction for boutique accessories.",
    member_signal_ids: [],
    signal_ids: [],
    source_keys: ["etsy_v3"],
    keyword_terms: ["coastal cowgirl", "pearl charm", "car charm"],
    motif_terms: ["cowgirl", "pearl", "turquoise", "shell"],
    citation_ids: [citationId],
    signal_count: 1,
    cross_source_count: 1,
    first_observed_at: new Date().toISOString(),
    last_observed_at: new Date().toISOString(),
    status: "approved",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await input.repos.trendIntelligence.scores.create({
    id: scoreId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    cluster_id: clusterId,
    total_score: "88.00",
    confidence_score: "82.00",
    component_scores: {
      freshness: 9,
      keyword_match_strength: 10,
      visual_motif_match: 9,
      cross_source_confirmation: 6,
      buyer_intent_strength: 5,
      productability: 9,
      personalization_potential: 8,
      seasonality_fit: 7,
      brand_fit: 10,
      risk_ip_concern: 0,
      fulfillment_fit: 8,
      confidence: 7
    },
    reasons: ["Strong boutique accessory fit.", "Trend language maps to Salty Cowhide profile."],
    warnings: [],
    risk_flags: [],
    recommended_action: "promote_to_concept",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await input.repos.trendIntelligence.concepts.create({
    id: conceptId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    cluster_id: clusterId,
    trend_score_id: scoreId,
    title: input.title ?? "Coastal Cowgirl Pearl Charm Collection",
    customer_segment: "Coastal cowgirl gifting buyer",
    product_category: "accessories",
    suggested_product_types: ["car charms", "keychains", "ornaments"],
    personalization_potential: "high",
    phrases: ["coastal cowgirl", "vitamin sea", "pearl charm"],
    visual_motifs: ["pearl", "turquoise", "cowgirl hat", "shell"],
    palette: ["sand", "turquoise", "blush pink"],
    print_style: "layered acrylic charm layout",
    recommended_blank_or_base_product: "clear acrylic charm base",
    margin_hypothesis: "Healthy margin when bundled with giftable add-ons.",
    source_evidence: {
      cluster_id: clusterId,
      source_keys: ["etsy_v3"],
      signal_ids: [],
      citation_ids: [citationId],
      evidence_summary: "Approved concept grounded in persisted Etsy boutique-accessory trend evidence."
    },
    reason_it_may_sell: "Giftable western-coastal accessory language aligns with proven boutique discovery patterns.",
    risk_notes: "Owner review required before public use.",
    owner_action_needed: "approve",
    review_status: "approved",
    created_by_kind: "ollama_agent",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  return {
    profileId: String(profile.id),
    clusterId,
    scoreId,
    citationId,
    conceptId
  };
}

export async function seedMarketingLaunchPlan(input: {
  repos: RepositoryBundle;
  workspaceId?: string;
  actorId?: string;
  title?: string;
  campaignType?: string;
  spendType?: string;
}) {
  const workspaceId = input.workspaceId ?? marketingWorkspaceId;
  const actorId = input.actorId ?? marketingActorId;
  const concept = await seedApprovedMarketingConcept({
    repos: input.repos,
    workspaceId,
    actorId,
    ...(input.title ? { title: input.title } : {})
  });
  const brandVoice = await ensureSaltyCowhideBrandVoiceProfile({
    repos: input.repos,
    workspaceId,
    actorId
  });
  const launchPlan = await createMarketingLaunchPlan({
    repos: input.repos,
    workspaceId,
    actorId,
    sourceEntityType: "product_concept_candidate",
    sourceEntityId: concept.conceptId,
    brandVoiceProfileId: text(brandVoice.id),
    launchName: "Seeded Marketing Launch",
    campaignType: input.campaignType ?? "hybrid",
    spendType: input.spendType ?? "owner_time_only"
  });
  return {
    ...concept,
    brandVoiceProfileId: text(brandVoice.id),
    launchPlanId: text(launchPlan.id)
  };
}

export function marketingLaunchToolCalls(launchPlanId: string) {
  const namedCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [
    { name: "read_brand_voice_profile", arguments: {} },
    { name: "read_approved_product_or_concept", arguments: { launchPlanId } },
    { name: "read_trend_evidence_for_product", arguments: { launchPlanId } },
    { name: "read_product_readiness_data", arguments: { launchPlanId } },
    { name: "calculate_product_margin", arguments: { launchPlanId } },
    { name: "draft_organic_launch_plan", arguments: { launchPlanId } },
    { name: "draft_seo_pdp_recommendations", arguments: { launchPlanId } },
    { name: "draft_social_content", arguments: { launchPlanId } },
    { name: "draft_pinterest_organic_plan", arguments: { launchPlanId } },
    { name: "draft_email_sms_drafts", arguments: { launchPlanId } },
    { name: "draft_marketplace_seo_suggestions", arguments: { launchPlanId } },
    { name: "draft_outreach_drafts", arguments: { launchPlanId } },
    { name: "draft_positioning_statement", arguments: { launchPlanId } },
    { name: "draft_offer_hypotheses", arguments: { launchPlanId } },
    { name: "draft_audience_hypotheses", arguments: { launchPlanId } },
    { name: "draft_ad_angles", arguments: { launchPlanId } },
    { name: "draft_ad_copy_variants", arguments: { launchPlanId } },
    { name: "draft_creative_briefs", arguments: { launchPlanId } },
    { name: "calculate_budget_recommendation", arguments: { launchPlanId } },
    { name: "compile_campaign_build_sheet", arguments: { launchPlanId } },
    { name: "run_policy_review", arguments: { launchPlanId } },
    {
      name: "save_marketing_output_for_review",
      arguments: {
        launchPlanId,
        summary: "Created a full owner-reviewable launch package with no-spend and paid-draft paths.",
        warnings: ["All outputs remain draft-only until owner approval."]
      }
    }
  ];

  return namedCalls.map((call, index) => ({
    id: `marketing_call_${index + 1}`,
    name: call.name,
    arguments: call.arguments
  }));
}

export function marketingFinalJson(launchPlanId: string) {
  return JSON.stringify({
    launchPlanId,
    approvalRequestIds: [],
    summary: "Launch package drafted for owner review.",
    warnings: ["Manual approval is still required before any public or paid action."],
    counts: {
      organicContentDraftCount: 10,
      lifecycleFlowCount: 3,
      positioningCount: 1,
      offerCount: 2,
      audienceHypothesisCount: 2,
      adAngleCount: 2,
      adCopyVariantCount: 4,
      creativeBriefCount: 3,
      policyReviewCount: 1,
      budgetRecommendationCount: 1,
      mediaPlanDraftCount: 1,
      campaignDraftCount: 2,
      approvalRequestCount: 12
    }
  });
}

export class ScriptedMarketingProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  calls: ModelTextInput[] = [];

  constructor(private readonly responses: ModelTextResult[]) {}

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    this.calls.push(input);
    return this.responses.shift() ?? {
      ok: false,
      providerUsed: "ollama",
      modelUsed: "qwen3:8b",
      error: { code: "ollama_invalid_response", message: "No scripted marketing response." }
    };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return this.generateText(input) as Promise<ModelStructuredResult<T>>;
  }
}
