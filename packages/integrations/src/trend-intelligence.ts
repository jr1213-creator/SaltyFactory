import { Buffer } from "node:buffer";
import type { RuntimeConfig } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { assertNoRawCredential, sanitizeProviderError } from "@saltyfactory/security";
import { getUsableGoogleConnectionBundle, type GoogleFetch } from "./google";

export const SOURCE_NOT_CONFIGURED = "source_not_configured";
export const SOURCE_AUTH_MISSING = "source_auth_missing";
export const SOURCE_ACCESS_DENIED = "source_access_denied";
export const SOURCE_RATE_LIMITED = "source_rate_limited";
export const SOURCE_UNAVAILABLE = "source_unavailable";
export const SOURCE_TERMS_RESTRICTED = "source_terms_restricted";
export const SOURCE_DATA_EMPTY = "source_data_empty";
export const SOURCE_INVALID_RESPONSE = "source_invalid_response";
export const SOURCE_QUOTA_EXCEEDED = "source_quota_exceeded";
export const SOURCE_RESTRICTED_DO_NOT_AUTOMATE = "source_restricted_do_not_automate";
export const TREND_PROFILE_MISSING = "trend_profile_missing";
export const TREND_SOURCE_DISABLED = "trend_source_disabled";
export const TREND_SOURCE_NOT_ALLOWED_FOR_PROFILE = "trend_source_not_allowed_for_profile";
export const TREND_SOURCE_CREDENTIAL_NOT_SERVER_SIDE = "trend_source_credential_not_server_side";
export const TREND_SOURCE_TOKEN_ECHO_DETECTED = "trend_source_token_echo_detected";
export const TREND_SOURCE_UNSAFE_AUTOMATION_REQUESTED = "trend_source_unsafe_automation_requested";
export const SOURCE_APPROVAL_REQUIRED = "source_approval_required";

export const ETSY_INVALID_KEYWORD = "etsy_invalid_keyword";
export const ETSY_QUERY_FAILED = "etsy_query_failed";
export const EBAY_AUTH_MISSING = "ebay_auth_missing";
export const EBAY_QUERY_FAILED = "ebay_query_failed";
export const EBAY_BROWSE_RATE_LIMITED = "ebay_browse_rate_limited";
export const SHOPIFY_CONNECTION_MISSING = "shopify_connection_missing";
export const SHOPIFY_INTERNAL_QUERY_FAILED = "shopify_internal_query_failed";
export const GSC_AUTH_MISSING = "gsc_auth_missing";
export const GSC_PROPERTY_MISSING = "gsc_property_missing";
export const GSC_QUERY_FAILED = "gsc_query_failed";
export const GA4_AUTH_MISSING = "ga4_auth_missing";
export const GA4_PROPERTY_MISSING = "ga4_property_missing";
export const GA4_QUERY_FAILED = "ga4_query_failed";
export const PINTEREST_AUTH_MISSING = "pinterest_auth_missing";
export const PINTEREST_SCOPE_MISSING = "pinterest_scope_missing";
export const PINTEREST_TRENDS_UNAVAILABLE = "pinterest_trends_unavailable";
export const PINTEREST_QUERY_FAILED = "pinterest_query_failed";
export const GOOGLE_TRENDS_ALPHA_NOT_AVAILABLE = "google_trends_alpha_not_available";
export const GOOGLE_TRENDS_AUTH_MISSING = "google_trends_auth_missing";
export const GOOGLE_TRENDS_QUERY_FAILED = "google_trends_query_failed";
export const META_AD_LIBRARY_AUTH_MISSING = "meta_ad_library_auth_missing";
export const META_AD_LIBRARY_LIMITED_COVERAGE = "meta_ad_library_limited_coverage";
export const META_AD_LIBRARY_QUERY_FAILED = "meta_ad_library_query_failed";
export const REDDIT_COMMERCIAL_ACCESS_MISSING = "reddit_commercial_access_missing";
export const REDDIT_QUERY_FAILED = "reddit_query_failed";
export const TIKTOK_APPROVED_ACCESS_MISSING = "tiktok_approved_access_missing";
export const TIKTOK_QUERY_FAILED = "tiktok_query_failed";
export const LICENSED_PROVIDER_KEY_MISSING = "licensed_provider_key_missing";
export const LICENSED_PROVIDER_NOT_APPROVED = "licensed_provider_not_approved";
export const LICENSED_PROVIDER_QUERY_FAILED = "licensed_provider_query_failed";

export type TrendSourceKey =
  | "etsy_v3"
  | "ebay_browse"
  | "shopify_internal"
  | "google_search_console"
  | "google_analytics"
  | "pinterest_trends"
  | "google_trends_alpha"
  | "meta_ad_library"
  | "reddit_api"
  | "tiktok_business_discovery"
  | "licensed_google_serp_provider";

export type TrendSourceAccessMode = "official_api" | "owned_first_party" | "licensed_provider" | "manual_observation" | "restricted_do_not_automate";
export type TrendSignalRunStatus = "queued" | "running" | "success" | "partial" | "failed" | "blocked";
export type TrendSignalStatus = "active" | "rejected" | "archived" | "risky";
export type TrendSignalType =
  | "etsy_listing"
  | "ebay_listing"
  | "shopify_product_performance"
  | "shopify_search_query"
  | "gsc_query"
  | "ga4_event"
  | "pinterest_trend_keyword"
  | "google_trends_keyword"
  | "meta_ad_signal"
  | "reddit_post"
  | "reddit_comment"
  | "tiktok_commercial_signal"
  | "licensed_provider_keyword"
  | "keyword"
  | "marketplace_product"
  | "first_party_search"
  | "other";

type TrendSourceDefinition = {
  sourceKey: TrendSourceKey;
  displayName: string;
  accessMode: TrendSourceAccessMode;
  capabilities: string[];
  riskLevel: "low" | "medium" | "high";
  commercialUseAllowed: boolean;
  requiresCredential: boolean;
  requiresApproval: boolean;
  allowedUseNotes?: string;
  sourcePolicyUrl?: string;
};

type TrendSourceState = TrendSourceDefinition & {
  authStatus: "connected" | "configured" | "missing_credentials" | "not_configured" | "access_limited";
  approvalStatus: "approved" | "not_required" | "pending";
  isEnabled: boolean;
  isTrusted: boolean;
};

type TrendWatchProfile = WorkspaceRow & {
  niche_name?: string;
  target_customer?: string;
  keywords?: string[];
  seed_phrases?: string[];
  hashtags?: string[];
  excluded_terms?: string[];
  visual_motifs?: string[];
  brand_palette?: string[];
  product_categories?: string[];
  product_types?: string[];
  allowed_sources?: string[];
  source_weights?: Record<string, number>;
  freshness_window_days?: number;
  min_signal_threshold?: number;
  marketplace_focus?: string[];
};

type AdapterFetchOptions = {
  keywords?: string[] | undefined;
  maxKeywords?: number | undefined;
  maxResultsPerKeyword?: number | undefined;
  windowStart?: string | undefined;
  windowEnd?: string | undefined;
  dryRun?: boolean | undefined;
};

type TrendSourceAdapterContext = {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  config: RuntimeConfig;
  source: WorkspaceRow;
  run: WorkspaceRow;
  fetcher: GoogleFetch;
};

type NormalizedSignal = {
  signalType: TrendSignalType;
  status: TrendSignalStatus;
  keyword: string;
  relatedTerms: string[];
  category: string;
  region: string;
  season?: string | null;
  confidence: number;
  allowedUse: "data_reference";
  sourceUrl?: string | null;
  externalIdentifier?: string | null;
  rawValue: Record<string, unknown>;
  normalizedKeyword?: string | null;
  normalizedTitle?: string | null;
  normalizedTags: string[];
  normalizedMotifTags: string[];
  metricValue?: number | null;
  metricType?: string | null;
  priceValue?: number | null;
  priceCurrency?: string | null;
  observedAt?: string;
  citationUrl?: string | null;
  riskFlags: string[];
  notes?: string | null;
  citationSnapshot?: Record<string, unknown> | null;
};

type AdapterFetchResult = {
  rawItems: Record<string, unknown>[];
  warnings?: string[];
};

type AdapterReport = {
  sourceKey: TrendSourceKey;
  status: TrendSignalRunStatus;
  runId?: string | undefined;
  normalizedSignalCount: number;
  citationCount: number;
  failureCode?: string | undefined;
  message?: string | undefined;
  warnings?: string[] | undefined;
};

type TrendSourceAdapter = {
  sourceKey: TrendSourceKey;
  capabilities: string[];
  fetchSignals(profile: TrendWatchProfile, options: AdapterFetchOptions, context: TrendSourceAdapterContext): Promise<AdapterFetchResult>;
  normalize(rawItems: Record<string, unknown>[], profile: TrendWatchProfile, options: AdapterFetchOptions, context: TrendSourceAdapterContext): Promise<NormalizedSignal[]>;
  persist(run: WorkspaceRow, normalizedSignals: NormalizedSignal[], profile: TrendWatchProfile, context: TrendSourceAdapterContext): Promise<{ normalizedSignalCount: number; citationCount: number }>;
  classifyFailure(error: unknown): string;
  sanitizeForReport(result: AdapterReport): AdapterReport;
};

class TrendSourceRuntimeError extends Error {
  constructor(
    public readonly failureCode: string,
    message: string,
    public readonly runStatus: Exclude<TrendSignalRunStatus, "queued" | "running" | "success"> = "failed"
  ) {
    super(message);
  }
}

