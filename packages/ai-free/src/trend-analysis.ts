import crypto from "node:crypto";
import { now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";

export const NO_TREND_SIGNALS_AVAILABLE = "no_trend_signals_available";
export const OLLAMA_INVALID_JSON = "ollama_invalid_json";

const DEFAULT_MAX_SIGNALS = 100;
const DEFAULT_MAX_CONCEPTS = 8;
const productTypeHints = ["car charm", "keychain", "ornament", "suncatcher", "apparel", "boutique accessory"];
const personalizationTerms = new Set(["custom", "personalized", "name", "names", "date", "dates", "gift", "gifts", "bachelorette", "favor", "favors", "monogram", "initial", "initials", "charm", "ornament", "keychain"]);
const productTypeKeywords: Array<{ value: string; tokens: string[] }> = [
  { value: "car charm", tokens: ["car", "charm"] },
  { value: "keychain", tokens: ["keychain"] },
  { value: "ornament", tokens: ["ornament"] },
  { value: "suncatcher", tokens: ["suncatcher"] },
  { value: "apparel", tokens: ["shirt", "tee", "crewneck", "hoodie", "sweatshirt", "apparel"] },
  { value: "boutique accessory", tokens: ["accessory", "accessories", "bag", "tote", "pouch"] }
];
const stopWords = new Set([
  "a", "an", "and", "are", "at", "be", "by", "co", "for", "from", "gift", "gifts", "in", "is", "it", "its", "of", "on", "or", "our",
  "the", "to", "with", "your", "you", "ya", "cowgirl", "coastal", "western", "beach", "cowboy", "boutique"
]);

export type TrendAnalysisClusterResult = {
  id: string;
  label: string;
  summary: string;
  memberSignalIds: string[];
  sourceKeys: string[];
  keywordTerms: string[];
  motifTerms: string[];
  citationIds: string[];
  signalCount: number;
  crossSourceCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  status: string;
  createdByKind: string | null;
  confidence: number;
};

export type TrendScoreResult = {
  id: string;
  clusterId: string;
  totalScore: number;
  confidenceScore: number;
  componentScores: Record<string, number>;
  reasons: string[];
  warnings: string[];
  riskFlags: string[];
  recommendedAction: "promote_to_concept" | "watch_longer" | "reject" | "needs_owner_review";
};

export type ProductConceptCandidateResult = {
  id: string;
  profileId: string;
  clusterId: string;
  trendScoreId: string | null;
  title: string;
  customerSegment: string;
  productCategory: string;
  suggestedProductTypes: string[];
  personalizationPotential: string;
  phrases: string[];
  visualMotifs: string[];
  palette: string[];
  printStyle: string;
  recommendedBlankOrBaseProduct: string | null;
  marginHypothesis: string | null;
  sourceEvidence: Record<string, unknown>;
  reasonItMaySell: string;
  riskNotes: string;
  ownerActionNeeded: string;
  reviewStatus: string;
  createdByKind: string;
  ownerNotes: string | null;
};

export type TrendAnalysisReportDetail = {
  report: Record<string, unknown>;
  clusters: TrendAnalysisClusterResult[];
  scores: TrendScoreResult[];
  conceptCandidates: ProductConceptCandidateResult[];
};

type AnalysisSignal = {
  id: string;
  sourceId: string;
  sourceKey: string;
  signalType: string;
  keyword: string;
  normalizedKeyword: string;
  normalizedTitle: string;
  normalizedTags: string[];
  normalizedMotifTags: string[];
  relatedTerms: string[];
  category: string;
  season: string | null;
  confidence: number;
  status: string;
  riskFlags: string[];
  observedAt: string;
  metricValue: number | null;
  metricType: string | null;
  priceValue: number | null;
  priceCurrency: string | null;
  citationIds: string[];
  citationUrls: string[];
};

type ConceptDraft = {
  clusterId: string;
  clusterLabel: string;
  clusterSummary: string;
  score: TrendScoreResult;
  recommendedConceptCount: number;
  customerSegment: string;
  productCategory: string;
  suggestedProductTypes: string[];
  personalizationPotential: string;
  phraseDirections: string[];
  visualMotifs: string[];
  palette: string[];
  printStyleHints: string[];
  evidence: Record<string, unknown>;
  riskNotes: string[];
  ownerActionNeededDefault: string;
};

type ProfileSnapshot = {
  id: string;
  nicheName: string;
  targetCustomer: string;
  keywords: string[];
  seedPhrases: string[];
  excludedTerms: string[];
  visualMotifs: string[];
  brandPalette: string[];
  productCategories: string[];
  productTypes: string[];
  sourceWeights: Record<string, number>;
  scoreWeights: Record<string, number>;
  freshnessWindowDays: number;
  minSignalThreshold: number;
};

type TrendAnalysisTaskInput = {
  profileId?: string;
  sourceKeys?: string[];
  maxSignals?: number;
  maxConcepts?: number;
  instructions?: string;
};

const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const asStringArray = (input: unknown): string[] => Array.isArray(input) ? input.map((item) => String(item).trim()).filter(Boolean) : [];
const asWorkspacePatch = <T extends Record<string, unknown>>(input: T) => input as unknown as WorkspaceRow;
const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input.trim() : fallback;
const numberValue = (input: unknown) => {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};
const maxBound = (input: unknown, fallback: number, max: number) => Math.max(1, Math.min(Math.floor(numberValue(input) ?? fallback), max));

function compactText(input: unknown, maxLength = 220) {
  const normalized = String(input ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
}

function normalizeToken(input: string) {
  return compactText(input.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").replace(/\s+/g, " "), 80);
}

function tokenize(input: string) {
  return normalizeToken(input)
    .split(/[\s/-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => compactText(value, 120)).filter(Boolean))];
}

function titleCase(input: string) {
  return input.split(/\s+/).map((part) => part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : "").join(" ").trim();
}

function hashId(prefix: string, input: string) {
  return `${prefix}_${crypto.createHash("sha1").update(input).digest("hex").slice(0, 14)}`;
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function profileSnapshot(profile: WorkspaceRow): ProfileSnapshot {
  return {
    id: profile.id,
    nicheName: text(value(profile, "niche_name"), "Trend Profile"),
    targetCustomer: text(value(profile, "target_customer"), "Salty Cowhide customer"),
    keywords: uniqueStrings(asStringArray(value(profile, "keywords"))),
    seedPhrases: uniqueStrings(asStringArray(value(profile, "seed_phrases", "seedPhrases"))),
    excludedTerms: uniqueStrings(asStringArray(value(profile, "excluded_terms", "excludedTerms")).map(normalizeToken)),
    visualMotifs: uniqueStrings(asStringArray(value(profile, "visual_motifs", "visualMotifs")).map(normalizeToken)),
    brandPalette: uniqueStrings(asStringArray(value(profile, "brand_palette", "brandPalette")).map(normalizeToken)),
    productCategories: uniqueStrings(asStringArray(value(profile, "product_categories", "productCategories")).map(normalizeToken)),
    productTypes: uniqueStrings(asStringArray(value(profile, "product_types", "productTypes")).map(normalizeToken)),
    sourceWeights: Object.fromEntries(Object.entries(asRecord(value(profile, "source_weights", "sourceWeights"))).map(([key, raw]) => [key, numberValue(raw) ?? 1])),
    scoreWeights: Object.fromEntries(Object.entries(asRecord(value(profile, "score_weights", "scoreWeights"))).map(([key, raw]) => [key, numberValue(raw) ?? 0])),
    freshnessWindowDays: Math.max(1, Number(value(profile, "freshness_window_days", "freshnessWindowDays") ?? 30)),
    minSignalThreshold: Math.max(1, Number(value(profile, "min_signal_threshold", "minSignalThreshold") ?? 1))
  };
}

function taskInputValue(taskInput: Record<string, unknown> | undefined, key: string) {
  return taskInput?.[key] ?? taskInput?.[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
}

function safeDate(input: unknown) {
  const raw = text(input);
  if (!raw) return null;
  const stamp = new Date(raw);
  return Number.isNaN(stamp.getTime()) ? null : stamp;
}

function currentMonthKey() {
  return new Date().toISOString().slice(5, 7);
}

function seasonalTokensForMonth(month: string) {
  if (["05", "06", "07", "08"].includes(month)) return ["summer", "beach", "coastal", "bachelorette", "vacation"];
  if (["09", "10", "11"].includes(month)) return ["fall", "autumn", "rodeo", "tailgate"];
  return ["holiday", "gift", "winter", "ornament"];
}

function productTypeCandidates(tokens: string[], profile: ProfileSnapshot) {
  const normalized = new Set(tokens.map(normalizeToken));
  const hits = productTypeKeywords
    .filter((entry) => entry.tokens.every((token) => normalized.has(token) || tokens.includes(token)))
    .map((entry) => entry.value);
  const fallback = profile.productTypes.length ? profile.productTypes.map((value) => compactText(value, 80)) : productTypeHints;
  return uniqueStrings((hits.length ? hits : fallback).slice(0, 4));
}

function productCategoryForTypes(types: string[]) {
  if (types.some((value) => /apparel|tee|shirt|hoodie|crewneck/i.test(value))) return "apparel";
  if (types.some((value) => /accessory|keychain|charm|ornament|suncatcher/i.test(value))) return "accessories";
  return "boutique accessories";
}

function evidenceSummary(label: string, signalCount: number, sourceKeys: string[], motifs: string[]) {
  const motifText = motifs.length ? ` Motifs: ${motifs.slice(0, 3).join(", ")}.` : "";
  return `${signalCount} persisted signals across ${sourceKeys.length} source${sourceKeys.length === 1 ? "" : "s"} support ${label}.${motifText}`.trim();
}

function clusterMetadataMatchesAgentRun(row: WorkspaceRow, agentRunId: string) {
  const metadata = asRecord(value(row, "metadata"));
  return text(metadata.agentRunId) === agentRunId;
}

function safeProfile(profile: ProfileSnapshot) {
  return {
    id: profile.id,
    nicheName: profile.nicheName,
    targetCustomer: profile.targetCustomer,
    keywords: profile.keywords,
    seedPhrases: profile.seedPhrases,
    excludedTerms: profile.excludedTerms,
    visualMotifs: profile.visualMotifs,
    brandPalette: profile.brandPalette,
    productCategories: profile.productCategories,
    productTypes: profile.productTypes,
    sourceWeights: profile.sourceWeights,
    scoreWeights: profile.scoreWeights,
    freshnessWindowDays: profile.freshnessWindowDays,
    minSignalThreshold: profile.minSignalThreshold
  };
}

function safeSignal(signal: AnalysisSignal) {
  return {
    id: signal.id,
    sourceId: signal.sourceId,
    sourceKey: signal.sourceKey,
    signalType: signal.signalType,
    keyword: signal.keyword,
    normalizedKeyword: signal.normalizedKeyword,
    normalizedTitle: signal.normalizedTitle,
    normalizedTags: signal.normalizedTags,
    normalizedMotifTags: signal.normalizedMotifTags,
    relatedTerms: signal.relatedTerms,
    category: signal.category,
    season: signal.season,
    confidence: signal.confidence,
    status: signal.status,
    riskFlags: signal.riskFlags,
    observedAt: signal.observedAt,
    metricValue: signal.metricValue,
    metricType: signal.metricType,
    priceValue: signal.priceValue,
    priceCurrency: signal.priceCurrency,
    citationIds: signal.citationIds,
    citationUrls: signal.citationUrls
  };
}

function safeCluster(row: WorkspaceRow): TrendAnalysisClusterResult {
  return {
    id: row.id,
    label: text(value(row, "label") ?? value(row, "name"), "Trend Cluster"),
    summary: text(value(row, "summary") ?? value(row, "notes")),
    memberSignalIds: asStringArray(value(row, "member_signal_ids", "memberSignalIds") ?? value(row, "signal_ids", "signalIds")),
    sourceKeys: asStringArray(value(row, "source_keys", "sourceKeys")),
    keywordTerms: asStringArray(value(row, "keyword_terms", "keywordTerms") ?? value(row, "keywords")),
    motifTerms: asStringArray(value(row, "motif_terms", "motifTerms") ?? value(row, "aesthetic_tags", "aestheticTags")),
    citationIds: asStringArray(value(row, "citation_ids", "citationIds")),
    signalCount: Number(value(row, "signal_count", "signalCount") ?? asStringArray(value(row, "member_signal_ids", "memberSignalIds")).length),
    crossSourceCount: Number(value(row, "cross_source_count", "crossSourceCount") ?? asStringArray(value(row, "source_keys", "sourceKeys")).length),
    firstObservedAt: text(value(row, "first_observed_at", "firstObservedAt")) || null,
    lastObservedAt: text(value(row, "last_observed_at", "lastObservedAt")) || null,
    status: text(value(row, "status"), "candidate"),
    createdByKind: text(value(row, "created_by_kind", "createdByKind")) || null,
    confidence: Number(value(row, "confidence") ?? 0)
  };
}

function safeScore(row: WorkspaceRow): TrendScoreResult {
  return {
    id: row.id,
    clusterId: text(value(row, "cluster_id", "clusterId")),
    totalScore: Number(value(row, "total_score", "totalScore") ?? 0),
    confidenceScore: Number(value(row, "confidence_score", "confidenceScore") ?? 0),
    componentScores: Object.fromEntries(Object.entries(asRecord(value(row, "component_scores", "componentScores"))).map(([key, raw]) => [key, Number(raw ?? 0)])),
    reasons: asStringArray(value(row, "reasons")),
    warnings: asStringArray(value(row, "warnings")),
    riskFlags: asStringArray(value(row, "risk_flags", "riskFlags")),
    recommendedAction: (text(value(row, "recommended_action", "recommendedAction"), "watch_longer") as TrendScoreResult["recommendedAction"])
  };
}

function safeConcept(row: WorkspaceRow): ProductConceptCandidateResult {
  return {
    id: row.id,
    profileId: text(value(row, "profile_id", "profileId")),
    clusterId: text(value(row, "cluster_id", "clusterId")),
    trendScoreId: text(value(row, "trend_score_id", "trendScoreId")) || null,
    title: text(value(row, "title")),
    customerSegment: text(value(row, "customer_segment", "customerSegment")),
    productCategory: text(value(row, "product_category", "productCategory")),
    suggestedProductTypes: asStringArray(value(row, "suggested_product_types", "suggestedProductTypes")),
    personalizationPotential: text(value(row, "personalization_potential", "personalizationPotential")),
    phrases: asStringArray(value(row, "phrases")),
    visualMotifs: asStringArray(value(row, "visual_motifs", "visualMotifs")),
    palette: asStringArray(value(row, "palette")),
    printStyle: text(value(row, "print_style", "printStyle")),
    recommendedBlankOrBaseProduct: text(value(row, "recommended_blank_or_base_product", "recommendedBlankOrBaseProduct")) || null,
    marginHypothesis: text(value(row, "margin_hypothesis", "marginHypothesis")) || null,
    sourceEvidence: asRecord(value(row, "source_evidence", "sourceEvidence")),
    reasonItMaySell: text(value(row, "reason_it_may_sell", "reasonItMaySell")),
    riskNotes: text(value(row, "risk_notes", "riskNotes")),
    ownerActionNeeded: text(value(row, "owner_action_needed", "ownerActionNeeded")),
    reviewStatus: text(value(row, "review_status", "reviewStatus"), "pending_review"),
    createdByKind: text(value(row, "created_by_kind", "createdByKind"), "ollama_agent"),
    ownerNotes: text(value(row, "owner_notes", "ownerNotes")) || null
  };
}

function safeReport(row: WorkspaceRow) {
  const metadata = asRecord(value(row, "metadata"));
  return {
    id: row.id,
    profileId: text(value(row, "profile_id", "profileId")),
    agentRunId: text(value(row, "agent_run_id", "agentRunId")) || null,
    sourceSignalCount: Number(value(row, "source_signal_count", "sourceSignalCount") ?? 0),
    clusterCount: Number(value(row, "cluster_count", "clusterCount") ?? 0),
    conceptCandidateCount: Number(value(row, "concept_candidate_count", "conceptCandidateCount") ?? 0),
    summary: text(value(row, "summary")),
    warnings: asStringArray(value(row, "warnings")),
    status: text(value(row, "status"), "pending_review"),
    createdAt: value(row, "created_at", "createdAt"),
    updatedAt: value(row, "updated_at", "updatedAt"),
    metadata: {
      clusterIds: asStringArray(metadata.clusterIds),
      scoreIds: asStringArray(metadata.scoreIds),
      conceptCandidateIds: asStringArray(metadata.conceptCandidateIds),
      topConceptTitles: asStringArray(metadata.topConceptTitles)
    }
  };
}

async function getProfileOrThrow(repos: RepositoryBundle, workspaceId: string, profileId: string) {
  const profile = await repos.trendIntelligence.profiles.getById(profileId, workspaceId);
  if (!profile) throw new Error("trend_profile_missing");
  return profileSnapshot(profile);
}

function signalTokenSet(signal: AnalysisSignal) {
  return new Set([
    ...tokenize(signal.keyword),
    ...tokenize(signal.normalizedKeyword),
    ...tokenize(signal.normalizedTitle),
    ...signal.normalizedTags.flatMap(tokenize),
    ...signal.relatedTerms.flatMap(tokenize),
    ...signal.normalizedMotifTags.flatMap(tokenize)
  ]);
}

function sharedCount(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const token of left) if (right.has(token)) count += 1;
  return count;
}

function signalSimilarity(left: AnalysisSignal, right: AnalysisSignal) {
  const leftTokens = signalTokenSet(left);
  const rightTokens = signalTokenSet(right);
  const sharedTokens = sharedCount(leftTokens, rightTokens);
  const sharedMotifs = sharedCount(new Set(left.normalizedMotifTags.map(normalizeToken)), new Set(right.normalizedMotifTags.map(normalizeToken)));
  const sameKeyword = left.normalizedKeyword && left.normalizedKeyword === right.normalizedKeyword ? 2 : 0;
  const sharedProductTypes = sharedCount(new Set(productTypeCandidates([...leftTokens], { productTypes: productTypeHints, productCategories: [], keywords: [], seedPhrases: [], excludedTerms: [], visualMotifs: [], brandPalette: [], sourceWeights: {}, scoreWeights: {}, freshnessWindowDays: 30, minSignalThreshold: 1, targetCustomer: "", nicheName: "", id: "" })), new Set(productTypeCandidates([...rightTokens], { productTypes: productTypeHints, productCategories: [], keywords: [], seedPhrases: [], excludedTerms: [], visualMotifs: [], brandPalette: [], sourceWeights: {}, scoreWeights: {}, freshnessWindowDays: 30, minSignalThreshold: 1, targetCustomer: "", nicheName: "", id: "" })));
  return sameKeyword + Math.min(sharedTokens, 3) + sharedMotifs * 2 + Math.min(sharedProductTypes, 1);
}

function buildConnectedComponents(signals: AnalysisSignal[]) {
  const adjacency = new Map<string, Set<string>>();
  for (const signal of signals) adjacency.set(signal.id, new Set());
  for (let index = 0; index < signals.length; index += 1) {
    for (let inner = index + 1; inner < signals.length; inner += 1) {
      const left = signals[index]!;
      const right = signals[inner]!;
      if (signalSimilarity(left, right) >= 3) {
        adjacency.get(left.id)?.add(right.id);
        adjacency.get(right.id)?.add(left.id);
      }
    }
  }

  const visited = new Set<string>();
  const byId = new Map(signals.map((signal) => [signal.id, signal]));
  const components: AnalysisSignal[][] = [];
  for (const signal of signals) {
    if (visited.has(signal.id)) continue;
    const queue = [signal.id];
    const members: AnalysisSignal[] = [];
    while (queue.length) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = byId.get(currentId);
      if (current) members.push(current);
      for (const next of adjacency.get(currentId) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    components.push(members);
  }

  return components
    .map((component) => component.sort((left, right) => left.id.localeCompare(right.id)))
    .sort((left, right) => right.length - left.length || left.map((signal) => signal.id).join("|").localeCompare(right.map((signal) => signal.id).join("|")));
}

function clusterTerms(signals: AnalysisSignal[]) {
  const tokenCounts = new Map<string, number>();
  const motifCounts = new Map<string, number>();
  for (const signal of signals) {
    for (const token of signalTokenSet(signal)) tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    for (const motif of signal.normalizedMotifTags.map(normalizeToken)) motifCounts.set(motif, (motifCounts.get(motif) ?? 0) + 1);
  }
  const keywordTerms = [...tokenCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([token]) => token).slice(0, 8);
  const motifTerms = [...motifCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([token]) => token).slice(0, 6);
  return { keywordTerms, motifTerms };
}

function buildClusterLabel(keywords: string[], motifs: string[]) {
  const productHit = productTypeKeywords.find((entry) => keywords.some((keyword) => entry.tokens.includes(keyword)));
  const parts = uniqueStrings([
    ...motifs.slice(0, 2),
    ...keywords.filter((keyword) => !productHit?.tokens.includes(keyword)).slice(0, 2),
    ...(productHit ? [productHit.value] : [])
  ]).slice(0, 3);
  return titleCase(parts.join(" ")) || "Trend Cluster";
}

function buildClusterSummary(label: string, signals: AnalysisSignal[], sourceKeys: string[], motifs: string[]) {
  const observed = signals.map((signal) => safeDate(signal.observedAt)).filter(Boolean) as Date[];
  const latest = observed.sort((left, right) => right.getTime() - left.getTime())[0];
  const recency = latest ? ` Latest observed ${latest.toISOString().slice(0, 10)}.` : "";
  return `${signals.length} persisted signals group around ${label} from ${sourceKeys.join(", ")}.${motifs.length ? ` Motifs include ${motifs.slice(0, 3).join(", ")}.` : ""}${recency}`.trim();
}

function componentWeight(profile: ProfileSnapshot, key: string, fallback: number) {
  const configured = numberValue(profile.scoreWeights[key]);
  return configured !== null && configured > 0 ? configured : fallback;
}

function overlapScore(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const leftSet = new Set(left.map(normalizeToken));
  const rightSet = new Set(right.map(normalizeToken));
  const shared = sharedCount(leftSet, rightSet);
  return roundScore((shared / Math.max(leftSet.size, rightSet.size, 1)) * 100);
}

function sourceWeight(profile: ProfileSnapshot, sourceKey: string) {
  return Math.max(0.5, Number(profile.sourceWeights[sourceKey] ?? 1));
}

function suggestedPersonalizationLevel(tokens: string[]) {
  const score = tokens.filter((token) => personalizationTerms.has(token)).length;
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function buildPhraseDirections(cluster: TrendAnalysisClusterResult, profile: ProfileSnapshot) {
  const banned = new Set(profile.excludedTerms.map(normalizeToken));
  return uniqueStrings(cluster.keywordTerms.filter((term) =>
    !banned.has(normalizeToken(term)) &&
    !productTypeHints.includes(term) &&
    !/etsy|listing|gift|summer|western|coastal|cowgirl/i.test(term)
  )).slice(0, 5);
}

async function upsertRow(repo: RepositoryBundle["trendIntelligence"]["reports"] | RepositoryBundle["trendIntelligence"]["scores"] | RepositoryBundle["trendIntelligence"]["clusters"] | RepositoryBundle["trendIntelligence"]["clusterSignals"] | RepositoryBundle["trendIntelligence"]["concepts"] | RepositoryBundle["aiEmployee"]["outputs"], row: WorkspaceRow) {
  const existing = await repo.getById(row.id, text(value(row, "workspace_id", "workspaceId")));
  return existing ? repo.update(row.id, row) : repo.create(row);
}

async function getSignalsByIds(repos: RepositoryBundle, workspaceId: string, signalIds: string[]) {
  const rows = await repos.trend.listByWorkspace(workspaceId);
  const wanted = new Set(signalIds);
  return rows.filter((row) => wanted.has(row.id));
}

async function signalRowsWithCitations(repos: RepositoryBundle, workspaceId: string, profileId: string) {
  const signals = await repos.trendIntelligence.listSignalsByProfile(workspaceId, profileId);
  const activeSignals = signals
    .filter((row) => !["archived", "rejected"].includes(text(value(row, "status"), "active")))
    .sort((left, right) => text(value(right, "observed_at", "observedAt") ?? value(right, "captured_at", "capturedAt") ?? value(right, "created_at", "createdAt")).localeCompare(
      text(value(left, "observed_at", "observedAt") ?? value(left, "captured_at", "capturedAt") ?? value(left, "created_at", "createdAt"))
    ) || left.id.localeCompare(right.id));
  const citations = await repos.trendIntelligence.citations.listByWorkspace(workspaceId);
  const citationsBySignal = new Map<string, WorkspaceRow[]>();
  for (const citation of citations) {
    if (text(value(citation, "entity_type", "entityType")) !== "trend_signal") continue;
    const signalId = text(value(citation, "entity_id", "entityId"));
    if (!signalId) continue;
    const bucket = citationsBySignal.get(signalId) ?? [];
    bucket.push(citation);
    citationsBySignal.set(signalId, bucket);
  }
  return activeSignals.map((row) => {
    const rowCitations = citationsBySignal.get(row.id) ?? [];
    return {
      id: row.id,
      sourceId: text(value(row, "source_id", "sourceId")),
      sourceKey: text(value(row, "source_key", "sourceKey")),
      signalType: text(value(row, "signal_type", "signalType"), "other"),
      keyword: text(value(row, "keyword")),
      normalizedKeyword: text(value(row, "normalized_keyword", "normalizedKeyword") ?? value(row, "keyword")),
      normalizedTitle: text(value(row, "normalized_title", "normalizedTitle")),
      normalizedTags: uniqueStrings(asStringArray(value(row, "normalized_tags", "normalizedTags")).map(normalizeToken)),
      normalizedMotifTags: uniqueStrings(asStringArray(value(row, "normalized_motif_tags", "normalizedMotifTags")).map(normalizeToken)),
      relatedTerms: uniqueStrings(asStringArray(value(row, "related_terms", "relatedTerms")).map(normalizeToken)),
      category: text(value(row, "category"), "other"),
      season: text(value(row, "season")) || null,
      confidence: Number(value(row, "confidence") ?? 0),
      status: text(value(row, "status"), "active"),
      riskFlags: uniqueStrings(asStringArray(value(row, "risk_flags", "riskFlags")).map(normalizeToken)),
      observedAt: text(value(row, "observed_at", "observedAt") ?? value(row, "captured_at", "capturedAt") ?? value(row, "created_at", "createdAt"), new Date().toISOString()),
      metricValue: numberValue(value(row, "metric_value", "metricValue")),
      metricType: text(value(row, "metric_type", "metricType")) || null,
      priceValue: numberValue(value(row, "price_value", "priceValue")),
      priceCurrency: text(value(row, "price_currency", "priceCurrency")) || null,
      citationIds: rowCitations.map((citation) => citation.id),
      citationUrls: rowCitations.map((citation) => text(value(citation, "citation_url", "citationUrl"))).filter(Boolean)
    } satisfies AnalysisSignal;
  });
}

async function clustersForAgentRun(repos: RepositoryBundle, workspaceId: string, profileId: string, agentRunId: string) {
  return (await repos.trendIntelligence.listClustersByProfile(workspaceId, profileId)).filter((row) => clusterMetadataMatchesAgentRun(row, agentRunId));
}

async function scoresForAgentRun(repos: RepositoryBundle, workspaceId: string, profileId: string, agentRunId: string) {
  return (await repos.trendIntelligence.listScoresByProfile(workspaceId, profileId)).filter((row) => clusterMetadataMatchesAgentRun(row, agentRunId));
}

async function conceptsForAgentRun(repos: RepositoryBundle, workspaceId: string, profileId: string, agentRunId: string) {
  return (await repos.trendIntelligence.listConceptsByProfile(workspaceId, profileId)).filter((row) => clusterMetadataMatchesAgentRun(row, agentRunId));
}

export async function readTrendWatchProfile(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  profileId: string;
}) {
  const profile = await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  return safeProfile(profile);
}

export async function readPersistedTrendSignals(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  profileId: string;
  sourceKeys?: string[] | undefined;
  maxSignals?: number | undefined;
}) {
  await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  const sourceKeys = new Set((input.sourceKeys ?? []).map(String));
  const maxSignals = maxBound(input.maxSignals, DEFAULT_MAX_SIGNALS, 200);
  const signals = (await signalRowsWithCitations(input.repos, input.workspaceId, input.profileId))
    .filter((signal) => !sourceKeys.size || sourceKeys.has(signal.sourceKey))
    .slice(0, maxSignals);
  return {
    signalCount: signals.length,
    signals: signals.map(safeSignal)
  };
}

export async function ensureTrendAnalysisReportDraft(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  profileId: string;
  agentRunId: string;
}) {
  await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  const existing = await input.repos.trendIntelligence.getReportByAgentRunId(input.workspaceId, input.agentRunId);
  if (existing) return safeReport(existing);
  const created = await input.repos.trendIntelligence.reports.create({
    id: hashId("treport", `${input.profileId}:${input.agentRunId}`),
    workspace_id: input.workspaceId,
    profile_id: input.profileId,
    agent_run_id: input.agentRunId,
    source_signal_count: 0,
    cluster_count: 0,
    concept_candidate_count: 0,
    summary: "Trend analysis queued.",
    warnings: [],
    status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    metadata: {
      agentRunId: input.agentRunId,
      clusterIds: [],
      scoreIds: [],
      conceptCandidateIds: [],
      topConceptTitles: []
    }
  } as WorkspaceRow);
  return safeReport(created);
}

export async function findTrendAnalysisReportByAgentRunId(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  agentRunId: string;
}) {
  const report = await input.repos.trendIntelligence.getReportByAgentRunId(input.workspaceId, input.agentRunId);
  return report ? safeReport(report) : null;
}

export async function clusterPersistedTrendSignals(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  profileId: string;
  signalIds?: string[] | undefined;
  sourceKeys?: string[] | undefined;
  maxSignals?: number | undefined;
  agentRunId?: string | undefined;
}) {
  const profile = await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  const selectedIds = new Set((input.signalIds ?? []).map(String));
  const read = await readPersistedTrendSignals({
    repos: input.repos,
    workspaceId: input.workspaceId,
    profileId: input.profileId,
    sourceKeys: input.sourceKeys,
    maxSignals: input.maxSignals
  });
  const signals = read.signals.filter((signal) => !selectedIds.size || selectedIds.has(signal.id));
  if (!signals.length) throw new Error(NO_TREND_SIGNALS_AVAILABLE);

  const components = buildConnectedComponents(signals as AnalysisSignal[]);
  const currentClusterIds: string[] = [];
  const existingClusters = await input.repos.trendIntelligence.listClustersByProfile(input.workspaceId, input.profileId);
  const existingSignalRows = await getSignalsByIds(input.repos, input.workspaceId, signals.map((signal) => signal.id));

  for (const signalRow of existingSignalRows) {
    await input.repos.trend.update(signalRow.id, asWorkspacePatch({ cluster_id: null, updated_by: input.actorId ?? null }));
  }

  for (const component of components) {
    const { keywordTerms, motifTerms } = clusterTerms(component as AnalysisSignal[]);
    const memberSignalIds = component.map((signal) => signal.id).sort();
    const sourceKeys = uniqueStrings(component.map((signal) => signal.sourceKey)).sort();
    const citationIds = uniqueStrings(component.flatMap((signal) => signal.citationIds));
    const observed = component.map((signal) => safeDate(signal.observedAt)).filter(Boolean) as Date[];
    const firstObservedAt = observed.length ? new Date(Math.min(...observed.map((value) => value.getTime()))).toISOString() : null;
    const lastObservedAt = observed.length ? new Date(Math.max(...observed.map((value) => value.getTime()))).toISOString() : null;
    const label = buildClusterLabel(keywordTerms, motifTerms);
    const summary = buildClusterSummary(label, component as AnalysisSignal[], sourceKeys, motifTerms);
    const confidenceScore = roundScore(Math.min(100, 18 + component.length * 10 + sourceKeys.length * 12 + citationIds.length * 2));
    const clusterId = hashId("tclus", `${input.profileId}:${memberSignalIds.join("|")}`);
    currentClusterIds.push(clusterId);
    const row = {
      id: clusterId,
      workspace_id: input.workspaceId,
      profile_id: input.profileId,
      name: label,
      label,
      summary,
      signal_ids: memberSignalIds,
      member_signal_ids: memberSignalIds,
      source_keys: sourceKeys,
      keywords: keywordTerms,
      keyword_terms: keywordTerms,
      aesthetic_tags: motifTerms,
      motif_terms: motifTerms,
      seasonality: uniqueStrings(component.map((signal) => signal.season ?? "").filter(Boolean)),
      citation_ids: citationIds,
      target_customer: profile.targetCustomer,
      confidence: (confidenceScore / 100).toFixed(4),
      signal_count: memberSignalIds.length,
      cross_source_count: sourceKeys.length,
      first_observed_at: firstObservedAt,
      last_observed_at: lastObservedAt,
      created_by_kind: "deterministic_clusterer",
      status: "candidate",
      approved_for_generation: false,
      notes: summary,
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null,
      metadata: {
        agentRunId: input.agentRunId ?? null,
        deterministicClusterKey: clusterId
      }
    } satisfies WorkspaceRow;
    await upsertRow(input.repos.trendIntelligence.clusters, row);

    for (const memberSignalId of memberSignalIds) {
      await input.repos.trend.update(memberSignalId, asWorkspacePatch({
        cluster_id: clusterId,
        updated_by: input.actorId ?? null,
        metadata: {
          agentRunId: input.agentRunId ?? null
        }
      }));
      await upsertRow(input.repos.trendIntelligence.clusterSignals, {
        id: hashId("tclusig", `${clusterId}:${memberSignalId}`),
        workspace_id: input.workspaceId,
        cluster_id: clusterId,
        signal_id: memberSignalId,
        metadata: {
          agentRunId: input.agentRunId ?? null
        }
      } as WorkspaceRow);
    }
  }

  for (const cluster of existingClusters) {
    if (currentClusterIds.includes(cluster.id)) continue;
    if (text(value(cluster, "status")) !== "candidate") continue;
    if (text(value(cluster, "created_by_kind", "createdByKind")) !== "deterministic_clusterer") continue;
    await input.repos.trendIntelligence.clusters.update(cluster.id, asWorkspacePatch({
      status: "archived",
      updated_by: input.actorId ?? null,
      metadata: {
        ...asRecord(value(cluster, "metadata")),
        archivedByLatestAnalysis: true
      }
    }));
  }

  const rows = await Promise.all(currentClusterIds.map((clusterId) => input.repos.trendIntelligence.clusters.getById(clusterId, input.workspaceId)));
  return rows.filter(Boolean).map((row) => safeCluster(row as WorkspaceRow));
}

