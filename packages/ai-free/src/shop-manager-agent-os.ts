import crypto from "node:crypto";
import { now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import {
  calculateBudgetRecommendation as calculateMarketingBudgetRecommendation,
  calculateProductMargin as calculateMarketingProductMargin,
  compileCampaignBuildSheet,
  draftAdAngles as draftMarketingAdAngles,
  draftAdCopyVariants as draftMarketingAdCopyVariants,
  draftAudienceHypotheses as draftMarketingAudienceHypotheses,
  draftEmailSmsDrafts as draftMarketingEmailSmsDrafts,
  draftMarketplaceSeoSuggestions as draftMarketingMarketplaceSeoSuggestions,
  draftOrganicLaunchPlan as draftMarketingOrganicLaunchPlan,
  draftOutreachDrafts as draftMarketingOutreachDrafts,
  draftPinterestOrganicPlan as draftMarketingPinterestOrganicPlan,
  draftSeoPdpRecommendations as draftMarketingSeoPdpRecommendations,
  draftSocialContent as draftMarketingSocialContent,
  getMarketingLaunchPlanDetail,
  readApprovedProductOrConcept,
  readProductReadinessData as readMarketingProductReadinessData,
  readTrendEvidenceForProduct,
  runPolicyReview as runMarketingPolicyReview
} from "./marketing-launch";

export const COMMERCE_AGENT_INVALID_JSON = "commerce_agent_invalid_json";
export const COMMERCE_AGENT_INVALID_BODY = "commerce_agent_invalid_body";
export const COMMERCE_AGENT_ROLE_DISABLED = "commerce_agent_role_disabled";
export const COMMERCE_AGENT_ROLE_UNKNOWN = "commerce_agent_role_unknown";
export const COMMERCE_AGENT_INVALID_DECISION = "commerce_agent_invalid_decision";

export type CommerceAgentRoleCatalogEntry = {
  role_key: string;
  display_name: string;
  purpose: string;
  allowed_tools: string[];
  forbidden_actions: string[];
  input_entity_types: string[];
  output_entity_types: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  is_enabled: boolean;
};

export type CommerceAgentRunInput = {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  roleKey: string;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
  approvalItemId?: string | undefined;
  recommendationId?: string | undefined;
  content?: string | undefined;
  audienceContext?: string | undefined;
  consultationType?: string | undefined;
  agentRunId?: string | undefined;
};

export type BehavioralConsultationOutput = {
  consultation_type: string;
  customer_context_summary: string;
  customer_motivation_summary: string;
  likely_objections: string[];
  trust_signals_needed: string[];
  friction_points: string[];
  emotional_drivers: string[];
  clarity_improvements: string[];
  ethical_persuasion_notes: string[];
  dark_pattern_risks: string[];
  recommended_framing: string[];
  avoid_framing: string[];
  sensitive_attribute_warnings: string[];
  confidence_score: number;
  requires_policy_review: true;
};

const commonForbiddenActions = [
  "sendEmail",
  "sendSms",
  "publishSocialPost",
  "scheduleSocialPost",
  "mutateShopifyProduct",
  "publishShopifyProduct",
  "createMetaCampaign",
  "createGoogleAdsCampaign",
  "createPinterestCampaign",
  "createTikTokCampaign",
  "changeBudget",
  "activateCampaign",
  "callPrintify",
  "callHuggingFace",
  "generateImage",
  "scrapeWebsite",
  "useBrowserAutomation",
  "autoApprove"
];

const allToolNames = [
  "readApprovedProductOrConcept",
  "readTrendEvidenceForProduct",
  "readMarketingLaunchPlan",
  "readProductReadinessData",
  "readAssetQaData",
  "readMockupData",
  "calculateProductMargin",
  "runProductReadinessCheck",
  "runCreativeQaCheck",
  "runIpTrademarkCheck",
  "draftCatalogMerchandisingRecommendation",
  "draftSeoGeoPdpRecommendation",
  "draftOrganicLaunchPlan",
  "draftSocialContent",
  "draftPinterestOrganicPlan",
  "draftEmailSmsDrafts",
  "draftMarketplaceSeoSuggestions",
  "draftOutreachDrafts",
  "draftAudienceHypotheses",
  "draftAdAngles",
  "draftAdCopyVariants",
  "draftCampaignBuildSheet",
  "consultBehavioralPsychology",
  "runPolicyReview",
  "calculateBudgetRecommendation",
  "prioritizeApprovalQueue",
  "createApprovalPrediction",
  "recordOwnerApprovalFeedback",
  "updateOwnerDecisionPatterns",
  "createShopManagerBrief",
  "createQualityCheck",
  "createProcessImprovementFinding",
  "saveCommerceRecommendation",
  "saveCommerceOutputForReview"
];

const readTools = ["readApprovedProductOrConcept", "readTrendEvidenceForProduct", "readMarketingLaunchPlan", "readProductReadinessData"];
const saveTools = ["saveCommerceRecommendation", "saveCommerceOutputForReview"];
const qualityTools = ["createQualityCheck", "runProductReadinessCheck", "runCreativeQaCheck", "runIpTrademarkCheck"];

function role(
  role_key: string,
  display_name: string,
  purpose: string,
  allowed_tools: string[],
  output_entity_types: string[],
  risk_level: CommerceAgentRoleCatalogEntry["risk_level"] = "medium"
): CommerceAgentRoleCatalogEntry {
  return {
    role_key,
    display_name,
    purpose,
    allowed_tools: [...new Set([...readTools, ...allowed_tools, ...saveTools])],
    forbidden_actions: commonForbiddenActions,
    input_entity_types: ["product_concept_candidate", "product_draft", "listing_draft", "marketing_launch_plan", "approval_queue_item"],
    output_entity_types,
    risk_level,
    is_enabled: true
  };
}

export const commerceAgentRoleCatalog: CommerceAgentRoleCatalogEntry[] = [
  role("product_readiness_launch_gate", "Product Readiness / Launch Gate Agent", "Evaluate whether a product, concept, or listing is ready to move forward.", ["calculateProductMargin", "runProductReadinessCheck"], ["commerce_quality_check", "commerce_recommendation"], "high"),
  role("margin_offer_economics", "Margin & Offer Economics Agent", "Evaluate profitability, offer safety, break-even CPA, and organic-only versus paid-test readiness.", ["calculateProductMargin", "calculateBudgetRecommendation"], ["commerce_recommendation"], "high"),
  role("creative_qa_print_risk", "Creative QA / Print Risk Agent", "Evaluate existing assets and mockups for print and commercial usability without editing or generating images.", ["readAssetQaData", "readMockupData", "runCreativeQaCheck"], ["commerce_quality_check"], "high"),
  role("ip_trademark_copycat_risk", "IP / Trademark / Copycat Risk Agent", "Hard gate IP, trademark, protected brand, song lyric, official/licensed, inspired-by, dupe, and copycat risks.", ["runIpTrademarkCheck", "runPolicyReview"], ["commerce_quality_check"], "critical"),
  role("catalog_merchandising", "Catalog Merchandising Agent", "Suggest collection placement, bundles, cross-sells, seasonal fit, and product-family grouping without mutating Shopify.", ["draftCatalogMerchandisingRecommendation"], ["commerce_recommendation"]),
  role("seo_geo_pdp_optimization", "SEO / GEO / PDP Optimization Agent", "Draft SEO, GEO, answer-ready, structured-data, and PDP conversion recommendations without unsupported claims or Shopify mutation.", ["draftSeoGeoPdpRecommendation", "runPolicyReview"], ["commerce_recommendation", "organic_content_draft"], "high"),
  role("customer_voice_review_mining", "Customer Voice / Review Mining Agent", "Extract buyer language, objections, requests, confusion points, and FAQ ideas from owned customer data when available.", ["saveCommerceRecommendation"], ["commerce_recommendation"]),
  role("returns_support_insight", "Returns / Support Insight Agent", "Identify repeated support, return, refund, shipping, and product-confusion patterns without messaging customers or issuing refunds.", ["saveCommerceRecommendation"], ["commerce_recommendation"]),
  role("supplier_fulfillment_reliability", "Supplier / Fulfillment Reliability Agent", "Evaluate provider and product suitability from available cost, production, shipping, quality, variant, mockup, and brand-fit data.", ["saveCommerceRecommendation", "createQualityCheck"], ["commerce_recommendation", "commerce_quality_check"], "high"),
  role("competitor_pattern", "Competitor Pattern Agent", "Extract market patterns from legitimate data already ingested without scraping or reproducing competitor creative.", ["readTrendEvidenceForProduct", "saveCommerceRecommendation", "runIpTrademarkCheck"], ["commerce_recommendation"], "high"),
  role("experiment_planner", "Experiment Planner Agent", "Turn uncertainty into structured owner-reviewed tests without launching experiments or spending.", ["saveCommerceRecommendation"], ["commerce_recommendation"]),
  role("performance_decision", "Performance Decision Agent", "Read available metrics and recommend keep, pause, refresh, fix, organic-only, paid-test, scale, retire, or watch-longer actions with evidence refs.", ["saveCommerceRecommendation"], ["commerce_recommendation"], "high"),
  role("organic_launch_planner", "Organic Launch Planner Agent", "Create no-spend 7-day, 14-day, and 30-day launch plans with owner-time estimates and zero cash cost.", ["draftOrganicLaunchPlan"], ["organic_content_draft", "commerce_recommendation"]),
  role("social_repurposing", "Social Repurposing Agent", "Draft Instagram, Facebook, carousel, short-form script, hashtag, and owner posting checklist outputs without posting or scheduling.", ["draftSocialContent", "runPolicyReview"], ["organic_content_draft"], "high"),
  role("pinterest_organic", "Pinterest Organic Agent", "Draft pin titles, descriptions, boards, creative suggestions, text overlays, and seasonal pin calendar without publishing pins.", ["draftPinterestOrganicPlan", "runPolicyReview"], ["organic_content_draft"], "high"),
  role("email_sms_draft", "Email/SMS Draft Agent", "Draft subject lines, preview text, email markdown, SMS variants, and lifecycle flows without sending or scheduling.", ["draftEmailSmsDrafts", "runPolicyReview"], ["organic_content_draft", "lifecycle_campaign_flow"], "high"),
  role("marketplace_seo", "Marketplace SEO Agent", "Draft marketplace title, tags, photo-order, description, and refresh recommendations without marketplace mutation.", ["draftMarketplaceSeoSuggestions", "runPolicyReview"], ["organic_content_draft"], "medium"),
  role("outreach_collaboration", "Outreach / Collaboration Agent", "Draft boutique, gift-guide, influencer, event, and partnership outreach templates without sending messages.", ["draftOutreachDrafts", "runPolicyReview"], ["organic_content_draft"], "high"),
  role("no_spend_growth", "No-Spend Growth Agent", "Ensure no-spend strategy and PDP improvement are considered before paid escalation.", ["draftOrganicLaunchPlan", "saveCommerceRecommendation"], ["commerce_recommendation", "organic_content_draft"], "high"),
  role("behavioral_psychology_customer_empathy", "Behavioral Psychology / Customer Empathy Agent", "Consult on ethical customer motivation, objections, trust, clarity, friction, and framing without diagnosis or exploitation.", ["consultBehavioralPsychology", "runPolicyReview"], ["behavioral_consultation"], "high"),
  role("policy_claims_ip_risk_checker", "Policy / Claims / IP Risk Checker", "Rule-first hard gate for unsafe claims, personal-attribute targeting, protected IP, fake proof, fake urgency, and platform-prohibited content.", ["runPolicyReview", "runIpTrademarkCheck", "createQualityCheck"], ["commerce_quality_check", "policy_review_result"], "critical"),
  role("budget_pacing_analyst", "Budget & Pacing Analyst", "Recommendation-only budget and paid-readiness guidance that never spends or changes budgets.", ["calculateBudgetRecommendation", "saveCommerceRecommendation"], ["commerce_recommendation", "budget_recommendation"], "high"),
  role("campaign_build_sheet", "Media Buyer / Campaign Build Sheet Agent", "Create manual campaign build sheets and draft campaign plans only; no ad-platform writes.", ["draftAudienceHypotheses", "draftAdAngles", "draftAdCopyVariants", "draftCampaignBuildSheet", "runPolicyReview"], ["campaign_draft", "media_plan_draft", "commerce_recommendation"], "high"),
  role("owner_daily_brief", "Owner Daily Brief Agent", "Summarize changes, approvals, blockers, risk, progress, and next actions in shop manager brief records.", ["prioritizeApprovalQueue", "createShopManagerBrief"], ["shop_manager_brief"]),
  role("approval_queue", "Approval Queue Agent", "Collect and prioritize all owner decisions with business impact, risk, and next best action.", ["prioritizeApprovalQueue"], ["approval_queue_item"], "high"),
  role("shop_manager_approval_intelligence", "Shop Manager Agent with Approval Intelligence", "Present approval cards, predict likely owner decisions, learn from owner feedback, and never auto-approve.", ["prioritizeApprovalQueue", "createApprovalPrediction", "recordOwnerApprovalFeedback", "updateOwnerDecisionPatterns"], ["approval_prediction_record", "owner_decision_pattern"], "high"),
  role("dev_proof_qa", "Dev Proof / QA Agent", "Review implementation and proof status without modifying code, committing, or pushing.", ["createProcessImprovementFinding"], ["process_improvement_finding"], "medium"),
  role("quality_control_process_improvement", "Quality Control / Process Improvement Agent", "Find recurring process failures and suggest prompt, tool, schema, and workflow improvements without applying them.", ["createProcessImprovementFinding"], ["process_improvement_finding"], "high")
];

export const commerceAgentRoleKeys = commerceAgentRoleCatalog.map((entry) => entry.role_key);

const protectedIpTerms = [
  "disney",
  "barbie",
  "taylor swift",
  "nfl",
  "mlb",
  "ncaa",
  "yellowstone",
  "nike",
  "stetson",
  "stanley",
  "buc-ee",
  "buc ee",
  "celebrity",
  "official",
  "licensed",
  "authentic"
];

const unsafeClaimPatterns: Array<{ code: string; pattern: RegExp; fix: string }> = [
  { code: "protected_ip_term", pattern: /\b(disney|barbie|taylor swift|nfl|mlb|ncaa|yellowstone|nike|stetson|stanley|buc-?ee'?s?|celebrity)\b/i, fix: "Remove protected brand, team, celebrity, or franchise references unless license proof exists." },
  { code: "official_licensed_authentic_claim", pattern: /\b(official|licensed|authentic)\b/i, fix: "Remove official/licensed/authentic claims unless source records prove authorization." },
  { code: "inspired_by_or_dupe", pattern: /\b(inspired by|dupe|knockoff|copycat|counterfeit)\b/i, fix: "Use original product positioning and do not imply affiliation or imitation." },
  { code: "song_lyrics", pattern: /\blyrics?\b|\bline from the song\b/i, fix: "Do not use song lyrics or lyric-like copied phrases." },
  { code: "fake_urgency", pattern: /\bonly\s+\d+\s+left\b|\bends in\s+\d+\s+(minutes?|hours?)\b|\bgoing fast\b/i, fix: "Remove scarcity or urgency unless inventory/system evidence proves it." },
  { code: "fake_social_proof", pattern: /\b5[- ]star\b|\bthousands love\b|\bbest[- ]seller\b|\bcustomer favorite\b/i, fix: "Remove unverified review, bestseller, or testimonial language." },
  { code: "false_material_claim", pattern: /\bgenuine leather\b|\breal leather\b|\bhandmade\b|\bwaterproof\b/i, fix: "Remove material, handmade, or waterproof claims unless product data proves them." },
  { code: "sensitive_personal_attribute", pattern: /\bare you\b.{0,80}\b(woman|women|mom|overweight|divorced|anxious|ptsd|diabetes|disabled|depressed|broke|40\+|over 40)\b/i, fix: "Avoid direct personal-attribute ad copy; frame around style, occasion, or interests instead." },
  { code: "shame_fear_manipulation", pattern: /\b(embarrassed|ashamed|insecure|nobody will love|fix your body|stop looking cheap|fear of missing out)\b/i, fix: "Remove shame, fear, insecurity, and manipulative framing." }
];

const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input.trim() : fallback;
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const asArray = (input: unknown): unknown[] => Array.isArray(input) ? input : [];
const asStringArray = (input: unknown): string[] => Array.isArray(input) ? input.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
const numeric = (input: unknown) => {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};
const truthy = (input: unknown) => input === true || input === "true";
const compact = (input: unknown, maxLength = 320) => {
  const normalized = String(input ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
};
const hash = (input: string) => crypto.createHash("sha1").update(input).digest("hex").slice(0, 14);
const id = (prefix: string, seed?: string) => seed ? `${prefix}_${hash(seed)}` : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function upsertRow(repo: { getById(id: string, workspaceId?: string): Promise<WorkspaceRow | null>; create(row: WorkspaceRow): Promise<WorkspaceRow>; update(id: string, patch: WorkspaceRow): Promise<WorkspaceRow> }, row: WorkspaceRow) {
  const workspaceId = text(row.workspace_id ?? row.workspaceId);
  const existing = await repo.getById(row.id, workspaceId || undefined);
  return existing ? repo.update(row.id, row) : repo.create(row);
}

function roleForKey(roleKey: string) {
  return commerceAgentRoleCatalog.find((entry) => entry.role_key === roleKey) ?? null;
}

function sourceFromInput(input: {
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
}) {
  return {
    sourceEntityType: text(input.sourceEntityType, input.launchPlanId ? "marketing_launch_plan" : "workspace"),
    sourceEntityId: text(input.sourceEntityId, input.launchPlanId ?? "workspace")
  };
}

async function resolveSourceEntity(input: CommerceAgentRunInput) {
  if (input.launchPlanId) {
    const plan = await input.repos.marketing.launchPlans.getById(input.launchPlanId, input.workspaceId);
    if (plan) {
      return {
        sourceEntityType: text(value(plan, "source_entity_type", "sourceEntityType"), "marketing_launch_plan"),
        sourceEntityId: text(value(plan, "source_entity_id", "sourceEntityId"), input.launchPlanId)
      };
    }
  }
  return sourceFromInput(input);
}

async function assertRoleEnabled(input: { repos: RepositoryBundle; workspaceId: string; roleKey: string }) {
  const catalog = roleForKey(input.roleKey);
  if (!catalog) throw new Error(COMMERCE_AGENT_ROLE_UNKNOWN);
  const persisted = await input.repos.commerceAgent.roles.getById(id("crole", input.roleKey), input.workspaceId);
  const enabled = persisted ? value(persisted, "is_enabled", "isEnabled") !== false && text(value(persisted, "status"), "active") !== "disabled" : catalog.is_enabled;
  if (!enabled) throw new Error(COMMERCE_AGENT_ROLE_DISABLED);
  return catalog;
}

export async function registerCommerceAgentRoles(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
}) {
  const rows: WorkspaceRow[] = [];
  for (const entry of commerceAgentRoleCatalog) {
    rows.push(await upsertRow(input.repos.commerceAgent.roles, {
      id: id("crole", entry.role_key),
      workspace_id: input.workspaceId,
      role_key: entry.role_key,
      display_name: entry.display_name,
      purpose: entry.purpose,
      allowed_tools: entry.allowed_tools,
      forbidden_actions: entry.forbidden_actions,
      input_entity_types: entry.input_entity_types,
      output_entity_types: entry.output_entity_types,
      risk_level: entry.risk_level,
      is_enabled: entry.is_enabled,
      status: "active",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null,
      metadata: { source: "shop_manager_agent_os_registry" }
    } as WorkspaceRow));
  }
  return rows.map((row) => safeRole(row));
}

export async function listCommerceAgentRoles(input: { repos: RepositoryBundle; workspaceId: string }) {
  const rows = await input.repos.commerceAgent.roles.listByWorkspace(input.workspaceId);
  return rows.length ? rows.map(safeRole) : commerceAgentRoleCatalog;
}

function safeRole(row: WorkspaceRow): CommerceAgentRoleCatalogEntry {
  return {
    role_key: text(value(row, "role_key", "roleKey")),
    display_name: text(value(row, "display_name", "displayName")),
    purpose: text(value(row, "purpose")),
    allowed_tools: asStringArray(value(row, "allowed_tools", "allowedTools")),
    forbidden_actions: asStringArray(value(row, "forbidden_actions", "forbiddenActions")),
    input_entity_types: asStringArray(value(row, "input_entity_types", "inputEntityTypes")),
    output_entity_types: asStringArray(value(row, "output_entity_types", "outputEntityTypes")),
    risk_level: text(value(row, "risk_level", "riskLevel"), "medium") as CommerceAgentRoleCatalogEntry["risk_level"],
    is_enabled: value(row, "is_enabled", "isEnabled") !== false
  };
}

export async function saveCommerceRecommendation(input: CommerceAgentRunInput & {
  recommendationType: string;
  title: string;
  summary: string;
  rationale: string;
  evidenceRefs?: unknown[] | undefined;
  severity?: string | undefined;
  confidenceScore?: number | undefined;
  expectedImpact?: string | undefined;
  ownerActionNeeded?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}) {
  const source = await resolveSourceEntity(input);
  const row = await upsertRow(input.repos.commerceAgent.recommendations, {
    id: id("crec", `${input.workspaceId}:${input.roleKey}:${source.sourceEntityType}:${source.sourceEntityId}:${input.recommendationType}:${input.title}`),
    workspace_id: input.workspaceId,
    role_key: input.roleKey,
    source_entity_type: source.sourceEntityType,
    source_entity_id: source.sourceEntityId,
    recommendation_type: input.recommendationType,
    title: compact(input.title, 180),
    summary: compact(input.summary, 520),
    rationale: compact(input.rationale, 700),
    evidence_refs: input.evidenceRefs ?? [],
    severity: input.severity ?? "medium",
    confidence_score: (input.confidenceScore ?? 0.62).toFixed(4),
    expected_impact: input.expectedImpact ?? "medium",
    owner_action_needed: input.ownerActionNeeded ?? "review",
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    metadata: input.metadata ?? {}
  } as WorkspaceRow);
  return row;
}

export async function createQualityCheck(input: CommerceAgentRunInput & {
  checkType: string;
  verdict: string;
  score?: number | null | undefined;
  reasons: unknown[];
  fixSuggestions?: unknown[] | undefined;
  evidenceRefs?: unknown[] | undefined;
}) {
  const source = await resolveSourceEntity(input);
  return upsertRow(input.repos.commerceAgent.qualityChecks, {
    id: id("cq", `${input.workspaceId}:${input.roleKey}:${source.sourceEntityType}:${source.sourceEntityId}:${input.checkType}`),
    workspace_id: input.workspaceId,
    role_key: input.roleKey,
    source_entity_type: source.sourceEntityType,
    source_entity_id: source.sourceEntityId,
    check_type: input.checkType,
    verdict: input.verdict,
    score: input.score ?? null,
    reasons: input.reasons,
    fix_suggestions: input.fixSuggestions ?? [],
    evidence_refs: input.evidenceRefs ?? []
  } as WorkspaceRow);
}

export async function readAssetQaData(input: CommerceAgentRunInput & { assetId?: string | undefined }) {
  const assetId = text(input.assetId);
  const draftId = text(input.sourceEntityType) === "product_draft" ? text(input.sourceEntityId) : "";
  const draft = draftId ? await input.repos.draft.getById(draftId, input.workspaceId) : null;
  const resolvedAssetId = assetId || text(value(draft, "asset_id", "assetId"));
  const asset = resolvedAssetId ? await input.repos.asset.getById(resolvedAssetId, input.workspaceId) : null;
  const qaRows = (await input.repos.qa.listByWorkspace(input.workspaceId)).filter((row) =>
    text(value(row, "asset_id", "assetId")) === resolvedAssetId || text(value(row, "source_asset_id", "sourceAssetId")) === resolvedAssetId
  );
  const latestQa = qaRows.sort((left, right) => text(value(right, "updated_at", "updatedAt")).localeCompare(text(value(left, "updated_at", "updatedAt"))))[0] ?? null;
  return {
    asset: asset ? { id: asset.id, qaStatus: value(asset, "qa_status", "qaStatus"), width: value(asset, "width"), height: value(asset, "height"), mimeType: value(asset, "mime_type", "mimeType"), transparentBackground: value(asset, "transparent_background", "transparentBackground") } : null,
    latestQa: latestQa ? { id: latestQa.id, status: value(latestQa, "status"), blockedReasons: value(latestQa, "blocked_reasons", "blockedReasons"), metadata: value(latestQa, "metadata") } : null,
    qaCount: qaRows.length
  };
}

export async function readMockupData(input: CommerceAgentRunInput & { mockupId?: string | undefined }) {
  const mockupId = text(input.mockupId);
  const draftId = text(input.sourceEntityType) === "product_draft" ? text(input.sourceEntityId) : "";
  const draft = draftId ? await input.repos.draft.getById(draftId, input.workspaceId) : null;
  const mockupIds = mockupId ? [mockupId] : asStringArray(value(draft, "mockup_ids", "mockupIds"));
  const mockups = (await Promise.all(mockupIds.map((idValue) => input.repos.mockup.getById(idValue, input.workspaceId)))).filter(Boolean) as WorkspaceRow[];
  return {
    mockupCount: mockups.length,
    mockups: mockups.map((row) => ({
      id: row.id,
      status: value(row, "status"),
      approvedForProduct: value(row, "approved_for_product", "approvedForProduct"),
      productType: value(row, "product_type", "productType"),
      qualityStatus: value(row, "quality_status", "qualityStatus")
    }))
  };
}

export async function readMarketingLaunchPlan(input: CommerceAgentRunInput) {
  const launchPlanId = text(input.launchPlanId);
  if (!launchPlanId) return null;
  return getMarketingLaunchPlanDetail({
    repos: input.repos,
    workspaceId: input.workspaceId,
    launchPlanId
  });
}

export async function runProductReadinessCheck(input: CommerceAgentRunInput) {
  const readiness = await readMarketingProductReadinessData({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    launchPlanId: input.launchPlanId
  });
  const blockers = asStringArray(readiness.blockers);
  const warnings = asStringArray(readiness.warnings);
  const recommendation = blockers.length ? "block" : warnings.length ? "fix_first" : readiness.marketabilityScore >= 80 ? "proceed" : "watch_longer";
  const qualityCheck = await createQualityCheck({
    ...input,
    roleKey: "product_readiness_launch_gate",
    checkType: "product_readiness_launch_gate",
    verdict: blockers.length ? "blocked" : warnings.length ? "warning" : "pass",
    score: readiness.marketabilityScore,
    reasons: [...blockers, ...warnings, `recommendation:${recommendation}`],
    fixSuggestions: blockers.length ? blockers.map((entry) => `Fix ${entry.replace(/_/g, " ")} before launch.`) : warnings.map((entry) => `Review ${entry.replace(/_/g, " ")} before paid escalation.`),
    evidenceRefs: [{ type: "product_marketing_readiness", id: readiness.id }]
  });
  const rec = await saveCommerceRecommendation({
    ...input,
    roleKey: "product_readiness_launch_gate",
    recommendationType: "product_readiness",
    title: "Product readiness launch gate",
    summary: `Readiness score ${readiness.marketabilityScore}; recommendation is ${recommendation}.`,
    rationale: blockers.length ? `Blocked by ${blockers.join(", ")}.` : warnings.length ? `Warnings require owner review: ${warnings.join(", ")}.` : "Core readiness signals are sufficient for owner-reviewed next steps.",
    evidenceRefs: [{ type: "commerce_quality_check", id: qualityCheck.id }, { type: "product_marketing_readiness", id: readiness.id }],
    severity: blockers.length ? "critical" : warnings.length ? "medium" : "low",
    confidenceScore: 0.74,
    expectedImpact: blockers.length ? "avoid unsafe launch movement" : "focus owner review",
    ownerActionNeeded: recommendation,
    metadata: { readiness, recommendation, requiresHumanDecision: true }
  });
  return { readiness, qualityCheck, recommendation: rec, recommendationDecision: recommendation };
}

export async function runMarginOfferEconomics(input: CommerceAgentRunInput) {
  const margin = await calculateMarketingProductMargin({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    launchPlanId: input.launchPlanId
  });
  const estimatedMargin = numeric((margin as Record<string, unknown>).estimatedMargin);
  const paidReady = estimatedMargin != null ? estimatedMargin >= 0.45 : false;
  const output = {
    estimated_margin: estimatedMargin,
    break_even_cpa: estimatedMargin != null ? Math.max(0, estimatedMargin * 18).toFixed(2) : null,
    safe_offers: ["bundle-before-discount", "owner-time-only organic launch"],
    unsafe_offer_warnings: estimatedMargin == null ? ["margin_data_missing"] : estimatedMargin < 0.35 ? ["paid_test_not_safe_until_margin_improves"] : [],
    bundle_recommendations: ["Test giftable two-item bundle only after cost and shipping assumptions are confirmed."],
    paid_readiness: paidReady ? "ready_for_small_manual_paid_test" : "not_ready_for_paid_spend",
    organic_only_recommendation: paidReady ? null : "Use organic-only proof collection before paid escalation."
  };
  const rec = await saveCommerceRecommendation({
    ...input,
    roleKey: "margin_offer_economics",
    recommendationType: "margin_offer_economics",
    title: "Margin and offer economics",
    summary: output.organic_only_recommendation ?? "Margin supports a small owner-reviewed paid test.",
    rationale: "Offer guidance is advisory only and does not change prices, discounts, or budgets.",
    severity: paidReady ? "medium" : "high",
    confidenceScore: estimatedMargin == null ? 0.48 : 0.72,
    ownerActionNeeded: paidReady ? "review_paid_test" : "collect_margin_data",
    metadata: { output, priceMutation: false, discountMutation: false }
  });
  return { output, recommendation: rec };
}

export async function runCreativeQaCheck(input: CommerceAgentRunInput) {
  const assetQa = await readAssetQaData(input);
  const mockupData = await readMockupData(input);
  const reasons: string[] = [];
  const fixes: string[] = [];
  const latestStatus = text((assetQa.latestQa as Record<string, unknown> | null)?.status);
  if (!assetQa.asset) {
    reasons.push("source_asset_missing");
    fixes.push("Attach an approved source asset before launch movement.");
  }
  if (assetQa.asset && latestStatus && latestStatus !== "passed") {
    reasons.push(`asset_qa_${latestStatus}`);
    fixes.push("Review transparent PNG QA, edge cleanup, contrast, and artifact findings.");
  }
  if (!mockupData.mockupCount) {
    reasons.push("mockup_missing");
    fixes.push("Add approved mockups before storefront or ad review.");
  }
  const verdict = reasons.length ? "warning" : "pass";
  const check = await createQualityCheck({
    ...input,
    roleKey: "creative_qa_print_risk",
    checkType: "creative_qa_print_risk",
    verdict,
    score: verdict === "pass" ? 88 : 54,
    reasons: reasons.length ? reasons : ["asset_and_mockup_data_reviewable"],
    fixSuggestions: fixes,
    evidenceRefs: [{ type: "asset_qa", data: assetQa }, { type: "mockups", data: mockupData }]
  });
  return { assetQa, mockupData, qualityCheck: check };
}

export function runRuleBasedPolicyClaimsIpCheck(content: string) {
  const normalized = content.toLowerCase();
  const flags = unsafeClaimPatterns
    .filter((entry) => entry.pattern.test(content))
    .map((entry) => ({ code: entry.code, fix: entry.fix }));
  for (const term of protectedIpTerms) {
    if (normalized.includes(term) && !flags.some((flag) => flag.code === "protected_ip_term")) {
      flags.push({ code: "protected_ip_term", fix: "Remove protected IP terms unless license proof exists." });
    }
  }
  const severity = flags.some((flag) => ["protected_ip_term", "sensitive_personal_attribute", "official_licensed_authentic_claim", "inspired_by_or_dupe"].includes(flag.code))
    ? "critical"
    : flags.length ? "high" : "low";
  return {
    verdict: flags.length ? "blocked" : "pass",
    blocked: flags.length > 0,
    severity,
    policyCodes: flags.map((flag) => flag.code),
    fixSuggestions: flags.map((flag) => flag.fix)
  };
}

function mergePolicyResults(results: Array<ReturnType<typeof runRuleBasedPolicyClaimsIpCheck>>) {
  const policyCodes = [...new Set(results.flatMap((result) => result.policyCodes))];
  const fixSuggestions = [...new Set(results.flatMap((result) => result.fixSuggestions))];
  const blocked = results.some((result) => result.blocked);
  const severity = results.some((result) => result.severity === "critical")
    ? "critical"
    : results.some((result) => result.severity === "high")
      ? "high"
      : blocked ? "high" : "low";
  return {
    verdict: blocked ? "blocked" : "pass",
    blocked,
    severity,
    policyCodes,
    fixSuggestions
  };
}

async function persistCommercePolicyReviewResult(input: CommerceAgentRunInput & {
  targetType: string;
  targetId: string;
  reviewedContent: string;
  policy: ReturnType<typeof mergePolicyResults>;
  evidence?: Record<string, unknown> | undefined;
}) {
  return upsertRow(input.repos.marketing.policyReviewResults, {
    id: id("policy", `${input.workspaceId}:${input.targetType}:${input.targetId}:${hash(input.reviewedContent)}`),
    workspace_id: input.workspaceId,
    target_type: input.targetType,
    target_id: input.targetId,
    platform: null,
    verdict: input.policy.verdict,
    severity: input.policy.severity,
    policy_codes: input.policy.policyCodes,
    evidence: {
      ...(input.evidence ?? {}),
      contentHash: hash(input.reviewedContent),
      reviewedAt: now()
    },
    fix_suggestions: input.policy.fixSuggestions,
    owner_override: null,
    blocked: input.policy.blocked,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow);
}

function behavioralPolicyReviewPayload(input: CommerceAgentRunInput, consultation: BehavioralConsultationOutput) {
  return {
    content: text(input.content),
    audienceContext: text(input.audienceContext),
    customer_context_summary: consultation.customer_context_summary,
    customer_motivation_summary: consultation.customer_motivation_summary,
    likely_objections: consultation.likely_objections,
    trust_signals_needed: consultation.trust_signals_needed,
    friction_points: consultation.friction_points,
    emotional_drivers: consultation.emotional_drivers,
    clarity_improvements: consultation.clarity_improvements,
    ethical_persuasion_notes: consultation.ethical_persuasion_notes,
    recommended_framing: consultation.recommended_framing,
    avoid_framing: consultation.avoid_framing,
    dark_pattern_risks: consultation.dark_pattern_risks,
    sensitive_attribute_warnings: consultation.sensitive_attribute_warnings
  };
}

function behavioralPolicyProposedText(payload: Record<string, unknown>) {
  return [
    payload.content,
    payload.audienceContext,
    payload.customer_context_summary,
    payload.customer_motivation_summary,
    payload.likely_objections,
    payload.trust_signals_needed,
    payload.friction_points,
    payload.emotional_drivers,
    payload.clarity_improvements,
    payload.ethical_persuasion_notes,
    payload.recommended_framing
  ].flatMap((entry) => Array.isArray(entry) ? entry : [entry])
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export async function runBehavioralConsultationPolicyReview(input: CommerceAgentRunInput & {
  consultation: BehavioralConsultationOutput;
  behavioralConsultationId: string;
}) {
  const payload = behavioralPolicyReviewPayload(input, input.consultation);
  const proposedText = behavioralPolicyProposedText(payload);
  const proposedPolicy = runRuleBasedPolicyClaimsIpCheck(proposedText);
  const outputRiskCodes = [
    ...input.consultation.dark_pattern_risks,
    ...input.consultation.sensitive_attribute_warnings.filter((code) => code !== "direct_personal_attribute_copy" || /are you\b/i.test(text(input.content)))
  ];
  const outputPolicy = outputRiskCodes.length
    ? {
      verdict: "blocked" as const,
      blocked: true,
      severity: outputRiskCodes.includes("direct_personal_attribute_copy") || outputRiskCodes.includes("sensitive_personal_attribute") ? "critical" as const : "high" as const,
      policyCodes: outputRiskCodes,
      fixSuggestions: outputRiskCodes.map((code) =>
        code === "direct_personal_attribute_copy"
          ? "Rewrite direct personal-attribute copy into style, occasion, or interest-based framing."
          : `Resolve behavioral policy warning: ${code}.`)
    }
    : {
      verdict: "pass" as const,
      blocked: false,
      severity: "low" as const,
      policyCodes: [],
      fixSuggestions: []
    };
  const policy = mergePolicyResults([proposedPolicy, outputPolicy]);
  const reviewedContent = JSON.stringify(payload);
  const saved = await persistCommercePolicyReviewResult({
    ...input,
    roleKey: "policy_claims_ip_risk_checker",
    targetType: "behavioral_consultation",
    targetId: input.behavioralConsultationId,
    reviewedContent,
    policy,
    evidence: {
      policySource: "behavioral_consultation_output_and_input",
      inspectedFields: Object.keys(payload),
      sourceEntityType: input.sourceEntityType ?? null,
      sourceEntityId: input.sourceEntityId ?? null,
      launchPlanId: input.launchPlanId ?? null,
      proposedContentHash: hash(proposedText)
    }
  });
  return {
    policyReviewIds: [saved.id],
    policyReviewCount: 1,
    blockedCount: policy.blocked ? 1 : 0,
    policyReviewResult: saved,
    policy
  };
}

export async function runBehavioralConsultationWithPolicyReview(input: CommerceAgentRunInput) {
  const consultation = await consultBehavioralPsychology(input);
  const rowId = text(value(consultation.row, "id"));
  const policyReview = await runBehavioralConsultationPolicyReview({
    ...input,
    consultation: consultation.consultation,
    behavioralConsultationId: rowId || id("bconsult_policy_target")
  });
  if (!policyReview.policyReviewCount) throw new Error("behavioral_policy_review_required");
  return {
    ...consultation,
    policyReview,
    behavioralConsultBypassedPolicyChecker: false
  };
}

export async function runIpTrademarkCheck(input: CommerceAgentRunInput) {
  let sourceText = input.content ?? "";
  try {
    const entity = await readApprovedProductOrConcept({
      repos: input.repos,
      workspaceId: input.workspaceId,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      launchPlanId: input.launchPlanId
    });
    sourceText = `${sourceText}\n${entity.title}\n${entity.description}\n${asStringArray(entity.phrases).join(" ")}`.trim();
  } catch {
    // Policy checks may run against standalone copy before an entity exists.
  }
  const policy = runRuleBasedPolicyClaimsIpCheck(sourceText);
  const check = await createQualityCheck({
    ...input,
    roleKey: input.roleKey || "ip_trademark_copycat_risk",
    checkType: "policy_claims_ip_risk",
    verdict: policy.verdict,
    score: policy.blocked ? 15 : 92,
    reasons: policy.policyCodes.length ? policy.policyCodes : ["no_rule_based_policy_or_ip_flags"],
    fixSuggestions: policy.fixSuggestions,
    evidenceRefs: [{ type: "rule_based_policy", contentHash: hash(sourceText), severity: policy.severity }]
  });
  return { policy, qualityCheck: check };
}

async function draftGenericRecommendation(input: CommerceAgentRunInput, options: {
  roleKey: string;
  recommendationType: string;
  title: string;
  summary: string;
  rationale: string;
  output: Record<string, unknown>;
  severity?: string;
}) {
  const rec = await saveCommerceRecommendation({
    ...input,
    roleKey: options.roleKey,
    recommendationType: options.recommendationType,
    title: options.title,
    summary: options.summary,
    rationale: options.rationale,
    severity: options.severity ?? "medium",
    confidenceScore: 0.66,
    ownerActionNeeded: "review",
    metadata: { output: options.output, providerMutation: false, requiresHumanDecision: true }
  });
  return { output: options.output, recommendation: rec };
}

export async function draftCatalogMerchandisingRecommendation(input: CommerceAgentRunInput) {
  const entity = await readApprovedProductOrConcept({ repos: input.repos, workspaceId: input.workspaceId, sourceEntityType: input.sourceEntityType, sourceEntityId: input.sourceEntityId, launchPlanId: input.launchPlanId });
  return draftGenericRecommendation(input, {
    roleKey: "catalog_merchandising",
    recommendationType: "catalog_merchandising",
    title: "Catalog merchandising recommendation",
    summary: "Suggest collection placement, giftable bundle context, and cross-sell candidates without mutating Shopify.",
    rationale: `The product category ${entity.productCategory} and phrases ${entity.phrases.slice(0, 3).join(", ")} support owner-reviewed merchandising.`,
    output: {
      collection_placement: [`${entity.productCategory} gifts`, "coastal western picks"],
      bundles: ["pair with a matching accessory after margin review"],
      cross_sells: entity.suggestedProductTypes,
      homepage_candidate: entity.approved,
      hide_archive_suggestion: "no hide/archive suggestion unless quality checks block"
    }
  });
}

export async function draftSeoGeoPdpRecommendation(input: CommerceAgentRunInput) {
  const entity = await readApprovedProductOrConcept({ repos: input.repos, workspaceId: input.workspaceId, sourceEntityType: input.sourceEntityType, sourceEntityId: input.sourceEntityId, launchPlanId: input.launchPlanId });
  if (input.launchPlanId) await draftMarketingSeoPdpRecommendations({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId: input.launchPlanId });
  const output = {
    seo_title: compact(`${entity.title} | Salty Cowhide Co.`, 70),
    meta_description: compact(entity.description, 150),
    h1: entity.title,
    h2_suggestions: ["Why it fits the coastal western style", "Gift-ready details to review"],
    keyword_targeting: entity.phrases.slice(0, 8),
    image_alt_text: `${entity.title} product image, owner-approved before public use`,
    internal_link_suggestions: ["/collections", "/drops"],
    ai_readable_product_summary: compact(`${entity.title}: ${entity.description}`, 260),
    answer_ready_product_facts: ["Owner-reviewed copy required", `Category: ${entity.productCategory}`, `Customer context: ${entity.customerSegment}`],
    faq_block: ["Who is this for?", "What style does it match?", "What details need owner review?"],
    comparison_bullets: ["Original Salty Cowhide positioning", "No unsupported claims", "No provider mutation"],
    schema_recommendations: ["Product", "FAQPage where approved facts exist", "BreadcrumbList"],
    pdp_improvements: ["Clarify above-fold product type", "Use substantiated material/size facts only", "Keep CTA owner-reviewed"]
  };
  return draftGenericRecommendation(input, {
    roleKey: "seo_geo_pdp_optimization",
    recommendationType: "seo_geo_pdp",
    title: "SEO / GEO / PDP optimization",
    summary: "Drafted search, answer-engine, and PDP clarity improvements without Shopify mutation.",
    rationale: "Recommendations are grounded in approved entity copy and avoid unsupported material, shipping, or delivery claims.",
    output,
    severity: "medium"
  });
}

async function callMarketingDraft(input: CommerceAgentRunInput, roleKey: string, recommendationType: string, title: string, fn: (args: { repos: RepositoryBundle; workspaceId: string; actorId?: string | undefined; launchPlanId: string }) => Promise<unknown>) {
  const launchPlanId = text(input.launchPlanId);
  const output = launchPlanId
    ? await fn({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId })
    : { blocked: "launch_plan_required_for_marketing_artifact_persistence" };
  const rec = await saveCommerceRecommendation({
    ...input,
    roleKey,
    recommendationType,
    title,
    summary: launchPlanId ? `${title} artifacts were drafted for owner review.` : `${title} needs a marketing launch plan before artifact persistence.`,
    rationale: "The tool creates or references internal draft artifacts only; live execution remains blocked.",
    severity: "medium",
    confidenceScore: launchPlanId ? 0.78 : 0.42,
    ownerActionNeeded: launchPlanId ? "review" : "create_launch_plan",
    metadata: { output, liveExecutionBlocked: true }
  });
  return { output, recommendation: rec };
}

export const draftOrganicLaunchPlan = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "organic_launch_planner", "organic_launch_plan", "No-spend organic launch plan", draftMarketingOrganicLaunchPlan);
export const draftSocialContent = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "social_repurposing", "social_repurposing", "Social repurposing drafts", draftMarketingSocialContent);
export const draftPinterestOrganicPlan = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "pinterest_organic", "pinterest_organic", "Pinterest organic plan", draftMarketingPinterestOrganicPlan);
export const draftEmailSmsDrafts = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "email_sms_draft", "email_sms_draft_no_send", "Email/SMS draft no-send package", draftMarketingEmailSmsDrafts);
export const draftMarketplaceSeoSuggestions = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "marketplace_seo", "marketplace_seo", "Marketplace SEO suggestions", draftMarketingMarketplaceSeoSuggestions);
export const draftOutreachDrafts = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "outreach_collaboration", "outreach_collaboration", "Outreach and collaboration drafts", draftMarketingOutreachDrafts);
export const draftAudienceHypotheses = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "campaign_build_sheet", "audience_hypotheses", "Audience hypotheses", draftMarketingAudienceHypotheses);
export const draftAdAngles = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "campaign_build_sheet", "ad_angles", "Ad angle drafts", draftMarketingAdAngles);
export const draftAdCopyVariants = (input: CommerceAgentRunInput) =>
  callMarketingDraft(input, "campaign_build_sheet", "ad_copy_variants", "Ad copy variants", draftMarketingAdCopyVariants);