const TREND_SOURCE_DEFINITIONS: TrendSourceDefinition[] = [
  {
    sourceKey: "etsy_v3",
    displayName: "Etsy Open API v3",
    accessMode: "official_api",
    capabilities: ["marketplaceSignals", "keywords", "listingImages", "prices", "taxonomy", "tags"],
    riskLevel: "low",
    commercialUseAllowed: true,
    requiresCredential: true,
    requiresApproval: false,
    allowedUseNotes: "Official Etsy Open API only.",
    sourcePolicyUrl: "https://developer.etsy.com/documentation/"
  },
  {
    sourceKey: "ebay_browse",
    displayName: "eBay Browse API",
    accessMode: "official_api",
    capabilities: ["marketplaceSignals", "keywords", "listingImages", "prices", "taxonomy"],
    riskLevel: "low",
    commercialUseAllowed: true,
    requiresCredential: true,
    requiresApproval: false,
    allowedUseNotes: "Official eBay Browse API only.",
    sourcePolicyUrl: "https://developer.ebay.com/api-docs/buy/browse/overview.html"
  },
  {
    sourceKey: "shopify_internal",
    displayName: "Shopify Internal Store Data",
    accessMode: "owned_first_party",
    capabilities: ["firstPartyBuyerIntent", "productPerformance", "searchQueries", "salesVelocity", "pricing"],
    riskLevel: "low",
    commercialUseAllowed: true,
    requiresCredential: true,
    requiresApproval: false,
    allowedUseNotes: "Owned first-party Shopify data only."
  },
  {
    sourceKey: "google_search_console",
    displayName: "Google Search Console",
    accessMode: "owned_first_party",
    capabilities: ["firstPartySearchQueries", "impressions", "clicks", "ctr", "averagePosition", "geo"],
    riskLevel: "low",
    commercialUseAllowed: true,
    requiresCredential: true,
    requiresApproval: false,
    allowedUseNotes: "Owned first-party Search Console property only."
  },
  {
    sourceKey: "google_analytics",
    displayName: "Google Analytics 4",
    accessMode: "owned_first_party",
    capabilities: ["events", "siteSearch", "productViews", "conversions", "revenueSignals", "geo"],
    riskLevel: "low",
    commercialUseAllowed: true,
    requiresCredential: true,
    requiresApproval: false,
    allowedUseNotes: "Owned first-party GA4 property only."
  },
  {
    sourceKey: "pinterest_trends",
    displayName: "Pinterest Trends / Official API",
    accessMode: "official_api",
    capabilities: ["visualTrendKeywords", "growth", "demographics"],
    riskLevel: "medium",
    commercialUseAllowed: false,
    requiresCredential: true,
    requiresApproval: true,
    allowedUseNotes: "Official Pinterest Trends or Insights only. No scraping.",
    sourcePolicyUrl: "https://developers.pinterest.com/"
  },
  {
    sourceKey: "google_trends_alpha",
    displayName: "Google Trends API Alpha",
    accessMode: "official_api",
    capabilities: ["searchInterest", "risingQueries", "geo"],
    riskLevel: "low",
    commercialUseAllowed: false,
    requiresCredential: true,
    requiresApproval: true,
    allowedUseNotes: "Official Google Trends alpha only. No pytrends.",
    sourcePolicyUrl: "https://developers.google.com/"
  },
  {
    sourceKey: "meta_ad_library",
    displayName: "Meta Ad Library API",
    accessMode: "official_api",
    capabilities: ["adCopy", "adCreativeMetadata", "advertiserSignals"],
    riskLevel: "medium",
    commercialUseAllowed: false,
    requiresCredential: true,
    requiresApproval: true,
    allowedUseNotes: "Official Ad Library only; coverage may be limited.",
    sourcePolicyUrl: "https://developers.facebook.com/"
  },
  {
    sourceKey: "reddit_api",
    displayName: "Reddit API",
    accessMode: "official_api",
    capabilities: ["posts", "comments", "sentimentLanguage", "engagement"],
    riskLevel: "medium",
    commercialUseAllowed: false,
    requiresCredential: true,
    requiresApproval: true,
    allowedUseNotes: "Official Reddit API only. Commercial access must be approved.",
    sourcePolicyUrl: "https://www.reddit.com/dev/api/"
  },
  {
    sourceKey: "tiktok_business_discovery",
    displayName: "TikTok Approved Business/Commercial Discovery API",
    accessMode: "official_api",
    capabilities: ["commercialContentSignals", "hashtagSignals", "creativeSignals"],
    riskLevel: "high",
    commercialUseAllowed: false,
    requiresCredential: true,
    requiresApproval: true,
    allowedUseNotes: "Approved TikTok API only. No Creative Center scraping.",
    sourcePolicyUrl: "https://developers.tiktok.com/"
  },
  {
    sourceKey: "licensed_google_serp_provider",
    displayName: "Licensed Google/SERP Trend Provider",
    accessMode: "licensed_provider",
    capabilities: ["keywordTrends", "searchVolume", "serpSignals"],
    riskLevel: "medium",
    commercialUseAllowed: false,
    requiresCredential: true,
    requiresApproval: true,
    allowedUseNotes: "Licensed provider only with explicit paid approval."
  }
];

const definitionByKey = Object.fromEntries(TREND_SOURCE_DEFINITIONS.map((definition) => [definition.sourceKey, definition])) as Record<TrendSourceKey, TrendSourceDefinition>;

const MANUAL_TREND_SOURCE_BLOCK_MESSAGE = "Manual trend-source URL ingestion is disabled. Use official, owned, or licensed source adapters through Trend Intelligence.";

const DEFAULT_REGION = "US";
const SALTY_COWHIDE_PROFILE = {
  nicheName: "Salty Cowhide Co.",
  targetCustomer: "Coastal cowgirl / boutique western coastal buyer / bachelorette and personalized accessory buyer",
  productCategories: ["apparel", "keychains", "ornaments", "car_charms", "accessories"],
  keywords: [
    "coastal cowgirl",
    "cowgirl car charm",
    "western bachelorette",
    "beach cowgirl",
    "cowboy boot keychain",
    "cowgirl ornament",
    "disco cowgirl",
    "yeehaw beach",
    "western keychain",
    "coastal ornament",
    "custom cowgirl keychain",
    "beach rodeo",
    "sea ya cowboy",
    "salty cowhide",
    "coastal cowgirl keychain",
    "cowgirl suncatcher",
    "cowgirl ornament charm",
    "rodeo car charm",
    "beach bachelorette favors"
  ],
  seedPhrases: [
    "coastal cowgirl social club",
    "last toast on the coast",
    "boots bikinis beach vibes",
    "cowgirls need vitamin sea",
    "salty rodeo",
    "yee claw",
    "custom beach cowgirl ornament",
    "coastal cowgirl car charm",
    "western beach keychain"
  ],
  excludedTerms: ["Disney", "Barbie", "Yellowstone", "Taylor Swift", "NFL", "MLB", "NCAA", "Nike", "Stetson", "Stanley", "Buc-ee's"],
  visualMotifs: ["cowhide", "cowboy boots", "cowboy hats", "seashells", "starfish", "turquoise stars", "disco balls", "bows", "lobster", "beach sunset", "scallop shell", "suncatcher", "acrylic charm", "keychain", "car charm", "ornament", "hologram", "pearl", "straw hat", "coastal club"],
  brandPalette: ["sand", "cream", "coral", "turquoise", "seafoam", "butter yellow", "faded black", "pepper grey", "blush pink", "sky blue"],
  allowedSources: ["etsy_v3", "ebay_browse", "shopify_internal", "google_search_console", "google_analytics", "pinterest_trends", "google_trends_alpha", "meta_ad_library", "licensed_google_serp_provider"] satisfies TrendSourceKey[],
  sourceWeights: {
    etsy_v3: 1.4,
    ebay_browse: 0.8,
    shopify_internal: 2,
    google_search_console: 1.6,
    google_analytics: 1.5,
    pinterest_trends: 1.5,
    google_trends_alpha: 1.3,
    meta_ad_library: 0.6,
    licensed_google_serp_provider: 1.2
  },
  productTypes: ["keychain", "ornament", "car charm", "apparel", "accessory", "suncatcher"],
  marketplaceFocus: ["etsy", "ebay", "shopify"],
  freshnessWindowDays: 30,
  minSignalThreshold: 1
};

const unsafeKeyPattern = /proxy|captcha|stealth|browser|playwright|puppeteer|cookie|session|selenium|webdriver|avoid.?detection|delay/i;
const compactLimit = 240;

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compactText(value: unknown, maxLength = compactLimit) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function normalizeKeyword(value: string) {
  return compactText(value.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").replace(/\s+/g, " "), 120);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => compactText(value, 120)).filter(Boolean))];
}

function profileKeywords(profile: TrendWatchProfile, options?: AdapterFetchOptions) {
  const configured = options?.keywords?.length ? options.keywords : [
    ...asStringArray(profile.keywords),
    ...asStringArray(profile.seed_phrases ?? profile.seedPhrases)
  ];
  const maxKeywords = Math.max(1, Math.min(Number(options?.maxKeywords ?? 8), 20));
  return uniqueStrings(configured).slice(0, maxKeywords);
}

function profileExcludedTerms(profile: TrendWatchProfile) {
  return uniqueStrings(asStringArray(profile.excluded_terms ?? profile.excludedTerms)).map((term) => term.toLowerCase());
}

function profileVisualMotifs(profile: TrendWatchProfile) {
  return uniqueStrings(asStringArray(profile.visual_motifs ?? profile.visualMotifs)).map((term) => term.toLowerCase());
}

function allowedSourcesForProfile(profile: TrendWatchProfile) {
  return new Set(asStringArray(profile.allowed_sources ?? profile.allowedSources));
}

function keywordMatchesProfile(text: string, profile: TrendWatchProfile, options?: AdapterFetchOptions) {
  const haystack = normalizeKeyword(text);
  if (!haystack) return false;
  return profileKeywords(profile, options).some((keyword) => haystack.includes(normalizeKeyword(keyword)));
}

function matchExcludedTerms(profile: TrendWatchProfile, values: string[]) {
  const haystack = values.map((value) => normalizeKeyword(value)).join(" ");
  return profileExcludedTerms(profile)
    .filter((term) => haystack.includes(normalizeKeyword(term)))
    .map((term) => `excluded_term:${term}`);
}

function matchMotifs(profile: TrendWatchProfile, values: string[]) {
  const haystack = values.map((value) => normalizeKeyword(value)).join(" ");
  return profileVisualMotifs(profile).filter((motif) => haystack.includes(normalizeKeyword(motif)));
}

function safeSnapshot(value: unknown): Record<string, unknown> {
  const walk = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.slice(0, 12).map(walk);
    if (!input || typeof input !== "object") {
      if (typeof input === "string") {
        const sanitized = compactText(input, compactLimit);
        return /(token|secret|authorization|cookie|password)/i.test(sanitized) ? "[redacted]" : sanitized;
      }
      return input ?? null;
    }
    const output: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
      if (unsafeKeyPattern.test(key)) {
        output[key] = "[redacted]";
        continue;
      }
      output[key] = walk(raw);
    }
    return output;
  };
  return walk(value) as Record<string, unknown>;
}

function sourceKeyOf(row: WorkspaceRow | null | undefined) {
  return String(row?.source_key ?? row?.sourceKey ?? row?.type ?? "");
}

