import crypto from "node:crypto";
import { now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";

export const MARKETING_NO_APPROVED_SOURCE_ENTITY = "marketing_no_approved_source_entity";
export const MARKETING_SOURCE_ENTITY_NOT_FOUND = "marketing_source_entity_not_found";
export const MARKETING_SOURCE_ENTITY_NOT_APPROVED = "marketing_source_entity_not_approved";
export const MARKETING_LAUNCH_PLAN_INVALID = "marketing_launch_plan_invalid";
export const MARKETING_POLICY_BLOCKED = "marketing_policy_blocked";
export const MARKETING_INVALID_JSON = "marketing_invalid_json";
export const MARKETING_INVALID_APPROVAL_DECISION = "marketing_invalid_approval_decision";

type MarketingSourceDefinition = {
  sourceKey: string;
  displayName: string;
  sourceType: "owned_first_party" | "official_api" | "licensed_provider" | "manual_owner_input" | "restricted_do_not_automate";
  accessMode: "read_only" | "draft_only" | "write_blocked" | "live_write_disabled";
  riskLevel: "low" | "medium" | "high";
  providerKeys: string[];
  envKeys: string[];
  accessNotes: string;
  trusted: boolean;
  defaultEnabled: boolean;
};

type BrandVoiceSnapshot = {
  id: string;
  brandName: string;
  toneDescriptors: string[];
  vocabularyPreferences: string[];
  bannedPhrases: string[];
  approvedPhrases: string[];
  exampleApprovedCopy: string[];
  claimRules: Record<string, unknown>;
  ipBlocklist: string[];
};

type ApprovedMarketingEntity = {
  sourceEntityType: "product_concept_candidate" | "product_draft" | "listing_draft" | "shopify_draft" | "shopify_product";
  sourceEntityId: string;
  title: string;
  description: string;
  customerSegment: string;
  productCategory: string;
  suggestedProductTypes: string[];
  phrases: string[];
  visualMotifs: string[];
  palette: string[];
  printStyle: string;
  marginHypothesis: string | null;
  approved: boolean;
  reviewState: string;
  raw: WorkspaceRow;
};

type TrendEvidenceSnapshot = {
  clusterId: string | null;
  scoreId: string | null;
  sourceKeys: string[];
  signalIds: string[];
  citationIds: string[];
  citationUrls: string[];
  evidenceSummary: string;
  keywordTerms: string[];
  motifTerms: string[];
};

type MarketingReadinessSnapshot = {
  id: string;
  marketabilityScore: number;
  estimatedMargin: number | null;
  blockers: string[];
  warnings: string[];
  row: WorkspaceRow;
};

type MarketingLaunchPlanDetail = {
  launchPlan: Record<string, unknown>;
  sourceEntity: Record<string, unknown>;
  brandVoiceProfile: Record<string, unknown> | null;
  readiness: Record<string, unknown> | null;
  organicContentDrafts: Record<string, unknown>[];
  lifecycleCampaignFlows: Record<string, unknown>[];
  positioningStatements: Record<string, unknown>[];
  offerHypotheses: Record<string, unknown>[];
  audienceHypotheses: Record<string, unknown>[];
  adAngles: Record<string, unknown>[];
  adCopyVariants: Record<string, unknown>[];
  creativeBriefs: Record<string, unknown>[];
  landingPageRecommendations: Record<string, unknown>[];
  channelRecommendations: Record<string, unknown>[];
  budgetRecommendations: Record<string, unknown>[];
  mediaPlanDrafts: Record<string, unknown>[];
  campaignDrafts: Record<string, unknown>[];
  approvalRequests: Record<string, unknown>[];
  policyReviewResults: Record<string, unknown>[];
};

type PolicyCheckResult = {
  verdict: "pass" | "flagged" | "hard_block";
  severity: "low" | "medium" | "high" | "severe";
  policyCodes: string[];
  evidence: Record<string, unknown>;
  fixSuggestions: string[];
  blocked: boolean;
};

type MarketingApprovalDecision = "approved" | "rejected" | "needs_changes";

const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const asStringArray = (input: unknown): string[] => Array.isArray(input) ? input.map((item) => String(item).trim()).filter(Boolean) : [];
const asWorkspacePatch = <T extends Record<string, unknown>>(input: T) => input as unknown as WorkspaceRow;
const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input.trim() : fallback;
const truthy = (input: unknown) => input === true || input === "true";
const numeric = (input: unknown) => {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};
const compactText = (input: unknown, maxLength = 260) => {
  const normalized = String(input ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
};
const normalizeToken = (input: string) => compactText(input.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").replace(/\s+/g, " "), 80);
const normalizeSearchText = (input: string) => input.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").replace(/\s+/g, " ").trim();
const uniqueStrings = (values: string[]) => [...new Set(values.map((entry) => compactText(entry, 120)).filter(Boolean))];
const id = (prefix: string, seed?: string) => seed
  ? `${prefix}_${crypto.createHash("sha1").update(seed).digest("hex").slice(0, 14)}`
  : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const providerSourceDefinitions: MarketingSourceDefinition[] = [
  { sourceKey: "shopify_admin", displayName: "Shopify Admin", sourceType: "owned_first_party", accessMode: "write_blocked", riskLevel: "medium", providerKeys: ["shopify", "shopify_admin"], envKeys: ["SHOPIFY_ADMIN_TOKEN"], accessNotes: "Read-only or draft-only planning support. Live PDP mutation is blocked in this task.", trusted: true, defaultEnabled: false },
  { sourceKey: "ga4", displayName: "Google Analytics 4", sourceType: "owned_first_party", accessMode: "read_only", riskLevel: "low", providerKeys: ["ga4", "google_analytics"], envKeys: ["GA4_PROPERTY_ID", "GOOGLE_ANALYTICS_PROPERTY_ID"], accessNotes: "Owned first-party analytics read only.", trusted: true, defaultEnabled: false },
  { sourceKey: "google_search_console", displayName: "Google Search Console", sourceType: "owned_first_party", accessMode: "read_only", riskLevel: "low", providerKeys: ["google_search_console", "gsc"], envKeys: ["GOOGLE_SEARCH_CONSOLE_PROPERTY", "GSC_PROPERTY"], accessNotes: "Owned first-party search data read only.", trusted: true, defaultEnabled: false },
  { sourceKey: "google_merchant", displayName: "Google Merchant Center", sourceType: "owned_first_party", accessMode: "read_only", riskLevel: "low", providerKeys: ["google_merchant"], envKeys: ["GOOGLE_MERCHANT_ID"], accessNotes: "Merchant feed diagnostics read only.", trusted: true, defaultEnabled: false },
  { sourceKey: "klaviyo", displayName: "Klaviyo", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "medium", providerKeys: ["klaviyo"], envKeys: ["KLAVIYO_API_KEY"], accessNotes: "Draft-only lifecycle planning. No sends or schedules.", trusted: true, defaultEnabled: false },
  { sourceKey: "mailchimp", displayName: "Mailchimp", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "medium", providerKeys: ["mailchimp"], envKeys: ["MAILCHIMP_API_KEY"], accessNotes: "Draft-only lifecycle planning. No sends or schedules.", trusted: true, defaultEnabled: false },
  { sourceKey: "meta_ad_library", displayName: "Meta Ad Library", sourceType: "official_api", accessMode: "read_only", riskLevel: "medium", providerKeys: ["meta_ad_library"], envKeys: ["META_AD_LIBRARY_TOKEN"], accessNotes: "Reference research only. No scraping.", trusted: true, defaultEnabled: false },
  { sourceKey: "meta_marketing", displayName: "Meta Marketing", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "high", providerKeys: ["meta", "meta_ads"], envKeys: ["META_ACCESS_TOKEN"], accessNotes: "Manual build sheets only. Live campaign writes are disabled.", trusted: true, defaultEnabled: false },
  { sourceKey: "google_ads", displayName: "Google Ads", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "high", providerKeys: ["google_ads"], envKeys: ["GOOGLE_ADS_CUSTOMER_ID"], accessNotes: "Manual build sheets only. Live campaign writes are disabled.", trusted: true, defaultEnabled: false },
  { sourceKey: "pinterest", displayName: "Pinterest", sourceType: "official_api", accessMode: "draft_only", riskLevel: "medium", providerKeys: ["pinterest"], envKeys: ["PINTEREST_ACCESS_TOKEN"], accessNotes: "Organic planning only. No pin publishing.", trusted: true, defaultEnabled: false },
  { sourceKey: "tiktok_business", displayName: "TikTok Business", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "high", providerKeys: ["tiktok_business"], envKeys: ["TIKTOK_ACCESS_TOKEN"], accessNotes: "Manual planning only. Live writes are disabled.", trusted: true, defaultEnabled: false },
  { sourceKey: "tiktok_commercial_content", displayName: "TikTok Commercial Content", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "high", providerKeys: ["tiktok_commercial_content"], envKeys: ["TIKTOK_COMMERCIAL_TOKEN"], accessNotes: "Reference planning only. No publishing.", trusted: true, defaultEnabled: false },
  { sourceKey: "canva", displayName: "Canva", sourceType: "official_api", accessMode: "draft_only", riskLevel: "medium", providerKeys: ["canva"], envKeys: ["CANVA_ACCESS_TOKEN"], accessNotes: "Creative brief handoff only. No asset mutation.", trusted: true, defaultEnabled: false },
  { sourceKey: "buffer", displayName: "Buffer", sourceType: "official_api", accessMode: "live_write_disabled", riskLevel: "high", providerKeys: ["buffer"], envKeys: ["BUFFER_ACCESS_TOKEN"], accessNotes: "Posting is disabled in this task.", trusted: true, defaultEnabled: false },
  { sourceKey: "dataforseo", displayName: "DataForSEO", sourceType: "licensed_provider", accessMode: "read_only", riskLevel: "medium", providerKeys: ["dataforseo"], envKeys: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], accessNotes: "Licensed provider read only when approved and configured.", trusted: true, defaultEnabled: false },
  { sourceKey: "semrush", displayName: "SEMrush", sourceType: "licensed_provider", accessMode: "read_only", riskLevel: "medium", providerKeys: ["semrush"], envKeys: ["SEMRUSH_API_KEY"], accessNotes: "Licensed provider read only when approved and configured.", trusted: true, defaultEnabled: false },
  { sourceKey: "ahrefs", displayName: "Ahrefs", sourceType: "licensed_provider", accessMode: "read_only", riskLevel: "medium", providerKeys: ["ahrefs"], envKeys: ["AHREFS_API_KEY"], accessNotes: "Licensed provider read only when approved and configured.", trusted: true, defaultEnabled: false },
  { sourceKey: "manual_owner_notes", displayName: "Manual Owner Notes", sourceType: "manual_owner_input", accessMode: "read_only", riskLevel: "low", providerKeys: [], envKeys: [], accessNotes: "Owner-provided notes and constraints only.", trusted: true, defaultEnabled: true }
];

const policyIpTerms = [
  "disney", "barbie", "nfl", "mlb", "ncaa", "taylor swift", "yellowstone", "nike", "stetson", "stanley", "buc-ee", "buc ees",
  "celebrity", "licensed", "official", "authentic"
];

const policyPatterns: Array<{ code: string; severity: PolicyCheckResult["severity"]; blocked: boolean; pattern: RegExp; fix: string }> = [
  { code: "personal_attribute_targeting", severity: "severe", blocked: true, pattern: /\b(anxious|divorced moms?|ptsd|overweight|diabetes|struggling with money)\b/i, fix: "Remove personal-attribute targeting and focus on interests or occasions instead." },
  { code: "fake_urgency_or_scarcity", severity: "high", blocked: true, pattern: /\bonly\s+\d+\s+left\b|\bends in\s+\d+\s+(minutes?|hours?)\b|\beveryone is buying this\b/i, fix: "Remove urgency or scarcity claims unless they are provable in the source system." },
  { code: "fake_review_or_testimonial", severity: "high", blocked: true, pattern: /\b5[- ]star\b|\bthousands love\b|\bviral favorite\b|\bcustomer favorite\b/i, fix: "Remove unverified review, popularity, or testimonial language." },
  { code: "false_material_claim", severity: "high", blocked: true, pattern: /\bgenuine leather\b|\breal leather\b/i, fix: "Do not claim leather unless the product data proves it." },
  { code: "false_waterproof_claim", severity: "high", blocked: true, pattern: /\bwaterproof\b/i, fix: "Remove waterproof claims unless the product data proves them." },
  { code: "false_handmade_claim", severity: "high", blocked: true, pattern: /\bhandmade\b/i, fix: "Do not claim handmade unless the production workflow proves it." },
  { code: "discount_or_shipping_claim_unverified", severity: "medium", blocked: true, pattern: /\bfree shipping\b|\b\d+% off\b|\b\$?\d+\s+off\b/i, fix: "Remove discount or shipping claims unless they are configured and provable." },
  { code: "unsupported_health_or_sensitive_claim", severity: "severe", blocked: true, pattern: /\bcure\b|\bheal\b|\bmedical\b|\btherapy\b/i, fix: "Remove health, medical, or sensitive claims." }
];

function roleStylePhrases(brandVoice: BrandVoiceSnapshot) {
  return uniqueStrings([...brandVoice.vocabularyPreferences, ...brandVoice.approvedPhrases]).slice(0, 8);
}

function titleCase(input: string) {
  return input.split(/\s+/).map((part) => part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : "").join(" ").trim();
}

async function upsertRow(repo: { getById(id: string, workspaceId?: string): Promise<WorkspaceRow | null>; create(row: WorkspaceRow): Promise<WorkspaceRow>; update(id: string, patch: WorkspaceRow): Promise<WorkspaceRow> }, row: WorkspaceRow) {
  const existing = await repo.getById(row.id, value(row, "workspace_id") ? String(value(row, "workspace_id")) : undefined);
  return existing ? repo.update(row.id, row) : repo.create(row);
}

function connectedProviderKeys(rows: WorkspaceRow[]) {
  return new Set(rows.flatMap((row) => [
    text(value(row, "provider_key", "providerKey")),
    text(value(row, "provider_type", "providerType")),
    text(value(row, "provider_name", "providerName"))
  ]).filter(Boolean));
}

function configuredByEnv(keys: string[]) {
  return keys.some((key) => text(process.env[key]).length > 0);
}

function marketingSourceCredentialStatus(definition: MarketingSourceDefinition, providerKeys: Set<string>) {
  if (definition.sourceType === "manual_owner_input") return "configured";
  const configured = configuredByEnv(definition.envKeys) || definition.providerKeys.some((key) => providerKeys.has(key));
  if (!configured && definition.sourceType === "licensed_provider") return "approval_required";
  if (!configured) return "not_configured";
  if (definition.sourceType === "licensed_provider") return "configured";
  return "configured";
}

function marketingSourceExplicitlyEnabled(definition: MarketingSourceDefinition) {
  const normalized = definition.sourceKey.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return truthy(process.env[`MARKETING_SOURCE_ENABLE_${normalized}`]) || truthy(process.env[`MARKETING_${normalized}_SOURCE_ENABLED`]);
}

function marketingSourceEnabled(definition: MarketingSourceDefinition, credentialStatus: string) {
  if (definition.sourceType === "manual_owner_input") return true;
  if (credentialStatus !== "configured") return false;
  return definition.defaultEnabled || marketingSourceExplicitlyEnabled(definition);
}

function safeRow(row: WorkspaceRow | null | undefined) {
  return row ? { ...row } as Record<string, unknown> : null;
}

function safeBrandVoice(row: WorkspaceRow): BrandVoiceSnapshot {
  return {
    id: row.id,
    brandName: text(value(row, "brand_name", "brandName"), "Brand"),
    toneDescriptors: uniqueStrings(asStringArray(value(row, "tone_descriptors", "toneDescriptors"))),
    vocabularyPreferences: uniqueStrings(asStringArray(value(row, "vocabulary_preferences", "vocabularyPreferences"))),
    bannedPhrases: uniqueStrings(asStringArray(value(row, "banned_phrases", "bannedPhrases"))),
    approvedPhrases: uniqueStrings(asStringArray(value(row, "approved_phrases", "approvedPhrases"))),
    exampleApprovedCopy: uniqueStrings(asStringArray(value(row, "example_approved_copy", "exampleApprovedCopy"))),
    claimRules: asRecord(value(row, "claim_rules", "claimRules")),
    ipBlocklist: uniqueStrings(asStringArray(value(row, "ip_blocklist", "ipBlocklist")).map(normalizeToken))
  };
}

export async function ensureMarketingSourceRegistry(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
}) {
  const providerConnections = await input.repos.integration.listProviderConnectionsForWorkspace(input.workspaceId);
  const providerKeys = connectedProviderKeys(providerConnections);
  const rows: WorkspaceRow[] = [];

  for (const definition of providerSourceDefinitions) {
    const credentialStatus = marketingSourceCredentialStatus(definition, providerKeys);
    const row = {
      id: id("msrc", definition.sourceKey),
      workspace_id: input.workspaceId,
      source_key: definition.sourceKey,
      display_name: definition.displayName,
      source_type: definition.sourceType,
      credential_status: credentialStatus,
      access_mode: definition.accessMode,
      capabilities: [],
      is_enabled: marketingSourceEnabled(definition, credentialStatus),
      is_trusted: definition.trusted,
      risk_level: definition.riskLevel,
      last_sync_at: null,
      last_error: null,
      access_notes: definition.accessNotes,
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow;
    rows.push(await upsertRow(input.repos.marketing.sources, row));
  }

  return rows.map((row) => safeRow(row) as Record<string, unknown>);
}

export async function listMarketingSources(input: { repos: RepositoryBundle; workspaceId: string; actorId?: string | undefined }) {
  await ensureMarketingSourceRegistry(input);
  return (await input.repos.marketing.sources.listByWorkspace(input.workspaceId))
    .sort((left, right) => text(value(left, "display_name", "displayName")).localeCompare(text(value(right, "display_name", "displayName"))))
    .map((row) => safeRow(row) as Record<string, unknown>);
}

export async function ensureSaltyCowhideBrandVoiceProfile(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
}) {
  const existing = await input.repos.marketing.getBrandVoiceProfileByName(input.workspaceId, "Salty Cowhide Co.");
  const row = {
    id: id("bvoice", "salty-cowhide-co"),
    workspace_id: input.workspaceId,
    brand_name: "Salty Cowhide Co.",
    tone_descriptors: ["coastal cowgirl", "western coastal", "playful", "boutique", "beach-ranch", "giftable", "confident", "casual"],
    vocabulary_preferences: ["coastal cowgirl", "beach rodeo", "cowgirl charm", "giftable launch", "sunny western", "boutique favorite"],
    banned_phrases: [
      "luxury guaranteed", "authentic leather", "genuine leather", "waterproof", "officially licensed", "celebrity approved",
      "everyone is buying this", "only 3 left", "ends in 5 minutes", "5-star favorite"
    ],
    approved_phrases: ["coastal cowgirl energy", "giftable boutique drop", "owner-reviewed launch", "beach-meets-western styling"],
    example_approved_copy: [
      "A giftable coastal-western accent designed for owner review before any live launch step.",
      "Boutique styling, grounded proof, and manual send/publish approval at every step."
    ],
    claim_rules: {
      avoidFalseLuxury: true,
      avoidFalseHandmade: true,
      avoidFalseMaterialClaims: true,
      avoidFalseWaterproofClaims: true,
      avoidOfficialLicensingClaims: true,
      avoidCelebrityTeamBrandReferences: true,
      avoidFakeScarcity: true,
      avoidFakeReviews: true,
      avoidMedicalSensitiveAttributeClaims: true
    },
    ip_blocklist: ["disney", "barbie", "nfl", "mlb", "ncaa", "taylor swift", "yellowstone", "nike", "stetson", "stanley", "buc-ee's"],
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  const saved = existing ? await input.repos.marketing.brandVoiceProfiles.update(existing.id, row) : await input.repos.marketing.brandVoiceProfiles.create(row);
  return safeRow(saved) as Record<string, unknown>;
}

export async function listBrandVoiceProfiles(input: { repos: RepositoryBundle; workspaceId: string }) {
  return (await input.repos.marketing.brandVoiceProfiles.listByWorkspace(input.workspaceId))
    .sort((left, right) => text(value(left, "brand_name", "brandName")).localeCompare(text(value(right, "brand_name", "brandName"))))
    .map((row) => safeRow(row) as Record<string, unknown>);
}

async function getBrandVoiceProfileRow(input: { repos: RepositoryBundle; workspaceId: string; brandVoiceProfileId?: string | undefined }) {
  if (input.brandVoiceProfileId) {
    const row = await input.repos.marketing.brandVoiceProfiles.getById(input.brandVoiceProfileId, input.workspaceId);
    if (row) return row;
  }
  const exact = await input.repos.marketing.getBrandVoiceProfileByName(input.workspaceId, "Salty Cowhide Co.");
  if (exact) return exact;
  const rows = await input.repos.marketing.brandVoiceProfiles.listByWorkspace(input.workspaceId);
  return rows[0] ?? null;
}

export async function readBrandVoiceProfile(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  brandVoiceProfileId?: string | undefined;
}) {
  const row = await getBrandVoiceProfileRow(input);
  if (!row) throw new Error("brand_voice_profile_missing");
  return safeBrandVoice(row);
}

function conceptApproved(row: WorkspaceRow) {
  return text(value(row, "review_status", "reviewStatus")) === "approved";
}

function draftApproved(row: WorkspaceRow) {
  const approval = text(value(row, "approval_status", "approvalStatus") ?? value(row, "status"));
  return approval === "approved";
}

function listingApproved(row: WorkspaceRow) {
  const state = text(value(row, "approval_status", "approvalStatus") ?? value(row, "review_status", "reviewStatus") ?? value(row, "status"));
  return state === "approved";
}

function marketingEntityFromConcept(row: WorkspaceRow): ApprovedMarketingEntity {
  return {
    sourceEntityType: "product_concept_candidate",
    sourceEntityId: row.id,
    title: text(value(row, "title")),
    description: text(value(row, "reason_it_may_sell", "reasonItMaySell")),
    customerSegment: text(value(row, "customer_segment", "customerSegment")),
    productCategory: text(value(row, "product_category", "productCategory")),
    suggestedProductTypes: asStringArray(value(row, "suggested_product_types", "suggestedProductTypes")),
    phrases: asStringArray(value(row, "phrases")),
    visualMotifs: asStringArray(value(row, "visual_motifs", "visualMotifs")),
    palette: asStringArray(value(row, "palette")),
    printStyle: text(value(row, "print_style", "printStyle")),
    marginHypothesis: text(value(row, "margin_hypothesis", "marginHypothesis")) || null,
    approved: conceptApproved(row),
    reviewState: text(value(row, "review_status", "reviewStatus")),
    raw: row
  };
}

function marketingEntityFromDraft(row: WorkspaceRow, entityType: ApprovedMarketingEntity["sourceEntityType"]): ApprovedMarketingEntity {
  return {
    sourceEntityType: entityType,
    sourceEntityId: row.id,
    title: text(value(row, "title")),
    description: text(value(row, "description")),
    customerSegment: text(value(row, "target_customer", "targetCustomer"), "Salty Cowhide shopper"),
    productCategory: text(value(row, "product_type", "productType"), "accessories"),
    suggestedProductTypes: uniqueStrings([text(value(row, "product_type", "productType"), "accessories")]),
    phrases: asStringArray(value(row, "tags")),
    visualMotifs: asStringArray(value(row, "visual_motifs", "visualMotifs")),
    palette: asStringArray(value(row, "palette")),
    printStyle: text(value(row, "style_direction", "styleDirection"), "clean boutique graphic"),
    marginHypothesis: null,
    approved: entityType === "product_draft" ? draftApproved(row) : listingApproved(row),
    reviewState: text(value(row, "approval_status", "approvalStatus") ?? value(row, "review_status", "reviewStatus") ?? value(row, "status")),
    raw: row
  };
}

async function resolveMarketingEntity(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
}) {
  const sourceEntityType = text(input.sourceEntityType);
  const sourceEntityId = text(input.sourceEntityId);
  const tryExact = async () => {
    if (!sourceEntityType || !sourceEntityId) return null;
    if (sourceEntityType === "product_concept_candidate") {
      const row = await input.repos.trendIntelligence.concepts.getById(sourceEntityId, input.workspaceId);
      return row ? marketingEntityFromConcept(row) : null;
    }
    if (sourceEntityType === "product_draft") {
      const row = await input.repos.draft.getById(sourceEntityId, input.workspaceId);
      return row ? marketingEntityFromDraft(row, "product_draft") : null;
    }
    if (sourceEntityType === "listing_draft") {
      const row = await input.repos.listingDraftV1.getById(sourceEntityId, input.workspaceId);
      return row ? marketingEntityFromDraft(row, "listing_draft") : null;
    }
    if (sourceEntityType === "shopify_draft" || sourceEntityType === "shopify_product") {
      const row = await input.repos.shopify.getById(sourceEntityId, input.workspaceId);
      return row ? marketingEntityFromDraft(row, sourceEntityType as ApprovedMarketingEntity["sourceEntityType"]) : null;
    }
    return null;
  };

  if (sourceEntityType || sourceEntityId) {
    const exact = await tryExact();
    if (!exact) throw new Error(MARKETING_SOURCE_ENTITY_NOT_FOUND);
    if (!exact.approved) throw new Error(MARKETING_SOURCE_ENTITY_NOT_APPROVED);
    return exact;
  }

  const exact = await tryExact();
  if (exact) return exact;

  const concepts = (await input.repos.trendIntelligence.concepts.listByWorkspace(input.workspaceId)).map(marketingEntityFromConcept).filter((row) => row.approved);
  if (concepts.length) return concepts.sort((left, right) => left.title.localeCompare(right.title))[0] ?? null;

  const drafts = (await input.repos.draft.listByWorkspace(input.workspaceId)).map((row) => marketingEntityFromDraft(row, "product_draft")).filter((row) => row.approved);
  if (drafts.length) return drafts[0] ?? null;

  const listings = (await input.repos.listingDraftV1.listByWorkspace(input.workspaceId)).map((row) => marketingEntityFromDraft(row, "listing_draft")).filter((row) => row.approved);
  return listings[0] ?? null;
}