export async function draftCampaignBuildSheet(input: CommerceAgentRunInput) {
  const launchPlanId = text(input.launchPlanId);
  const output = launchPlanId
    ? await compileCampaignBuildSheet({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId })
    : { blocked: "launch_plan_required_for_campaign_build_sheet" };
  const rec = await saveCommerceRecommendation({
    ...input,
    roleKey: "campaign_build_sheet",
    recommendationType: "campaign_build_sheet",
    title: "Manual campaign build sheet",
    summary: "Manual build sheet prepared or blocked until launch plan exists; no ad-platform writes.",
    rationale: "Campaign build sheets are owner-reviewed manual instructions only.",
    severity: "high",
    confidenceScore: launchPlanId ? 0.74 : 0.4,
    metadata: { output, adPlatformWrite: false, liveSpend: false }
  });
  return { output, recommendation: rec };
}

export async function calculateBudgetRecommendation(input: CommerceAgentRunInput) {
  const launchPlanId = text(input.launchPlanId);
  const output = launchPlanId
    ? await calculateMarketingBudgetRecommendation({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId })
    : { recommendation: "budget_advice_requires_launch_plan", spendMutation: false };
  const rec = await saveCommerceRecommendation({
    ...input,
    roleKey: "budget_pacing_analyst",
    recommendationType: "budget_pacing",
    title: "Budget and pacing recommendation",
    summary: "Recommendation-only budget guidance; no budget changes or live campaign activation.",
    rationale: "Budget guidance remains owner-reviewed and manual-build only.",
    severity: "high",
    confidenceScore: launchPlanId ? 0.7 : 0.42,
    metadata: { output, budgetMutation: false, liveSpend: false }
  });
  return { output, recommendation: rec };
}

