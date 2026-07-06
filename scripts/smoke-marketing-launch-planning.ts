import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelRuntimeProvider } from "@saltyfactory/ai-free";
import {
  createMarketingLaunchPlan,
  ensureMarketingSourceRegistry,
  ensureSaltyCowhideBrandVoiceProfile,
  enqueueLocalOllamaAgentRun,
  getMarketingLaunchPlanDetail,
  listAgentTranscript
} from "@saltyfactory/ai-free";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { ensureSaltyCowhideTrendProfile } from "@saltyfactory/integrations";
import { loadLocalEnv } from "./smoke-ollama-agent-local";
import { runWorkerOnce } from "../apps/worker/src/index";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const actorId = "smoke_marketing_launch_runner";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

function requireSmokeEnabled() {
  if (process.env.RUN_MARKETING_LAUNCH_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_MARKETING_LAUNCH_SMOKE is not true" }, null, 2));
    process.exit(0);
  }
}

async function assertOllamaReady() {
  const tags = await fetch(`${baseUrl}/api/tags`).catch(() => null);
  if (!tags?.ok) throw new Error(JSON.stringify({ ok: false, code: "ollama_unavailable", message: "Ollama tags endpoint is not available." }));
  const body = await tags.json().catch(() => ({}));
  const models = Array.isArray(body.models) ? body.models : [];
  const hasModel = models.some((entry: Record<string, unknown>) => entry.name === model || entry.model === model);
  if (!hasModel) {
    const show = await fetch(`${baseUrl}/api/show`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model })
    }).catch(() => null);
    if (!show?.ok) throw new Error(JSON.stringify({ ok: false, code: "ollama_model_missing", model, message: "Configured Ollama model is not available locally." }));
  }
}