export async function readApprovedProductOrConcept(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
}) {
  let resolvedType = input.sourceEntityType;
  let resolvedId = input.sourceEntityId;
  if (input.launchPlanId) {
    const launchPlan = await input.repos.marketing.launchPlans.getById(input.launchPlanId, input.workspaceId);
    if (launchPlan) {
      resolvedType = text(value(launchPlan, "source_entity_type", "sourceEntityType"));
      resolvedId = text(value(launchPlan, "source_entity_id", "sourceEntityId"));
    }
  }
  const entity = await resolveMarketingEntity({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: resolvedType,
    sourceEntityId: resolvedId
  });
  if (!entity) throw new Error(MARKETING_NO_APPROVED_SOURCE_ENTITY);
  return {
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId,
    title: entity.title,
    description: entity.description,
    customerSegment: entity.customerSegment,
    productCategory: entity.productCategory,
    suggestedProductTypes: entity.suggestedProductTypes,
    phrases: entity.phrases,
    visualMotifs: entity.visualMotifs,
    palette: entity.palette,
    printStyle: entity.printStyle,
    marginHypothesis: entity.marginHypothesis,
    reviewState: entity.reviewState,
    approved: entity.approved
  };
}

export async function readTrendEvidenceForProduct(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
}) {
  const entity = await resolveMarketingEntity({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId
  });
  if (!entity) throw new Error(MARKETING_NO_APPROVED_SOURCE_ENTITY);
  if (entity.sourceEntityType !== "product_concept_candidate") {
    return {
      clusterId: null,
      scoreId: null,
      sourceKeys: [],
      signalIds: [],
      citationIds: [],
      citationUrls: [],
      evidenceSummary: "No persisted trend-cluster evidence is attached to this source entity.",
      keywordTerms: [],
      motifTerms: []
    } satisfies TrendEvidenceSnapshot;
  }

  const conceptRow = entity.raw;
  const sourceEvidence = asRecord(value(conceptRow, "source_evidence", "sourceEvidence"));
  const clusterId = text(sourceEvidence.cluster_id ?? sourceEvidence.clusterId ?? value(conceptRow, "cluster_id", "clusterId")) || null;
  const scoreId = text(value(conceptRow, "trend_score_id", "trendScoreId")) || null;
  const clusterRow = clusterId ? await input.repos.trendIntelligence.clusters.getById(clusterId, input.workspaceId) : null;
  const citationIds = uniqueStrings(asStringArray(sourceEvidence.citation_ids ?? sourceEvidence.citationIds ?? value(clusterRow, "citation_ids", "citationIds")));
  const signalIds = uniqueStrings(asStringArray(sourceEvidence.signal_ids ?? sourceEvidence.signalIds ?? value(clusterRow, "member_signal_ids", "memberSignalIds")));
  const citations = await Promise.all(citationIds.map((citationId) => input.repos.trendIntelligence.citations.getById(citationId, input.workspaceId)));
  return {
    clusterId,
    scoreId,
    sourceKeys: uniqueStrings(asStringArray(sourceEvidence.source_keys ?? sourceEvidence.sourceKeys ?? value(clusterRow, "source_keys", "sourceKeys"))),
    signalIds,
    citationIds,
    citationUrls: uniqueStrings(citations.filter(Boolean).map((row) => text(value(row, "citation_url", "citationUrl"))).filter(Boolean)),
    evidenceSummary: compactText(sourceEvidence.evidence_summary ?? sourceEvidence.evidenceSummary ?? value(clusterRow, "summary"), 260),
    keywordTerms: asStringArray(value(clusterRow, "keyword_terms", "keywordTerms")),
    motifTerms: asStringArray(value(clusterRow, "motif_terms", "motifTerms"))
  } satisfies TrendEvidenceSnapshot;
}