export async function consultBehavioralPsychology(input: CommerceAgentRunInput) {
  const audience = compact(input.audienceContext || "Customer context not specified.", 220);
  const copy = compact(input.content || "", 600);
  const policy = runRuleBasedPolicyClaimsIpCheck(copy);
  const directAttribute = /are you\b/i.test(copy) && /(woman|women|mom|40\+|over 40|texas|anxious|depressed|disabled|broke)/i.test(copy);
  const warnings = [
    ...policy.policyCodes.filter((code) => code === "sensitive_personal_attribute" || code === "shame_fear_manipulation"),
    ...(directAttribute ? ["direct_personal_attribute_copy"] : [])
  ];
  const output: BehavioralConsultationOutput = {
    consultation_type: text(input.consultationType, "audience_pdp_ad_framing"),
    customer_context_summary: audience,
    customer_motivation_summary: "Likely motivation centers on identity fit, giftability, regional/style resonance, and confidence that the product looks intentional rather than generic.",
    likely_objections: ["Will it look premium enough?", "Is the style too niche?", "Are size, material, shipping, or use details clear enough?"],
    trust_signals_needed: ["Clear product facts", "Approved mockups", "Transparent fulfillment expectations", "No unsupported claims"],
    friction_points: ["Unclear product type", "Missing material or size facts", "Overly generic copy", "Any direct personal-attribute framing"],
    emotional_drivers: ["giftability", "coastal western identity", "small-boutique discovery", "personal style expression"],
    clarity_improvements: ["Lead with product type and occasion", "Use style context without calling out sensitive traits", "Make the owner approval requirement explicit before public use"],
    ethical_persuasion_notes: ["Frame around interests, occasions, and style identity; do not exploit insecurity, fear, grief, disability, health, age, finances, or protected traits."],
    dark_pattern_risks: policy.policyCodes.filter((code) => ["fake_urgency", "fake_social_proof", "shame_fear_manipulation"].includes(code)),
    recommended_framing: ["For shoppers who love coastal western style", "A giftable accessory with boutique rodeo-meets-beach energy", "Texas/coastal context may inform targeting settings, not direct ad copy."],
    avoid_framing: ["Are you a 40-year-old woman in Texas?", "You need this to fix insecurity", "Official/licensed/dupe/inspired-by language", "Fake urgency or fake social proof"],
    sensitive_attribute_warnings: warnings,
    confidence_score: warnings.length ? 0.72 : 0.81,
    requires_policy_review: true
  };
  const source = await resolveSourceEntity(input);
  const row = await upsertRow(input.repos.commerceAgent.behavioralConsultations, {
    id: id("bconsult", `${input.workspaceId}:${input.roleKey}:${source.sourceEntityType}:${source.sourceEntityId}:${output.consultation_type}:${copy}`),
    workspace_id: input.workspaceId,
    consulting_agent_role_key: text(input.roleKey, "behavioral_psychology_customer_empathy"),
    source_entity_type: source.sourceEntityType,
    source_entity_id: source.sourceEntityId,
    consultation_type: output.consultation_type,
    input_summary: audience,
    output_json: output,
    ethical_risk_flags: output.dark_pattern_risks,
    sensitive_attribute_warnings: output.sensitive_attribute_warnings,
    confidence_score: output.confidence_score.toFixed(4),
    requires_policy_review: true
  } as WorkspaceRow);
  return { consultation: output, row, policyReviewRequired: true };
}