export async function scoreTrendCluster(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  profileId: string;
  clusterId: string;
  agentRunId?: string | undefined;
}) {
  const profile = await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  const clusterRow = await input.repos.trendIntelligence.clusters.getById(input.clusterId, input.workspaceId);
  if (!clusterRow || text(value(clusterRow, "profile_id", "profileId")) !== input.profileId) throw new Error("trend_cluster_missing");
  const cluster = safeCluster(clusterRow);
  const signalRows = await getSignalsByIds(input.repos, input.workspaceId, cluster.memberSignalIds);
  const signalMap = new Map((await signalRowsWithCitations(input.repos, input.workspaceId, input.profileId)).map((signal) => [signal.id, signal]));
  const signals = signalRows.map((row) => signalMap.get(row.id)).filter(Boolean) as AnalysisSignal[];
  const signalTokens = uniqueStrings(signals.flatMap((signal) => [...signalTokenSet(signal)]));
  const ownedSources = new Set(["shopify_internal", "google_search_console", "google_analytics"]);
  const monthKey = currentMonthKey();
  const seasonalTokens = seasonalTokensForMonth(monthKey);
  const keywordCorpus = uniqueStrings([...profile.keywords, ...profile.seedPhrases].flatMap(tokenize));
  const motifCorpus = uniqueStrings(profile.visualMotifs.flatMap(tokenize));
  const brandCorpus = uniqueStrings([...profile.keywords, ...profile.seedPhrases, ...profile.visualMotifs, ...profile.brandPalette, ...tokenize(profile.targetCustomer)].flatMap(tokenize));
  const productTypes = productTypeCandidates(signalTokens, profile);
  const productCategory = productCategoryForTypes(productTypes);
  const daysOld = signals
    .map((signal) => safeDate(signal.observedAt))
    .filter(Boolean)
    .map((observedAt) => Math.max(0, (Date.now() - (observedAt as Date).getTime()) / 86_400_000));
  const averageAge = daysOld.length ? daysOld.reduce((sum, value) => sum + value, 0) / daysOld.length : profile.freshnessWindowDays;
  const excludedHits = new Set<string>();
  for (const signal of signals) {
    for (const flag of signal.riskFlags) {
      const match = flag.match(/excluded_term:(.+)$/);
      if (match?.[1]) excludedHits.add(normalizeToken(match[1]));
    }
  }
  for (const token of signalTokens) {
    if (profile.excludedTerms.includes(normalizeToken(token))) excludedHits.add(normalizeToken(token));
  }

  const freshness = roundScore(Math.max(0, 100 - (averageAge / Math.max(1, profile.freshnessWindowDays)) * 100));
  const keywordMatchStrength = overlapScore(cluster.keywordTerms, keywordCorpus);
  const visualMotifMatch = overlapScore(cluster.motifTerms, motifCorpus);
  const weightedSources = cluster.sourceKeys.reduce((sum, sourceKey) => sum + sourceWeight(profile, sourceKey), 0);
  const crossSourceConfirmation = roundScore(Math.min(100, 20 + weightedSources * 15 + cluster.sourceKeys.length * 10));
  const buyerIntentStrength = roundScore(
    (cluster.sourceKeys.some((sourceKey) => ownedSources.has(sourceKey)) ? 78 : 48)
      + (signals.some((signal) => (signal.metricValue ?? 0) > 0) ? 8 : 0)
      + (signalTokens.some((token) => personalizationTerms.has(token)) ? 6 : 0)
  );
  const productability = roundScore((productTypes.length ? 62 : 35) + overlapScore(productTypes, profile.productTypes) * 0.3 + overlapScore([productCategory], profile.productCategories) * 0.2);
  const personalizationPotential = roundScore({
    high: 88,
    medium: 62,
    low: 28
  }[suggestedPersonalizationLevel(signalTokens)]);
  const seasonalityFit = roundScore(Math.max(
    overlapScore(signalTokens, seasonalTokens),
    signals.some((signal) => seasonalTokens.includes(normalizeToken(signal.season ?? ""))) ? 70 : 0
  ));
  const brandFit = roundScore(Math.max(overlapScore(signalTokens, brandCorpus), overlapScore(cluster.motifTerms, profile.visualMotifs)));
  const riskIpConcern = roundScore(excludedHits.size ? Math.min(100, 70 + excludedHits.size * 12) : 8);
  const fulfillmentFit = roundScore((productTypes.length ? 68 : 40) + overlapScore(productTypes, productTypeHints) * 0.2);
  const confidence = roundScore(Math.min(100, 15 + signals.length * 4 + cluster.sourceKeys.length * 8 + (cluster.citationIds.length ? Math.min(20, cluster.citationIds.length * 2) : 0)));

  const componentScores = {
    freshness,
    keyword_match_strength: keywordMatchStrength,
    visual_motif_match: visualMotifMatch,
    cross_source_confirmation: crossSourceConfirmation,
    buyer_intent_strength: buyerIntentStrength,
    productability,
    personalization_potential: personalizationPotential,
    seasonality_fit: seasonalityFit,
    brand_fit: brandFit,
    risk_ip_concern: riskIpConcern,
    fulfillment_fit: fulfillmentFit,
    confidence
  };

  const weightedPositive =
    freshness * componentWeight(profile, "freshness", 0.09) +
    keywordMatchStrength * componentWeight(profile, "keyword_match_strength", 0.14) +
    visualMotifMatch * componentWeight(profile, "visual_motif_match", 0.10) +
    crossSourceConfirmation * componentWeight(profile, "cross_source_confirmation", 0.10) +
    buyerIntentStrength * componentWeight(profile, "buyer_intent_strength", 0.07) +
    productability * componentWeight(profile, "productability", 0.10) +
    personalizationPotential * componentWeight(profile, "personalization_potential", 0.09) +
    seasonalityFit * componentWeight(profile, "seasonality_fit", 0.06) +
    brandFit * componentWeight(profile, "brand_fit", 0.13) +
    fulfillmentFit * componentWeight(profile, "fulfillment_fit", 0.06) +
    confidence * componentWeight(profile, "confidence", 0.06);
  const totalScore = roundScore(weightedPositive - riskIpConcern * 0.18);

  const reasons = uniqueStrings([
    keywordMatchStrength >= 60 ? "Strong overlap with saved Salty Cowhide keywords and seed phrases." : "",
    visualMotifMatch >= 55 ? "Visual motifs align with the current coastal western watch profile." : "",
    productability >= 60 ? `Signals map cleanly to current Salty Cowhide product types such as ${productTypes.slice(0, 3).join(", ")}.` : "",
    personalizationPotential >= 60 ? "Signals indicate personalization or gifting demand." : "",
    brandFit >= 60 ? "Cluster language fits the current boutique coastal cowgirl brand direction." : ""
  ]);
  const warnings = uniqueStrings([
    cluster.sourceKeys.length < 2 ? "Single-source cluster. Watch for cross-source confirmation before acting aggressively." : "",
    confidence < 45 ? "Low confidence due to limited signal count or weak metadata." : "",
    excludedHits.size ? `Excluded or IP-sensitive terms detected: ${[...excludedHits].join(", ")}.` : "",
    !signals.some((signal) => ownedSources.has(signal.sourceKey)) ? "No owned first-party demand signals are present yet." : ""
  ]);
  const riskFlags = uniqueStrings([
    ...signals.flatMap((signal) => signal.riskFlags),
    ...(excludedHits.size ? ["excluded_term_match"] : [])
  ]);

  const recommendedAction: TrendScoreResult["recommendedAction"] =
    riskIpConcern >= 85 ? "reject"
      : riskIpConcern >= 45 ? "needs_owner_review"
        : totalScore >= 75 && confidence >= 50 && productability >= 60 ? "promote_to_concept"
          : totalScore >= 52 ? "watch_longer"
            : brandFit < 35 && productability < 40 ? "reject"
              : "needs_owner_review";

  const row = {
    id: hashId("tscore", `${input.profileId}:${cluster.id}`),
    workspace_id: input.workspaceId,
    profile_id: input.profileId,
    cluster_id: cluster.id,
    total_score: totalScore.toFixed(2),
    confidence_score: confidence.toFixed(2),
    component_scores: componentScores,
    reasons,
    warnings,
    risk_flags: riskFlags,
    recommended_action: recommendedAction,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    metadata: {
      agentRunId: input.agentRunId ?? null,
      suggestedProductTypes: productTypes,
      productCategory
    }
  } satisfies WorkspaceRow;
  await upsertRow(input.repos.trendIntelligence.scores, row);
  await input.repos.trendIntelligence.clusters.update(cluster.id, asWorkspacePatch({
    confidence: (confidence / 100).toFixed(4),
    updated_by: input.actorId ?? null,
    metadata: {
      ...asRecord(value(clusterRow, "metadata")),
      agentRunId: input.agentRunId ?? null
    }
  }));
  return safeScore(row);
}