async function latestMarginForDraft(repos: RepositoryBundle, workspaceId: string, productDraftId: string) {
  const rows = (await repos.margin.listByWorkspace(workspaceId)).filter((row) => value(row, "product_draft_id", "productDraftId") === productDraftId);
  return rows.sort((left, right) =>
    text(value(right, "updated_at", "updatedAt")).localeCompare(text(value(left, "updated_at", "updatedAt")))
  )[0] ?? null;
}

function buildReadinessEvaluation(entity: ApprovedMarketingEntity, trendEvidence: TrendEvidenceSnapshot, marginEstimate: number | null) {
  const titlePresent = Boolean(entity.title);
  const descriptionPresent = Boolean(entity.description);
  const pricePresent = marginEstimate != null;
  const mockupPresent = entity.sourceEntityType === "product_draft"
    ? asStringArray(value(entity.raw, "mockup_ids", "mockupIds")).length > 0
    : false;
  const costPresent = marginEstimate != null || Boolean(entity.marginHypothesis);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!titlePresent) blockers.push("title_missing");
  if (!descriptionPresent) blockers.push("description_missing");
  if (!trendEvidence.sourceKeys.length) warnings.push("trend_evidence_missing");
  if (!pricePresent) warnings.push("price_or_margin_not_confirmed");
  if (!mockupPresent) warnings.push("mockup_missing");
  if (!costPresent) warnings.push("cost_not_confirmed");
  const score = Math.max(20, Math.min(100,
    32
    + (titlePresent ? 12 : 0)
    + (descriptionPresent ? 10 : 0)
    + (trendEvidence.sourceKeys.length ? 10 : 0)
    + (mockupPresent ? 10 : 0)
    + (costPresent ? 8 : 0)
    + (pricePresent ? 8 : 0)
    + (entity.approved ? 10 : -8)
  ));
  return {
    titlePresent,
    descriptionPresent,
    pricePresent,
    mockupPresent,
    assetStatus: entity.sourceEntityType === "product_draft" && text(value(entity.raw, "asset_id", "assetId")) ? "present" : "not_attached",
    variantStatus: entity.sourceEntityType === "product_draft" && asStringArray(value(entity.raw, "variant_ids", "variantIds")).length ? "present" : "not_confirmed",
    costPresent,
    estimatedMargin: marginEstimate,
    shippingAssumptionStatus: entity.sourceEntityType === "product_draft" ? "needs_review" : "not_started",
    pdpUrl: text(value(entity.raw, "storefront_url", "storefrontUrl")) || null,
    policyStatus: "pending_review",
    ipRiskStatus: trendEvidence.keywordTerms.some((term) => policyIpTerms.includes(normalizeToken(term))) ? "high" : "low",
    marketabilityScore: score,
    blockers,
    warnings
  };
}

export async function calculateProductMargin(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
}) {
  const entity = await resolveMarketingEntity({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId
  });
  if (!entity) throw new Error(MARKETING_NO_APPROVED_SOURCE_ENTITY);
  if (entity.marginHypothesis) return { estimatedMargin: null, marginHypothesis: entity.marginHypothesis, costPresent: true };
  if (entity.sourceEntityType !== "product_draft") return { estimatedMargin: null, marginHypothesis: null, costPresent: false };
  const marginRow = await latestMarginForDraft(input.repos, input.workspaceId, entity.sourceEntityId);
  return {
    estimatedMargin: numeric(value(marginRow, "margin_percent", "marginPercent")),
    marginHypothesis: null,
    costPresent: Boolean(marginRow)
  };
}