export async function runPolicyReview(input: CommerceAgentRunInput) {
  const launchPlanId = text(input.launchPlanId);
  const directContent = text(input.content);
  const directReview = directContent
    ? await persistCommercePolicyReviewResult({
      ...input,
      roleKey: "policy_claims_ip_risk_checker",
      targetType: text(input.sourceEntityType, launchPlanId ? "marketing_launch_plan_content" : "commerce_policy_content"),
      targetId: `${text(input.sourceEntityId, launchPlanId || "workspace")}:${hash(directContent)}`,
      reviewedContent: directContent,
      policy: mergePolicyResults([runRuleBasedPolicyClaimsIpCheck(directContent)]),
      evidence: {
        policySource: "direct_commerce_policy_content",
        launchPlanId: launchPlanId || null,
        sourceEntityType: input.sourceEntityType ?? null,
        sourceEntityId: input.sourceEntityId ?? null
      }
    })
    : null;
  const directQuality = directContent ? await runIpTrademarkCheck({ ...input, roleKey: "policy_claims_ip_risk_checker" }) : null;
  const marketingReview = launchPlanId
    ? await runMarketingPolicyReview({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId })
    : null;
  if (marketingReview || directReview) {
    const policyReviewIds = [
      ...asStringArray(asRecord(marketingReview).policyReviewIds),
      ...(directReview ? [directReview.id] : [])
    ];
    return {
      policyReviewIds,
      policyReviewCount: Number(asRecord(marketingReview).policyReviewCount ?? 0) + (directReview ? 1 : 0),
      blockedCount: Number(asRecord(marketingReview).blockedCount ?? 0) + (truthy(value(directReview, "blocked")) ? 1 : 0),
      directPolicyReviewResult: directReview,
      directQualityCheck: directQuality,
      marketingPolicyReview: marketingReview
    };
  }
  return runIpTrademarkCheck({ ...input, roleKey: "policy_claims_ip_risk_checker" });
}