export async function draftProductConceptCandidates(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  profileId: string;
  clusterIds: string[];
  maxConcepts?: number | undefined;
  agentRunId?: string | undefined;
}) {
  const profile = await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  const maxConcepts = maxBound(input.maxConcepts, DEFAULT_MAX_CONCEPTS, 16);
  const clusters = await Promise.all(input.clusterIds.map((clusterId) => input.repos.trendIntelligence.clusters.getById(clusterId, input.workspaceId)));
  const scored: Array<{ cluster: TrendAnalysisClusterResult; score: TrendScoreResult }> = [];
  for (const clusterRow of clusters.filter(Boolean) as WorkspaceRow[]) {
    const cluster = safeCluster(clusterRow);
    const scoreRow = (await input.repos.trendIntelligence.listScoresByCluster(input.workspaceId, cluster.id)).find((row) =>
      !input.agentRunId || clusterMetadataMatchesAgentRun(row, input.agentRunId)
    ) ?? (await input.repos.trendIntelligence.scores.getById(hashId("tscore", `${input.profileId}:${cluster.id}`), input.workspaceId));
    if (!scoreRow) continue;
    const score = safeScore(scoreRow);
    if (score.recommendedAction === "reject") continue;
    scored.push({ cluster, score });
  }
  scored.sort((left, right) => right.score.totalScore - left.score.totalScore || right.cluster.signalCount - left.cluster.signalCount || left.cluster.id.localeCompare(right.cluster.id));

  const drafts: ConceptDraft[] = [];
  for (const item of scored.slice(0, maxConcepts)) {
    const signals = await getSignalsByIds(input.repos, input.workspaceId, item.cluster.memberSignalIds);
    const tokens = uniqueStrings(signals.flatMap((signal) => tokenize(text(value(signal, "keyword"))).concat(tokenize(text(value(signal, "normalized_title", "normalizedTitle"))))));
    const suggestedTypes = productTypeCandidates(tokens, profile);
    const productCategory = productCategoryForTypes(suggestedTypes);
    drafts.push({
      clusterId: item.cluster.id,
      clusterLabel: item.cluster.label,
      clusterSummary: item.cluster.summary,
      score: item.score,
      recommendedConceptCount: item.score.totalScore >= 80 ? 2 : 1,
      customerSegment: profile.targetCustomer,
      productCategory,
      suggestedProductTypes: suggestedTypes,
      personalizationPotential: suggestedPersonalizationLevel(tokens),
      phraseDirections: buildPhraseDirections(item.cluster, profile),
      visualMotifs: item.cluster.motifTerms.slice(0, 5),
      palette: profile.brandPalette.slice(0, 5),
      printStyleHints: uniqueStrings([
        suggestedTypes.some((type) => /car charm|keychain|ornament|suncatcher/i.test(type)) ? "layered acrylic charm layout" : "",
        suggestedTypes.some((type) => /apparel/i.test(type)) ? "clean boutique graphic" : "",
        item.cluster.motifTerms.length ? `${item.cluster.motifTerms[0]}-forward composition` : "",
        "coastal western premium typography"
      ]),
      evidence: {
        clusterId: item.cluster.id,
        sourceKeys: item.cluster.sourceKeys,
        signalIds: item.cluster.memberSignalIds,
        citationIds: item.cluster.citationIds,
        evidenceSummary: evidenceSummary(item.cluster.label, item.cluster.signalCount, item.cluster.sourceKeys, item.cluster.motifTerms)
      },
      riskNotes: item.score.riskFlags.length ? item.score.riskFlags : item.score.warnings,
      ownerActionNeededDefault: item.score.recommendedAction === "promote_to_concept" ? "approve" : item.score.recommendedAction === "needs_owner_review" ? "request_changes" : "watch_longer"
    });
  }

  return {
    conceptDraftCount: drafts.length,
    conceptDrafts: drafts
  };
}