export async function readProductReadinessData(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
}) {
  const entity = await resolveMarketingEntity({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId
  });
  if (!entity) throw new Error(MARKETING_NO_APPROVED_SOURCE_ENTITY);
  const trendEvidence = await readTrendEvidenceForProduct({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId
  });
  const margin = await calculateProductMargin({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId
  });
  const evaluation = buildReadinessEvaluation(entity, trendEvidence, margin.estimatedMargin);
  const readinessId = id("mread", `${entity.sourceEntityType}:${entity.sourceEntityId}`);
  const row = {
    id: readinessId,
    workspace_id: input.workspaceId,
    source_entity_type: entity.sourceEntityType,
    source_entity_id: entity.sourceEntityId,
    title_present: evaluation.titlePresent,
    description_present: evaluation.descriptionPresent,
    price_present: evaluation.pricePresent,
    mockup_present: evaluation.mockupPresent,
    asset_status: evaluation.assetStatus,
    variant_status: evaluation.variantStatus,
    cost_present: evaluation.costPresent,
    estimated_margin: evaluation.estimatedMargin != null ? evaluation.estimatedMargin.toFixed(2) : null,
    shipping_assumption_status: evaluation.shippingAssumptionStatus,
    pdp_url: evaluation.pdpUrl,
    policy_status: evaluation.policyStatus,
    ip_risk_status: evaluation.ipRiskStatus,
    marketability_score: evaluation.marketabilityScore,
    blockers: evaluation.blockers,
    warnings: evaluation.warnings,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  const saved = await upsertRow(input.repos.marketing.readiness, row);
  return {
    id: saved.id,
    marketabilityScore: evaluation.marketabilityScore,
    estimatedMargin: evaluation.estimatedMargin,
    blockers: evaluation.blockers,
    warnings: evaluation.warnings,
    row: saved
  } satisfies MarketingReadinessSnapshot;
}

function safeLaunchPlan(row: WorkspaceRow) {
  return {
    id: row.id,
    sourceEntityType: text(value(row, "source_entity_type", "sourceEntityType")),
    sourceEntityId: text(value(row, "source_entity_id", "sourceEntityId")),
    brandVoiceProfileId: text(value(row, "brand_voice_profile_id", "brandVoiceProfileId")),
    readinessId: text(value(row, "readiness_id", "readinessId")) || null,
    launchName: text(value(row, "launch_name", "launchName")),
    campaignType: text(value(row, "campaign_type", "campaignType")),
    spendType: text(value(row, "spend_type", "spendType")),
    estimatedCashCost: numeric(value(row, "estimated_cash_cost", "estimatedCashCost")) ?? 0,
    ownerTimeEstimateMinutes: numeric(value(row, "owner_time_estimate_minutes", "ownerTimeEstimateMinutes")),
    requiresAdBudget: truthy(value(row, "requires_ad_budget", "requiresAdBudget")),
    status: text(value(row, "status")),
    summary: text(value(row, "summary"))
  };
}

export async function createMarketingLaunchPlan(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  brandVoiceProfileId?: string | undefined;
  launchName?: string | undefined;
  campaignType?: string | undefined;
  spendType?: string | undefined;
}) {
  const entity = await resolveMarketingEntity({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId
  });
  if (!entity) throw new Error(MARKETING_NO_APPROVED_SOURCE_ENTITY);
  const brandVoice = await getBrandVoiceProfileRow({
    repos: input.repos,
    workspaceId: input.workspaceId,
    brandVoiceProfileId: input.brandVoiceProfileId
  });
  if (!brandVoice) throw new Error("brand_voice_profile_missing");
  const readiness = await readProductReadinessData({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId
  });
  const launchId = id("mlaunch", `${entity.sourceEntityType}:${entity.sourceEntityId}:${text(value(brandVoice, "brand_name", "brandName"))}`);
  const campaignType = text(input.campaignType, "hybrid");
  const spendType = text(input.spendType, campaignType === "organic" ? "no_spend" : "owner_time_only");
  const row = {
    id: launchId,
    workspace_id: input.workspaceId,
    source_entity_type: entity.sourceEntityType,
    source_entity_id: entity.sourceEntityId,
    brand_voice_profile_id: brandVoice.id,
    readiness_id: readiness.id,
    launch_name: compactText(input.launchName || `${entity.title} Launch Package`, 140),
    campaign_type: campaignType,
    spend_type: spendType,
    estimated_cash_cost: spendType === "no_spend" ? "0" : "0",
    owner_time_estimate_minutes: 120,
    requires_ad_budget: campaignType === "paid" || campaignType === "hybrid",
    status: readiness.blockers.length ? "blocked" : "draft",
    summary: compactText(readiness.blockers.length
      ? "Marketing launch plan created with blockers that require owner review before live-facing work."
      : "Marketing launch plan created and ready for draft generation.", 260),
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  const saved = await upsertRow(input.repos.marketing.launchPlans, row);
  return safeLaunchPlan(saved);
}

async function getLaunchPlanOrThrow(repos: RepositoryBundle, workspaceId: string, launchPlanId: string) {
  const row = await repos.marketing.launchPlans.getById(launchPlanId, workspaceId);
  if (!row) throw new Error(MARKETING_LAUNCH_PLAN_INVALID);
  return row;
}

async function getLaunchContext(repos: RepositoryBundle, workspaceId: string, launchPlanId: string) {
  const launchPlan = await getLaunchPlanOrThrow(repos, workspaceId, launchPlanId);
  const entity = await resolveMarketingEntity({
    repos,
    workspaceId,
    sourceEntityType: text(value(launchPlan, "source_entity_type", "sourceEntityType")),
    sourceEntityId: text(value(launchPlan, "source_entity_id", "sourceEntityId"))
  });
  if (!entity) throw new Error(MARKETING_NO_APPROVED_SOURCE_ENTITY);
  const brandVoice = await readBrandVoiceProfile({
    repos,
    workspaceId,
    brandVoiceProfileId: text(value(launchPlan, "brand_voice_profile_id", "brandVoiceProfileId"))
  });
  const trendEvidence = await readTrendEvidenceForProduct({
    repos,
    workspaceId,
    sourceEntityType: entity.sourceEntityType,
    sourceEntityId: entity.sourceEntityId
  });
  return { launchPlan, entity, brandVoice, trendEvidence };
}

function cleanCandidatePhrases(entity: ApprovedMarketingEntity, brandVoice: BrandVoiceSnapshot) {
  const blocked = new Set([...brandVoice.bannedPhrases, ...brandVoice.ipBlocklist].map(normalizeToken));
  return uniqueStrings(entity.phrases.filter((phrase) => !blocked.has(normalizeToken(phrase))));
}

function shortTitle(entity: ApprovedMarketingEntity) {
  return compactText(entity.title.replace(/\bconcept\b/gi, "").trim() || entity.title, 80);
}

async function createOrganicDraft(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
  contentType: string;
  payload: Record<string, unknown>;
  estimatedCashCost?: number | undefined;
  ownerTimeEstimateMinutes?: number | undefined;
}) {
  const row = {
    id: id("orgdraft", `${input.launchPlanId}:${input.contentType}:${JSON.stringify(input.payload).slice(0, 80)}`),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    content_type: input.contentType,
    payload: input.payload,
    estimated_cash_cost: (input.estimatedCashCost ?? 0).toFixed(2),
    owner_time_estimate_minutes: input.ownerTimeEstimateMinutes ?? 20,
    publish_approval_required: true,
    send_approval_required: true,
    outreach_approval_required: true,
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  return upsertRow(input.repos.marketing.organicContentDrafts, row);
}

function organicPlanPayload(entity: ApprovedMarketingEntity, brandVoice: BrandVoiceSnapshot, timeframe: "7_day" | "14_day" | "30_day") {
  const baseTitle = shortTitle(entity);
  const hooks = roleStylePhrases(brandVoice);
  if (timeframe === "7_day") {
    return {
      planWindow: "7-day",
      headline: `${baseTitle} owner-time-only launch sprint`,
      actions: [
        `Refresh the PDP or concept notes with ${hooks[0] ?? "proof-backed"} language.`,
        "Publish one organic short-form post manually after owner approval.",
        "Send one no-send-mode email draft for owner review and manual scheduling."
      ],
      cashCost: 0
    };
  }
  if (timeframe === "14_day") {
    return {
      planWindow: "14-day",
      headline: `${baseTitle} organic follow-up`,
      actions: [
        "Repurpose the strongest caption into a carousel and pin.",
        "Add a gift-angle entry to a roundup or newsletter draft.",
        "Review comments, saves, and click feedback manually before any paid test."
      ],
      cashCost: 0
    };
  }
  return {
    planWindow: "30-day",
    headline: `${baseTitle} proof-building month`,
    actions: [
      "Refresh the best-performing hooks into a second caption set.",
      "Collect owner notes on objections and gifting questions.",
      "Only move to manual ad-build review if margin, policy, and tracking remain healthy."
    ],
    cashCost: 0
  };
}

export async function draftOrganicLaunchPlan(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, brandVoice } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const rows = await Promise.all([
    createOrganicDraft({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      contentType: "gift_guide_entry",
      payload: organicPlanPayload(entity, brandVoice, "7_day"),
      ownerTimeEstimateMinutes: 25
    }),
    createOrganicDraft({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      contentType: "carousel_post",
      payload: organicPlanPayload(entity, brandVoice, "14_day"),
      ownerTimeEstimateMinutes: 35
    }),
    createOrganicDraft({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      contentType: "blog_brief",
      payload: organicPlanPayload(entity, brandVoice, "30_day"),
      ownerTimeEstimateMinutes: 45
    })
  ]);
  return { organicContentDraftIds: rows.map((row) => row.id), organicContentDraftCount: rows.length };
}

export async function draftSeoPdpRecommendations(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, brandVoice, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const phrases = cleanCandidatePhrases(entity, brandVoice).slice(0, 6);
  const seo = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "shopify_seo_metadata",
    ownerTimeEstimateMinutes: 18,
    payload: {
      seoTitle: compactText(`${shortTitle(entity)} | Salty Cowhide Co.`, 70),
      seoDescription: compactText(`${entity.description} ${trendEvidence.evidenceSummary}`.trim(), 150),
      keywords: uniqueStrings([...phrases, ...trendEvidence.keywordTerms]).slice(0, 8)
    }
  });
  const pdp = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "pdp_recommendation",
    ownerTimeEstimateMinutes: 20,
    payload: {
      heroHook: compactText(`${shortTitle(entity)} for ${entity.customerSegment}`),
      proofBlocks: ["Owner-reviewed launch language", "Giftable occasion positioning", "Manual approval before any public edit"],
      faqSuggestions: ["Who is this product best for?", "What makes the design feel coastal-western?", "What personalization angle should be reviewed?"]
    }
  });
  const landing = {
    id: id("lprec", `${input.launchPlanId}:hero`),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    source_entity_type: entity.sourceEntityType,
    source_entity_id: entity.sourceEntityId,
    recommendation_type: "pdp_hero",
    before_text: "",
    after_text: `Lead with ${shortTitle(entity)} and proof-backed occasion language instead of generic launch copy.`,
    supporting_metrics: { sourceKeys: trendEvidence.sourceKeys, evidenceSummary: trendEvidence.evidenceSummary },
    expected_impact: "Higher clarity and stronger product-page intent match.",
    risk_flags: [],
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  await upsertRow(input.repos.marketing.landingPageRecommendations, landing);
  return {
    organicContentDraftIds: [seo.id, pdp.id],
    landingPageRecommendationIds: [landing.id]
  };
}

