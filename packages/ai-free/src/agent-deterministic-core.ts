import crypto from "node:crypto";
import { now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";

export const AGENT_CORE_SOURCE_REQUIRED = "agent_core_source_required";
export const AGENT_CORE_SOURCE_NOT_FOUND = "agent_core_source_not_found";

export const PRODUCT_READINESS_CHECKLIST_VERSION = "product_readiness_v1";
export const MARGIN_FORMULA_VERSION = "margin_economics_v1";
export const POLICY_RULESET_VERSION = "policy_claims_ip_v1";
export const SEO_GEO_PDP_RECOMMENDATION_VERSION = "seo_geo_pdp_v1";

export type DeterministicCoreInput = {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  roleKey?: string | undefined;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
  content?: string | undefined;
  suggestedRewrite?: string | undefined;
  llmNarrative?: string | undefined;
};

type NormalizedSourceEntity = {
  sourceEntityType: string;
  sourceEntityId: string;
  title: string;
  description: string;
  productCategory: string;
  tags: string[];
  phrases: string[];
  approved: boolean | null;
  reviewState: string;
  raw: WorkspaceRow;
};

const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input.trim() : fallback;
const numberValue = (input: unknown) => {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};
const bool = (input: unknown) => input === true || input === "true";
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const asArray = (input: unknown): unknown[] => Array.isArray(input) ? input : [];
const asStringArray = (input: unknown): string[] => Array.isArray(input) ? input.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
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

function approvalStateFor(row: WorkspaceRow, fallback = "") {
  return text(value(row, "approval_status", "approvalStatus") ?? value(row, "review_status", "reviewStatus") ?? value(row, "status"), fallback);
}

function normalizeSource(row: WorkspaceRow, sourceEntityType: string): NormalizedSourceEntity {
  const approvedState = approvalStateFor(row);
  const title = text(value(row, "title") ?? value(row, "name"));
  const description = text(value(row, "description") ?? value(row, "reason_it_may_sell", "reasonItMaySell") ?? value(row, "summary"));
  const productCategory = text(value(row, "product_category", "productCategory") ?? value(row, "product_type", "productType") ?? value(row, "category"));
  const tags = [
    ...asStringArray(value(row, "tags")),
    ...asStringArray(value(row, "phrases")),
    ...asStringArray(value(row, "keyword_terms", "keywordTerms"))
  ];
  return {
    sourceEntityType,
    sourceEntityId: row.id,
    title,
    description,
    productCategory,
    tags: [...new Set(tags)],
    phrases: asStringArray(value(row, "phrases")),
    approved: approvedState ? approvedState === "approved" : null,
    reviewState: approvedState,
    raw: row
  };
}

export async function resolveDeterministicSourceEntity(input: DeterministicCoreInput): Promise<NormalizedSourceEntity> {
  let sourceEntityType = text(input.sourceEntityType);
  let sourceEntityId = text(input.sourceEntityId);
  if (input.launchPlanId) {
    const launch = await input.repos.marketing.launchPlans.getById(input.launchPlanId, input.workspaceId);
    if (!launch) throw new Error(AGENT_CORE_SOURCE_NOT_FOUND);
    sourceEntityType ||= text(value(launch, "source_entity_type", "sourceEntityType"));
    sourceEntityId ||= text(value(launch, "source_entity_id", "sourceEntityId"));
  }
  if (!sourceEntityType || !sourceEntityId) throw new Error(AGENT_CORE_SOURCE_REQUIRED);
  const lookup = async () => {
    if (sourceEntityType === "product_concept_candidate") return input.repos.trendIntelligence.concepts.getById(sourceEntityId, input.workspaceId);
    if (sourceEntityType === "product_draft") return input.repos.draft.getById(sourceEntityId, input.workspaceId);
    if (sourceEntityType === "listing_draft") return input.repos.listingDraftV1.getById(sourceEntityId, input.workspaceId);
    if (sourceEntityType === "shopify_draft" || sourceEntityType === "shopify_product") return input.repos.shopify.getById(sourceEntityId, input.workspaceId);
    return null;
  };
  const row = await lookup();
  if (!row) throw new Error(AGENT_CORE_SOURCE_NOT_FOUND);
  return normalizeSource(row, sourceEntityType);
}

function sourceText(entity: NormalizedSourceEntity, extra = "") {
  return [
    entity.title,
    entity.description,
    entity.productCategory,
    entity.tags.join(" "),
    entity.phrases.join(" "),
    extra
  ].filter(Boolean).join("\n");
}

type PolicyFlag = {
  term: string;
  rule_id: string;
  matched_text: string;
  location: string;
  severity: "low" | "medium" | "high" | "severe";
  category: "ip" | "unsupported_claim" | "personal_attribute" | "manipulative" | "unsafe_language";
};

const policyRules: Array<{ rule_id: string; pattern: RegExp; severity: PolicyFlag["severity"]; category: PolicyFlag["category"]; term: string }> = [
  { rule_id: "protected_ip_brand", pattern: /\b(disney|barbie|taylor swift|nfl|mlb|ncaa|yellowstone|nike|stetson|stanley|buc-?ee'?s?|celebrity)\b/i, severity: "severe", category: "ip", term: "protected brand/ip term" },
  { rule_id: "official_license_claim", pattern: /\b(official|licensed|authentic)\b/i, severity: "high", category: "unsafe_language", term: "official/licensed/authentic" },
  { rule_id: "copycat_language", pattern: /\b(dupe|inspired by|knockoff|replica|counterfeit|copycat)\b/i, severity: "high", category: "ip", term: "copycat language" },
  { rule_id: "unsupported_superlative", pattern: /\b(guaranteed|best|number one|#1)\b/i, severity: "medium", category: "unsupported_claim", term: "unsupported superlative" },
  { rule_id: "unsupported_material_claim", pattern: /\b(waterproof|handmade|leather|hypoallergenic|eco-friendly|sustainable|non-toxic)\b/i, severity: "medium", category: "unsupported_claim", term: "unsupported material/safety claim" },
  { rule_id: "medical_or_outcome_claim", pattern: /\b(cure|heal|medical|before and after|before\/after)\b/i, severity: "severe", category: "unsupported_claim", term: "medical/outcome claim" },
  { rule_id: "direct_personal_attribute_copy", pattern: /\b(are you|do you suffer from|women over 40|40-year-old woman|divorced moms|anxious people|overweight|people with diabetes)\b/i, severity: "severe", category: "personal_attribute", term: "direct personal attribute copy" },
  { rule_id: "manipulative_urgency", pattern: /\b(only\s+\d+\s+left|going fast|ends in\s+\d+\s+(minutes?|hours?)|before it'?s gone)\b/i, severity: "high", category: "manipulative", term: "fake urgency/scarcity" },
  { rule_id: "fake_social_proof", pattern: /\b(5[- ]star|thousands love|best[- ]seller|customer favorite|reviews say)\b/i, severity: "high", category: "manipulative", term: "fake social proof" },
  { rule_id: "shame_fear_insecurity", pattern: /\b(embarrassed|ashamed|insecure|fix your body|stop looking cheap|nobody will love|fear of missing out)\b/i, severity: "high", category: "manipulative", term: "shame/fear/insecurity framing" }
];

export function runDeterministicPolicyRules(input: { text: string; location?: string | undefined }) {
  const flags: PolicyFlag[] = [];
  for (const rule of policyRules) {
    const match = input.text.match(rule.pattern);
    if (match?.[0]) {
      flags.push({
        term: rule.term,
        rule_id: rule.rule_id,
        matched_text: match[0],
        location: input.location ?? "source_text",
        severity: rule.severity,
        category: rule.category
      });
    }
  }
  const riskLevel = flags.some((flag) => flag.severity === "severe")
    ? "severe"
    : flags.some((flag) => flag.severity === "high")
      ? "high"
      : flags.some((flag) => flag.severity === "medium")
        ? "medium"
        : flags.some((flag) => flag.severity === "low") ? "low" : "none";
  return {
    flagged_terms: flags,
    unsupported_claims: flags.filter((flag) => flag.category === "unsupported_claim"),
    personal_attribute_flags: flags.filter((flag) => flag.category === "personal_attribute"),
    ip_flags: flags.filter((flag) => flag.category === "ip"),
    risk_level: riskLevel,
    verdict: riskLevel === "none" ? "pass" : ["high", "severe"].includes(riskLevel) ? "hard_block" : "flagged",
    blocked: ["high", "severe"].includes(riskLevel),
    policy_codes: [...new Set(flags.map((flag) => flag.rule_id))],
    fix_suggestions: [...new Set(flags.map((flag) => `Remove or substantiate ${flag.term}.`))]
  };
}

function safeRewriteFor(textValue: string) {
  let rewritten = textValue
    .replace(/\b(official|licensed|authentic|dupe|inspired by|knockoff|replica|counterfeit)\b/gi, "")
    .replace(/\b(disney|barbie|taylor swift|nfl|mlb|ncaa|yellowstone|nike|stetson|stanley|buc-?ee'?s?|celebrity)\b/gi, "original")
    .replace(/\bAre you a 40-year-old woman in Texas who needs this\b/gi, "For shoppers who love coastal western style")
    .replace(/\bAre you\b/gi, "For shoppers who")
    .replace(/\bofficial Barbie-inspired dupe\b/gi, "original boutique accessory")
    .replace(/\bonly\s+\d+\s+left\b/gi, "")
    .replace(/\bcustomer favorite\b/gi, "");
  rewritten = compact(rewritten, 500);
  return rewritten || "Original boutique accessory with owner-reviewed product facts.";
}

export async function runUnifiedPolicyIpCheck(input: DeterministicCoreInput) {
  const entity = await resolveDeterministicSourceEntity(input);
  const reviewedText = sourceText(entity, input.content);
  const result = runDeterministicPolicyRules({ text: reviewedText, location: entity.sourceEntityType });
  const suggestedRewrite = result.blocked || result.policy_codes.length ? safeRewriteFor(reviewedText) : null;
  const rewriteResult = suggestedRewrite ? runDeterministicPolicyRules({ text: suggestedRewrite, location: "suggested_rewrite" }) : null;
  const rewriteRecheckStatus = !suggestedRewrite ? "not_needed" : rewriteResult?.risk_level === "none" ? "passed" : "failed";
  const row = await upsertRow(input.repos.marketing.policyReviewResults, {
    id: id("policy", `${input.workspaceId}:${entity.sourceEntityType}:${entity.sourceEntityId}:${hash(reviewedText)}`),
    workspace_id: input.workspaceId,
    target_type: entity.sourceEntityType,
    target_id: entity.sourceEntityId,
    platform: null,
    verdict: result.verdict,
    severity: result.risk_level === "severe" ? "critical" : result.risk_level,
    policy_codes: result.policy_codes,
    evidence: { sourceTextHash: hash(reviewedText), rulesetVersion: POLICY_RULESET_VERSION, sourceApproved: entity.approved, reviewState: entity.reviewState },
    fix_suggestions: result.fix_suggestions,
    owner_override: null,
    blocked: result.blocked,
    source_text_hash: hash(reviewedText),
    ruleset_version: POLICY_RULESET_VERSION,
    flagged_terms: result.flagged_terms,
    unsupported_claims: result.unsupported_claims,
    personal_attribute_flags: result.personal_attribute_flags,
    ip_flags: result.ip_flags,
    risk_level: result.risk_level,
    llm_context_note: input.llmNarrative ? compact(input.llmNarrative, 500) : null,
    suggested_rewrite: suggestedRewrite,
    rewrite_recheck_status: rewriteRecheckStatus,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow);
  return { policyReview: row, result: { ...result, suggested_rewrite: suggestedRewrite, rewrite_recheck_status: rewriteRecheckStatus }, entity };
}

export async function recheckPolicyRewrite(input: DeterministicCoreInput & { rewrite: string }) {
  const rewrite = text(input.rewrite);
  if (!rewrite) return { ...runDeterministicPolicyRules({ text: "", location: "suggested_rewrite" }), rewrite_recheck_status: "failed" };
  const result = runDeterministicPolicyRules({ text: rewrite, location: "suggested_rewrite" });
  return { ...result, rewrite_recheck_status: result.risk_level === "none" ? "passed" : "failed" };
}

function latestByUpdated(rows: WorkspaceRow[]) {
  return [...rows].sort((left, right) =>
    text(value(right, "updated_at", "updatedAt") ?? value(right, "created_at", "createdAt") ?? value(right, "computed_at", "computedAt"))
      .localeCompare(text(value(left, "updated_at", "updatedAt") ?? value(left, "created_at", "createdAt") ?? value(left, "computed_at", "computedAt")))
  )[0] ?? null;
}

async function marginInputs(input: DeterministicCoreInput, entity: NormalizedSourceEntity) {
  const variantRows = entity.sourceEntityType === "product_draft"
    ? await input.repos.variant.listByDraft(input.workspaceId, entity.sourceEntityId)
    : [];
  const latestMarginCheck = latestByUpdated((await input.repos.margin.listByWorkspace(input.workspaceId)).filter((row) =>
    text(value(row, "product_draft_id", "productDraftId")) === entity.sourceEntityId
  ));
  const firstVariant = variantRows[0] ?? null;
  const price = numberValue(value(firstVariant, "price") ?? value(latestMarginCheck, "price") ?? value(entity.raw, "price"));
  const cogs = numberValue(value(firstVariant, "cost") ?? value(latestMarginCheck, "cost") ?? value(entity.raw, "cogs"));
  const printifyBaseCost = numberValue(value(entity.raw, "printify_base_cost", "printifyBaseCost"));
  const shippingCost = numberValue(value(latestMarginCheck, "printify_shipping_estimate", "printifyShippingEstimate") ?? value(entity.raw, "shipping_cost", "shippingCost"));
  const paymentFeeEstimate = numberValue(value(latestMarginCheck, "shopify_fee_estimate", "shopifyFeeEstimate") ?? value(entity.raw, "payment_fee_estimate", "paymentFeeEstimate"));
  const platformFeeEstimate = numberValue(value(latestMarginCheck, "platform_fee_estimate", "platformFeeEstimate") ?? value(entity.raw, "platform_fee_estimate", "platformFeeEstimate"));
  const otherCosts = numberValue(value(entity.raw, "other_costs", "otherCosts")) ?? 0;
  return {
    price,
    cogs,
    printify_base_cost: printifyBaseCost,
    shipping_cost: shippingCost,
    payment_fee_estimate: paymentFeeEstimate,
    platform_fee_estimate: platformFeeEstimate,
    other_costs: otherCosts,
    evidenceRefs: [
      ...(firstVariant ? [{ type: "product_variant", id: firstVariant.id }] : []),
      ...(latestMarginCheck ? [{ type: "price_margin_check", id: latestMarginCheck.id }] : [])
    ]
  };
}

export async function calculateMarginEconomics(input: DeterministicCoreInput) {
  const entity = await resolveDeterministicSourceEntity(input);
  const costs = await marginInputs(input, entity);
  const required = ["price", "cogs", "shipping_cost", "payment_fee_estimate", "platform_fee_estimate"] as const;
  const missing = required.filter((key) => costs[key] == null);
  const missingCostData = missing.length > 0;
  const price = costs.price;
  const totalCost = missingCostData || price == null
    ? null
    : (costs.cogs ?? 0) + (costs.printify_base_cost ?? 0) + (costs.shipping_cost ?? 0) + (costs.payment_fee_estimate ?? 0) + (costs.platform_fee_estimate ?? 0) + (costs.other_costs ?? 0);
  const marginDollars = price != null && totalCost != null ? Number((price - totalCost).toFixed(2)) : null;
  const marginPct = price != null && price > 0 && marginDollars != null ? Number((marginDollars / price).toFixed(4)) : null;
  const breakevenCpa = marginDollars == null ? null : Math.max(0, marginDollars);
  const floorBreach = marginPct == null ? null : marginPct < 0.5;
  const paidReadiness = missingCostData || marginPct == null
    ? "unknown"
    : marginPct >= 0.6 ? "ready" : floorBreach ? "not_ready" : "organic_only_recommended";
  const narrativeNumbers = input.llmNarrative ? [...input.llmNarrative.matchAll(/(?:margin|cpa|profit)[^\d$-]*\$?(-?\d+(?:\.\d+)?)/gi)].map((match) => Number(match[1])) : [];
  const mismatch = marginDollars != null && narrativeNumbers.some((entry) => Math.abs(entry - marginDollars) > 0.01);
  const reconciliationStatus = mismatch ? "failed" : input.llmNarrative ? "passed" : "not_applicable";
  const recommendationText = missingCostData
    ? `Margin cannot be fully determined until required cost data is present: ${missing.join(", ")}.`
    : paidReadiness === "ready"
      ? "Margin supports owner-reviewed paid testing; no budget changes were made."
      : paidReadiness === "organic_only_recommended"
        ? "Margin is viable but should collect organic proof before paid escalation."
        : "Margin is below floor; fix price/cost before paid escalation.";
  const row = await upsertRow(input.repos.commerceAgent.marginAnalysis, {
    id: id("margin_core", `${input.workspaceId}:${entity.sourceEntityType}:${entity.sourceEntityId}`),
    workspace_id: input.workspaceId,
    source_entity_type: entity.sourceEntityType,
    source_entity_id: entity.sourceEntityId,
    price: price == null ? null : price.toFixed(2),
    cost_breakdown: { ...costs, missingRequiredCosts: missing, minimum_margin_pct: 0.5, paid_ad_minimum_margin_pct: 0.6 },
    margin_dollars: marginDollars == null ? null : marginDollars.toFixed(2),
    margin_pct: marginPct == null ? null : marginPct.toFixed(4),
    breakeven_cpa: breakevenCpa == null ? null : breakevenCpa.toFixed(2),
    floor_breach: floorBreach,
    missing_cost_data: missingCostData,
    paid_readiness: paidReadiness,
    safe_offers: missingCostData ? ["organic-only until costs are complete"] : marginPct != null && marginPct >= 0.5 ? ["bundle-before-discount", "owner-reviewed free-shipping test only if margin remains above floor"] : [],
    unsafe_offer_warnings: missingCostData ? ["missing_cost_data"] : floorBreach ? ["margin_floor_breach", "paid_test_not_safe"] : [],
    recommendation_text: recommendationText,
    reconciliation_status: reconciliationStatus,
    evidence_refs: costs.evidenceRefs,
    formula_version: MARGIN_FORMULA_VERSION,
    computed_at: now(),
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow);
  return {
    marginAnalysis: row,
    deterministic: { price, margin_dollars: marginDollars, margin_pct: marginPct, breakeven_cpa: breakevenCpa, floor_breach: floorBreach, missing_cost_data: missingCostData, paid_readiness: paidReadiness, reconciliation_status: reconciliationStatus }
  };
}

function descriptionWordCount(description: string) {
  return description.split(/\s+/).filter(Boolean).length;
}

async function visualStatus(input: DeterministicCoreInput, entity: NormalizedSourceEntity) {
  const mockupIds = asStringArray(value(entity.raw, "mockup_ids", "mockupIds"));
  const assetId = text(value(entity.raw, "asset_id", "assetId"));
  const mockups = entity.sourceEntityType === "product_draft"
    ? await input.repos.mockup.listByWorkspace(input.workspaceId).then((rows) => rows.filter((row) => mockupIds.includes(row.id) || text(value(row, "product_draft_id", "productDraftId")) === entity.sourceEntityId))
    : [];
  const asset = assetId ? await input.repos.asset.getById(assetId, input.workspaceId) : null;
  return { mockupCount: mockups.length, assetPresent: Boolean(asset), assetStatus: text(value(asset, "status") ?? value(asset, "qa_status", "qaStatus"), asset ? "present" : "missing") };
}

export async function runDeterministicReadinessCheck(input: DeterministicCoreInput) {
  const entity = await resolveDeterministicSourceEntity(input);
  const margin = await calculateMarginEconomics(input);
  const policy = await runUnifiedPolicyIpCheck(input);
  const visual = await visualStatus(input, entity);
  const requiredChecks = {
    title_present: Boolean(entity.title),
    description_present: Boolean(entity.description),
    description_min_length: descriptionWordCount(entity.description) >= 8,
    product_type_present: Boolean(entity.productCategory),
    price_present: margin.deterministic.price != null && margin.deterministic.price > 0,
    tag_or_category_present: entity.tags.length > 0 || Boolean(entity.productCategory),
    source_entity_approved: entity.approved !== false
  };
  const marginChecks = {
    margin_available: !margin.deterministic.missing_cost_data,
    floor_breach_absent: margin.deterministic.floor_breach !== true,
    paid_readiness_known: margin.deterministic.paid_readiness !== "unknown"
  };
  const visualChecks = {
    mockup_or_asset_present: visual.mockupCount >= 1 || visual.assetPresent,
    mockup_count: visual.mockupCount,
    asset_status: visual.assetStatus
  };
  const policyChecks = {
    blocked_policy_absent: !bool(value(policy.policyReview, "blocked")),
    risk_level: text(value(policy.policyReview, "risk_level", "riskLevel"), text(value(policy.policyReview, "severity"), "none"))
  };
  const seoChecks = {
    title_length_ok: entity.title.length > 0 && entity.title.length <= 70,
    description_available: Boolean(entity.description)
  };
  const evidenceChecks = {
    source_trace_present: Boolean(entity.sourceEntityId),
    source_type: entity.sourceEntityType
  };
  const blockingIssues = [
    ...Object.entries(requiredChecks).filter(([, pass]) => !pass).map(([key]) => key),
    ...(margin.deterministic.floor_breach ? ["margin_floor_breach"] : []),
    ...(bool(value(policy.policyReview, "blocked")) ? ["policy_or_ip_blocked"] : [])
  ];
  const warnings = [
    ...(margin.deterministic.missing_cost_data ? ["missing_cost_data"] : []),
    ...(margin.deterministic.paid_readiness === "unknown" ? ["paid_readiness_unknown"] : []),
    ...(["low", "medium"].includes(policyChecks.risk_level) ? [`policy_risk_${policyChecks.risk_level}`] : []),
    ...(!visualChecks.mockup_or_asset_present ? ["mockup_or_asset_missing"] : []),
    ...(!seoChecks.title_length_ok ? ["seo_title_length_needs_review"] : [])
  ];
  const completenessScore = Math.round(Object.values(requiredChecks).filter(Boolean).length / Object.keys(requiredChecks).length * 25);
  const marginScore = margin.deterministic.floor_breach ? 0 : margin.deterministic.missing_cost_data ? 8 : 20;
  const visualScore = visualChecks.mockup_or_asset_present ? 20 : 8;
  const policyScore = bool(value(policy.policyReview, "blocked")) ? 0 : policyChecks.risk_level === "none" || policyChecks.risk_level === "low" ? 20 : 10;
  const seoScore = Object.values(seoChecks).filter(Boolean).length / Object.keys(seoChecks).length * 10;
  const evidenceScore = evidenceChecks.source_trace_present ? 5 : 0;
  const readinessScore = Math.max(0, Math.min(100, Math.round(completenessScore + marginScore + visualScore + policyScore + seoScore + evidenceScore)));
  const verdict = blockingIssues.length ? "blocked" : warnings.length ? "needs_fixes" : readinessScore >= 85 ? "ready" : "watch_longer";
  const row = await upsertRow(input.repos.commerceAgent.productReadinessChecks, {
    id: id("readiness_core", `${input.workspaceId}:${entity.sourceEntityType}:${entity.sourceEntityId}`),
    workspace_id: input.workspaceId,
    source_entity_type: entity.sourceEntityType,
    source_entity_id: entity.sourceEntityId,
    readiness_score: readinessScore,
    verdict,
    blocking_issues: blockingIssues,
    warnings,
    checklist: { requiredChecks, marginChecks, visualChecks, policyChecks, seoChecks, evidenceChecks, weights: { required: 25, margin: 20, visual: 20, policy: 20, seo: 10, evidence: 5 } },
    checklist_version: PRODUCT_READINESS_CHECKLIST_VERSION,
    evidence_refs: [{ type: "margin_analysis", id: margin.marginAnalysis.id }, { type: "policy_review", id: policy.policyReview.id }],
    computed_at: now(),
    llm_explanation: input.llmNarrative ? compact(input.llmNarrative, 700) : null,
    owner_action_needed: verdict === "ready" ? "proceed" : verdict === "blocked" ? "fix_blockers" : "fix_first",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow);
  return { readinessCheck: row, deterministic: { readiness_score: readinessScore, verdict, blocking_issues: blockingIssues, warnings, checklist: row.checklist ?? row.checklist_json } };
}

function primaryKeyword(entity: NormalizedSourceEntity) {
  return entity.tags[0] || entity.phrases[0] || entity.productCategory;
}

function keywordStuffing(textValue: string, keyword: string) {
  if (!keyword) return false;
  const count = (textValue.toLowerCase().match(new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase()}\\b`, "g")) ?? []).length;
  return count > 3;
}

export async function generateSeoGeoPdpDraft(input: DeterministicCoreInput) {
  const entity = await resolveDeterministicSourceEntity(input);
  const keyword = primaryKeyword(entity);
  const titleDraft = compact(keyword && !entity.title.toLowerCase().includes(keyword.toLowerCase()) ? `${entity.title} ${keyword}` : entity.title, 70);
  const metaDescriptionDraft = compact(entity.description || `${entity.title} owner-reviewed product details for Salty Cowhide shoppers.`, 155);
  return {
    title_draft: titleDraft,
    meta_description_draft: metaDescriptionDraft,
    h1_suggestion: entity.title,
    h2_suggestions: ["Product details", "Why it fits the style", "Owner-reviewed facts"],
    faq_items: [
      { question: "Who is this for?", answer: `Shoppers looking for ${entity.productCategory || "giftable"} style with owner-reviewed product facts.` },
      { question: "What details should be checked?", answer: "Confirm size, material, shipping, and personalization details before publishing." }
    ],
    ai_readable_summary: compact(`${entity.title}: ${entity.description}`, 260),
    comparison_bullets: ["Original Salty Cowhide positioning", "Policy-safe copy only", "No unsupported material or shipping claims"],
    schema_recommendations: ["Product.name", "Product.description", "Offer.price when known", "Brand", "BreadcrumbList", "FAQPage when approved facts exist"],
    image_alt_text_suggestions: [`${entity.title} product image`, `${entity.productCategory || "Salty Cowhide"} product detail`],
    pdp_clarity_fixes: ["Lead with product type", "Keep material and shipping claims substantiated", "Make personalization status clear if applicable"],
    internal_link_suggestions: ["/collections", "/drops"]
  };
}

export async function validateSeoGeoPdpDraft(input: DeterministicCoreInput & { draft?: Record<string, unknown> | undefined }) {
  const entity = await resolveDeterministicSourceEntity(input);
  const draft = asRecord(input.draft ?? await generateSeoGeoPdpDraft(input));
  const keyword = primaryKeyword(entity);
  const titleDraft = text(draft.title_draft ?? draft["titleDraft"]);
  const meta = text(draft.meta_description_draft ?? draft["metaDescriptionDraft"]);
  const first100 = `${entity.description} ${text(draft.ai_readable_summary ?? draft["aiReadableSummary"])}`.split(/\s+/).slice(0, 100).join(" ");
  const policy = await runUnifiedPolicyIpCheck({ ...input, content: [titleDraft, meta, text(draft.ai_readable_summary ?? draft["aiReadableSummary"]), JSON.stringify(draft.faq_items ?? draft["faqItems"] ?? [])].join("\n") });
  const unsupportedClaims = asArray(value(policy.policyReview, "unsupported_claims", "unsupportedClaims"));
  return {
    draft,
    policy,
    complianceChecklist: {
      title_len_ok: titleDraft.length > 0 && titleDraft.length <= 70,
      meta_len_ok: meta.length > 0 && meta.length <= 155,
      keyword_present_title: keyword ? titleDraft.toLowerCase().includes(keyword.toLowerCase()) : false,
      keyword_present_first_100_words: keyword ? first100.toLowerCase().includes(keyword.toLowerCase()) : false,
      schema_complete: ["Product.name", "Product.description"].every((field) => JSON.stringify(draft).includes(field)),
      unsupported_claims_absent: unsupportedClaims.length === 0,
      keyword_stuffing_absent: !keywordStuffing(`${titleDraft} ${meta} ${first100}`, keyword),
      keyword_data_source: "directional"
    }
  };
}

export async function createSeoGeoPdpRecommendation(input: DeterministicCoreInput) {
  const entity = await resolveDeterministicSourceEntity(input);
  const validation = await validateSeoGeoPdpDraft(input);
  const draft = validation.draft;
  const row = await upsertRow(input.repos.commerceAgent.seoRecommendations, {
    id: id("seo_core", `${input.workspaceId}:${entity.sourceEntityType}:${entity.sourceEntityId}`),
    workspace_id: input.workspaceId,
    source_entity_type: entity.sourceEntityType,
    source_entity_id: entity.sourceEntityId,
    title_draft: text(draft.title_draft ?? draft["titleDraft"]),
    meta_description_draft: text(draft.meta_description_draft ?? draft["metaDescriptionDraft"]),
    h1_suggestion: text(draft.h1_suggestion ?? draft["h1Suggestion"]),
    h2_suggestions: asArray(draft.h2_suggestions ?? draft["h2Suggestions"]),
    faq_items: asArray(draft.faq_items ?? draft["faqItems"]),
    ai_readable_summary: text(draft.ai_readable_summary ?? draft["aiReadableSummary"]),
    comparison_bullets: asArray(draft.comparison_bullets ?? draft["comparisonBullets"]),
    schema_recommendations: asArray(draft.schema_recommendations ?? draft["schemaRecommendations"]),
    image_alt_text_suggestions: asArray(draft.image_alt_text_suggestions ?? draft["imageAltTextSuggestions"]),
    pdp_clarity_fixes: asArray(draft.pdp_clarity_fixes ?? draft["pdpClarityFixes"]),
    internal_link_suggestions: asArray(draft.internal_link_suggestions ?? draft["internalLinkSuggestions"]),
    compliance_checklist: validation.complianceChecklist,
    keyword_data_source: "directional",
    policy_review_id: validation.policy.policyReview.id,
    evidence_refs: [{ type: "policy_review", id: validation.policy.policyReview.id }, { type: entity.sourceEntityType, id: entity.sourceEntityId }],
    recommendation_version: SEO_GEO_PDP_RECOMMENDATION_VERSION,
    review_status: "pending_review",
    computed_at: now(),
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow);
  return { seoRecommendation: row, validation };
}

export async function compileDeterministicCoreBundle(input: DeterministicCoreInput) {
  const entity = await resolveDeterministicSourceEntity(input);
  const byEntity = (row: WorkspaceRow) => text(value(row, "source_entity_type", "sourceEntityType")) === entity.sourceEntityType && text(value(row, "source_entity_id", "sourceEntityId")) === entity.sourceEntityId;
  const [readiness, margins, policies, seo] = await Promise.all([
    input.repos.commerceAgent.productReadinessChecks.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.marginAnalysis.listByWorkspace(input.workspaceId),
    input.repos.marketing.policyReviewResults.listByWorkspace(input.workspaceId),
    input.repos.commerceAgent.seoRecommendations.listByWorkspace(input.workspaceId)
  ]);
  return {
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId,
    latestReadiness: latestByUpdated(readiness.filter(byEntity)),
    latestMarginAnalysis: latestByUpdated(margins.filter(byEntity)),
    latestPolicyReview: latestByUpdated(policies.filter((row) => text(value(row, "target_type", "targetType")) === entity.sourceEntityType && text(value(row, "target_id", "targetId")) === entity.sourceEntityId)),
    latestSeoRecommendation: latestByUpdated(seo.filter(byEntity))
  };
}