export async function prioritizeApprovalQueue(input: CommerceAgentRunInput) {
  const existing = await input.repos.commerceAgent.approvalQueueItems.listByWorkspace(input.workspaceId);
  const pendingIds = new Set(existing.map((row) => row.id));
  const created: WorkspaceRow[] = [];
  const addItem = async (row: WorkspaceRow) => {
    if (pendingIds.has(row.id)) return null;
    pendingIds.add(row.id);
    const createdRow = await upsertRow(input.repos.commerceAgent.approvalQueueItems, row);
    created.push(createdRow);
    return createdRow;
  };
  const approvals = await input.repos.marketing.approvalRequests.listByWorkspace(input.workspaceId);
  for (const approval of approvals.filter((row) => text(value(row, "owner_decision", "ownerDecision"), "pending") === "pending")) {
    await addItem({
      id: id("aq", `marketing:${approval.id}`),
      workspace_id: input.workspaceId,
      source_entity_type: "marketing_approval_request",
      source_entity_id: approval.id,
      requested_action: "request_changes",
      priority: 85,
      reason: compact(`Owner review needed for ${text(value(approval, "requested_action", "requestedAction"), "marketing artifact")}.`, 260),
      risk_summary: value(approval, "risk_summary", "riskSummary") ?? null,
      status: "pending",
      created_by: input.actorId ?? null,
      notes: null
    } as WorkspaceRow);
  }
  const recommendations = await input.repos.commerceAgent.recommendations.listByWorkspace(input.workspaceId);
  for (const rec of recommendations.filter((row) => text(value(row, "review_status", "reviewStatus"), "pending_review") === "pending_review")) {
    await addItem({
      id: id("aq", `recommendation:${rec.id}`),
      workspace_id: input.workspaceId,
      source_entity_type: "commerce_recommendation",
      source_entity_id: rec.id,
      requested_action: "request_changes",
      priority: text(value(rec, "severity")) === "critical" ? 95 : text(value(rec, "severity")) === "high" ? 82 : 62,
      reason: compact(value(rec, "summary"), 260),
      risk_summary: { severity: value(rec, "severity"), expectedImpact: value(rec, "expected_impact", "expectedImpact") },
      status: "pending",
      created_by: input.actorId ?? null,
      notes: null
    } as WorkspaceRow);
  }
  const qualityChecks = await input.repos.commerceAgent.qualityChecks.listByWorkspace(input.workspaceId);
  for (const check of qualityChecks.filter((row) => ["blocked", "warning"].includes(text(value(row, "verdict"))))) {
    await addItem({
      id: id("aq", `quality:${check.id}`),
      workspace_id: input.workspaceId,
      source_entity_type: "commerce_quality_check",
      source_entity_id: check.id,
      requested_action: "request_changes",
      priority: text(value(check, "verdict")) === "blocked" ? 98 : 78,
      reason: compact(asStringArray(value(check, "reasons")).join(", ") || "Quality check needs owner review.", 260),
      risk_summary: { verdict: value(check, "verdict"), checkType: value(check, "check_type", "checkType") },
      status: "pending",
      created_by: input.actorId ?? null,
      notes: null
    } as WorkspaceRow);
  }
  const all = await input.repos.commerceAgent.approvalQueueItems.listByWorkspace(input.workspaceId);
  const pending = all
    .filter((row) => text(value(row, "status"), "pending") === "pending")
    .sort((left, right) => Number(value(right, "priority") ?? 0) - Number(value(left, "priority") ?? 0));
  return { createdApprovalQueueItemIds: created.map((row) => row.id), approvalQueueItems: pending };
}