export async function draftSocialContent(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, brandVoice } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const phrases = cleanCandidatePhrases(entity, brandVoice);
  const common = {
    hooks: [`${shortTitle(entity)} drop`, brandVoice.approvedPhrases[0] ?? "coastal cowgirl energy"],
    keywords: phrases.slice(0, 5)
  };
  const rows = await Promise.all([
    createOrganicDraft({
      repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId: input.launchPlanId, contentType: "instagram_caption",
      ownerTimeEstimateMinutes: 12,
      payload: { channel: "instagram", caption: `${shortTitle(entity)} is built for ${entity.customerSegment}. ${brandVoice.approvedPhrases[0] ?? "Owner-reviewed boutique copy only."}`, hashtags: phrases.slice(0, 5), cta: "Review, approve, then post manually.", ...common }
    }),
    createOrganicDraft({
      repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId: input.launchPlanId, contentType: "facebook_post",
      ownerTimeEstimateMinutes: 12,
      payload: { channel: "facebook", caption: `Introducing ${shortTitle(entity)} with a giftable coastal-western angle. Manual publish only after owner review.`, cta: "Review manually.", ...common }
    }),
    createOrganicDraft({
      repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId: input.launchPlanId, contentType: "tiktok_reels_script",
      ownerTimeEstimateMinutes: 18,
      payload: { channel: "tiktok", hook: `POV: your next ${entity.productCategory} needs ${brandVoice.toneDescriptors[0] ?? "coastal cowgirl"} energy`, beats: ["Show hero product angle", "Call out gifting moment", "End with manual-review CTA"], ...common }
    }),
    createOrganicDraft({
      repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, launchPlanId: input.launchPlanId, contentType: "short_form_storyboard",
      ownerTimeEstimateMinutes: 18,
      payload: { frames: ["Problem moment", "Product reveal", "Occasion angle", "Manual CTA"], overlayIdeas: phrases.slice(0, 3), ...common }
    })
  ]);
  return { organicContentDraftIds: rows.map((row) => row.id), organicContentDraftCount: rows.length };
}

export async function draftPinterestOrganicPlan(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const row = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "pinterest_pin",
    ownerTimeEstimateMinutes: 15,
    payload: {
      pinTitle: compactText(`${shortTitle(entity)} pin idea`, 100),
      pinDescription: compactText(`${entity.description} ${trendEvidence.evidenceSummary}`.trim(), 180),
      boardRecommendations: uniqueStrings(["Coastal Cowgirl Gifts", "Boutique Keychain Ideas", "Western Beach Decor"]).slice(0, 3),
      verticalCreativeNote: "Use a manual or later-approved vertical creative. No auto publish."
    }
  });
  return { organicContentDraftIds: [row.id], organicContentDraftCount: 1 };
}

async function createFlow(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
  flowTrigger: string;
  sequenceStep: number;
  subjectLine?: string | undefined;
  previewText?: string | undefined;
  bodyMarkdown?: string | undefined;
  smsVariantText?: string | undefined;
  segmentNotes?: string | undefined;
}) {
  const row = {
    id: id("mflow", `${input.launchPlanId}:${input.flowTrigger}:${input.sequenceStep}`),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    flow_trigger: input.flowTrigger,
    sequence_step: input.sequenceStep,
    subject_line: input.subjectLine ?? null,
    preview_text: input.previewText ?? null,
    body_markdown: input.bodyMarkdown ?? null,
    sms_variant_text: input.smsVariantText ?? null,
    segment_notes: input.segmentNotes ?? null,
    consent_required: true,
    send_status: "draft_only",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  return upsertRow(input.repos.marketing.lifecycleCampaignFlows, row);
}

export async function draftEmailSmsDrafts(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const emailDraft = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "email_draft",
    ownerTimeEstimateMinutes: 20,
    payload: {
      subjectLine: `${shortTitle(entity)} is ready for owner review`,
      previewText: "Draft-only launch email. No send automation.",
      bodyMarkdown: `## ${shortTitle(entity)}\n\n${entity.description}\n\nReview the copy, imagery, and CTA before any manual send.`
    }
  });
  const smsDraft = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "sms_draft",
    ownerTimeEstimateMinutes: 8,
    payload: {
      smsText: `${shortTitle(entity)} is queued for a manual-launch review. No send has been scheduled.`,
      complianceNote: "Consent required before any manual send."
    }
  });
  const flows = await Promise.all([
    createFlow({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      flowTrigger: "product_launch",
      sequenceStep: 1,
      subjectLine: `${shortTitle(entity)} launch note`,
      previewText: "Draft-only first launch touch.",
      bodyMarkdown: entity.description,
      segmentNotes: "Use only with consented customers."
    }),
    createFlow({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      flowTrigger: "product_launch",
      sequenceStep: 2,
      subjectLine: `${shortTitle(entity)} follow-up`,
      previewText: "Draft-only reminder touch.",
      smsVariantText: `${shortTitle(entity)} follow-up draft only. No send.`
    })
  ]);
  return {
    organicContentDraftIds: [emailDraft.id, smsDraft.id],
    organicContentDraftCount: 2,
    lifecycleFlowIds: flows.map((row) => row.id),
    lifecycleFlowCount: flows.length
  };
}

export async function draftMarketplaceSeoSuggestions(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const row = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "marketplace_seo",
    ownerTimeEstimateMinutes: 16,
    payload: {
      titleSuggestion: compactText(`${shortTitle(entity)} | ${entity.suggestedProductTypes[0] ?? entity.productCategory}`, 130),
      tagSuggestions: uniqueStrings([...entity.phrases, ...trendEvidence.keywordTerms]).slice(0, 13),
      photoOrderSuggestions: ["Hero angle", "Detail crop", "Gifting/lifestyle setup", "Scale reference"],
      noMarketplaceMutation: true
    }
  });
  return { organicContentDraftIds: [row.id], organicContentDraftCount: 1 };
}

export async function draftOutreachDrafts(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const row = await createOrganicDraft({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    contentType: "outreach_pitch",
    ownerTimeEstimateMinutes: 18,
    payload: {
      collaboratorTypes: ["boutique western creator", "bridal-party gift curator", "coastal lifestyle micro-creator"],
      pitch: `Hi there, I’m sharing ${shortTitle(entity)} because it fits a boutique coastal-western gifting moment. If the fit looks right, the next step would still be a manual owner review before any send.`,
      sendStatus: "draft_only"
    }
  });
  return { organicContentDraftIds: [row.id], organicContentDraftCount: 1 };
}

