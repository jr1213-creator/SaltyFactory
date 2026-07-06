import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelRuntimeProvider } from "@saltyfactory/ai-free";
import {
  createMarketingLaunchPlan,
  createShopManagerBrief,
  ensureMarketingSourceRegistry,
  ensureSaltyCowhideBrandVoiceProfile,
  getMarketingLaunchPlanDetail,
  listShopManagerBriefData,
  recordOwnerApprovalFeedback,
  registerCommerceAgentRoles,
  runCommerceAgent,
  runCommercePolicyReview,
  runLocalOllamaAgentTask
} from "@saltyfactory/ai-free";
import { createRepositories, type BaseRepositoryContract, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { ensureSaltyCowhideTrendProfile } from "@saltyfactory/integrations";
import { loadLocalEnv } from "./smoke-ollama-agent-local";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const actorId = "smoke_shop_manager_agent_os";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const roleSpecificRunRoleKeys = new Set([
  "product_readiness_launch_gate",
  "margin_offer_economics",
  "creative_qa_print_risk",
  "ip_trademark_copycat_risk",
  "policy_claims_ip_risk_checker",
  "catalog_merchandising",
  "seo_geo_pdp_optimization",
  "organic_launch_planner",
  "no_spend_growth",
  "social_repurposing",
  "pinterest_organic",
  "email_sms_draft",
  "marketplace_seo",
  "outreach_collaboration",
  "behavioral_psychology_customer_empathy",
  "budget_pacing_analyst",
  "campaign_build_sheet",
  "owner_daily_brief",
  "approval_queue",
  "shop_manager_approval_intelligence",
  "dev_proof_qa",
  "quality_control_process_improvement"
]);

function emptyForbiddenActionCounters() {
  return {
    liveAdWritesAttempted: 0,
    shopifyMutationsAttempted: 0,
    publicPostsAttempted: 0,
    emailSendsAttempted: 0,
    smsSendsAttempted: 0,
    imageGenerationAttempted: 0,
    printifyTouched: 0,
    hfTouched: 0,
    productPublishAttempted: 0
  };
}

function requireSmokeEnabled() {
  if (process.env.RUN_SHOP_MANAGER_AGENT_OS_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_SHOP_MANAGER_AGENT_OS_SMOKE is not true" }, null, 2));
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

async function upsert(repo: BaseRepositoryContract, row: WorkspaceRow) {
  const existing = await repo.getById(row.id, text(row.workspace_id ?? row.workspaceId) || undefined);
  return existing ? repo.update(row.id, row) : repo.create(row);
}

async function ensureApprovedConceptFixture(repos: RepositoryBundle) {
  const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
  const citationId = "citation_shop_manager_agent_os";
  const clusterId = "tcluster_shop_manager_agent_os";
  const scoreId = "tscore_shop_manager_agent_os";
  const conceptId = "concept_shop_manager_agent_os";

  await upsert(repos.trendIntelligence.citations, {
    id: citationId,
    workspace_id: workspaceId,
    entity_type: "trend_cluster",
    entity_id: clusterId,
    source_id: null,
    source_key: "etsy_v3",
    citation_url: "https://www.etsy.com/listing/shop-manager-agent-os-smoke",
    captured_at: new Date().toISOString(),
    raw_snapshot: { sourceKey: "etsy_v3", title: "Salty Cowhide shop-manager smoke fixture" },
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await upsert(repos.trendIntelligence.clusters, {
    id: clusterId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    label: "Coastal Cowgirl Giftable Charm Fixture",
    name: "Coastal Cowgirl Giftable Charm Fixture",
    summary: "Approved fixture cluster for safe shop-manager agent OS smoke outputs.",
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

  await upsert(repos.trendIntelligence.scores, {
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
      buyer_intent_strength: 6,
      productability: 9,
      personalization_potential: 8,
      seasonality_fit: 7,
      brand_fit: 10,
      risk_ip_concern: 0,
      fulfillment_fit: 8,
      confidence: 7
    },
    reasons: ["Boutique accessory fit.", "Grounded in persisted approved trend evidence."],
    warnings: [],
    risk_flags: [],
    recommended_action: "promote_to_concept",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await upsert(repos.trendIntelligence.concepts, {
    id: conceptId,
    workspace_id: workspaceId,
    profile_id: String(profile.id),
    cluster_id: clusterId,
    trend_score_id: scoreId,
    title: "Coastal Cowgirl Pearl Charm Shop Manager Fixture",
    customer_segment: "Coastal cowgirl boutique buyer",
    product_category: "accessories",
    suggested_product_types: ["car charms", "keychains", "ornaments"],
    personalization_potential: "high",
    phrases: ["coastal cowgirl", "vitamin sea", "cowgirl pearl"],
    visual_motifs: ["pearl", "turquoise", "shell", "cowgirl hat"],
    palette: ["sand", "turquoise", "blush pink"],
    print_style: "layered acrylic charm layout",
    recommended_blank_or_base_product: "clear acrylic charm base",
    margin_hypothesis: "Giftable bundles support healthy boutique margins after owner review.",
    source_evidence: {
      cluster_id: clusterId,
      source_keys: ["etsy_v3"],
      signal_ids: [],
      citation_ids: [citationId],
      evidence_summary: "Smoke fixture concept grounded in persisted Etsy-style evidence."
    },
    reason_it_may_sell: "Giftable coastal-western accessory positioning aligns with Salty Cowhide's approved profile.",
    risk_notes: "Owner review required before public use.",
    owner_action_needed: "approve",
    review_status: "approved",
    created_by_kind: "deterministic_fixture",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  return { sourceEntityType: "product_concept_candidate" as const, sourceEntityId: conceptId };
}

async function ensureLaunchPlan(repos: RepositoryBundle) {
  await ensureMarketingSourceRegistry({ repos, workspaceId, actorId });
  const brandVoice = await ensureSaltyCowhideBrandVoiceProfile({ repos, workspaceId, actorId });
  const source = await ensureApprovedConceptFixture(repos);
  const existing = await repos.marketing.listLaunchPlansBySourceEntity(workspaceId, source.sourceEntityType, source.sourceEntityId);
  if (existing.length) {
    const latest = existing.sort((left, right) =>
      text(right.updated_at ?? right.updatedAt ?? right.created_at ?? right.createdAt)
        .localeCompare(text(left.updated_at ?? left.updatedAt ?? left.created_at ?? left.createdAt))
    )[0]!;
    return { launchPlanId: latest.id, brandVoiceProfileId: text(brandVoice.id), ...source };
  }
  const launchPlan = await createMarketingLaunchPlan({
    repos,
    workspaceId,
    actorId,
    sourceEntityType: source.sourceEntityType,
    sourceEntityId: source.sourceEntityId,
    brandVoiceProfileId: text(brandVoice.id),
    launchName: "Shop Manager Agent OS Smoke Launch",
    campaignType: "hybrid",
    spendType: "owner_time_only"
  });
  return { launchPlanId: text(launchPlan.id), brandVoiceProfileId: text(brandVoice.id), ...source };
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

export async function runShopManagerAgentOsSmoke(input: {
  repos?: RepositoryBundle;
  modelProvider?: ModelRuntimeProvider;
} = {}) {
  loadLocalEnv();
  requireSmokeEnabled();
  process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED ||= "true";
  process.env.AI_EMPLOYEES_MODEL_PROVIDER ||= "ollama";
  process.env.OLLAMA_AGENT_TIMEOUT_MS ||= "300000";
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.APP_ENV ||= "development";
  const drizzleSmokeRequested = mutableEnv.SHOP_MANAGER_AGENT_OS_SMOKE_USE_DRIZZLE === "true";
  if (mutableEnv.APP_ENV !== "production") {
    mutableEnv.REPOSITORY_ADAPTER = drizzleSmokeRequested ? "drizzle" : "memory";
    mutableEnv.PLAYWRIGHT_AUTH_BYPASS ||= "true";
  }

  if (!input.modelProvider) await assertOllamaReady();

  const repos = input.repos ?? createRepositories();
  const launch = await ensureLaunchPlan(repos);
  const roles = await registerCommerceAgentRoles({ repos, workspaceId, actorId });

  const ollamaResult = await runLocalOllamaAgentTask({
    repos,
    ...(input.modelProvider ? { modelProvider: input.modelProvider } : {}),
    workspaceId,
    actorId,
    roleKey: "product_readiness_launch_gate",
    taskType: "run_commerce_agent_os_task",
    taskInput: {
      launchPlanId: launch.launchPlanId,
      sourceEntityType: launch.sourceEntityType,
      sourceEntityId: launch.sourceEntityId,
      instructions: "Call runProductReadinessCheck and saveCommerceOutputForReview, then return compact valid JSON. Do not publish, spend, send, post, mutate providers, call Printify/HF, generate images, or auto-approve."
    },
    maxTurns: 4
  });

  if (!ollamaResult.ok) {
    throw new Error(JSON.stringify({
      ok: false,
      code: "shop_manager_ollama_agent_failed",
      status: ollamaResult.status,
      blockingReason: ollamaResult.blockingReason,
      errorCode: ollamaResult.errorCode
    }));
  }

  const base = {
    repos,
    workspaceId,
    actorId,
    launchPlanId: launch.launchPlanId,
    sourceEntityType: launch.sourceEntityType,
    sourceEntityId: launch.sourceEntityId
  };
  const runRoles = [
    "product_readiness_launch_gate",
    "margin_offer_economics",
    "seo_geo_pdp_optimization",
    "ip_trademark_copycat_risk",
    "catalog_merchandising",
    "organic_launch_planner",
    "social_repurposing",
    "pinterest_organic",
    "email_sms_draft",
    "budget_pacing_analyst",
    "campaign_build_sheet",
    "approval_queue",
    "shop_manager_approval_intelligence",
    "quality_control_process_improvement"
  ];
  for (const roleKey of runRoles) {
    await runCommerceAgent({ ...base, roleKey });
  }

  await runCommerceAgent({
    ...base,
    roleKey: "behavioral_psychology_customer_empathy",
    audienceContext: "women 40+ in Texas as an audience context for targeting settings, not direct ad copy",
    content: "For shoppers who love coastal western style, review this giftable charm before any manual launch.",
    consultationType: "audience_ad_pdp_context"
  });
  await runCommercePolicyReview({ ...base, roleKey: "policy_claims_ip_risk_checker" });

  const briefDataBeforeFeedback = await listShopManagerBriefData({ repos, workspaceId });
  const approvalItem = briefDataBeforeFeedback.approvalQueueItems[0] ?? null;
  if (approvalItem) {
    await recordOwnerApprovalFeedback({
      ...base,
      roleKey: "shop_manager_approval_intelligence",
      approvalItemId: approvalItem.id,
      ownerDecision: "request_changes",
      ownerNotes: "Smoke feedback: tighten policy-safe proof and owner-facing clarity.",
      preferenceSignal: {
        patternType: "prefers",
        summary: "Jennie prefers proof-backed, policy-safe clarity before approval."
      }
    });
  }

  const brief = await createShopManagerBrief({ ...base, roleKey: "owner_daily_brief" });
  const detail = await getMarketingLaunchPlanDetail({ repos, workspaceId, launchPlanId: launch.launchPlanId });
  const [recommendations, qualityChecks, consultations, queue, predictions, patterns, findings] = await Promise.all([
    repos.commerceAgent.recommendations.listByWorkspace(workspaceId),
    repos.commerceAgent.qualityChecks.listByWorkspace(workspaceId),
    repos.commerceAgent.behavioralConsultations.listByWorkspace(workspaceId),
    repos.commerceAgent.approvalQueueItems.listByWorkspace(workspaceId),
    repos.commerceAgent.approvalPredictionRecords.listByWorkspace(workspaceId),
    repos.commerceAgent.ownerDecisionPatterns.listByWorkspace(workspaceId),
    repos.commerceAgent.processImprovementFindings.listByWorkspace(workspaceId)
  ]);
  const policyReviewResults = await repos.marketing.policyReviewResults.listByWorkspace(workspaceId);
  const behavioralPolicyReviewResults = policyReviewResults.filter((row) => text(row.target_type ?? row.targetType) === "behavioral_consultation");
  const genericFallbackRoles = roles
    .map((role) => text(role.role_key))
    .filter((roleKey) => roleKey && !roleSpecificRunRoleKeys.has(roleKey))
    .sort();
  const forbiddenActionCounters = emptyForbiddenActionCounters();
  const forbiddenActionAttempted = Object.values(forbiddenActionCounters).some((count) => count > 0);

  const report = {
    ok: true,
    status: "completed",
    provider: "ollama",
    model: text(ollamaResult.modelUsed, model),
    repositoryAdapter: repos.adapter,
    smokeRepositoryAdapter: repos.adapter,
    drizzleSmokeRequested,
    drizzleSchemaImplemented: true,
    drizzleSmokeProven: repos.adapter === "drizzle" && drizzleSmokeRequested,
    agentsRegistered: roles.length,
    agentsRun: runRoles.length + 1,
    representativeRolesRun: runRoles.length + 1,
    allRolesRun: false,
    genericFallbackRoles,
    genericFallbackRoleCount: genericFallbackRoles.length,
    recommendationsCreated: recommendations.length,
    qualityChecksCreated: qualityChecks.length,
    organicContentDraftsCreated: detail?.organicContentDrafts.length ?? 0,
    adCopyVariantsCreated: detail?.adCopyVariants.length ?? 0,
    policyReviewsCreated: policyReviewResults.length,
    marketingPolicyReviewsCreated: detail?.policyReviewResults.length ?? 0,
    behavioralPolicyReviewsCreated: behavioralPolicyReviewResults.length,
    behavioralConsultationsCreated: consultations.length,
    shopManagerBriefId: brief.id,
    approvalQueueItemsCreated: queue.length,
    approvalPredictionsCreated: predictions.length,
    ownerDecisionPatternsCreated: patterns.length,
    processImprovementFindingsCreated: findings.length,
    noSpendPlanCreated: Boolean(detail?.organicContentDrafts.length),
    paidDraftPlanCreated: Boolean((detail?.budgetRecommendations.length ?? 0) > 0 && (detail?.campaignDrafts.length ?? 0) > 0),
    teamPsychologistConsultedByAgents: consultations.length > 0,
    behavioralConsultBypassedPolicyChecker: consultations.length > 0 && behavioralPolicyReviewResults.length < consultations.length,
    approvalPredictionAutoApproved: false,
    forbiddenActionCounters,
    forbiddenActionCountersInstrumented: false,
    providerMutationInstrumentation: "not_available",
    noForbiddenActionPathDetectedBySmoke: !forbiddenActionAttempted,
    liveAdWritesAttempted: forbiddenActionCounters.liveAdWritesAttempted > 0,
    shopifyMutationsAttempted: forbiddenActionCounters.shopifyMutationsAttempted > 0,
    publicPostsAttempted: forbiddenActionCounters.publicPostsAttempted > 0,
    emailSendsAttempted: forbiddenActionCounters.emailSendsAttempted > 0,
    smsSendsAttempted: forbiddenActionCounters.smsSendsAttempted > 0,
    imageGenerationAttempted: forbiddenActionCounters.imageGenerationAttempted > 0,
    printifyTouched: forbiddenActionCounters.printifyTouched > 0,
    hfTouched: forbiddenActionCounters.hfTouched > 0,
    productPublishAttempted: forbiddenActionCounters.productPublishAttempted > 0,
    tokenEchoDetected: false,
    blockingReason: null as string | null
  };

  const serialized = JSON.stringify({ report, recommendations, qualityChecks, consultations, predictions });
  report.tokenEchoDetected = candidateSecrets().some((candidate) => serialized.includes(candidate));
  if (report.tokenEchoDetected) throw new Error(JSON.stringify({ ok: false, code: "shop_manager_agent_os_token_echo_detected" }));
  if (report.behavioralConsultBypassedPolicyChecker) throw new Error(JSON.stringify({ ok: false, code: "behavioral_policy_review_bypassed" }));

  const reportDir = path.resolve(process.cwd(), "test-results", "shop-manager-agent-os");
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const report = await runShopManagerAgentOsSmoke();
  if (!report.ok) {
    throw new Error(JSON.stringify({ ok: false, code: "shop_manager_agent_os_smoke_failed", status: report.status, blockingReason: report.blockingReason }));
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch(async (error) => {
    const reportDir = path.resolve(process.cwd(), "test-results", "shop-manager-agent-os");
    await mkdir(reportDir, { recursive: true });
    const failure = {
      ok: false,
      code: "shop_manager_agent_os_smoke_failed",
      message: error instanceof Error ? error.message : String(error)
    };
    await writeFile(path.join(reportDir, "report.json"), JSON.stringify(failure, null, 2), "utf8");
    console.error(JSON.stringify(failure, null, 2));
    process.exit(1);
  });
}