function normalizeRequestedDecision(input: unknown): "approve" | "reject" | "request_changes" | "watch_longer" {
  const decision = text(input).toLowerCase();
  if (decision === "approved" || decision === "approve") return "approve";
  if (decision === "rejected" || decision === "reject") return "reject";
  if (decision === "needs_changes" || decision === "request_changes") return "request_changes";
  if (decision === "watch_longer" || decision === "watch") return "watch_longer";
  throw new Error(COMMERCE_AGENT_INVALID_DECISION);
}

export async function createApprovalPrediction(input: CommerceAgentRunInput) {
  const queue = input.approvalItemId
    ? { approvalQueueItems: [(await input.repos.commerceAgent.approvalQueueItems.getById(input.approvalItemId, input.workspaceId))].filter(Boolean) as WorkspaceRow[] }
    : await prioritizeApprovalQueue(input);
  const item = queue.approvalQueueItems[0] ?? null;
  if (!item) throw new Error("approval_queue_empty");
  const risk = asRecord(value(item, "risk_summary", "riskSummary"));
  const riskLevel = text(risk.severity ?? risk.verdict, "medium");
  const predicted = ["critical", "high", "blocked"].includes(riskLevel) ? "request_changes" : "approve";
  const confidence = predicted === "approve" ? 0.58 : 0.76;
  const output = {
    approval_item_id: item.id,
    source_entity_type: text(value(item, "source_entity_type", "sourceEntityType")),
    source_entity_id: text(value(item, "source_entity_id", "sourceEntityId")),
    requested_action: normalizeRequestedDecision(value(item, "requested_action", "requestedAction")),
    recommended_owner_decision: predicted,
    confidence_score: confidence,
    confidence_reason: predicted === "approve" ? "No critical risk summary is attached; approval is still advisory." : "Risk or blocker evidence suggests changes before approval.",
    business_impact: Number(value(item, "priority") ?? 0) >= 80 ? "high" : "medium",
    risk_level: riskLevel === "blocked" ? "critical" : riskLevel,
    why_it_matters: compact(value(item, "reason"), 260),
    what_happens_if_approved: "The internal draft/recommendation may move to the next owner-reviewed stage; it still will not publish, spend, send, or mutate providers automatically.",
    what_happens_if_rejected: "The internal item remains stopped and can be revised or archived without external provider action.",
    suggested_edit_to_get_approved: predicted === "approve" ? "Confirm facts and keep the manual approval record." : "Resolve the blocker or rewrite the item using substantiated, policy-safe language.",
    requires_human_decision: true
  };
  const row = await upsertRow(input.repos.commerceAgent.approvalPredictionRecords, {
    id: id("apred", `${input.workspaceId}:${item.id}`),
    workspace_id: input.workspaceId,
    approval_item_id: item.id,
    source_entity_type: output.source_entity_type,
    source_entity_id: output.source_entity_id,
    predicted_decision: output.recommended_owner_decision,
    confidence_score: output.confidence_score.toFixed(4),
    confidence_reason: output.confidence_reason,
    actual_decision: null,
    prediction_correct: null,
    prediction_error_notes: null,
    decided_at: null
  } as WorkspaceRow);
  return { prediction: output, row };
}