export async function draftPositioningStatement(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const row = {
    id: id("mpos", input.launchPlanId),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    primary_promise: compactText(`${shortTitle(entity)} gives ${entity.customerSegment} a giftable coastal-western moment without generic mass-market styling.`, 220),
    customer_moment: compactText(`Designed for shoppers looking for ${entity.productCategory} ideas around gifting, bachelorette moments, or boutique self-purchase.`, 220),
    differentiators: uniqueStrings(["owner-reviewed boutique positioning", "trend-evidence-backed angle", "manual approval before any public action"]),
    objections: uniqueStrings(["Need stronger pricing proof", "Need mockup confidence", "Need policy-safe phrasing"]),
    evidence_refs: uniqueStrings([trendEvidence.clusterId ?? "", ...trendEvidence.citationIds]),
    risk_flags: [],
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  const saved = await upsertRow(input.repos.marketing.positioningStatements, row);
  return { positioningIds: [saved.id], positioningCount: 1 };
}

export async function draftOfferHypotheses(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const rows = [
    {
      id: id("moffer", `${input.launchPlanId}:organic_only_positioning`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      offer_type: "organic_only_positioning",
      offer_details: { positioning: "Lead with story, gifting context, and boutique styling before any discounting." },
      margin_calculation: null,
      risk_flags: [],
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    },
    {
      id: id("moffer", `${input.launchPlanId}:personalization_upsell`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      offer_type: "personalization_upsell",
      offer_details: { upsell: `Test a manual review path for personalized ${entity.productCategory} phrasing after margin confirmation.` },
      margin_calculation: null,
      risk_flags: [],
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    }
  ] as WorkspaceRow[];
  const saved = await Promise.all(rows.map((row) => upsertRow(input.repos.marketing.offerHypotheses, row)));
  return { offerIds: saved.map((row) => row.id), offerCount: saved.length };
}

export async function draftAudienceHypotheses(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const entries = [
    { channel: "organic_social", segmentName: "Coastal Cowgirl Gift Shopper", description: `High-intent boutique buyers for ${shortTitle(entity)}.`, rationale: "Matches source phrases and gifting language." },
    { channel: "pinterest", segmentName: "Wedding + Bachelorette Planner", description: "Save-minded shoppers searching giftable western-coastal details.", rationale: "Strong fit for giftable occasion phrasing." },
    { channel: "email", segmentName: "Previous Boutique Buyer", description: "Existing opted-in customers who already engage with new product launches.", rationale: "Owned audience path with manual send approval." }
  ];
  const rows = await Promise.all(entries.map((entry) => upsertRow(input.repos.marketing.audienceHypotheses, {
    id: id("maud", `${input.launchPlanId}:${entry.channel}:${entry.segmentName}`),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    channel: entry.channel,
    segment_name: entry.segmentName,
    description: entry.description,
    rationale: entry.rationale,
    targeting_parameters: { interestKeywords: uniqueStrings([...entity.phrases, ...trendEvidence.keywordTerms]).slice(0, 8) },
    exclusion_rules: ["No sensitive-attribute targeting."],
    sensitive_targeting_flags: [],
    evidence_refs: uniqueStrings([trendEvidence.clusterId ?? "", ...trendEvidence.citationIds]),
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow)));
  return { audienceHypothesisIds: rows.map((row) => row.id), audienceHypothesisCount: rows.length };
}

export async function draftAdAngles(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const entries = [
    { type: "giftable_moment", title: "Giftable coastal-western moment", hook: `A boutique ${entity.productCategory} that feels ready for the next gift table.`, promise: "Turns a trend-backed idea into a memorable giftable accent." },
    { type: "personalization_angle", title: "Personalized keepsake angle", hook: "Built for names, dates, and custom celebration moments.", promise: "Creates stronger attachment without copying marketplace phrasing." },
    { type: "boutique_style", title: "Boutique styling over generic mass-market copy", hook: "The coastal-cowgirl look, minus the commodity feel.", promise: "Positions the product as a premium boutique option with manual proof checks." }
  ];
  const rows = await Promise.all(entries.map((entry) => upsertRow(input.repos.marketing.adAngles, {
    id: id("mangle", `${input.launchPlanId}:${entry.type}`),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    angle_type: entry.type,
    angle_title: entry.title,
    hook: compactText(entry.hook, 180),
    promise: compactText(entry.promise, 180),
    proof_points: uniqueStrings([trendEvidence.evidenceSummary, "Owner-reviewed launch package", `${trendEvidence.sourceKeys.length || 1} supporting data source(s)`]),
    trend_evidence_refs: uniqueStrings([trendEvidence.clusterId ?? "", ...trendEvidence.citationIds]),
    risk_flags: [],
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow)));
  return { adAngleIds: rows.map((row) => row.id), adAngleCount: rows.length };
}

export async function draftAdCopyVariants(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const angles = (await input.repos.marketing.adAngles.listByWorkspace(input.workspaceId)).filter((row) => value(row, "launch_plan_id", "launchPlanId") === input.launchPlanId);
  const variants = await Promise.all(angles.slice(0, 3).flatMap((angleRow, index) => [
    upsertRow(input.repos.marketing.adCopyVariants, {
      id: id("mcopy", `${input.launchPlanId}:${angleRow.id}:meta`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      ad_angle_id: angleRow.id,
      channel: "meta",
      headline: compactText(`${shortTitle(entity)} | ${text(value(angleRow, "angle_title", "angleTitle"))}`, 60),
      primary_text: compactText(`${text(value(angleRow, "hook"))} Review the draft package manually before any build or spend step.`, 220),
      description: compactText(text(value(angleRow, "promise")), 120),
      cta: "Review draft",
      platform_constraints: { maxHeadline: 60, liveWrite: false },
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow),
    upsertRow(input.repos.marketing.adCopyVariants, {
      id: id("mcopy", `${input.launchPlanId}:${angleRow.id}:google:${index}`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      ad_angle_id: angleRow.id,
      channel: "google",
      headline: compactText(`${shortTitle(entity)} boutique launch`, 30),
      primary_text: compactText(text(value(angleRow, "promise")), 90),
      description: compactText("Manual build sheet only. No live campaign creation.", 90),
      cta: "Learn more",
      platform_constraints: { maxHeadline: 30, maxDescription: 90, liveWrite: false },
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow)
  ]));
  return { adCopyVariantIds: variants.map((row) => row.id), adCopyVariantCount: variants.length };
}

export async function draftCreativeBriefs(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { entity, trendEvidence } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const angles = (await input.repos.marketing.adAngles.listByWorkspace(input.workspaceId)).filter((row) => value(row, "launch_plan_id", "launchPlanId") === input.launchPlanId);
  const rows = await Promise.all([
    upsertRow(input.repos.marketing.creativeBriefs, {
      id: id("mbrief", `${input.launchPlanId}:static_ad`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      ad_angle_id: angles[0]?.id ?? null,
      creative_type: "static_ad",
      prompt_or_brief: `Create a static ad concept for ${shortTitle(entity)} with ${trendEvidence.motifTerms[0] ?? "coastal-western"} visual cues. Do not generate the image in this task.`,
      text_overlay: compactText(shortTitle(entity), 40),
      aspect_ratio: "1:1",
      asset_requirements: { needsProductPhoto: true, needsOwnerReview: true },
      source_evidence_refs: uniqueStrings([trendEvidence.clusterId ?? "", ...trendEvidence.citationIds]),
      forbidden_motifs: policyIpTerms,
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow),
    upsertRow(input.repos.marketing.creativeBriefs, {
      id: id("mbrief", `${input.launchPlanId}:pinterest_pin`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      ad_angle_id: angles[1]?.id ?? null,
      creative_type: "pinterest_pin",
      prompt_or_brief: `Draft a vertical pin concept for ${shortTitle(entity)} with clean boutique typography and manual approval gates.`,
      text_overlay: compactText(`${shortTitle(entity)} pin draft`, 40),
      aspect_ratio: "2:3",
      asset_requirements: { vertical: true, overlaySafeZone: true, manualUploadOnly: true },
      source_evidence_refs: uniqueStrings([trendEvidence.clusterId ?? "", ...trendEvidence.citationIds]),
      forbidden_motifs: policyIpTerms,
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow),
    upsertRow(input.repos.marketing.creativeBriefs, {
      id: id("mbrief", `${input.launchPlanId}:reels_script`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      ad_angle_id: angles[2]?.id ?? null,
      creative_type: "reels_script",
      prompt_or_brief: `Draft a 15-second short-form script for ${shortTitle(entity)} with a gifting hook, proof beat, and manual CTA.`,
      text_overlay: "Giftable coastal-western moment",
      aspect_ratio: "9:16",
      asset_requirements: { bRollIdeas: ["close-up", "gift table", "lifestyle reveal"], noGeneration: true },
      source_evidence_refs: uniqueStrings([trendEvidence.clusterId ?? "", ...trendEvidence.citationIds]),
      forbidden_motifs: policyIpTerms,
      review_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow)
  ]);
  return { creativeBriefIds: rows.map((row) => row.id), creativeBriefCount: rows.length };
}

function stripTechnicalFields(record: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (/^(id|workspace_|created_|updated_|metadata$|organization_|launch_plan_id$|launchPlanId$|source_entity_id$|sourceEntityId$|brand_voice_profile_id$|brandVoiceProfileId$|policy_review_result_id$|policyReviewResultId$|review_status$|reviewStatus$|created_by$|createdBy$|updated_by$|updatedBy$)/i.test(key)) continue;
    out[key] = raw;
  }
  return out;
}

function collectStrings(input: unknown, into: string[] = []) {
  if (typeof input === "string") {
    const normalized = compactText(input, 600);
    if (normalized) into.push(normalized);
    return into;
  }
  if (Array.isArray(input)) {
    for (const item of input) collectStrings(item, into);
    return into;
  }
  if (!input || typeof input !== "object") return into;
  for (const value of Object.values(input as Record<string, unknown>)) collectStrings(value, into);
  return into;
}

function policyReviewFromText(texts: string[], brandVoice: BrandVoiceSnapshot): PolicyCheckResult {
  const combined = normalizeSearchText(texts.join(" "));
  const policyCodes: string[] = [];
  const evidence: Record<string, unknown> = {};
  const fixSuggestions = new Set<string>();
  let severity: PolicyCheckResult["severity"] = "low";
  let blocked = false;

  for (const term of uniqueStrings([...policyIpTerms, ...brandVoice.ipBlocklist]).map(normalizeToken)) {
    if (term && combined.includes(term)) {
      policyCodes.push("ip_or_trademark_reference");
      evidence.ipTerm = term;
      fixSuggestions.add("Remove brand, franchise, celebrity, sports, or licensing references.");
      severity = "severe";
      blocked = true;
    }
  }
  for (const banned of brandVoice.bannedPhrases.map(normalizeToken)) {
    if (banned && combined.includes(banned)) {
      policyCodes.push("brand_voice_banned_phrase");
      evidence.bannedPhrase = banned;
      fixSuggestions.add("Replace the banned phrase with approved boutique language.");
      severity = severity === "severe" ? "severe" : "high";
      blocked = true;
    }
  }
  for (const rule of policyPatterns) {
    if (!rule.pattern.test(combined)) continue;
    policyCodes.push(rule.code);
    evidence[rule.code] = true;
    fixSuggestions.add(rule.fix);
    blocked ||= rule.blocked;
    if (rule.severity === "severe") severity = "severe";
    else if (rule.severity === "high" && severity !== "severe") severity = "high";
    else if (rule.severity === "medium" && !["severe", "high"].includes(severity)) severity = "medium";
  }

  const verdict = policyCodes.length === 0 ? "pass" : blocked ? "hard_block" : "flagged";
  return {
    verdict,
    severity,
    policyCodes: uniqueStrings(policyCodes),
    evidence,
    fixSuggestions: [...fixSuggestions],
    blocked
  };
}

async function upsertPolicyReviewResult(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  targetType: string;
  targetId: string;
  platform?: string | undefined;
  result: PolicyCheckResult;
}) {
  const row = {
    id: id("policy", `${input.targetType}:${input.targetId}`),
    workspace_id: input.workspaceId,
    target_type: input.targetType,
    target_id: input.targetId,
    platform: input.platform ?? null,
    verdict: input.result.verdict,
    severity: input.result.severity,
    policy_codes: input.result.policyCodes,
    evidence: input.result.evidence,
    fix_suggestions: input.result.fixSuggestions,
    owner_override: null,
    blocked: input.result.blocked,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  return upsertRow(input.repos.marketing.policyReviewResults, row);
}

async function policyTargetsForLaunchPlan(repos: RepositoryBundle, workspaceId: string, launchPlanId: string) {
  const byLaunch = <T extends WorkspaceRow>(rows: T[]) => rows.filter((row) => value(row, "launch_plan_id", "launchPlanId") === launchPlanId);
  return [
    ...byLaunch(await repos.marketing.positioningStatements.listByWorkspace(workspaceId)).map((row) => ({ targetType: "positioning_statement", row, repo: null })),
    ...byLaunch(await repos.marketing.offerHypotheses.listByWorkspace(workspaceId)).map((row) => ({ targetType: "offer_hypothesis", row, repo: null })),
    ...byLaunch(await repos.marketing.audienceHypotheses.listByWorkspace(workspaceId)).map((row) => ({ targetType: "audience_hypothesis", row, repo: null })),
    ...byLaunch(await repos.marketing.adAngles.listByWorkspace(workspaceId)).map((row) => ({ targetType: "ad_angle", row, repo: null })),
    ...byLaunch(await repos.marketing.adCopyVariants.listByWorkspace(workspaceId)).map((row) => ({ targetType: "ad_copy_variant", row, repo: repos.marketing.adCopyVariants })),
    ...byLaunch(await repos.marketing.organicContentDrafts.listByWorkspace(workspaceId)).map((row) => ({ targetType: "organic_content_draft", row, repo: repos.marketing.organicContentDrafts })),
    ...byLaunch(await repos.marketing.lifecycleCampaignFlows.listByWorkspace(workspaceId)).map((row) => ({ targetType: "lifecycle_campaign_flow", row, repo: null })),
    ...byLaunch(await repos.marketing.creativeBriefs.listByWorkspace(workspaceId)).map((row) => ({ targetType: "creative_brief", row, repo: repos.marketing.creativeBriefs })),
    ...byLaunch(await repos.marketing.landingPageRecommendations.listByWorkspace(workspaceId)).map((row) => ({ targetType: "landing_page_recommendation", row, repo: null })),
    ...byLaunch(await repos.marketing.campaignDrafts.listByWorkspace(workspaceId)).map((row) => ({ targetType: "campaign_draft", row, repo: null }))
  ];
}

export async function runPolicyReview(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const { brandVoice } = await getLaunchContext(input.repos, input.workspaceId, input.launchPlanId);
  const targets = await policyTargetsForLaunchPlan(input.repos, input.workspaceId, input.launchPlanId);
  const results: WorkspaceRow[] = [];

  for (const target of targets) {
    const payload = stripTechnicalFields(asRecord(target.row));
    const texts = collectStrings(payload);
    const result = policyReviewFromText(texts, brandVoice);
    const saved = await upsertPolicyReviewResult({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      targetType: target.targetType,
      targetId: target.row.id,
      platform: target.targetType === "ad_copy_variant" ? text(value(target.row, "channel")) : undefined,
      result
    });
    if (target.repo && ("policy_review_result_id" in target.row || "policyReviewResultId" in target.row || ["ad_copy_variant", "organic_content_draft", "creative_brief"].includes(target.targetType))) {
      await target.repo.update(target.row.id, asWorkspacePatch({
        policy_review_result_id: saved.id,
        updated_by: input.actorId ?? null
      }));
    }
    results.push(saved);
  }

  return {
    policyReviewIds: results.map((row) => row.id),
    policyReviewCount: results.length,
    blockedCount: results.filter((row) => truthy(value(row, "blocked"))).length
  };
}

async function createChannelRecommendation(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
  channel: string;
  priorityScore: number;
  rationale: string;
  requiredAssets: string[];
  cashCostEstimate: number;
  ownerTimeEstimateMinutes: number;
  riskFlags?: string[] | undefined;
}) {
  const row = {
    id: id("mchan", `${input.launchPlanId}:${input.channel}`),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    channel: input.channel,
    priority_score: input.priorityScore,
    rationale: compactText(input.rationale, 220),
    required_assets: input.requiredAssets,
    cash_cost_estimate: input.cashCostEstimate.toFixed(2),
    owner_time_estimate_minutes: input.ownerTimeEstimateMinutes,
    risk_flags: input.riskFlags ?? [],
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  return upsertRow(input.repos.marketing.channelRecommendations, row);
}

export async function calculateBudgetRecommendation(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const launchPlan = await getLaunchPlanOrThrow(input.repos, input.workspaceId, input.launchPlanId);
  const readinessRow = text(value(launchPlan, "readiness_id", "readinessId"))
    ? await input.repos.marketing.readiness.getById(text(value(launchPlan, "readiness_id", "readinessId")), input.workspaceId)
    : null;
  const readinessScore = numeric(value(readinessRow, "marketability_score", "marketabilityScore")) ?? 0;
  const budgetAllowed = text(value(launchPlan, "campaign_type", "campaignType")) !== "organic";
  const dailyBudget = budgetAllowed && readinessScore >= 55 ? 25 : 0;
  const totalBudget = budgetAllowed && readinessScore >= 55 ? 175 : 0;
  const row = {
    id: id("mbudget", input.launchPlanId),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    recommended_daily_budget: dailyBudget.toFixed(2),
    recommended_total_test_budget: totalBudget.toFixed(2),
    break_even_cpa: totalBudget ? "18.00" : null,
    target_cpa: totalBudget ? "14.00" : null,
    calculation_basis: {
      readinessScore,
      campaignType: text(value(launchPlan, "campaign_type", "campaignType")),
      spendType: text(value(launchPlan, "spend_type", "spendType")),
      liveSpendBlocked: true
    },
    risk_flags: totalBudget ? [] : ["paid_test_not_recommended_yet"],
    requires_approval: true,
    review_status: "pending_review",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow;
  const saved = await upsertRow(input.repos.marketing.budgetRecommendations, row);
  const channels = await Promise.all([
    createChannelRecommendation({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      channel: "organic_social",
      priorityScore: 88,
      rationale: "No-spend distribution is available immediately after owner review.",
      requiredAssets: ["caption", "storyboard"],
      cashCostEstimate: 0,
      ownerTimeEstimateMinutes: 45
    }),
    createChannelRecommendation({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      channel: "pinterest",
      priorityScore: 74,
      rationale: "Save-first organic intent fits boutique gifting and decor discovery.",
      requiredAssets: ["vertical_pin", "pin_copy"],
      cashCostEstimate: 0,
      ownerTimeEstimateMinutes: 30
    }),
    createChannelRecommendation({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      launchPlanId: input.launchPlanId,
      channel: "meta_paid_draft",
      priorityScore: totalBudget ? 62 : 38,
      rationale: totalBudget ? "Can move into manual build-sheet review after owner approval." : "Keep as a blocked paid draft until readiness improves.",
      requiredAssets: ["ad_copy", "static_brief"],
      cashCostEstimate: totalBudget,
      ownerTimeEstimateMinutes: 25,
      riskFlags: totalBudget ? [] : ["budget_blocked_until_readiness_improves"]
    })
  ]);
  return {
    budgetRecommendationIds: [saved.id],
    budgetRecommendationCount: 1,
    channelRecommendationIds: channels.map((row) => row.id),
    channelRecommendationCount: channels.length
  };
}

export async function compileCampaignBuildSheet(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
}) {
  const launchPlan = await getLaunchPlanOrThrow(input.repos, input.workspaceId, input.launchPlanId);
  const budget = (await input.repos.marketing.budgetRecommendations.listByWorkspace(input.workspaceId)).find((row) =>
    value(row, "launch_plan_id", "launchPlanId") === input.launchPlanId
  ) ?? null;
  const mediaPlan = await upsertRow(input.repos.marketing.mediaPlanDrafts, {
    id: id("mmedia", input.launchPlanId),
    workspace_id: input.workspaceId,
    launch_plan_id: input.launchPlanId,
    objective: "Launch proof-backed marketing package",
    campaign_type: text(value(launchPlan, "campaign_type", "campaignType")),
    spend_type: text(value(launchPlan, "spend_type", "spendType")),
    channel_allocations: {
      organic_social: { allocation: 0, mode: "manual_publish_after_approval" },
      pinterest: { allocation: 0, mode: "manual_publish_after_approval" },
      meta_paid_draft: { allocation: numeric(value(budget, "recommended_total_test_budget", "recommendedTotalTestBudget")) ?? 0, mode: "manual_build_sheet_only" }
    },
    total_budget_recommended: value(budget, "recommended_total_test_budget", "recommendedTotalTestBudget") ?? "0",
    daily_budget_cap: value(budget, "recommended_daily_budget", "recommendedDailyBudget") ?? null,
    break_even_cpa: value(budget, "break_even_cpa", "breakEvenCpa") ?? null,
    test_duration_days: 7,
    status: "draft",
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null
  } as WorkspaceRow);

  const drafts = await Promise.all([
    upsertRow(input.repos.marketing.campaignDrafts, {
      id: id("mcamp", `${input.launchPlanId}:meta`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      media_plan_draft_id: mediaPlan.id,
      platform: "meta",
      campaign_name: compactText(`${text(value(launchPlan, "launch_name", "launchName"))} Meta Draft`, 120),
      objective: "traffic",
      platform_object_structure: { campaign: true, adSet: true, ads: true, liveWriteBlocked: true },
      platform_object_ids: null,
      write_mode: "manual_build_sheet",
      utm_schema: { source: "meta", medium: "paid_draft", campaign: normalizeToken(text(value(launchPlan, "launch_name", "launchName"))).replace(/\s+/g, "_") },
      risk_summary: { noSpendYet: false, liveWriteBlocked: true },
      approval_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow),
    upsertRow(input.repos.marketing.campaignDrafts, {
      id: id("mcamp", `${input.launchPlanId}:pinterest`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      media_plan_draft_id: mediaPlan.id,
      platform: "pinterest",
      campaign_name: compactText(`${text(value(launchPlan, "launch_name", "launchName"))} Pinterest Organic Build Sheet`, 120),
      objective: "awareness",
      platform_object_structure: { manualBoardSelection: true, manualPinUpload: true, liveWriteBlocked: true },
      platform_object_ids: null,
      write_mode: "draft_export",
      utm_schema: { source: "pinterest", medium: "organic_draft", campaign: normalizeToken(text(value(launchPlan, "launch_name", "launchName"))).replace(/\s+/g, "_") },
      risk_summary: { publicPostBlockedUntilApproval: true },
      approval_status: "pending_review",
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow)
  ]);
  return {
    mediaPlanDraftIds: [mediaPlan.id],
    mediaPlanDraftCount: 1,
    campaignDraftIds: drafts.map((row) => row.id),
    campaignDraftCount: drafts.length
  };
}

function requestedActionForTarget(targetType: string) {
  if (targetType === "campaign_draft") return "approve_manual_build_sheet";
  if (targetType === "budget_recommendation") return "approve_budget_recommendation";
  if (targetType === "organic_content_draft") return "approve_manual_publish_copy";
  return "owner_review_required";
}

export async function createApprovalRequest(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
  targets: Array<{ targetType: string; targetId: string; requestedAction?: string; riskSummary?: Record<string, unknown> }>;
}) {
  const existing = await input.repos.marketing.listApprovalRequestsByLaunchPlan(input.workspaceId, input.launchPlanId);
  const created: WorkspaceRow[] = [];
  for (const target of input.targets) {
    if (existing.some((row) =>
      text(value(row, "target_type", "targetType")) === target.targetType &&
      text(value(row, "target_id", "targetId")) === target.targetId
    )) continue;
    const row = {
      id: id("mapproval", `${input.launchPlanId}:${target.targetType}:${target.targetId}`),
      workspace_id: input.workspaceId,
      launch_plan_id: input.launchPlanId,
      target_type: target.targetType,
      target_id: target.targetId,
      requested_action: target.requestedAction ?? requestedActionForTarget(target.targetType),
      risk_summary: target.riskSummary ?? null,
      owner_decision: "pending",
      reviewer: null,
      decided_at: null,
      notes: null,
      created_by: input.actorId ?? null,
      updated_by: input.actorId ?? null
    } as WorkspaceRow;
    created.push(await upsertRow(input.repos.marketing.approvalRequests, row));
  }
  return { approvalRequestIds: created.map((row) => row.id), approvalRequestCount: created.length };
}

function reviewStatusPatch(decision: "approved" | "rejected" | "needs_changes") {
  if (decision === "approved") return "approved";
  if (decision === "rejected") return "rejected";
  return "pending_review";
}

export function parseMarketingApprovalDecision(input: unknown): MarketingApprovalDecision | null {
  const decision = text(input);
  return decision === "approved" || decision === "rejected" || decision === "needs_changes" ? decision : null;
}

async function repoForApprovalTarget(repos: RepositoryBundle, targetType: string) {
  if (targetType === "positioning_statement") return repos.marketing.positioningStatements;
  if (targetType === "offer_hypothesis") return repos.marketing.offerHypotheses;
  if (targetType === "audience_hypothesis") return repos.marketing.audienceHypotheses;
  if (targetType === "ad_angle") return repos.marketing.adAngles;
  if (targetType === "ad_copy_variant") return repos.marketing.adCopyVariants;
  if (targetType === "organic_content_draft") return repos.marketing.organicContentDrafts;
  if (targetType === "lifecycle_campaign_flow") return repos.marketing.lifecycleCampaignFlows;
  if (targetType === "creative_brief") return repos.marketing.creativeBriefs;
  if (targetType === "landing_page_recommendation") return repos.marketing.landingPageRecommendations;
  if (targetType === "channel_recommendation") return repos.marketing.channelRecommendations;
  if (targetType === "budget_recommendation") return repos.marketing.budgetRecommendations;
  if (targetType === "campaign_draft") return repos.marketing.campaignDrafts;
  return null;
}

async function updateTargetReviewState(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  targetType: string;
  targetId: string;
  decision: "approved" | "rejected" | "needs_changes";
  actorId?: string | undefined;
}) {
  const repo = await repoForApprovalTarget(input.repos, input.targetType);
  if (!repo) return null;
  const current = await repo.getById(input.targetId, input.workspaceId);
  if (!current) return null;
  if (input.targetType === "ad_copy_variant" && input.decision === "approved") {
    const policyId = text(value(current, "policy_review_result_id", "policyReviewResultId"));
    const policy = policyId ? await input.repos.marketing.policyReviewResults.getById(policyId, input.workspaceId) : null;
    if (!policy || text(value(policy, "verdict")) !== "pass") throw new Error("policy_review_required");
  }
  const patch: Record<string, unknown> = {
    updated_by: input.actorId ?? null
  };
  if ("review_status" in current || "reviewStatus" in current) patch.review_status = reviewStatusPatch(input.decision);
  if ("approval_status" in current || "approvalStatus" in current) patch.approval_status = input.decision;
  return repo.update(input.targetId, asWorkspacePatch(patch));
}

function summarizeCounts(detail: MarketingLaunchPlanDetail) {
  return {
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
    approvalRequestCount: detail.approvalRequests.length
  };
}

export async function saveMarketingOutputForReview(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string | undefined;
  launchPlanId: string;
  agentRunId: string;
  summary?: string | undefined;
  warnings?: string[] | undefined;
}) {
  await runPolicyReview({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId
  });
  const detail = await getMarketingLaunchPlanDetail({
    repos: input.repos,
    workspaceId: input.workspaceId,
    launchPlanId: input.launchPlanId
  });
  if (!detail) throw new Error(MARKETING_LAUNCH_PLAN_INVALID);
  const targets = [
    ...detail.positioningStatements.map((row) => ({ targetType: "positioning_statement", targetId: String(row.id) })),
    ...detail.offerHypotheses.map((row) => ({ targetType: "offer_hypothesis", targetId: String(row.id) })),
    ...detail.audienceHypotheses.map((row) => ({ targetType: "audience_hypothesis", targetId: String(row.id) })),
    ...detail.adAngles.map((row) => ({ targetType: "ad_angle", targetId: String(row.id) })),
    ...detail.adCopyVariants.map((row) => ({ targetType: "ad_copy_variant", targetId: String(row.id) })),
    ...detail.organicContentDrafts.map((row) => ({ targetType: "organic_content_draft", targetId: String(row.id) })),
    ...detail.lifecycleCampaignFlows.map((row) => ({ targetType: "lifecycle_campaign_flow", targetId: String(row.id) })),
    ...detail.creativeBriefs.map((row) => ({ targetType: "creative_brief", targetId: String(row.id) })),
    ...detail.landingPageRecommendations.map((row) => ({ targetType: "landing_page_recommendation", targetId: String(row.id) })),
    ...detail.channelRecommendations.map((row) => ({ targetType: "channel_recommendation", targetId: String(row.id) })),
    ...detail.budgetRecommendations.map((row) => ({ targetType: "budget_recommendation", targetId: String(row.id) })),
    ...detail.mediaPlanDrafts.map((row) => ({ targetType: "media_plan_draft", targetId: String(row.id) })),
    ...detail.campaignDrafts.map((row) => ({ targetType: "campaign_draft", targetId: String(row.id) }))
  ];
  const approvals = await createApprovalRequest({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    launchPlanId: input.launchPlanId,
    targets
  });
  const counts = summarizeCounts(detail);
  const warnings = uniqueStrings(input.warnings ?? []);
  const summary = compactText(input.summary || `Created a reviewable launch package for ${detail.sourceEntity.title ?? "the selected source entity"} with organic, SEO, lifecycle, paid-draft, and approval artifacts.`, 320);
  await input.repos.marketing.launchPlans.update(input.launchPlanId, asWorkspacePatch({
    status: "needs_review",
    summary,
    updated_by: input.actorId ?? null,
    metadata: {
      agentRunId: input.agentRunId,
      warnings
    }
  }));
  const output = await upsertRow(input.repos.aiEmployee.outputs, {
    id: id("aiout_marketing", `${input.launchPlanId}:${input.agentRunId}`),
    workspace_id: input.workspaceId,
    run_id: input.agentRunId,
    output_type: "marketing_launch_package",
    ref_type: "marketing_launch_plan",
    ref_id: input.launchPlanId,
    output_json: {
      launchPlanId: input.launchPlanId,
      approvalRequestIds: approvals.approvalRequestIds,
      warnings,
      summary,
      ...counts
    },
    status: "pending_review",
    metadata: {
      roleKey: "marketing_launch_planner",
      providerAction: false,
      publishAction: false,
      spendAction: false
    }
  } as WorkspaceRow);
  return {
    aiOutputId: output.id,
    approvalRequestIds: approvals.approvalRequestIds,
    summary,
    warnings,
    ...counts
  };
}

export async function listMarketingLaunchPlans(input: {
  repos: RepositoryBundle;
  workspaceId: string;
}) {
  return (await input.repos.marketing.launchPlans.listByWorkspace(input.workspaceId))
    .sort((left, right) => text(value(right, "updated_at", "updatedAt")).localeCompare(text(value(left, "updated_at", "updatedAt"))) || left.id.localeCompare(right.id))
    .map(safeLaunchPlan);
}

export async function getMarketingLaunchPlanDetail(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  launchPlanId: string;
}) {
  const launchPlan = await input.repos.marketing.launchPlans.getById(input.launchPlanId, input.workspaceId);
  if (!launchPlan) return null;
  const sourceEntity = await readApprovedProductOrConcept({
    repos: input.repos,
    workspaceId: input.workspaceId,
    sourceEntityType: text(value(launchPlan, "source_entity_type", "sourceEntityType")),
    sourceEntityId: text(value(launchPlan, "source_entity_id", "sourceEntityId"))
  });
  const brandVoiceRow = await getBrandVoiceProfileRow({
    repos: input.repos,
    workspaceId: input.workspaceId,
    brandVoiceProfileId: text(value(launchPlan, "brand_voice_profile_id", "brandVoiceProfileId"))
  });
  const readinessRow = text(value(launchPlan, "readiness_id", "readinessId"))
    ? await input.repos.marketing.readiness.getById(text(value(launchPlan, "readiness_id", "readinessId")), input.workspaceId)
    : null;
  const filterByLaunch = (rows: WorkspaceRow[]) => rows.filter((row) => value(row, "launch_plan_id", "launchPlanId") === input.launchPlanId).map((row) => safeRow(row) as Record<string, unknown>);
  const organicContentDrafts = filterByLaunch(await input.repos.marketing.organicContentDrafts.listByWorkspace(input.workspaceId));
  const lifecycleCampaignFlows = filterByLaunch(await input.repos.marketing.lifecycleCampaignFlows.listByWorkspace(input.workspaceId));
  const positioningStatements = filterByLaunch(await input.repos.marketing.positioningStatements.listByWorkspace(input.workspaceId));
  const offerHypotheses = filterByLaunch(await input.repos.marketing.offerHypotheses.listByWorkspace(input.workspaceId));
  const audienceHypotheses = filterByLaunch(await input.repos.marketing.audienceHypotheses.listByWorkspace(input.workspaceId));
  const adAngles = filterByLaunch(await input.repos.marketing.adAngles.listByWorkspace(input.workspaceId));
  const adCopyVariants = filterByLaunch(await input.repos.marketing.adCopyVariants.listByWorkspace(input.workspaceId));
  const creativeBriefs = filterByLaunch(await input.repos.marketing.creativeBriefs.listByWorkspace(input.workspaceId));
  const landingPageRecommendations = filterByLaunch(await input.repos.marketing.landingPageRecommendations.listByWorkspace(input.workspaceId));
  const channelRecommendations = filterByLaunch(await input.repos.marketing.channelRecommendations.listByWorkspace(input.workspaceId));
  const budgetRecommendations = filterByLaunch(await input.repos.marketing.budgetRecommendations.listByWorkspace(input.workspaceId));
  const mediaPlanDrafts = filterByLaunch(await input.repos.marketing.mediaPlanDrafts.listByWorkspace(input.workspaceId));
  const campaignDrafts = filterByLaunch(await input.repos.marketing.campaignDrafts.listByWorkspace(input.workspaceId));
  const approvalRequests = filterByLaunch(await input.repos.marketing.approvalRequests.listByWorkspace(input.workspaceId));
  const policyTargetIds = new Set([
    ...organicContentDrafts.map((entry) => String(entry.id)),
    ...positioningStatements.map((entry) => String(entry.id)),
    ...offerHypotheses.map((entry) => String(entry.id)),
    ...audienceHypotheses.map((entry) => String(entry.id)),
    ...adAngles.map((entry) => String(entry.id)),
    ...adCopyVariants.map((entry) => String(entry.id)),
    ...creativeBriefs.map((entry) => String(entry.id)),
    ...landingPageRecommendations.map((entry) => String(entry.id)),
    ...campaignDrafts.map((entry) => String(entry.id))
  ]);
  const policyReviewResults = (await input.repos.marketing.policyReviewResults.listByWorkspace(input.workspaceId))
    .filter((row) => policyTargetIds.has(text(value(row, "target_id", "targetId"))))
    .map((row) => safeRow(row) as Record<string, unknown>);
  return {
    launchPlan: safeLaunchPlan(launchPlan),
    sourceEntity,
    brandVoiceProfile: brandVoiceRow ? safeRow(brandVoiceRow) as Record<string, unknown> : null,
    readiness: readinessRow ? safeRow(readinessRow) as Record<string, unknown> : null,
    organicContentDrafts,
    lifecycleCampaignFlows,
    positioningStatements,
    offerHypotheses,
    audienceHypotheses,
    adAngles,
    adCopyVariants,
    creativeBriefs,
    landingPageRecommendations,
    channelRecommendations,
    budgetRecommendations,
    mediaPlanDrafts,
    campaignDrafts,
    approvalRequests,
    policyReviewResults
  } satisfies MarketingLaunchPlanDetail;
}

export async function listMarketingApprovalQueue(input: {
  repos: RepositoryBundle;
  workspaceId: string;
}) {
  return (await input.repos.marketing.listApprovalRequestsByStatus(input.workspaceId, "pending"))
    .sort((left, right) => text(value(left, "requested_action", "requestedAction")).localeCompare(text(value(right, "requested_action", "requestedAction"))))
    .map((row) => safeRow(row) as Record<string, unknown>);
}

export async function decideMarketingApprovalRequest(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  approvalRequestId: string;
  ownerDecision: string;
  reviewer?: string | undefined;
  notes?: string | undefined;
  actorId?: string | undefined;
}) {
  const ownerDecision = parseMarketingApprovalDecision(input.ownerDecision);
  if (!ownerDecision) throw new Error(MARKETING_INVALID_APPROVAL_DECISION);
  const current = await input.repos.marketing.approvalRequests.getById(input.approvalRequestId, input.workspaceId);
  if (!current) return null;
  await updateTargetReviewState({
    repos: input.repos,
    workspaceId: input.workspaceId,
    targetType: text(value(current, "target_type", "targetType")),
    targetId: text(value(current, "target_id", "targetId")),
    decision: ownerDecision,
    actorId: input.actorId
  });
  const updated = await input.repos.marketing.approvalRequests.update(input.approvalRequestId, asWorkspacePatch({
    owner_decision: ownerDecision,
    reviewer: input.reviewer ?? null,
    decided_at: now(),
    notes: input.notes ? compactText(input.notes, 280) : null,
    updated_by: input.actorId ?? null
  }));
  return safeRow(updated);
}

export async function getCampaignBuildSheet(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  campaignDraftId: string;
}) {
  const campaignDraft = await input.repos.marketing.campaignDrafts.getById(input.campaignDraftId, input.workspaceId);
  if (!campaignDraft) return null;
  const launchPlanId = text(value(campaignDraft, "launch_plan_id", "launchPlanId"));
  const detail = await getMarketingLaunchPlanDetail({
    repos: input.repos,
    workspaceId: input.workspaceId,
    launchPlanId
  });
  if (!detail) return null;
  return {
    campaignDraft: safeRow(campaignDraft),
    launchPlan: detail.launchPlan,
    adCopyVariants: detail.adCopyVariants,
    creativeBriefs: detail.creativeBriefs,
    mediaPlanDrafts: detail.mediaPlanDrafts,
    budgetRecommendations: detail.budgetRecommendations,
    policyReviewResults: detail.policyReviewResults
  };
}

export function marketingLaunchTaskOptions(taskInput: Record<string, unknown> | undefined) {
  return {
    launchPlanId: text(taskInput?.launchPlanId ?? taskInput?.launch_plan_id),
    sourceEntityType: text(taskInput?.sourceEntityType ?? taskInput?.source_entity_type),
    sourceEntityId: text(taskInput?.sourceEntityId ?? taskInput?.source_entity_id),
    brandVoiceProfileId: text(taskInput?.brandVoiceProfileId ?? taskInput?.brand_voice_profile_id)
  };
}

export function toSafeMarketingLaunchError(error: unknown) {
  return sanitizeProviderError(error);
}