function normalizeConceptInput(input: unknown) {
  const row = asRecord(input);
  const sourceEvidence = asRecord(row.source_evidence ?? row.sourceEvidence);
  return {
    title: compactText(row.title, 140),
    customerSegment: compactText(row.customer_segment ?? row.customerSegment, 140),
    productCategory: compactText(row.product_category ?? row.productCategory, 120),
    suggestedProductTypes: uniqueStrings(asStringArray(row.suggested_product_types ?? row.suggestedProductTypes)).slice(0, 6),
    personalizationPotential: compactText(row.personalization_potential ?? row.personalizationPotential, 80),
    phrases: uniqueStrings(asStringArray(row.phrases)).slice(0, 8),
    visualMotifs: uniqueStrings(asStringArray(row.visual_motifs ?? row.visualMotifs)).slice(0, 8),
    palette: uniqueStrings(asStringArray(row.palette)).slice(0, 8),
    printStyle: compactText(row.print_style ?? row.printStyle, 140),
    recommendedBlankOrBaseProduct: compactText(row.recommended_blank_or_base_product ?? row.recommendedBlankOrBaseProduct, 140) || null,
    marginHypothesis: compactText(row.margin_hypothesis ?? row.marginHypothesis, 180) || null,
    sourceEvidence: {
      clusterId: compactText(sourceEvidence.cluster_id ?? sourceEvidence.clusterId, 120),
      sourceKeys: uniqueStrings(asStringArray(sourceEvidence.source_keys ?? sourceEvidence.sourceKeys)).slice(0, 8),
      signalIds: uniqueStrings(asStringArray(sourceEvidence.signal_ids ?? sourceEvidence.signalIds)).slice(0, 30),
      citationIds: uniqueStrings(asStringArray(sourceEvidence.citation_ids ?? sourceEvidence.citationIds)).slice(0, 30),
      evidenceSummary: compactText(sourceEvidence.evidence_summary ?? sourceEvidence.evidenceSummary, 260)
    },
    reasonItMaySell: compactText(row.reason_it_may_sell ?? row.reasonItMaySell, 280),
    riskNotes: compactText(row.risk_notes ?? row.riskNotes, 220),
    ownerActionNeeded: compactText(row.owner_action_needed ?? row.ownerActionNeeded, 40)
  };
}