async function createApprovedMarketingConceptFixture(repos: RepositoryBundle) {
  const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
  const citationId = "citation_marketing_smoke";
  const clusterId = "tcluster_marketing_smoke";
  const scoreId = "tscore_marketing_smoke";
  const conceptId = "concept_marketing_smoke";

  await repos.trendIntelligence.citations.create({
    id: citationId,
    workspace_id: workspaceId,
    entity_type: "trend_cluster",
    entity_id: clusterId,
    source_id: null,
    source_key: "etsy_v3",
    citation_url: "https://www.etsy.com/listing/marketing-smoke",
    captured_at: new Date().toISOString(),
    raw_snapshot: {
      sourceKey: "etsy_v3",
      title: "Salty Cowhide Smoke Fixture Citation"
    },
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await repos.trendIntelligence.clusters.create({
    id: clusterId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    label: "Coastal Cowgirl Giftable Charms",
    name: "Coastal Cowgirl Giftable Charms",
    summary: "Smoke fixture cluster for coastal western charms, gifting, and boutique accessory positioning.",
    member_signal_ids: [],
    signal_ids: [],
    source_keys: ["etsy_v3"],
    keyword_terms: ["coastal cowgirl", "giftable charm", "pearl keychain"],
    motif_terms: ["turquoise", "pearl", "cowgirl hat", "shell"],
    citation_ids: [citationId],
    signal_count: 1,
    cross_source_count: 1,
    first_observed_at: new Date().toISOString(),
    last_observed_at: new Date().toISOString(),
    status: "approved",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await repos.trendIntelligence.scores.create({
    id: scoreId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    cluster_id: clusterId,
    total_score: "87.00",
    confidence_score: "81.00",
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
    reasons: ["Boutique accessory fit.", "Grounded in approved trend evidence."],
    warnings: [],
    risk_flags: [],
    recommended_action: "promote_to_concept",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await repos.trendIntelligence.concepts.create({
    id: conceptId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    cluster_id: clusterId,
    trend_score_id: scoreId,
    title: "Coastal Cowgirl Pearl Charm Launch",
    customer_segment: "Coastal cowgirl boutique buyer",
    product_category: "accessories",
    suggested_product_types: ["car charms", "keychains", "ornaments"],
    personalization_potential: "high",
    phrases: ["coastal cowgirl", "vitamin sea", "cowgirl pearl"],
    visual_motifs: ["pearl", "turquoise", "shell", "cowgirl hat"],
    palette: ["sand", "turquoise", "blush pink"],
    print_style: "layered acrylic charm layout",
    recommended_blank_or_base_product: "clear acrylic charm base",
    margin_hypothesis: "Giftable bundles support healthy boutique margins.",
    source_evidence: {
      cluster_id: clusterId,
      source_keys: ["etsy_v3"],
      signal_ids: [],
      citation_ids: [citationId],
      evidence_summary: "Smoke fixture concept grounded in persisted Etsy evidence."
    },
    reason_it_may_sell: "Giftable coastal-western accessory positioning aligns with the approved trend profile.",
    risk_notes: "Owner review required before public use.",
    owner_action_needed: "approve",
    review_status: "approved",
    created_by_kind: "deterministic_fallback",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  return { profileId: String(profile.id), sourceEntityType: "product_concept_candidate" as const, sourceEntityId: conceptId };
}

async function resolveApprovedSourceEntity(repos: RepositoryBundle) {
  const concepts = await repos.trendIntelligence.concepts.listByWorkspace(workspaceId);
  const approvedConcept = concepts.find((row) => text(row.review_status ?? row.reviewStatus) === "approved");
  if (approvedConcept) {
    return {
      sourceEntityType: "product_concept_candidate" as const,
      sourceEntityId: approvedConcept.id,
      profileId: text(approvedConcept.profile_id ?? approvedConcept.profileId)
    };
  }

  const drafts = await repos.draft.listByWorkspace(workspaceId);
  const approvedDraft = drafts.find((row) => {
    const state = text(row.approval_status ?? row.approvalStatus ?? row.status);
    return state === "approved" || state === "ready_for_review";
  });
  if (approvedDraft) {
    return {
      sourceEntityType: "product_draft" as const,
      sourceEntityId: approvedDraft.id,
      profileId: ""
    };
  }

  return createApprovedMarketingConceptFixture(repos);
}

async function ensureMarketingSmokeLaunchPlan(repos: RepositoryBundle) {
  await ensureMarketingSourceRegistry({ repos, workspaceId, actorId });
  const brandVoice = await ensureSaltyCowhideBrandVoiceProfile({ repos, workspaceId, actorId });
  const entity = await resolveApprovedSourceEntity(repos);
  const existing = await repos.marketing.listLaunchPlansBySourceEntity(workspaceId, entity.sourceEntityType, entity.sourceEntityId);
  if (existing.length) {
    const latest = existing.sort((left, right) =>
      text(right.updated_at ?? right.updatedAt ?? right.created_at ?? right.createdAt)
        .localeCompare(text(left.updated_at ?? left.updatedAt ?? left.created_at ?? left.createdAt))
    )[0]!;
    return {
      launchPlanId: latest.id,
      brandVoiceProfileId: text(brandVoice.id),
      sourceEntityType: entity.sourceEntityType,
      sourceEntityId: entity.sourceEntityId
    };
  }

  const launchPlan = await createMarketingLaunchPlan({
    repos,
    workspaceId,
    actorId,
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId,
    brandVoiceProfileId: text(brandVoice.id),
    launchName: "Smoke Marketing Launch Package",
    campaignType: "hybrid",
    spendType: "owner_time_only"
  });

  return {
    launchPlanId: text(launchPlan.id),
    brandVoiceProfileId: text(brandVoice.id),
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId
  };
}

function candidateSecrets() {
  return [
    process.env.SHOPIFY_ADMIN_TOKEN,
    process.env.PRINTIFY_API_TOKEN,
    process.env.HF_API_TOKEN,
    process.env.KLAVIYO_API_KEY,
    process.env.MAILCHIMP_API_KEY,
    process.env.META_ACCESS_TOKEN,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
    process.env.PINTEREST_ACCESS_TOKEN,
    process.env.TIKTOK_ACCESS_TOKEN
  ].filter((value): value is string => Boolean(value && value.trim()));
}

export async function runMarketingLaunchSmoke(input: {
  repos?: RepositoryBundle;
  modelProvider?: ModelRuntimeProvider;
} = {}) {
  loadLocalEnv();
  requireSmokeEnabled();
  process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED ||= "true";
  process.env.AI_EMPLOYEES_MODEL_PROVIDER ||= "ollama";
  process.env.AI_EMPLOYEES_AGENT_EXECUTION_MODE ||= "queued";

  if (!input.modelProvider) await assertOllamaReady();

  const repos = input.repos ?? createRepositories();
  const launch = await ensureMarketingSmokeLaunchPlan(repos);
  const queued = await enqueueLocalOllamaAgentRun({
    repos,
    workspaceId,
    actorId,
    roleKey: "marketing_launch_planner",
    taskType: "generate_marketing_launch_package",
    taskInput: {
      launchPlanId: launch.launchPlanId,
      sourceEntityType: launch.sourceEntityType,
      sourceEntityId: launch.sourceEntityId,
      brandVoiceProfileId: launch.brandVoiceProfileId,
      instructions: "Build the full reviewable marketing package using only persisted workspace data and allowlisted tools. Required sequence: draft the package outputs, calculate budget recommendations, compile the campaign build sheet, run policy review, call save_marketing_output_for_review, and only then return final JSON."
    }
  });

  if (!queued.ok) {
    throw new Error(JSON.stringify({
      ok: false,
      code: queued.errorCode ?? "marketing_launch_queue_failed",
      message: queued.message,
      agentRunId: queued.agentRunId ?? null
    }));
  }

  let transcript = null as Awaited<ReturnType<typeof listAgentTranscript>> | null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await runWorkerOnce(undefined, {
      repos,
      ...(input.modelProvider ? { agentModelProvider: input.modelProvider } : {})
    });
    transcript = await listAgentTranscript({ repos, workspaceId, agentRunId: queued.agentRunId });
    const status = text(transcript?.run?.status);
    if (["completed", "blocked", "failed", "incomplete"].includes(status)) break;
  }

  transcript ??= await listAgentTranscript({ repos, workspaceId, agentRunId: queued.agentRunId });
  if (!transcript) throw new Error(JSON.stringify({ ok: false, code: "agent_transcript_missing", agentRunId: queued.agentRunId }));

  const status = text(transcript.run.status);
  if (!["completed", "blocked", "failed", "incomplete"].includes(status)) {
    throw new Error(JSON.stringify({ ok: false, code: "worker_not_running", agentRunId: queued.agentRunId, status }));
  }

  const detail = await getMarketingLaunchPlanDetail({
    repos,
    workspaceId,
    launchPlanId: launch.launchPlanId
  });
  if (!detail) throw new Error(JSON.stringify({ ok: false, code: "launch_plan_detail_missing", launchPlanId: launch.launchPlanId }));
  const runMetadata = (transcript.run.metadata ?? transcript.run["metadata"]) as Record<string, unknown> | undefined;
  const blockingReason = text(
    transcript.run.blocking_reason
    ?? transcript.run.blockingReason
    ?? runMetadata?.blockingReason
  ) || null;
  const errorCode = text(
    transcript.run.error_code
    ?? transcript.run.errorCode
    ?? runMetadata?.errorCode
  ) || null;

  const report = {
    ok: status === "completed",
    status,
    provider: "ollama",
    model: text(transcript.run.model_used ?? transcript.run.modelUsed, model),
    brandVoiceProfileId: launch.brandVoiceProfileId,
    launchPlanId: launch.launchPlanId,
    sourceEntityType: launch.sourceEntityType,
    sourceEntityId: launch.sourceEntityId,
    readinessId: detail.launchPlan.readinessId ?? null,
    organicContentDraftCount: detail.organicContentDrafts.length,
    lifecycleFlowCount: detail.lifecycleCampaignFlows.length,
    positioningCount: detail.positioningStatements.length,
    offerCount: detail.offerHypotheses.length,
    audienceHypothesisCount: detail.audienceHypotheses.length,
    adAngleCount: detail.adAngles.length,
    adCopyVariantCount: detail.adCopyVariants.length,
    creativeBriefCount: detail.creativeBriefs.length,
    policyReviewCount: detail.policyReviewResults.length,
    budgetRecommendationCount: detail.budgetRecommendations.length,
    mediaPlanDraftCount: detail.mediaPlanDrafts.length,
    campaignDraftCount: detail.campaignDrafts.length,
    approvalRequestCount: detail.approvalRequests.length,
    noSpendPlanCreated: detail.organicContentDrafts.length > 0,
    paidDraftPlanCreated: detail.budgetRecommendations.length > 0 && detail.campaignDrafts.length > 0,
    liveAdWritesAttempted: false,
    shopifyMutationsAttempted: false,
    publicPostsAttempted: false,
    emailSendsAttempted: false,
    smsSendsAttempted: false,
    imageGenerationAttempted: false,
    printifyTouched: false,
    hfTouched: false,
    productPublishAttempted: false,
    tokenEchoDetected: false,
    blockingReason,
    errorCode,
    transcriptEventCount: transcript.events.length
  };

  const serialized = JSON.stringify({ ...report, transcript });
  report.tokenEchoDetected = candidateSecrets().some((candidate) => serialized.includes(candidate));
  if (report.tokenEchoDetected) {
    throw new Error(JSON.stringify({ ok: false, code: "marketing_launch_token_echo_detected" }));
  }

  const reportDir = path.resolve(process.cwd(), "test-results", "marketing-launch-planning");
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const report = await runMarketingLaunchSmoke();
  if (!report.ok) {
    throw new Error(JSON.stringify({
      ok: false,
      code: "marketing_launch_smoke_failed",
      status: report.status,
      blockingReason: report.blockingReason
    }));
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch(async (error) => {
    const reportDir = path.resolve(process.cwd(), "test-results", "marketing-launch-planning");
    await mkdir(reportDir, { recursive: true });
    const failure = {
      ok: false,
      code: "marketing_launch_smoke_failed",
      message: error instanceof Error ? error.message : String(error)
    };
    await writeFile(path.join(reportDir, "report.json"), JSON.stringify(failure, null, 2), "utf8");
    console.error(JSON.stringify(failure, null, 2));
    process.exit(1);
  });
}