function feedbackDecision(input: unknown): "approved" | "rejected" | "needs_changes" | "watch_longer" {
  const normalized = normalizeRequestedDecision(input);
  if (normalized === "approve") return "approved";
  if (normalized === "reject") return "rejected";
  if (normalized === "request_changes") return "needs_changes";
  return "watch_longer";
}

export async function recordOwnerApprovalFeedback(input: CommerceAgentRunInput & {
  ownerDecision: string;
  ownerNotes?: string | undefined;
  editedFields?: Record<string, unknown> | undefined;
  rejectionReason?: string | undefined;
  preferenceSignal?: Record<string, unknown> | undefined;
}) {
  const decision = feedbackDecision(input.ownerDecision);
  const row = await input.repos.commerceAgent.ownerApprovalFeedback.create({
    id: id("ofeed", `${input.workspaceId}:${input.approvalItemId}:${Date.now()}`),
    workspace_id: input.workspaceId,
    approval_item_id: text(input.approvalItemId),
    owner_decision: decision,
    owner_notes: input.ownerNotes ?? null,
    edited_fields: input.editedFields ?? null,
    rejection_reason: input.rejectionReason ?? null,
    preference_signal: input.preferenceSignal ?? null
  } as WorkspaceRow);
  const predictions = (await input.repos.commerceAgent.approvalPredictionRecords.listByWorkspace(input.workspaceId))
    .filter((prediction) => text(value(prediction, "approval_item_id", "approvalItemId")) === input.approvalItemId);
  for (const prediction of predictions) {
    const predicted = feedbackDecision(value(prediction, "predicted_decision", "predictedDecision"));
    await input.repos.commerceAgent.approvalPredictionRecords.update(prediction.id, {
      actual_decision: decision,
      prediction_correct: predicted === decision,
      prediction_error_notes: predicted === decision ? null : "Owner decision differed from advisory prediction.",
      decided_at: now()
    });
  }
  const item = input.approvalItemId ? await input.repos.commerceAgent.approvalQueueItems.getById(input.approvalItemId, input.workspaceId) : null;
  if (item) {
    await input.repos.commerceAgent.approvalQueueItems.update(item.id, {
      status: "decided",
      decided_by: input.actorId ?? null,
      decided_at: now(),
      notes: input.ownerNotes ?? null
    });
  }
  const patternResult = await updateOwnerDecisionPatterns({ ...input, latestFeedbackId: row.id });
  return { feedback: row, patternResult };
}

export async function updateOwnerDecisionPatterns(input: CommerceAgentRunInput & { latestFeedbackId?: string | undefined }) {
  const feedbackRows = (await input.repos.commerceAgent.ownerApprovalFeedback.listByWorkspace(input.workspaceId))
    .sort((left, right) => text(value(right, "created_at", "createdAt")).localeCompare(text(value(left, "created_at", "createdAt"))));
  const latest = input.latestFeedbackId
    ? await input.repos.commerceAgent.ownerApprovalFeedback.getById(input.latestFeedbackId, input.workspaceId)
    : feedbackRows[0] ?? null;
  if (!latest) return { createdPatternIds: [], updatedPatternIds: [] };
  const signal = asRecord(value(latest, "preference_signal", "preferenceSignal"));
  const decision = text(value(latest, "owner_decision", "ownerDecision"));
  const patternType = text(signal.patternType ?? signal.pattern_type, decision === "approved" ? "approves" : decision === "rejected" ? "rejects" : decision === "needs_changes" ? "requests_changes" : "workflow_preference");
  const summary = compact(signal.summary ?? value(latest, "owner_notes", "ownerNotes") ?? `${decision} pattern observed from owner feedback.`, 300);
  const existing = (await input.repos.commerceAgent.ownerDecisionPatterns.listByWorkspace(input.workspaceId))
    .filter((row) => text(value(row, "pattern_type", "patternType")) === patternType && !text(value(row, "superseded_by", "supersededBy")));
  const evidenceIds = feedbackRows
    .filter((row) => {
      const rowSignal = asRecord(value(row, "preference_signal", "preferenceSignal"));
      return text(rowSignal.patternType ?? rowSignal.pattern_type, patternType) === patternType;
    })
    .map((row) => text(value(row, "approval_item_id", "approvalItemId")))
    .filter(Boolean);
  const confidence = Math.min(0.85, evidenceIds.length <= 1 ? 0.35 : 0.35 + evidenceIds.length * 0.12);
  const newPattern = await input.repos.commerceAgent.ownerDecisionPatterns.create({
    id: id("opattern", `${input.workspaceId}:${patternType}:${Date.now()}:${summary}`),
    workspace_id: input.workspaceId,
    pattern_type: patternType,
    summary,
    evidence_approval_ids: [...new Set(evidenceIds)],
    confidence_score: confidence.toFixed(4),
    tentative: evidenceIds.length < 3,
    superseded_by: null,
    last_observed_at: now()
  } as WorkspaceRow);
  const updated: string[] = [];
  for (const pattern of existing) {
    if (text(value(pattern, "summary")) !== summary) {
      await input.repos.commerceAgent.ownerDecisionPatterns.update(pattern.id, { superseded_by: newPattern.id });
      updated.push(pattern.id);
    }
  }
  return { createdPatternIds: [newPattern.id], updatedPatternIds: updated, pattern: newPattern };
}