export async function saveProductConceptCandidates(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  profileId: string;
  agentRunId: string;
  candidates: unknown[];
}) {
  const profile = await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  const report = await input.repos.trendIntelligence.getReportByAgentRunId(input.workspaceId, input.agentRunId);
  const saved: ProductConceptCandidateResult[] = [];

  for (const rawCandidate of input.candidates) {
    const candidate = normalizeConceptInput(rawCandidate);
    if (!candidate.title || !candidate.customerSegment || !candidate.productCategory || !candidate.suggestedProductTypes.length || !candidate.printStyle || !candidate.reasonItMaySell || !candidate.sourceEvidence.clusterId) {
      throw new Error("trend_concept_candidate_invalid");
    }
    if (!["approve", "reject", "request_changes", "watch_longer"].includes(candidate.ownerActionNeeded)) {
      throw new Error("trend_concept_candidate_invalid");
    }
    const clusterRow = await input.repos.trendIntelligence.clusters.getById(candidate.sourceEvidence.clusterId, input.workspaceId);
    if (!clusterRow || text(value(clusterRow, "profile_id", "profileId")) !== input.profileId) throw new Error("trend_cluster_missing");
    const cluster = safeCluster(clusterRow);
    const excluded = profile.excludedTerms.filter((term) => {
      const haystack = normalizeToken(`${candidate.title} ${candidate.phrases.join(" ")}`);
      return term && haystack.includes(term);
    });
    if (excluded.length) throw new Error("excluded_term_in_concept");
    const competitorTitles = new Set((await getSignalsByIds(input.repos, input.workspaceId, cluster.memberSignalIds)).map((signal) => normalizeToken(text(value(signal, "normalized_title", "normalizedTitle") ?? value(signal, "keyword")))).filter(Boolean));
    const normalizedTitle = normalizeToken(candidate.title);
    if (competitorTitles.has(normalizedTitle) || candidate.phrases.some((phrase) => competitorTitles.has(normalizeToken(phrase)))) {
      throw new Error("copied_competitor_phrase_detected");
    }
    if (candidate.sourceEvidence.signalIds.some((signalId) => !cluster.memberSignalIds.includes(signalId))) {
      throw new Error("trend_concept_candidate_invalid");
    }
    if (candidate.sourceEvidence.citationIds.some((citationId) => !cluster.citationIds.includes(citationId))) {
      throw new Error("trend_concept_candidate_invalid");
    }
    const scoreRow = (await input.repos.trendIntelligence.listScoresByCluster(input.workspaceId, cluster.id))[0] ?? null;
    const conceptId = hashId("tconcept", `${cluster.id}:${normalizeToken(candidate.title)}`);
    const row = {
      id: conceptId,
      workspace_id: input.workspaceId,
      profile_id: input.profileId,
      cluster_id: cluster.id,
      trend_score_id: scoreRow?.id ?? null,
      title: candidate.title,
      customer_segment: candidate.customerSegment,
      product_category: candidate.productCategory,
      suggested_product_types: candidate.suggestedProductTypes,
      personalization_potential: candidate.personalizationPotential,
      phrases: candidate.phrases,
      visual_motifs: candidate.visualMotifs,
      palette: candidate.palette,
      print_style: candidate.printStyle,
      recommended_blank_or_base_product: candidate.recommendedBlankOrBaseProduct,
      margin_hypothesis: candidate.marginHypothesis,
      source_evidence: {
        cluster_id: cluster.id,
        source_keys: candidate.sourceEvidence.sourceKeys,
        signal_ids: candidate.sourceEvidence.signalIds,
        citation_ids: candidate.sourceEvidence.citationIds,
        evidence_summary: candidate.sourceEvidence.evidenceSummary
      },
      reason_it_may_sell: candidate.reasonItMaySell,
      risk_notes: candidate.riskNotes,
      owner_action_needed: candidate.ownerActionNeeded,
      review_status: "pending_review",
      created_by_kind: "ollama_agent",
      owner_notes: null,
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null,
      metadata: {
        agentRunId: input.agentRunId,
        ...(report ? { reportId: report.id } : {})
      }
    } satisfies WorkspaceRow;
    await upsertRow(input.repos.trendIntelligence.concepts, row);
    saved.push(safeConcept(row));
  }

  return {
    conceptCandidateIds: saved.map((candidate) => candidate.id),
    topConceptTitles: saved.map((candidate) => candidate.title),
    conceptCandidates: saved
  };
}