function detail<T>(row: WorkspaceRow | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function runStatusForFailure(code: string): Exclude<TrendSignalRunStatus, "queued" | "running" | "success"> {
  if ([
    SOURCE_NOT_CONFIGURED,
    SOURCE_AUTH_MISSING,
    SOURCE_ACCESS_DENIED,
    SOURCE_TERMS_RESTRICTED,
    SOURCE_RESTRICTED_DO_NOT_AUTOMATE,
    TREND_PROFILE_MISSING,
    TREND_SOURCE_DISABLED,
    TREND_SOURCE_NOT_ALLOWED_FOR_PROFILE,
    TREND_SOURCE_CREDENTIAL_NOT_SERVER_SIDE,
    TREND_SOURCE_UNSAFE_AUTOMATION_REQUESTED,
    SOURCE_APPROVAL_REQUIRED,
    EBAY_AUTH_MISSING,
    SHOPIFY_CONNECTION_MISSING,
    GSC_AUTH_MISSING,
    GSC_PROPERTY_MISSING,
    GA4_AUTH_MISSING,
    GA4_PROPERTY_MISSING,
    PINTEREST_AUTH_MISSING,
    PINTEREST_SCOPE_MISSING,
    PINTEREST_TRENDS_UNAVAILABLE,
    GOOGLE_TRENDS_ALPHA_NOT_AVAILABLE,
    GOOGLE_TRENDS_AUTH_MISSING,
    META_AD_LIBRARY_AUTH_MISSING,
    REDDIT_COMMERCIAL_ACCESS_MISSING,
    TIKTOK_APPROVED_ACCESS_MISSING,
    LICENSED_PROVIDER_KEY_MISSING,
    LICENSED_PROVIDER_NOT_APPROVED
  ].includes(code)) {
    return "blocked";
  }
  if (code === SOURCE_DATA_EMPTY) return "partial";
  return "failed";
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new TrendSourceRuntimeError(SOURCE_INVALID_RESPONSE, "Source returned a non-JSON response.");
  }
}

async function fetchJson(input: {
  fetcher: GoogleFetch;
  url: string;
  init?: RequestInit;
  failureCode: string;
  authFailureCode?: string;
  rateLimitCode?: string;
  unavailableCode?: string;
}) {
  const response = await input.fetcher(input.url, input.init);
  const json = await readJson(response);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new TrendSourceRuntimeError(input.authFailureCode ?? input.failureCode, sanitizeProviderError(json), "blocked");
    }
    if (response.status === 404 && input.unavailableCode) {
      throw new TrendSourceRuntimeError(input.unavailableCode, sanitizeProviderError(json), "blocked");
    }
    if (response.status === 429) {
      throw new TrendSourceRuntimeError(input.rateLimitCode ?? SOURCE_RATE_LIMITED, sanitizeProviderError(json), "failed");
    }
    if (response.status === 503) {
      throw new TrendSourceRuntimeError(SOURCE_UNAVAILABLE, sanitizeProviderError(json), "failed");
    }
    throw new TrendSourceRuntimeError(input.failureCode, sanitizeProviderError(json), "failed");
  }
  return json;
}

function rejectUnsafeAutomation(input: unknown) {
  const walk = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some((item) => walk(item));
    return Object.entries(value as Record<string, unknown>).some(([key, nested]) => unsafeKeyPattern.test(key) || walk(nested));
  };
  if (walk(input)) {
    throw new TrendSourceRuntimeError(
      TREND_SOURCE_UNSAFE_AUTOMATION_REQUESTED,
      "Unsafe automation fields were requested for trend-source ingestion.",
      "blocked"
    );
  }
}

async function connectionFor(repos: RepositoryBundle, workspaceId: string, providerKey: string) {
  return repos.integration.getProviderConnectionForWorkspace(workspaceId, providerKey);
}

async function stateForSource(input: { sourceKey: TrendSourceKey; repos: RepositoryBundle; workspaceId: string; config: RuntimeConfig }): Promise<TrendSourceState> {
  const definition = definitionByKey[input.sourceKey];
  const approved = (value: boolean) => value ? ("approved" as const) : ("pending" as const);
  switch (input.sourceKey) {
    case "etsy_v3": {
      const hasKey = Boolean(input.config.ETSY_API_KEY || input.config.ETSY_CLIENT_ID);
      return {
        ...definition,
        authStatus: hasKey ? "configured" : "missing_credentials",
        approvalStatus: "not_required" as const,
        commercialUseAllowed: true,
        isEnabled: hasKey,
        isTrusted: true
      };
    }
    case "ebay_browse": {
      const hasCredentials = Boolean(input.config.EBAY_CLIENT_ID && input.config.EBAY_CLIENT_SECRET);
      return {
        ...definition,
        authStatus: hasCredentials ? "configured" : "missing_credentials",
        approvalStatus: "not_required" as const,
        commercialUseAllowed: true,
        isEnabled: hasCredentials,
        isTrusted: true
      };
    }
    case "shopify_internal": {
      const connection = await connectionFor(input.repos, input.workspaceId, "shopify");
      const enabled = Boolean(connection || input.config.providers.shopifyAdmin.enabled);
      return {
        ...definition,
        authStatus: enabled ? "connected" : "missing_credentials",
        approvalStatus: "not_required" as const,
        commercialUseAllowed: true,
        isEnabled: enabled,
        isTrusted: true
      };
    }
    case "google_search_console": {
      const bundle = await getUsableGoogleConnectionBundle({ repos: input.repos, workspaceId: input.workspaceId, actorId: "system", config: input.config });
      const siteUrl = bundle.ok ? bundle.workspaceConfig.searchConsoleSiteUrl : "";
      return {
        ...definition,
        authStatus: bundle.ok ? "connected" : bundle.status === "auth_required" ? "missing_credentials" : "not_configured",
        approvalStatus: "not_required" as const,
        commercialUseAllowed: true,
        isEnabled: bundle.ok && Boolean(siteUrl),
        isTrusted: true
      };
    }
    case "google_analytics": {
      const bundle = await getUsableGoogleConnectionBundle({ repos: input.repos, workspaceId: input.workspaceId, actorId: "system", config: input.config });
      const propertyId = bundle.ok ? bundle.workspaceConfig.ga4PropertyId : "";
      return {
        ...definition,
        authStatus: bundle.ok ? "connected" : bundle.status === "auth_required" ? "missing_credentials" : "not_configured",
        approvalStatus: "not_required" as const,
        commercialUseAllowed: true,
        isEnabled: bundle.ok && Boolean(propertyId),
        isTrusted: true
      };
    }
    case "pinterest_trends": {
      const hasCredential = Boolean(input.config.PINTEREST_ACCESS_TOKEN);
      const isApproved = input.config.PINTEREST_TRENDS_APPROVED;
      return {
        ...definition,
        authStatus: hasCredential ? "configured" : "missing_credentials",
        approvalStatus: isApproved ? "approved" : "pending",
        commercialUseAllowed: hasCredential && isApproved,
        isEnabled: input.config.PINTEREST_TRENDS_ENABLED && hasCredential && isApproved,
        isTrusted: true
      };
    }
    case "google_trends_alpha": {
      const hasCredential = Boolean(input.config.GOOGLE_TRENDS_ALPHA_API_KEY || input.config.GOOGLE_TRENDS_ALPHA_ACCESS_TOKEN);
      const isApproved = input.config.GOOGLE_TRENDS_ALPHA_APPROVED;
      return {
        ...definition,
        authStatus: hasCredential ? "configured" : "missing_credentials",
        approvalStatus: isApproved ? "approved" : "pending",
        commercialUseAllowed: hasCredential && isApproved,
        isEnabled: input.config.GOOGLE_TRENDS_ALPHA_ENABLED && hasCredential && isApproved,
        isTrusted: true
      };
    }
    case "meta_ad_library": {
      const hasCredential = Boolean(input.config.META_AD_LIBRARY_ACCESS_TOKEN);
      const isApproved = input.config.META_AD_LIBRARY_APPROVED;
      return {
        ...definition,
        authStatus: hasCredential ? "configured" : "missing_credentials",
        approvalStatus: approved(isApproved),
        commercialUseAllowed: hasCredential && isApproved,
        isEnabled: input.config.META_AD_LIBRARY_ENABLED && hasCredential && isApproved,
        isTrusted: true
      };
    }
    case "reddit_api": {
      const hasCredential = Boolean(input.config.REDDIT_ACCESS_TOKEN || (input.config.REDDIT_CLIENT_ID && input.config.REDDIT_CLIENT_SECRET && input.config.REDDIT_USER_AGENT));
      const isApproved = input.config.REDDIT_COMMERCIAL_APPROVED;
      return {
        ...definition,
        authStatus: hasCredential ? "configured" : "missing_credentials",
        approvalStatus: approved(isApproved),
        commercialUseAllowed: hasCredential && isApproved,
        isEnabled: input.config.REDDIT_API_ENABLED && hasCredential && isApproved,
        isTrusted: true
      };
    }
    case "tiktok_business_discovery": {
      const hasCredential = Boolean(input.config.TIKTOK_ACCESS_TOKEN);
      const isApproved = input.config.TIKTOK_APPROVED_ACCESS;
      return {
        ...definition,
        authStatus: hasCredential ? "configured" : "missing_credentials",
        approvalStatus: approved(isApproved),
        commercialUseAllowed: hasCredential && isApproved,
        isEnabled: input.config.TIKTOK_COMMERCIAL_API_ENABLED && hasCredential && isApproved,
        isTrusted: true
      };
    }
    case "licensed_google_serp_provider": {
      const hasCredential = Boolean(input.config.LICENSED_TREND_PROVIDER_API_KEY);
      const isApproved = input.config.LICENSED_TREND_PROVIDER_APPROVED;
      return {
        ...definition,
        authStatus: hasCredential ? "configured" : "missing_credentials",
        approvalStatus: approved(isApproved),
        commercialUseAllowed: hasCredential && isApproved,
        isEnabled: input.config.LICENSED_TREND_PROVIDER_ENABLED && hasCredential && isApproved,
        isTrusted: true
      };
    }
  }
}