export async function createShopManagerBrief(input: CommerceAgentRunInput) {
  const queue = await prioritizeApprovalQueue(input);
  const recommendations = await input.repos.commerceAgent.recommendations.listByWorkspace(input.workspaceId);
  const checks = await input.repos.commerceAgent.qualityChecks.listByWorkspace(input.workspaceId);
  const processFindings = await input.repos.commerceAgent.processImprovementFindings.listByWorkspace(input.workspaceId);
  const briefDate = new Date().toISOString().slice(0, 10);
  const row = await upsertRow(input.repos.commerceAgent.shopManagerBriefs, {
    id: id("sbrief", `${input.workspaceId}:${briefDate}`),
    workspace_id: input.workspaceId,
    brief_date: briefDate,
    summary: `Shop Manager brief: ${queue.approvalQueueItems.length} approvals, ${checks.filter((check) => text(value(check, "verdict")) !== "pass").length} quality warnings, ${recommendations.length} recommendations.`,
    top_priorities: queue.approvalQueueItems.slice(0, 5).map((item) => ({ id: item.id, reason: value(item, "reason"), priority: value(item, "priority") })),
    blocked_items: checks.filter((check) => text(value(check, "verdict")) === "blocked").map((check) => ({ id: check.id, reasons: value(check, "reasons") })),
    approvals_needed: queue.approvalQueueItems.map((item) => ({ id: item.id, sourceEntityType: value(item, "source_entity_type", "sourceEntityType"), sourceEntityId: value(item, "source_entity_id", "sourceEntityId") })),
    risks: checks.filter((check) => text(value(check, "verdict")) !== "pass").map((check) => ({ id: check.id, verdict: value(check, "verdict"), reasons: value(check, "reasons") })),
    recommended_next_actions: recommendations.slice(0, 6).map((rec) => ({ id: rec.id, title: value(rec, "title"), ownerActionNeeded: value(rec, "owner_action_needed", "ownerActionNeeded") })),
    agent_health: {
      registeredAgents: commerceAgentRoleCatalog.length,
      processFindings: processFindings.length,
      providerMutation: false,
      humanDecisionRequired: true
    }
  } as WorkspaceRow);
  return row;
}

export async function createProcessImprovementFinding(input: CommerceAgentRunInput & {
  findingType?: string | undefined;
  title?: string | undefined;
  summary?: string | undefined;
}) {
  const checks = await input.repos.commerceAgent.qualityChecks.listByWorkspace(input.workspaceId);
  const blockingChecks = checks.filter((check) => ["blocked", "warning"].includes(text(value(check, "verdict"))));
  const byType = new Map<string, number>();
  for (const check of blockingChecks) byType.set(text(value(check, "check_type", "checkType"), "quality"), (byType.get(text(value(check, "check_type", "checkType"), "quality")) ?? 0) + 1);
  const repeatedType = [...byType.entries()].find(([, count]) => count > 1)?.[0] ?? null;
  const findingType = input.findingType ?? (repeatedType ? "repeated_quality_failure" : "single_process_observation");
  const row = await upsertRow(input.repos.commerceAgent.processImprovementFindings, {
    id: id("pfind", `${input.workspaceId}:${findingType}:${input.title ?? repeatedType ?? "general"}`),
    workspace_id: input.workspaceId,
    finding_type: findingType,
    title: input.title ?? (repeatedType ? `Repeated ${repeatedType.replace(/_/g, " ")} issue` : "Shop-manager process improvement finding"),
    summary: input.summary ?? (repeatedType ? `Multiple ${repeatedType} checks need owner review.` : "No repeated failure pattern was applied automatically."),
    affected_agents: [input.roleKey],
    affected_entities: blockingChecks.map((check) => ({ id: check.id, type: value(check, "check_type", "checkType") })),
    repeated_pattern: Boolean(repeatedType),
    severity: repeatedType ? "high" : "medium",
    recommended_process_change: repeatedType ? "Add a preflight checklist before asking for owner approval." : "Keep monitoring approval and quality-check outcomes.",
    recommended_prompt_change: repeatedType ? "Prompt agents to cite blocker evidence and exact setup/fix requirements." : null,
    recommended_tool_change: repeatedType ? "Consider adding a narrower read-only diagnostic tool." : null,
    recommended_schema_change: null,
    review_status: "pending_review"
  } as WorkspaceRow);
  return row;
}

export async function saveCommerceOutputForReview(input: CommerceAgentRunInput & {
  outputType?: string | undefined;
  outputJson: Record<string, unknown>;
}) {
  const agentRunId = text(input.agentRunId);
  if (!agentRunId) return null;
  const source = await resolveSourceEntity(input);
  return upsertRow(input.repos.aiEmployee.outputs, {
    id: id("aiout_commerce", `${agentRunId}:${input.roleKey}`),
    workspace_id: input.workspaceId,
    run_id: agentRunId,
    output_type: input.outputType ?? "commerce_agent_output",
    ref_type: source.sourceEntityType,
    ref_id: source.sourceEntityId,
    output_json: input.outputJson,
    status: "pending_review",
    metadata: {
      roleKey: input.roleKey,
      requiresHumanDecision: true,
      providerMutation: false,
      publishAction: false,
      spendAction: false,
      sendAction: false
    }
  } as WorkspaceRow);
}

export async function runCommerceAgent(input: CommerceAgentRunInput) {
  const role = await assertRoleEnabled(input);
  const withRole = { ...input, roleKey: role.role_key };
  let output: unknown;
  if (role.role_key === "product_readiness_launch_gate") output = await runProductReadinessCheck(withRole);
  else if (role.role_key === "margin_offer_economics") output = await runMarginOfferEconomics(withRole);
  else if (role.role_key === "creative_qa_print_risk") output = await runCreativeQaCheck(withRole);
  else if (role.role_key === "ip_trademark_copycat_risk") output = await runIpTrademarkCheck(withRole);
  else if (role.role_key === "policy_claims_ip_risk_checker") output = await runPolicyReview(withRole);
  else if (role.role_key === "catalog_merchandising") output = await draftCatalogMerchandisingRecommendation(withRole);
  else if (role.role_key === "seo_geo_pdp_optimization") output = await draftSeoGeoPdpRecommendation(withRole);
  else if (role.role_key === "organic_launch_planner" || role.role_key === "no_spend_growth") output = await draftOrganicLaunchPlan(withRole);
  else if (role.role_key === "social_repurposing") output = await draftSocialContent(withRole);
  else if (role.role_key === "pinterest_organic") output = await draftPinterestOrganicPlan(withRole);
  else if (role.role_key === "email_sms_draft") output = await draftEmailSmsDrafts(withRole);
  else if (role.role_key === "marketplace_seo") output = await draftMarketplaceSeoSuggestions(withRole);
  else if (role.role_key === "outreach_collaboration") output = await draftOutreachDrafts(withRole);
  else if (role.role_key === "behavioral_psychology_customer_empathy") output = await runBehavioralConsultationWithPolicyReview(withRole);
  else if (role.role_key === "budget_pacing_analyst") output = await calculateBudgetRecommendation(withRole);
  else if (role.role_key === "campaign_build_sheet") {
    await draftAudienceHypotheses(withRole);
    await draftAdAngles(withRole);
    await draftAdCopyVariants(withRole);
    output = await draftCampaignBuildSheet(withRole);
  } else if (role.role_key === "owner_daily_brief") output = await createShopManagerBrief(withRole);
  else if (role.role_key === "approval_queue") output = await prioritizeApprovalQueue(withRole);
  else if (role.role_key === "shop_manager_approval_intelligence") {
    await prioritizeApprovalQueue(withRole);
    output = await createApprovalPrediction(withRole);
  } else if (role.role_key === "quality_control_process_improvement" || role.role_key === "dev_proof_qa") output = await createProcessImprovementFinding(withRole);
  else output = await draftGenericRecommendation(withRole, {
    roleKey: role.role_key,
    recommendationType: role.role_key,
    title: role.display_name,
    summary: role.purpose,
    rationale: "This agent produced an owner-reviewable internal recommendation from existing workspace data only.",
    output: { roleKey: role.role_key, providerMutation: false, requiresHumanDecision: true }
  });
  await saveCommerceOutputForReview({ ...withRole, outputType: role.output_entity_types[0] ?? "commerce_agent_output", outputJson: asRecord(output) });
  return { ok: true, status: "completed" as const, roleKey: role.role_key, output };
}

export async function listShopManagerBriefData(input: { repos: RepositoryBundle; workspaceId: string }) {
  const [briefs, queue, predictions, recommendations, qualityChecks, consultations, findings, runs] = await Promise.all([
    input.repos.commerceAgent.shopManagerBriefs.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.approvalQueueItems.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.approvalPredictionRecords.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.recommendations.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.qualityChecks.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.behavioralConsultations.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.processImprovementFindings.listByWorkspace(input.workspaceId),
    input.repos.aiEmployee.runs.listByWorkspace(input.workspaceId)
  ]);
  const sortLatest = (rows: WorkspaceRow[]) => rows.sort((left, right) => text(value(right, "updated_at", "updatedAt") ?? value(right, "created_at", "createdAt")).localeCompare(text(value(left, "updated_at", "updatedAt") ?? value(left, "created_at", "createdAt"))));
  return {
    latestBrief: sortLatest([...briefs])[0] ?? null,
    approvalQueueItems: queue.filter((row) => text(value(row, "status"), "pending") === "pending").sort((left, right) => Number(value(right, "priority") ?? 0) - Number(value(left, "priority") ?? 0)),
    approvalPredictions: sortLatest([...predictions]),
    recommendations: sortLatest([...recommendations]),
    qualityChecks: sortLatest([...qualityChecks]),
    behavioralConsultations: sortLatest([...consultations]),
    processImprovementFindings: sortLatest([...findings]),
    recentAgentRuns: sortLatest(runs.filter((row) => commerceAgentRoleKeys.includes(text(value(row, "employee_type", "employeeType"))))).slice(0, 8)
  };
}

export function commerceAgentToolsForRole(roleKey: string) {
  return roleForKey(roleKey)?.allowed_tools ?? [];
}

export { allToolNames as commerceAgentToolNames };