export async function saveTrendAnalysisReport(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  profileId: string;
  agentRunId: string;
  payload: Record<string, unknown>;
}) {
  const summary = compactText(input.payload.summary, 500);
  const warnings = uniqueStrings(asStringArray(input.payload.warnings)).map((warning) => compactText(warning, 180));
  const status = text(input.payload.status, "pending_review");
  if (!summary || !["pending_review", "reviewed", "failed", "blocked"].includes(status)) throw new Error("trend_analysis_report_invalid");

  const reportRow = await input.repos.trendIntelligence.getReportByAgentRunId(input.workspaceId, input.agentRunId) ?? await input.repos.trendIntelligence.reports.create({
    id: hashId("treport", `${input.profileId}:${input.agentRunId}`),
    workspace_id: input.workspaceId,
    profile_id: input.profileId,
    agent_run_id: input.agentRunId,
    source_signal_count: 0,
    cluster_count: 0,
    concept_candidate_count: 0,
    summary: "",
    warnings: [],
    status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    metadata: {
      agentRunId: input.agentRunId
    }
  } as WorkspaceRow);

  const clusterUpdates = Array.isArray(input.payload.clusterSummaries)
    ? input.payload.clusterSummaries.map((entry) => asRecord(entry))
    : [];
  for (const clusterUpdate of clusterUpdates) {
    const clusterId = text(clusterUpdate.cluster_id ?? clusterUpdate.clusterId);
    if (!clusterId) continue;
    const existing = await input.repos.trendIntelligence.clusters.getById(clusterId, input.workspaceId);
    if (!existing || text(value(existing, "profile_id", "profileId")) !== input.profileId) continue;
    await input.repos.trendIntelligence.clusters.update(clusterId, asWorkspacePatch({
      label: compactText(clusterUpdate.label ?? value(existing, "label") ?? value(existing, "name"), 160),
      name: compactText(clusterUpdate.label ?? value(existing, "name") ?? value(existing, "label"), 160),
      summary: compactText(clusterUpdate.summary ?? value(existing, "summary") ?? value(existing, "notes"), 320),
      notes: compactText(clusterUpdate.summary ?? value(existing, "notes") ?? value(existing, "summary"), 320),
      updated_by: input.actorId ?? null,
      metadata: {
        ...asRecord(value(existing, "metadata")),
        refinedByOllama: true,
        agentRunId: input.agentRunId
      }
    }));
  }

  const clusters = await clustersForAgentRun(input.repos, input.workspaceId, input.profileId, input.agentRunId);
  const scores = await scoresForAgentRun(input.repos, input.workspaceId, input.profileId, input.agentRunId);
  const concepts = await conceptsForAgentRun(input.repos, input.workspaceId, input.profileId, input.agentRunId);
  const signalIds = uniqueStrings(clusters.flatMap((cluster) => asStringArray(value(cluster, "member_signal_ids", "memberSignalIds") ?? value(cluster, "signal_ids", "signalIds"))));
  const topConceptTitles = concepts.map((concept) => text(value(concept, "title"))).filter(Boolean).slice(0, 8);
  const updatedReport = await input.repos.trendIntelligence.reports.update(reportRow.id, asWorkspacePatch({
    summary,
    warnings,
    status,
    source_signal_count: signalIds.length,
    cluster_count: clusters.length,
    concept_candidate_count: concepts.length,
    updated_by: input.actorId ?? null,
    metadata: {
      ...asRecord(value(reportRow, "metadata")),
      agentRunId: input.agentRunId,
      clusterIds: clusters.map((cluster) => cluster.id),
      scoreIds: scores.map((score) => score.id),
      conceptCandidateIds: concepts.map((concept) => concept.id),
      topConceptTitles
    }
  }));

  const outputId = hashId("aiout_trend", `${input.profileId}:${input.agentRunId}`);
  await upsertRow(input.repos.aiEmployee.outputs, {
    id: outputId,
    workspace_id: input.workspaceId,
    run_id: input.agentRunId,
    output_type: "trend_analysis_report",
    ref_type: "trend_watch_profile",
    ref_id: input.profileId,
    output_json: {
      reportId: updatedReport.id,
      sourceSignalCount: signalIds.length,
      clusterCount: clusters.length,
      conceptCandidateCount: concepts.length,
      topConceptTitles,
      warnings,
      summary
    },
    status: "pending_review",
    metadata: {
      roleKey: "trend_intelligence_agent",
      providerAction: false,
      publishAction: false
    }
  } as WorkspaceRow);

  return {
    reportId: updatedReport.id,
    sourceSignalCount: signalIds.length,
    clusterCount: clusters.length,
    scoreCount: scores.length,
    conceptCandidateCount: concepts.length,
    topConceptTitles,
    aiOutputId: outputId
  };
}