async function upsertTrendSourceRow(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  state: TrendSourceState;
}) {
  const existing = await input.repos.trendIntelligence.getSourceByKey(input.workspaceId, input.state.sourceKey);
  const row: WorkspaceRow = {
    id: existing?.id ?? `tsrc_${input.state.sourceKey}`,
    workspace_id: input.workspaceId,
    source_key: input.state.sourceKey,
    display_name: input.state.displayName,
    access_mode: input.state.accessMode,
    capabilities: input.state.capabilities,
    auth_status: input.state.authStatus,
    approval_status: input.state.approvalStatus,
    risk_level: input.state.riskLevel,
    commercial_use_allowed: input.state.commercialUseAllowed,
    requires_credential: input.state.requiresCredential,
    requires_approval: input.state.requiresApproval,
    is_enabled: input.state.isEnabled,
    is_trusted: input.state.isTrusted,
    allowed_use_notes: input.state.allowedUseNotes ?? null,
    name: input.state.displayName,
    type: input.state.sourceKey,
    allowed_use: "data_reference",
    requires_manual_import: input.state.accessMode === "manual_observation",
    status: input.state.isEnabled ? "enabled" : input.state.approvalStatus === "pending" ? "approval_required" : input.state.authStatus,
    active: input.state.isEnabled,
    source_policy_url: input.state.sourcePolicyUrl ?? null,
    notes: input.state.allowedUseNotes ?? null,
    created_by: input.actorId,
    updated_by: input.actorId
  };
  if (existing) {
    return input.repos.trendIntelligence.sources.update(existing.id, row);
  }
  return input.repos.trendIntelligence.sources.create(row);
}

export async function ensureTrendSourceRegistry(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  config: RuntimeConfig;
}) {
  const rows: WorkspaceRow[] = [];
  for (const definition of TREND_SOURCE_DEFINITIONS) {
    const state = await stateForSource({ sourceKey: definition.sourceKey, repos: input.repos, workspaceId: input.workspaceId, config: input.config });
    rows.push(await upsertTrendSourceRow({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, state }));
  }
  return rows.sort((left, right) => String(left.display_name ?? left.name).localeCompare(String(right.display_name ?? right.name)));
}

export async function ensureSaltyCowhideTrendProfile(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
}) {
  const existing = (await input.repos.trendIntelligence.profiles.listByWorkspace(input.workspaceId)).find((row) =>
    String(row.niche_name ?? row.nicheName) === SALTY_COWHIDE_PROFILE.nicheName
  );
  const row: WorkspaceRow = {
    id: existing?.id ?? "twatch_salty_cowhide",
    workspace_id: input.workspaceId,
    niche_name: SALTY_COWHIDE_PROFILE.nicheName,
    target_customer: SALTY_COWHIDE_PROFILE.targetCustomer,
    product_categories: SALTY_COWHIDE_PROFILE.productCategories,
    keywords: SALTY_COWHIDE_PROFILE.keywords,
    seed_phrases: SALTY_COWHIDE_PROFILE.seedPhrases,
    hashtags: [],
    excluded_terms: SALTY_COWHIDE_PROFILE.excludedTerms,
    visual_motifs: SALTY_COWHIDE_PROFILE.visualMotifs,
    brand_palette: SALTY_COWHIDE_PROFILE.brandPalette,
    seasonality_windows: null,
    geographic_focus: [DEFAULT_REGION],
    price_range_min: null,
    price_range_max: null,
    product_types: SALTY_COWHIDE_PROFILE.productTypes,
    allowed_sources: SALTY_COWHIDE_PROFILE.allowedSources,
    source_weights: SALTY_COWHIDE_PROFILE.sourceWeights,
    score_weights: null,
    freshness_window_days: SALTY_COWHIDE_PROFILE.freshnessWindowDays,
    min_signal_threshold: SALTY_COWHIDE_PROFILE.minSignalThreshold,
    risk_filters: [],
    watchlist_stores: null,
    marketplace_focus: SALTY_COWHIDE_PROFILE.marketplaceFocus,
    is_active: true,
    created_by: input.actorId,
    updated_by: input.actorId
  };
  return existing
    ? input.repos.trendIntelligence.profiles.update(existing.id, row)
    : input.repos.trendIntelligence.profiles.create(row);
}

function assertSourceAllowed(profile: TrendWatchProfile, source: WorkspaceRow, options: AdapterFetchOptions) {
  rejectUnsafeAutomation(options);
  const sourceKey = sourceKeyOf(source) as TrendSourceKey;
  if (!sourceKey) {
    throw new TrendSourceRuntimeError(SOURCE_NOT_CONFIGURED, "Trend source is not configured.", "blocked");
  }
  if (!allowedSourcesForProfile(profile).has(sourceKey)) {
    throw new TrendSourceRuntimeError(TREND_SOURCE_NOT_ALLOWED_FOR_PROFILE, `Trend source ${sourceKey} is not allowed for this profile.`, "blocked");
  }
  if (String(source.access_mode ?? source.accessMode) === "restricted_do_not_automate") {
    throw new TrendSourceRuntimeError(SOURCE_RESTRICTED_DO_NOT_AUTOMATE, `Trend source ${sourceKey} is restricted and cannot be automated.`, "blocked");
  }
}

function sourceStatusOf(row: WorkspaceRow) {
  return {
    authStatus: String(row.auth_status ?? row.authStatus ?? "not_configured"),
    approvalStatus: String(row.approval_status ?? row.approvalStatus ?? "not_required"),
    isEnabled: Boolean(row.is_enabled ?? row.isEnabled),
    commercialUseAllowed: Boolean(row.commercial_use_allowed ?? row.commercialUseAllowed)
  };
}

async function createRunRow(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  profileId: string;
  source: WorkspaceRow;
}) {
  return input.repos.trendIntelligence.runs.create({
    id: makeId("tsrun"),
    workspace_id: input.workspaceId,
    profile_id: input.profileId,
    source_id: String(input.source.id),
    source_key: sourceKeyOf(input.source),
    status: "queued",
    raw_signal_count: 0,
    normalized_signal_count: 0,
    citation_count: 0,
    started_at: null,
    completed_at: null,
    created_by: input.actorId,
    updated_by: input.actorId
  });
}

async function markRun(input: {
  repos: RepositoryBundle;
  runId: string;
  patch: Partial<WorkspaceRow>;
}) {
  return input.repos.trendIntelligence.runs.update(input.runId, input.patch);
}

function normalizedSignalToRow(input: {
  signal: NormalizedSignal;
  workspaceId: string;
  actorId: string;
  profileId: string;
  runId: string;
  source: WorkspaceRow;
}) {
  const observedAt = input.signal.observedAt ?? nowIso();
  return {
    id: makeId("tsig"),
    workspace_id: input.workspaceId,
    profile_id: input.profileId,
    run_id: input.runId,
    source_id: String(input.source.id),
    source_key: sourceKeyOf(input.source),
    signal_type: input.signal.signalType,
    external_identifier: input.signal.externalIdentifier ?? null,
    raw_value: safeSnapshot(input.signal.rawValue),
    normalized_keyword: input.signal.normalizedKeyword ?? null,
    normalized_title: input.signal.normalizedTitle ?? null,
    normalized_tags: input.signal.normalizedTags,
    normalized_motif_tags: input.signal.normalizedMotifTags,
    metric_value: input.signal.metricValue ?? null,
    metric_type: input.signal.metricType ?? null,
    price_value: input.signal.priceValue ?? null,
    price_currency: input.signal.priceCurrency ?? null,
    observed_at: observedAt,
    citation_url: input.signal.citationUrl ?? null,
    source_url: input.signal.sourceUrl ?? input.signal.citationUrl ?? null,
    captured_at: observedAt,
    keyword: input.signal.keyword,
    related_terms: input.signal.relatedTerms,
    category: input.signal.category,
    region: input.signal.region,
    season: input.signal.season ?? null,
    confidence: input.signal.confidence,
    allowed_use: input.signal.allowedUse,
    status: input.signal.status,
    cluster_id: null,
    risk_flags: input.signal.riskFlags,
    notes: input.signal.notes ?? null,
    created_by: input.actorId,
    updated_by: input.actorId
  } satisfies WorkspaceRow;
}

async function persistNormalizedSignals(input: {
  run: WorkspaceRow;
  normalizedSignals: NormalizedSignal[];
  profile: TrendWatchProfile;
  context: TrendSourceAdapterContext;
}) {
  const citations: WorkspaceRow[] = [];
  for (const signal of input.normalizedSignals) {
    const created = await input.context.repos.trend.create(
      normalizedSignalToRow({
        signal,
        workspaceId: input.context.workspaceId,
        actorId: input.context.actorId,
        profileId: String(input.profile.id),
        runId: String(input.run.id),
        source: input.context.source
      })
    );
    if (signal.citationUrl || signal.citationSnapshot) {
      citations.push(await input.context.repos.trendIntelligence.citations.create({
        id: makeId("tcite"),
        workspace_id: input.context.workspaceId,
        entity_type: "trend_signal",
        entity_id: created.id,
        source_id: String(input.context.source.id),
        source_key: sourceKeyOf(input.context.source),
        citation_url: signal.citationUrl ?? null,
        captured_at: signal.observedAt ?? nowIso(),
        raw_snapshot: safeSnapshot(signal.citationSnapshot ?? signal.rawValue),
        created_by: input.context.actorId,
        updated_by: input.context.actorId
      }));
    }
  }
  return {
    normalizedSignalCount: input.normalizedSignals.length,
    citationCount: citations.length
  };
}

function createDefaultPersist(sourceKey: TrendSourceKey) {
  return async (run: WorkspaceRow, normalizedSignals: NormalizedSignal[], profile: TrendWatchProfile, context: TrendSourceAdapterContext) => {
    const result = await persistNormalizedSignals({ run, normalizedSignals, profile, context });
    return result;
  };
}

function createDefaultSanitizer(sourceKey: TrendSourceKey) {
  return (result: AdapterReport) => {
    const safe = {
      ...result,
      ...(result.warnings ? { warnings: result.warnings.map((warning) => sanitizeProviderError(warning)) } : {})
    };
    const serialized = JSON.stringify(safe);
    assertNoRawCredential(serialized);
    return safe;
  };
}

function confidenceFromMetric(value: number | null, floor = 0.3) {
  if (value === null) return floor;
  return Math.max(floor, Math.min(1, value / 100));
}

function normalizePriceValue(value: unknown): { amount: number | null; currency: string | null } {
  if (!value || typeof value !== "object") {
    return { amount: asNumber(value), currency: null };
  }
  const record = value as Record<string, unknown>;
  const amount = asNumber(record.amount ?? record.value ?? record.price ?? record.amount_with_tax);
  const currency = asString(record.currency_code ?? record.currency ?? record.currencyCode);
  return { amount, currency: currency || null };
}

function maybeTitle(value: unknown) {
  const title = compactText(value, 160);
  return title || null;
}

function commonRiskAndMotifs(profile: TrendWatchProfile, values: string[]) {
  return {
    riskFlags: matchExcludedTerms(profile, values),
    motifTags: matchMotifs(profile, values)
  };
}