export async function getTrendAnalysisReportDetail(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  reportId: string;
}) {
  const reportRow = await input.repos.trendIntelligence.reports.getById(input.reportId, input.workspaceId);
  if (!reportRow) return null;
  const report = safeReport(reportRow);
  const metadata = asRecord(value(reportRow, "metadata"));
  const clusterIds = asStringArray(metadata.clusterIds);
  const scoreIds = asStringArray(metadata.scoreIds);
  const conceptIds = asStringArray(metadata.conceptCandidateIds);
  const profileId = text(value(reportRow, "profile_id", "profileId"));
  const agentRunId = text(value(reportRow, "agent_run_id", "agentRunId"));

  const clusterRows = clusterIds.length
    ? (await Promise.all(clusterIds.map((clusterId) => input.repos.trendIntelligence.clusters.getById(clusterId, input.workspaceId)))).filter(Boolean) as WorkspaceRow[]
    : agentRunId
      ? await clustersForAgentRun(input.repos, input.workspaceId, profileId, agentRunId)
      : await input.repos.trendIntelligence.listClustersByProfile(input.workspaceId, profileId);
  const scoreRows = scoreIds.length
    ? (await Promise.all(scoreIds.map((scoreId) => input.repos.trendIntelligence.scores.getById(scoreId, input.workspaceId)))).filter(Boolean) as WorkspaceRow[]
    : agentRunId
      ? await scoresForAgentRun(input.repos, input.workspaceId, profileId, agentRunId)
      : await input.repos.trendIntelligence.listScoresByProfile(input.workspaceId, profileId);
  const conceptRows = conceptIds.length
    ? (await Promise.all(conceptIds.map((conceptId) => input.repos.trendIntelligence.concepts.getById(conceptId, input.workspaceId)))).filter(Boolean) as WorkspaceRow[]
    : agentRunId
      ? await conceptsForAgentRun(input.repos, input.workspaceId, profileId, agentRunId)
      : await input.repos.trendIntelligence.listConceptsByProfile(input.workspaceId, profileId);

  return {
    report,
    clusters: clusterRows.map(safeCluster),
    scores: scoreRows.map(safeScore),
    conceptCandidates: conceptRows.map(safeConcept)
  } satisfies TrendAnalysisReportDetail;
}

export async function listProductConceptCandidates(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  profileId: string;
}) {
  await getProfileOrThrow(input.repos, input.workspaceId, input.profileId);
  return (await input.repos.trendIntelligence.listConceptsByProfile(input.workspaceId, input.profileId))
    .sort((left, right) => text(value(right, "updated_at", "updatedAt") ?? value(right, "created_at", "createdAt")).localeCompare(text(value(left, "updated_at", "updatedAt") ?? value(left, "created_at", "createdAt"))) || left.id.localeCompare(right.id))
    .map(safeConcept);
}

export async function reviewProductConceptCandidate(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  conceptId: string;
  reviewStatus: "approved" | "rejected" | "archived";
  ownerNotes?: string | undefined;
  actorId?: string | undefined;
}) {
  const current = await input.repos.trendIntelligence.concepts.getById(input.conceptId, input.workspaceId);
  if (!current) return null;
  const updated = await input.repos.trendIntelligence.concepts.update(input.conceptId, asWorkspacePatch({
    review_status: input.reviewStatus,
    owner_notes: input.ownerNotes ? compactText(input.ownerNotes, 280) : null,
    updated_by: input.actorId ?? null,
    metadata: {
      ...asRecord(value(current, "metadata")),
      reviewUpdatedAt: now()
    }
  }));
  return safeConcept(updated);
}

export function trendAnalysisTaskOptions(taskInput: Record<string, unknown> | undefined): {
  profileId: string;
  sourceKeys: string[];
  maxSignals: number;
  maxConcepts: number;
} {
  return {
    profileId: text(taskInputValue(taskInput, "profileId")),
    sourceKeys: asStringArray(taskInputValue(taskInput, "sourceKeys")),
    maxSignals: maxBound(taskInputValue(taskInput, "maxSignals"), DEFAULT_MAX_SIGNALS, 200),
    maxConcepts: maxBound(taskInputValue(taskInput, "maxConcepts"), DEFAULT_MAX_CONCEPTS, 16)
  };
}

export function toSafeTrendAnalysisError(error: unknown) {
  return sanitizeProviderError(error);
}