const etsyAdapter: TrendSourceAdapter = {
  sourceKey: "etsy_v3",
  capabilities: definitionByKey.etsy_v3.capabilities,
  async fetchSignals(profile, options, context) {
    const status = sourceStatusOf(context.source);
    const apiKey = context.config.ETSY_API_KEY || context.config.ETSY_CLIENT_ID;
    if (!apiKey) throw new TrendSourceRuntimeError(SOURCE_AUTH_MISSING, "Etsy credentials are missing.", "blocked");
    if (!status.commercialUseAllowed) throw new TrendSourceRuntimeError(SOURCE_TERMS_RESTRICTED, "Etsy commercial use is not allowed for this configuration.", "blocked");
    const keywords = profileKeywords(profile, options);
    if (!keywords.length) throw new TrendSourceRuntimeError(ETSY_INVALID_KEYWORD, "At least one Etsy keyword is required.", "blocked");
    const maxResults = Math.max(1, Math.min(Number(options.maxResultsPerKeyword ?? 8), 25));
    const rows: Record<string, unknown>[] = [];
    for (const keyword of keywords) {
      if (normalizeKeyword(keyword).length < 3) throw new TrendSourceRuntimeError(ETSY_INVALID_KEYWORD, "Etsy keywords must be at least three characters.", "blocked");
      const url = new URL("https://openapi.etsy.com/v3/application/listings/active");
      url.searchParams.set("keywords", keyword);
      url.searchParams.set("limit", String(maxResults));
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        init: { method: "GET", headers: { "x-api-key": apiKey } },
        failureCode: ETSY_QUERY_FAILED,
        authFailureCode: SOURCE_AUTH_MISSING
      });
      const results = Array.isArray(json.results) ? json.results : [];
      for (const item of results as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile, options) {
    return rawItems.map((item) => {
      const title = maybeTitle(item.title);
      const tags = uniqueStrings(asStringArray(item.tags).concat(asStringArray(item.taxonomy_path)));
      const price = normalizePriceValue(item.price);
      const keyword = asString(item.__keyword) || title || "etsy";
      const url = asString(item.url) || (asString(item.listing_id) ? `https://www.etsy.com/listing/${asString(item.listing_id)}` : "");
      const sourceTexts = [keyword, title ?? "", ...tags];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, sourceTexts);
      return {
        signalType: "etsy_listing",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: tags.slice(0, 10),
        category: "marketplace_product",
        region: DEFAULT_REGION,
        season: null,
        confidence: confidenceFromMetric(asNumber(item.num_favorers) ?? asNumber(item.views)),
        allowedUse: "data_reference",
        sourceUrl: url || null,
        externalIdentifier: asString(item.listing_id) || null,
        rawValue: {
          listingId: asString(item.listing_id) || null,
          keyword,
          title,
          price: price.amount,
          currency: price.currency,
          tags,
          shopName: asString(item.shop_name) || null,
          url: url || null
        },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: title,
        normalizedTags: tags,
        normalizedMotifTags: motifTags,
        metricValue: asNumber(item.num_favorers) ?? null,
        metricType: asNumber(item.num_favorers) !== null ? "favorites" : null,
        priceValue: price.amount,
        priceCurrency: price.currency,
        observedAt: nowIso(),
        citationUrl: url || null,
        riskFlags,
        notes: null,
        citationSnapshot: {
          listingId: asString(item.listing_id) || null,
          title,
          price: price.amount,
          currency: price.currency,
          tags,
          url: url || null
        }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("etsy_v3"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return ETSY_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("etsy_v3")
};

async function ebayApplicationToken(config: RuntimeConfig, fetcher: GoogleFetch) {
  if (!config.EBAY_CLIENT_ID || !config.EBAY_CLIENT_SECRET) {
    throw new TrendSourceRuntimeError(EBAY_AUTH_MISSING, "eBay client credentials are missing.", "blocked");
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope"
  });
  const response = await fetcher("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${config.EBAY_CLIENT_ID}:${config.EBAY_CLIENT_SECRET}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });
  const json = await readJson(response);
  if (!response.ok) {
    if (response.status === 429) throw new TrendSourceRuntimeError(EBAY_BROWSE_RATE_LIMITED, sanitizeProviderError(json), "failed");
    throw new TrendSourceRuntimeError(EBAY_AUTH_MISSING, sanitizeProviderError(json), "blocked");
  }
  const token = asString(json.access_token);
  if (!token) throw new TrendSourceRuntimeError(EBAY_AUTH_MISSING, "eBay OAuth token response was invalid.", "blocked");
  return token;
}

const ebayAdapter: TrendSourceAdapter = {
  sourceKey: "ebay_browse",
  capabilities: definitionByKey.ebay_browse.capabilities,
  async fetchSignals(profile, options, context) {
    const token = await ebayApplicationToken(context.config, context.fetcher);
    const keywords = profileKeywords(profile, options);
    if (!keywords.length) throw new TrendSourceRuntimeError(SOURCE_DATA_EMPTY, "No eBay keywords were provided.", "partial");
    const maxResults = Math.max(1, Math.min(Number(options.maxResultsPerKeyword ?? 8), 25));
    const rows: Record<string, unknown>[] = [];
    for (const keyword of keywords) {
      const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
      url.searchParams.set("q", keyword);
      url.searchParams.set("limit", String(maxResults));
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        init: {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "x-ebay-c-marketplace-id": context.config.EBAY_MARKETPLACE_ID || "EBAY_US"
          }
        },
        failureCode: EBAY_QUERY_FAILED,
        authFailureCode: EBAY_AUTH_MISSING,
        rateLimitCode: EBAY_BROWSE_RATE_LIMITED
      });
      const items = Array.isArray(json.itemSummaries) ? json.itemSummaries : [];
      for (const item of items as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const title = maybeTitle(item.title);
      const categories = uniqueStrings(asStringArray(item.categories).flatMap((entry) => typeof entry === "string" ? [entry] : asStringArray((entry as Record<string, unknown>).categoryName)));
      const price = normalizePriceValue(item.price);
      const keyword = asString(item.__keyword) || title || "ebay";
      const url = asString(item.itemWebUrl);
      const values = [keyword, title ?? "", ...categories];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "ebay_listing",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: categories.slice(0, 10),
        category: "marketplace_product",
        region: DEFAULT_REGION,
        season: null,
        confidence: confidenceFromMetric(asNumber(item.bidCount) ?? asNumber(item.watchCount)),
        allowedUse: "data_reference",
        sourceUrl: url || null,
        externalIdentifier: asString(item.itemId) || null,
        rawValue: {
          itemId: asString(item.itemId) || null,
          keyword,
          title,
          categoryNames: categories,
          price: price.amount,
          currency: price.currency,
          itemWebUrl: url || null
        },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: title,
        normalizedTags: categories,
        normalizedMotifTags: motifTags,
        metricValue: asNumber(item.watchCount) ?? asNumber(item.bidCount),
        metricType: asNumber(item.watchCount) !== null ? "watch_count" : asNumber(item.bidCount) !== null ? "bid_count" : null,
        priceValue: price.amount,
        priceCurrency: price.currency,
        observedAt: nowIso(),
        citationUrl: url || null,
        riskFlags,
        notes: null,
        citationSnapshot: {
          itemId: asString(item.itemId) || null,
          title,
          categories,
          price: price.amount,
          currency: price.currency,
          itemWebUrl: url || null
        }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("ebay_browse"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return EBAY_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("ebay_browse")
};

const shopifyInternalAdapter: TrendSourceAdapter = {
  sourceKey: "shopify_internal",
  capabilities: definitionByKey.shopify_internal.capabilities,
  async fetchSignals(_profile, _options, context) {
    const status = sourceStatusOf(context.source);
    if (!status.isEnabled) throw new TrendSourceRuntimeError(SHOPIFY_CONNECTION_MISSING, "Shopify is not connected for internal trend signals.", "blocked");
    const metrics = await context.repos.workspaceMetric.listByWorkspace(context.workspaceId);
    const shopifyMetrics = metrics.filter((metric) => {
      const source = String(metric.source ?? "");
      const key = String(metric.metric_key ?? metric.metricKey ?? "");
      return source === "shopify" || key.startsWith("shopify.");
    });
    if (!shopifyMetrics.length) throw new TrendSourceRuntimeError(SOURCE_NOT_CONFIGURED, "Shopify internal metrics are not available yet.", "blocked");
    return { rawItems: shopifyMetrics.map((metric) => ({ ...metric })) };
  },
  async normalize(rawItems, profile) {
    return rawItems
      .filter((metric) => keywordMatchesProfile(String(metric.metric_key ?? metric.metricKey ?? "") + " " + JSON.stringify(metric.dimension_json ?? metric.dimensionJson ?? {}), profile))
      .map((metric) => {
        const key = String(metric.metric_key ?? metric.metricKey ?? "shopify.metric");
        const dimensions = safeSnapshot(metric.dimension_json ?? metric.dimensionJson ?? {});
        const keyword = compactText(String((dimensions.query as string | undefined) ?? (dimensions.productTitle as string | undefined) ?? key), 120);
        const values = [keyword, key];
        const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
        return {
          signalType: key.includes("search") ? "shopify_search_query" : "shopify_product_performance",
          status: riskFlags.length ? "risky" : "active",
          keyword,
          relatedTerms: [],
          category: "first_party_search",
          region: DEFAULT_REGION,
          confidence: confidenceFromMetric(asNumber(metric.metric_value ?? metric.metricValue)),
          allowedUse: "data_reference",
          sourceUrl: null,
          rawValue: { metricKey: key, metricValue: asNumber(metric.metric_value ?? metric.metricValue), dimensions },
          normalizedKeyword: normalizeKeyword(keyword),
          normalizedTitle: null,
          normalizedTags: [],
          normalizedMotifTags: motifTags,
          metricValue: asNumber(metric.metric_value ?? metric.metricValue),
          metricType: key,
          priceValue: null,
          priceCurrency: null,
          observedAt: asString(metric.measured_at ?? metric.measuredAt) || nowIso(),
          citationUrl: null,
          riskFlags,
          notes: null,
          citationSnapshot: { metricKey: key, dimensions }
        } satisfies NormalizedSignal;
      });
  },
  persist: createDefaultPersist("shopify_internal"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return SHOPIFY_INTERNAL_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("shopify_internal")
};

async function usableGoogleBundle(context: TrendSourceAdapterContext) {
  return getUsableGoogleConnectionBundle({
    repos: context.repos,
    workspaceId: context.workspaceId,
    actorId: context.actorId,
    config: context.config,
    fetcher: context.fetcher
  });
}

const gscAdapter: TrendSourceAdapter = {
  sourceKey: "google_search_console",
  capabilities: definitionByKey.google_search_console.capabilities,
  async fetchSignals(profile, options, context) {
    const bundle = await usableGoogleBundle(context);
    if (!bundle.ok) throw new TrendSourceRuntimeError(GSC_AUTH_MISSING, bundle.message, "blocked");
    const siteUrl = bundle.workspaceConfig.searchConsoleSiteUrl;
    if (!siteUrl) throw new TrendSourceRuntimeError(GSC_PROPERTY_MISSING, "Search Console property is missing.", "blocked");
    const windowStart = options.windowStart ?? new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10);
    const windowEnd = options.windowEnd ?? new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const rowLimit = Math.max(10, Math.min(Number(options.maxResultsPerKeyword ?? 20) * Math.max(profileKeywords(profile, options).length, 1), 100));
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const json = await fetchJson({
      fetcher: context.fetcher,
      url: endpoint,
      init: {
        method: "POST",
        headers: {
          authorization: `Bearer ${bundle.tokens.access_token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          startDate: windowStart,
          endDate: windowEnd,
          rowLimit,
          dimensions: ["query"]
        })
      },
      failureCode: GSC_QUERY_FAILED,
      authFailureCode: GSC_AUTH_MISSING
    });
    const rows = Array.isArray(json.rows) ? json.rows : [];
    return {
      rawItems: rows.map((row) => ({ ...(row as Record<string, unknown>), __siteUrl: siteUrl })),
      warnings: []
    };
  },
  async normalize(rawItems, profile, options) {
    const signals: NormalizedSignal[] = [];
    for (const row of rawItems) {
      const query = compactText(Array.isArray(row.keys) ? row.keys[0] : "", 160);
      if (!query || !keywordMatchesProfile(query, profile, options)) continue;
      const values = [query];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      signals.push({
        signalType: "gsc_query",
        status: riskFlags.length ? "risky" : "active",
        keyword: query,
        relatedTerms: [],
        category: "first_party_search",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(asNumber(row.impressions)),
        allowedUse: "data_reference",
        sourceUrl: asString(row.__siteUrl) || null,
        rawValue: {
          query,
          clicks: asNumber(row.clicks),
          impressions: asNumber(row.impressions),
          ctr: asNumber(row.ctr),
          position: asNumber(row.position)
        },
        normalizedKeyword: normalizeKeyword(query),
        normalizedTitle: null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: asNumber(row.clicks),
        metricType: "clicks",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: asString(row.__siteUrl) || null,
        riskFlags,
        notes: null,
        citationSnapshot: {
          query,
          clicks: asNumber(row.clicks),
          impressions: asNumber(row.impressions),
          ctr: asNumber(row.ctr),
          position: asNumber(row.position)
        }
      });
    }
    return signals;
  },
  persist: createDefaultPersist("google_search_console"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return GSC_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("google_search_console")
};

const ga4Adapter: TrendSourceAdapter = {
  sourceKey: "google_analytics",
  capabilities: definitionByKey.google_analytics.capabilities,
  async fetchSignals(profile, options, context) {
    const bundle = await usableGoogleBundle(context);
    if (!bundle.ok) throw new TrendSourceRuntimeError(GA4_AUTH_MISSING, bundle.message, "blocked");
    const propertyId = bundle.workspaceConfig.ga4PropertyId;
    if (!propertyId) throw new TrendSourceRuntimeError(GA4_PROPERTY_MISSING, "GA4 property ID is missing.", "blocked");
    const windowStart = options.windowStart ?? new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10);
    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
    const runReport = async (body: Record<string, unknown>) => fetchJson({
      fetcher: context.fetcher,
      url: endpoint,
      init: {
        method: "POST",
        headers: {
          authorization: `Bearer ${bundle.tokens.access_token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: windowStart, endDate: "today" }],
          ...body
        })
      },
      failureCode: GA4_QUERY_FAILED,
      authFailureCode: GA4_AUTH_MISSING
    });
    const [searchTerms, itemsViewed, eventNames] = await Promise.all([
      runReport({
        dimensions: [{ name: "searchTerm" }],
        metrics: [{ name: "eventCount" }],
        limit: Math.max(10, Math.min(Number(options.maxResultsPerKeyword ?? 20) * 2, 100))
      }),
      runReport({
        dimensions: [{ name: "itemName" }],
        metrics: [{ name: "itemsViewed" }],
        limit: Math.max(10, Math.min(Number(options.maxResultsPerKeyword ?? 20) * 2, 100))
      }),
      runReport({
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        limit: 25
      })
    ]);
    const rawItems = [
      ...((Array.isArray(searchTerms.rows) ? searchTerms.rows : []).map((row) => ({ ...(row as Record<string, unknown>), __kind: "search_term", __propertyId: propertyId }))),
      ...((Array.isArray(itemsViewed.rows) ? itemsViewed.rows : []).map((row) => ({ ...(row as Record<string, unknown>), __kind: "item_name", __propertyId: propertyId }))),
      ...((Array.isArray(eventNames.rows) ? eventNames.rows : []).map((row) => ({ ...(row as Record<string, unknown>), __kind: "event_name", __propertyId: propertyId })))
    ];
    return { rawItems };
  },
  async normalize(rawItems, profile, options) {
    const signals: NormalizedSignal[] = [];
    for (const row of rawItems) {
      const kind = asString(row.__kind);
      const dimension = Array.isArray(row.dimensionValues) ? row.dimensionValues : [];
      const metric = Array.isArray(row.metricValues) ? row.metricValues : [];
      const label = compactText((dimension[0] as Record<string, unknown> | undefined)?.value ?? "", 160);
      const count = asNumber((metric[0] as Record<string, unknown> | undefined)?.value);
      const keyword = label || kind;
      if (!label || (kind !== "event_name" && !keywordMatchesProfile(label, profile, options))) continue;
      const values = [keyword];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      signals.push({
        signalType: "ga4_event",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [],
        category: kind === "search_term" ? "first_party_search" : "marketplace_product",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(count),
        allowedUse: "data_reference",
        sourceUrl: null,
        rawValue: {
          kind,
          propertyId: asString(row.__propertyId) || null,
          label,
          count
        },
        normalizedKeyword: kind === "search_term" ? normalizeKeyword(label) : null,
        normalizedTitle: kind === "item_name" ? label : null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: count,
        metricType: kind === "item_name" ? "items_viewed" : "event_count",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: null,
        riskFlags,
        notes: null,
        citationSnapshot: {
          kind,
          label,
          count
        }
      });
    }
    return signals;
  },
  persist: createDefaultPersist("google_analytics"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return GA4_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("google_analytics")
};

const pinterestAdapter: TrendSourceAdapter = {
  sourceKey: "pinterest_trends",
  capabilities: definitionByKey.pinterest_trends.capabilities,
  async fetchSignals(profile, options, context) {
    if (!context.config.PINTEREST_ACCESS_TOKEN) throw new TrendSourceRuntimeError(PINTEREST_AUTH_MISSING, "Pinterest access token is missing.", "blocked");
    if (!context.config.PINTEREST_TRENDS_APPROVED) throw new TrendSourceRuntimeError(PINTEREST_SCOPE_MISSING, "Pinterest Trends approval is missing.", "blocked");
    if (!context.config.PINTEREST_TRENDS_ENABLED) throw new TrendSourceRuntimeError(PINTEREST_TRENDS_UNAVAILABLE, "Pinterest Trends is not enabled.", "blocked");
    const keywords = profileKeywords(profile, options);
    const rows: Record<string, unknown>[] = [];
    for (const keyword of keywords) {
      const url = new URL(`${context.config.PINTEREST_TRENDS_API_BASE_URL.replace(/\/$/, "")}/trends/keywords`);
      url.searchParams.set("term", keyword);
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        init: {
          method: "GET",
          headers: { authorization: `Bearer ${context.config.PINTEREST_ACCESS_TOKEN}` }
        },
        failureCode: PINTEREST_QUERY_FAILED,
        authFailureCode: PINTEREST_SCOPE_MISSING,
        unavailableCode: PINTEREST_TRENDS_UNAVAILABLE
      });
      const items = Array.isArray(json.items) ? json.items : Array.isArray(json.trends) ? json.trends : [];
      for (const item of items as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const keyword = compactText(item.keyword ?? item.term ?? item.__keyword, 120);
      const growth = asNumber(item.growth ?? item.growthPercent ?? item.growth_pct);
      const values = [keyword];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "pinterest_trend_keyword",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [],
        category: "keyword",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(growth),
        allowedUse: "data_reference",
        sourceUrl: null,
        rawValue: { keyword, growth },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: growth,
        metricType: "growth",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: null,
        riskFlags,
        notes: null,
        citationSnapshot: { keyword, growth }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("pinterest_trends"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return PINTEREST_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("pinterest_trends")
};

const googleTrendsAdapter: TrendSourceAdapter = {
  sourceKey: "google_trends_alpha",
  capabilities: definitionByKey.google_trends_alpha.capabilities,
  async fetchSignals(profile, options, context) {
    if (!context.config.GOOGLE_TRENDS_ALPHA_ENABLED || !context.config.GOOGLE_TRENDS_ALPHA_APPROVED) {
      throw new TrendSourceRuntimeError(GOOGLE_TRENDS_ALPHA_NOT_AVAILABLE, "Google Trends alpha access is not enabled.", "blocked");
    }
    const credential = context.config.GOOGLE_TRENDS_ALPHA_ACCESS_TOKEN || context.config.GOOGLE_TRENDS_ALPHA_API_KEY;
    if (!credential) throw new TrendSourceRuntimeError(GOOGLE_TRENDS_AUTH_MISSING, "Google Trends alpha credentials are missing.", "blocked");
    const keywords = profileKeywords(profile, options);
    const rows: Record<string, unknown>[] = [];
    for (const keyword of keywords) {
      const url = new URL(`${context.config.GOOGLE_TRENDS_ALPHA_BASE_URL.replace(/\/$/, "")}/v1alpha/trends:query`);
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(context.config.GOOGLE_TRENDS_ALPHA_ACCESS_TOKEN ? { authorization: `Bearer ${credential}` } : {}),
            ...(context.config.GOOGLE_TRENDS_ALPHA_API_KEY ? { "x-goog-api-key": context.config.GOOGLE_TRENDS_ALPHA_API_KEY } : {})
          },
          body: JSON.stringify({ keyword, geo: DEFAULT_REGION })
        },
        failureCode: GOOGLE_TRENDS_QUERY_FAILED,
        authFailureCode: GOOGLE_TRENDS_AUTH_MISSING,
        unavailableCode: GOOGLE_TRENDS_ALPHA_NOT_AVAILABLE
      });
      const items = Array.isArray(json.items) ? json.items : Array.isArray(json.risingQueries) ? json.risingQueries : [];
      for (const item of items as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const keyword = compactText(item.query ?? item.keyword ?? item.term ?? item.__keyword, 120);
      const interest = asNumber(item.interest ?? item.score ?? item.value);
      const values = [keyword];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "google_trends_keyword",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [],
        category: "keyword",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(interest),
        allowedUse: "data_reference",
        sourceUrl: null,
        rawValue: { keyword, interest },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: interest,
        metricType: "interest",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: null,
        riskFlags,
        notes: null,
        citationSnapshot: { keyword, interest }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("google_trends_alpha"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return GOOGLE_TRENDS_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("google_trends_alpha")
};

const metaAdapter: TrendSourceAdapter = {
  sourceKey: "meta_ad_library",
  capabilities: definitionByKey.meta_ad_library.capabilities,
  async fetchSignals(profile, options, context) {
    if (!context.config.META_AD_LIBRARY_ACCESS_TOKEN) throw new TrendSourceRuntimeError(META_AD_LIBRARY_AUTH_MISSING, "Meta Ad Library token is missing.", "blocked");
    if (!context.config.META_AD_LIBRARY_APPROVED || !context.config.META_AD_LIBRARY_ENABLED) {
      throw new TrendSourceRuntimeError(SOURCE_APPROVAL_REQUIRED, "Meta Ad Library access is not approved for this workspace.", "blocked");
    }
    const keywords = profileKeywords(profile, options);
    const rows: Record<string, unknown>[] = [];
    for (const keyword of keywords) {
      const url = new URL("https://graph.facebook.com/v20.0/ads_archive");
      url.searchParams.set("search_terms", keyword);
      url.searchParams.set("ad_type", "ALL");
      url.searchParams.set("ad_reached_countries", '["US"]');
      url.searchParams.set("access_token", context.config.META_AD_LIBRARY_ACCESS_TOKEN);
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        failureCode: META_AD_LIBRARY_QUERY_FAILED,
        authFailureCode: META_AD_LIBRARY_AUTH_MISSING
      });
      const data = Array.isArray(json.data) ? json.data : [];
      for (const item of data as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows, warnings: ["Meta Ad Library coverage can be incomplete."] };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const creativeBodies = Array.isArray(item.ad_creative_bodies) ? item.ad_creative_bodies : [];
      const title = compactText(creativeBodies[0] ?? item.adSnapshotUrl ?? item.__keyword, 160);
      const keyword = asString(item.__keyword) || title || "meta";
      const url = asString(item.adSnapshotUrl) || null;
      const values = [keyword, title];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "meta_ad_signal",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [],
        category: "keyword",
        region: DEFAULT_REGION,
        confidence: 0.45,
        allowedUse: "data_reference",
        sourceUrl: url,
        rawValue: {
          keyword,
          pageName: compactText(item.page_name, 120),
          adSnapshotUrl: url,
          creativeText: title
        },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: title || null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: null,
        metricType: "coverage_limited",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: url,
        riskFlags: riskFlags.concat("coverage_limited"),
        notes: "Coverage limited to official Ad Library availability.",
        citationSnapshot: {
          pageName: compactText(item.page_name, 120),
          adSnapshotUrl: url,
          creativeText: title
        }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("meta_ad_library"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return META_AD_LIBRARY_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("meta_ad_library")
};

async function redditAccessToken(config: RuntimeConfig, fetcher: GoogleFetch) {
  if (config.REDDIT_ACCESS_TOKEN) return config.REDDIT_ACCESS_TOKEN;
  if (!config.REDDIT_CLIENT_ID || !config.REDDIT_CLIENT_SECRET || !config.REDDIT_USER_AGENT) {
    throw new TrendSourceRuntimeError(REDDIT_COMMERCIAL_ACCESS_MISSING, "Reddit commercial-safe credentials are missing.", "blocked");
  }
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const response = await fetcher("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": config.REDDIT_USER_AGENT
    },
    body
  });
  const json = await readJson(response);
  if (!response.ok) throw new TrendSourceRuntimeError(REDDIT_COMMERCIAL_ACCESS_MISSING, sanitizeProviderError(json), "blocked");
  const token = asString(json.access_token);
  if (!token) throw new TrendSourceRuntimeError(REDDIT_COMMERCIAL_ACCESS_MISSING, "Reddit access token response was invalid.", "blocked");
  return token;
}

const redditAdapter: TrendSourceAdapter = {
  sourceKey: "reddit_api",
  capabilities: definitionByKey.reddit_api.capabilities,
  async fetchSignals(profile, options, context) {
    if (!context.config.REDDIT_API_ENABLED || !context.config.REDDIT_COMMERCIAL_APPROVED) {
      throw new TrendSourceRuntimeError(REDDIT_COMMERCIAL_ACCESS_MISSING, "Reddit commercial access is not approved.", "blocked");
    }
    const token = await redditAccessToken(context.config, context.fetcher);
    const keywords = profileKeywords(profile, options);
    const rows: Record<string, unknown>[] = [];
    for (const keyword of keywords) {
      const url = new URL("https://oauth.reddit.com/search");
      url.searchParams.set("q", keyword);
      url.searchParams.set("limit", String(Math.max(10, Math.min(Number(options.maxResultsPerKeyword ?? 10), 25))));
      url.searchParams.set("sort", "hot");
      url.searchParams.set("type", "link");
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        init: {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "user-agent": context.config.REDDIT_USER_AGENT || "saltyfactory-trend-intelligence/1.0"
          }
        },
        failureCode: REDDIT_QUERY_FAILED,
        authFailureCode: REDDIT_COMMERCIAL_ACCESS_MISSING
      });
      const children = Array.isArray((json.data as Record<string, unknown> | undefined)?.children)
        ? ((json.data as Record<string, unknown>).children as Record<string, unknown>[])
        : [];
      for (const child of children) {
        const data = child.data as Record<string, unknown> | undefined;
        if (data) rows.push({ ...data, __keyword: keyword });
      }
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const title = compactText(item.title ?? item.body ?? item.selftext ?? item.__keyword, 180);
      const keyword = asString(item.__keyword) || title || "reddit";
      const excerpt = compactText(item.selftext ?? item.body ?? "", 220);
      const permalink = asString(item.permalink);
      const url = permalink ? `https://reddit.com${permalink}` : null;
      const values = [keyword, title, excerpt];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "reddit_post",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [compactText(item.subreddit, 80)].filter(Boolean),
        category: "keyword",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(asNumber(item.ups) ?? asNumber(item.score)),
        allowedUse: "data_reference",
        sourceUrl: url,
        externalIdentifier: asString(item.id) || null,
        rawValue: {
          id: asString(item.id) || null,
          title,
          excerpt,
          subreddit: compactText(item.subreddit, 80),
          score: asNumber(item.score),
          comments: asNumber(item.num_comments),
          permalink: url
        },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: title || null,
        normalizedTags: [compactText(item.subreddit, 80)].filter(Boolean),
        normalizedMotifTags: motifTags,
        metricValue: asNumber(item.score),
        metricType: "score",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: url,
        riskFlags,
        notes: null,
        citationSnapshot: {
          id: asString(item.id) || null,
          title,
          excerpt,
          subreddit: compactText(item.subreddit, 80),
          score: asNumber(item.score),
          comments: asNumber(item.num_comments),
          permalink: url
        }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("reddit_api"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return REDDIT_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("reddit_api")
};

const tiktokAdapter: TrendSourceAdapter = {
  sourceKey: "tiktok_business_discovery",
  capabilities: definitionByKey.tiktok_business_discovery.capabilities,
  async fetchSignals(profile, options, context) {
    if (!context.config.TIKTOK_COMMERCIAL_API_ENABLED || !context.config.TIKTOK_APPROVED_ACCESS || !context.config.TIKTOK_ACCESS_TOKEN) {
      throw new TrendSourceRuntimeError(TIKTOK_APPROVED_ACCESS_MISSING, "Approved TikTok commercial access is missing.", "blocked");
    }
    const rows: Record<string, unknown>[] = [];
    for (const keyword of profileKeywords(profile, options)) {
      const url = `${context.config.TIKTOK_API_BASE_URL.replace(/\/$/, "")}/v2/business/discovery/query/`;
      const json = await fetchJson({
        fetcher: context.fetcher,
        url,
        init: {
          method: "POST",
          headers: {
            authorization: `Bearer ${context.config.TIKTOK_ACCESS_TOKEN}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({ keyword, region: DEFAULT_REGION })
        },
        failureCode: TIKTOK_QUERY_FAILED,
        authFailureCode: TIKTOK_APPROVED_ACCESS_MISSING
      });
      const items = Array.isArray(json.data) ? json.data : [];
      for (const item of items as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const keyword = compactText(item.keyword ?? item.hashtag_name ?? item.__keyword, 120);
      const value = asNumber(item.views ?? item.engagement ?? item.video_count);
      const values = [keyword];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "tiktok_commercial_signal",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [],
        category: "keyword",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(value),
        allowedUse: "data_reference",
        sourceUrl: null,
        rawValue: { keyword, value },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: value,
        metricType: "engagement",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: null,
        riskFlags,
        notes: null,
        citationSnapshot: { keyword, value }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("tiktok_business_discovery"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return TIKTOK_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("tiktok_business_discovery")
};

const licensedProviderAdapter: TrendSourceAdapter = {
  sourceKey: "licensed_google_serp_provider",
  capabilities: definitionByKey.licensed_google_serp_provider.capabilities,
  async fetchSignals(profile, options, context) {
    if (!context.config.LICENSED_TREND_PROVIDER_API_KEY) {
      throw new TrendSourceRuntimeError(LICENSED_PROVIDER_KEY_MISSING, "Licensed provider API key is missing.", "blocked");
    }
    if (!context.config.LICENSED_TREND_PROVIDER_ENABLED || !context.config.LICENSED_TREND_PROVIDER_APPROVED) {
      throw new TrendSourceRuntimeError(LICENSED_PROVIDER_NOT_APPROVED, "Licensed provider approval is missing.", "blocked");
    }
    if (!context.config.LICENSED_TREND_PROVIDER_BASE_URL || !context.config.LICENSED_TREND_PROVIDER_NAME) {
      throw new TrendSourceRuntimeError(SOURCE_NOT_CONFIGURED, "Licensed provider base URL or provider name is missing.", "blocked");
    }
    const rows: Record<string, unknown>[] = [];
    for (const keyword of profileKeywords(profile, options)) {
      const url = new URL(context.config.LICENSED_TREND_PROVIDER_BASE_URL);
      url.searchParams.set("provider", context.config.LICENSED_TREND_PROVIDER_NAME);
      url.searchParams.set("q", keyword);
      const json = await fetchJson({
        fetcher: context.fetcher,
        url: String(url),
        init: {
          method: "GET",
          headers: {
            authorization: `Bearer ${context.config.LICENSED_TREND_PROVIDER_API_KEY}`,
            "x-api-key": context.config.LICENSED_TREND_PROVIDER_API_KEY
          }
        },
        failureCode: LICENSED_PROVIDER_QUERY_FAILED,
        authFailureCode: LICENSED_PROVIDER_KEY_MISSING
      });
      const items = Array.isArray(json.items) ? json.items : Array.isArray(json.data) ? json.data : [];
      for (const item of items as Record<string, unknown>[]) rows.push({ ...item, __keyword: keyword });
    }
    return { rawItems: rows };
  },
  async normalize(rawItems, profile) {
    return rawItems.map((item) => {
      const keyword = compactText(item.keyword ?? item.query ?? item.term ?? item.__keyword, 120);
      const searchVolume = asNumber(item.search_volume ?? item.searchVolume ?? item.value);
      const values = [keyword];
      const { riskFlags, motifTags } = commonRiskAndMotifs(profile, values);
      return {
        signalType: "licensed_provider_keyword",
        status: riskFlags.length ? "risky" : "active",
        keyword,
        relatedTerms: [],
        category: "keyword",
        region: DEFAULT_REGION,
        confidence: confidenceFromMetric(searchVolume),
        allowedUse: "data_reference",
        sourceUrl: asString(item.url) || null,
        rawValue: { keyword, searchVolume },
        normalizedKeyword: normalizeKeyword(keyword),
        normalizedTitle: null,
        normalizedTags: [],
        normalizedMotifTags: motifTags,
        metricValue: searchVolume,
        metricType: "search_volume",
        priceValue: null,
        priceCurrency: null,
        observedAt: nowIso(),
        citationUrl: asString(item.url) || null,
        riskFlags,
        notes: null,
        citationSnapshot: { keyword, searchVolume, url: asString(item.url) || null }
      } satisfies NormalizedSignal;
    });
  },
  persist: createDefaultPersist("licensed_google_serp_provider"),
  classifyFailure(error) {
    if (error instanceof TrendSourceRuntimeError) return error.failureCode;
    return LICENSED_PROVIDER_QUERY_FAILED;
  },
  sanitizeForReport: createDefaultSanitizer("licensed_google_serp_provider")
};

const adapterByKey: Record<TrendSourceKey, TrendSourceAdapter> = {
  etsy_v3: etsyAdapter,
  ebay_browse: ebayAdapter,
  shopify_internal: shopifyInternalAdapter,
  google_search_console: gscAdapter,
  google_analytics: ga4Adapter,
  pinterest_trends: pinterestAdapter,
  google_trends_alpha: googleTrendsAdapter,
  meta_ad_library: metaAdapter,
  reddit_api: redditAdapter,
  tiktok_business_discovery: tiktokAdapter,
  licensed_google_serp_provider: licensedProviderAdapter
};

async function runAdapter(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  config: RuntimeConfig;
  profile: TrendWatchProfile;
  source: WorkspaceRow;
  options: AdapterFetchOptions;
  fetchers?: Partial<Record<TrendSourceKey, GoogleFetch>>;
}) {
  const sourceKey = sourceKeyOf(input.source) as TrendSourceKey;
  const adapter = adapterByKey[sourceKey];
  const run = await createRunRow({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    profileId: String(input.profile.id),
    source: input.source
  });
  const context: TrendSourceAdapterContext = {
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    config: input.config,
    source: input.source,
    run,
    fetcher: input.fetchers?.[sourceKey] ?? fetch
  };
  try {
    assertSourceAllowed(input.profile, input.source, input.options);
    await markRun({ repos: input.repos, runId: String(run.id), patch: { status: "running", started_at: nowIso() } });
    const fetched = await adapter.fetchSignals(input.profile, input.options, context);
    const normalizedSignals = await adapter.normalize(fetched.rawItems, input.profile, input.options, context);
    if (!normalizedSignals.length) {
      await markRun({
        repos: input.repos,
        runId: String(run.id),
        patch: {
          status: "partial",
          failure_code: SOURCE_DATA_EMPTY,
          raw_signal_count: fetched.rawItems.length,
          normalized_signal_count: 0,
          citation_count: 0,
          completed_at: nowIso()
        }
      });
      await input.repos.trendIntelligence.sources.update(String(input.source.id), { last_successful_fetch_at: nowIso(), updated_by: input.actorId });
      return adapter.sanitizeForReport({
        sourceKey,
        status: "partial",
        runId: String(run.id),
        normalizedSignalCount: 0,
        citationCount: 0,
        failureCode: SOURCE_DATA_EMPTY,
        warnings: fetched.warnings
      });
    }
    if (!input.options.dryRun) {
      const persisted = await adapter.persist(run, normalizedSignals, input.profile, context);
      await markRun({
        repos: input.repos,
        runId: String(run.id),
        patch: {
          status: normalizedSignals.length < fetched.rawItems.length ? "partial" : "success",
          raw_signal_count: fetched.rawItems.length,
          normalized_signal_count: persisted.normalizedSignalCount,
          citation_count: persisted.citationCount,
          completed_at: nowIso()
        }
      });
      await input.repos.trendIntelligence.sources.update(String(input.source.id), { last_successful_fetch_at: nowIso(), updated_by: input.actorId });
      return adapter.sanitizeForReport({
        sourceKey,
        status: normalizedSignals.length < fetched.rawItems.length ? "partial" : "success",
        runId: String(run.id),
        normalizedSignalCount: persisted.normalizedSignalCount,
        citationCount: persisted.citationCount,
        warnings: fetched.warnings
      });
    }
    await markRun({
      repos: input.repos,
      runId: String(run.id),
      patch: {
        status: "success",
        raw_signal_count: fetched.rawItems.length,
        normalized_signal_count: normalizedSignals.length,
        citation_count: normalizedSignals.filter((signal) => signal.citationUrl || signal.citationSnapshot).length,
        completed_at: nowIso(),
        notes: "dry_run"
      }
    });
    return adapter.sanitizeForReport({
      sourceKey,
      status: "success",
      runId: String(run.id),
      normalizedSignalCount: normalizedSignals.length,
      citationCount: normalizedSignals.filter((signal) => signal.citationUrl || signal.citationSnapshot).length,
      warnings: fetched.warnings
    });
  } catch (error) {
    const failureCode = adapter.classifyFailure(error);
    const runStatus = error instanceof TrendSourceRuntimeError ? error.runStatus : runStatusForFailure(failureCode);
    await markRun({
      repos: input.repos,
      runId: String(run.id),
      patch: {
        status: runStatus,
        failure_code: failureCode,
        completed_at: nowIso(),
        notes: sanitizeProviderError(error)
      }
    });
    return adapter.sanitizeForReport({
      sourceKey,
      status: runStatus,
      runId: String(run.id),
      normalizedSignalCount: 0,
      citationCount: 0,
      failureCode,
      message: sanitizeProviderError(error)
    });
  }
}

export async function listTrendSources(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  config: RuntimeConfig;
}) {
  const sources = await ensureTrendSourceRegistry(input);
  return sources.map((source) => safeSnapshot(source) as WorkspaceRow);
}

export async function runTrendSourcesForProfile(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  config: RuntimeConfig;
  profileId: string;
  sourceKeys?: string[] | undefined;
  keywords?: string[] | undefined;
  dryRun?: boolean | undefined;
  fetchers?: Partial<Record<TrendSourceKey, GoogleFetch>> | undefined;
}) {
  rejectUnsafeAutomation({
    sourceKeys: input.sourceKeys,
    keywords: input.keywords,
    dryRun: input.dryRun
  });
  const profile = await input.repos.trendIntelligence.profiles.getById(input.profileId, input.workspaceId);
  if (!profile) {
    throw new TrendSourceRuntimeError(TREND_PROFILE_MISSING, "Trend watch profile not found.", "blocked");
  }
  const sources = await ensureTrendSourceRegistry({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    config: input.config
  });
  const requestedKeys = input.sourceKeys?.length
    ? uniqueStrings(input.sourceKeys)
    : asStringArray(profile.allowed_sources ?? profile.allowedSources);
  const attempted = requestedKeys.filter((key) => key in definitionByKey) as TrendSourceKey[];
  const results: AdapterReport[] = [];
  for (const sourceKey of attempted) {
      const source = sources.find((row) => sourceKeyOf(row) === sourceKey);
    if (!source) {
      results.push({
        sourceKey,
        status: "blocked",
        normalizedSignalCount: 0,
        citationCount: 0,
        failureCode: SOURCE_NOT_CONFIGURED,
        message: "Source registry row is missing."
      });
      continue;
    }
    results.push(await runAdapter({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      config: input.config,
      profile,
      source,
      options: {
        keywords: input.keywords,
        dryRun: input.dryRun
      },
      ...(input.fetchers ? { fetchers: input.fetchers } : {})
    }));
  }
  return {
    ok: true as const,
    profileId: String(profile.id),
    sourcesAttempted: attempted,
    sourceResults: results
  };
}

export async function getTrendSignalRunDetail(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  runId: string;
}) {
  const run = await input.repos.trendIntelligence.runs.getById(input.runId, input.workspaceId);
  if (!run) return null;
  const signals = await input.repos.trendIntelligence.listSignalsByRun(input.workspaceId, input.runId);
  const citations = (
    await Promise.all(signals.map((signal) => input.repos.trendIntelligence.listCitationsForEntity(input.workspaceId, "trend_signal", String(signal.id))))
  ).flat();
  return {
    run: safeSnapshot(run),
    signals: signals.map((signal) => safeSnapshot(signal)),
    citations: citations.map((citation) => safeSnapshot(citation))
  };
}

export function createManualTrendSourceBlockedResponse() {
  return {
    ok: false as const,
    status: "blocked" as const,
    failureCode: SOURCE_RESTRICTED_DO_NOT_AUTOMATE,
    message: MANUAL_TREND_SOURCE_BLOCK_MESSAGE,
    nextAction: "/api/studio/trend-intelligence/sources"
  };
}

export function assertSafeTrendSourceRequest(value: unknown) {
  rejectUnsafeAutomation(value);
}
