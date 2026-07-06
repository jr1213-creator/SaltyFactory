import crypto from "node:crypto";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import {
  calculateMarginEconomics,
  runDeterministicPolicyRules,
  runDeterministicReadinessCheck,
  runUnifiedPolicyIpCheck
} from "./agent-deterministic-core";

export const CUSTOMER_DESIGN_INVALID_BODY = "customer_design_invalid_body";
export const CUSTOMER_DESIGN_INVALID_JSON = "customer_design_invalid_json";
export const CUSTOMER_DESIGN_SESSION_NOT_FOUND = "customer_design_session_not_found";
export const CUSTOMER_DESIGN_SESSION_FORBIDDEN = "customer_design_session_forbidden";
export const CUSTOMER_DESIGN_SESSION_INVALID = "customer_design_session_invalid";
export const CUSTOMER_DESIGN_SESSION_EXPIRED = "customer_design_session_expired";
export const CUSTOMER_DESIGN_SESSION_TERMINAL = "customer_design_session_terminal";
export const CUSTOMER_DESIGN_CANDIDATE_NOT_FOUND = "customer_design_candidate_not_found";
export const CUSTOMER_DESIGN_CANDIDATE_BLOCKED = "customer_design_candidate_blocked";
export const CUSTOMER_DESIGN_PUBLISH_BLOCKED = "customer_design_publish_blocked";
export const CUSTOMER_DESIGN_MARGIN_DATA_MISSING = "customer_design_margin_data_missing";
export const CUSTOMER_DESIGN_RATE_LIMITED = "customer_design_rate_limited";
export const CUSTOMER_DESIGN_PURCHASE_LINK_FORBIDDEN = "customer_design_purchase_link_forbidden";

const workspaceDefault = "wks_default";
const id = (prefix: string, seed?: string) => seed ? `${prefix}_${hash(seed)}` : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input.trim() : fallback;
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const asArray = (input: unknown): unknown[] => Array.isArray(input) ? input : [];
const asStringArray = (input: unknown): string[] => Array.isArray(input) ? input.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const bool = (input: unknown) => input === true || input === "true";
const hash = (input: string) => crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
const sessionTokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const moneyOrNull = (input: unknown) => {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(2) : null;
};
const patchRow = (row: Record<string, unknown>) => row as unknown as WorkspaceRow;

export type CustomerDesignInput = {
  repos: RepositoryBundle;
  workspaceId?: string | undefined;
  actorId?: string | undefined;
};

export const customerDesignAgentRoles = [
  {
    role_key: "customer_design_concierge",
    display_name: "Customer Design Concierge",
    purpose: "Collect customer intent, clarify safe design requirements, show candidates, and request gated customer-specific product creation.",
    allowed_tools: ["readCustomerDesignSession", "saveCustomerMessage", "extractCustomerDesignRequirements", "askClarifyingQuestion", "createDesignCandidateBriefs", "showDesignCandidates", "recordCustomerApproval", "requestCustomerSpecificProductCreation"],
    forbidden_actions: ["publish", "spend", "sendEmail", "sendSms", "mutateShopifyDirectly", "bypassPolicy", "bypassQa", "createProductWithoutCustomerApproval"],
    input_entity_types: ["customer_design_session", "customer_design_message"],
    output_entity_types: ["customer_design_message", "customer_design_requirement", "customer_design_candidate", "customer_design_publish_job"],
    risk_level: "high",
    is_enabled: true
  },
  {
    role_key: "customer_design_brief_agent",
    display_name: "Customer Design Brief Agent",
    purpose: "Turn structured customer requests into 3-5 safe design candidate briefs.",
    allowed_tools: ["extractCustomerDesignRequirements", "generateCustomerDesignCandidates", "runCustomerDesignPolicyReview"],
    forbidden_actions: ["publish", "spend", "sendEmail", "sendSms", "mutateShopifyDirectly", "bypassPolicy", "generateImageWithoutPolicyPass"],
    input_entity_types: ["customer_design_requirement"],
    output_entity_types: ["customer_design_candidate"],
    risk_level: "medium",
    is_enabled: true
  },
  {
    role_key: "customer_design_policy_agent",
    display_name: "Customer Design Policy Agent",
    purpose: "Run deterministic policy/IP checks on customer request and candidate copy before preview or purchase-link creation.",
    allowed_tools: ["runCustomerDesignPolicyReview"],
    forbidden_actions: ["clearIpRisk", "downgradePolicyRisk", "bypassPolicy"],
    input_entity_types: ["customer_design_candidate", "customer_design_message"],
    output_entity_types: ["policy_review_result"],
    risk_level: "critical",
    is_enabled: true
  },
  {
    role_key: "customer_design_publish_agent",
    display_name: "Customer Design Publish Agent",
    purpose: "Create customer-specific purchase products only through server-side deterministic gates and disabled-by-default Shopify controls.",
    allowed_tools: ["recordCustomerDesignApproval", "runCustomerDesignReadinessChecks", "runCustomerDesignMarginChecks", "blockCustomerDesignPublishJob"],
    forbidden_actions: ["publishMainCatalog", "addPublicCollection", "sendEmail", "sendSms", "spend", "bypassPolicy", "bypassQa"],
    input_entity_types: ["customer_design_candidate"],
    output_entity_types: ["customer_design_publish_job", "customer_specific_product"],
    risk_level: "critical",
    is_enabled: true
  }
] as const;

function workspaceId(input: CustomerDesignInput) {
  return input.workspaceId || process.env.STOREFRONT_WORKSPACE_ID || workspaceDefault;
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function ttlHours() {
  const parsed = Number(process.env.CUSTOMER_CONCIERGE_SESSION_TTL_HOURS ?? "24");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

function maxCandidates() {
  const parsed = Number(process.env.CUSTOMER_CONCIERGE_MAX_CANDIDATES ?? "5");
  return Math.min(Math.max(Number.isFinite(parsed) ? Math.floor(parsed) : 5, 3), 5);
}

function sessionLimit(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function allowedProductTypes() {
  const raw = process.env.CUSTOMER_CONCIERGE_ALLOWED_PRODUCT_TYPES || "shirt,tee,t-shirt,hoodie,tank,hat,tote,sticker,keychain";
  return raw.split(/[,\n]/).map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

function enabledFlag(name: string, fallback = false) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return value === "true";
}

function productCreateMode() {
  const mode = process.env.CUSTOMER_CONCIERGE_SHOPIFY_PRODUCT_CREATE_MODE;
  return mode === "test_adapter" || mode === "live" ? mode : "disabled";
}

function purchaseAccessToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function sanitizePublicProduct(row: WorkspaceRow) {
  const images = asArray(value(row, "images")).map((entry) => {
    const image = asRecord(entry);
    return { url: text(image.url ?? image.src), altText: text(image.altText ?? image.alt) };
  }).filter((image) => image.url || image.altText);
  return {
    id: row.id,
    handle: text(value(row, "handle")),
    title: text(value(row, "title"), "Product"),
    description: text(value(row, "description_excerpt", "descriptionExcerpt") ?? value(row, "description")),
    vendor: text(value(row, "vendor")),
    productType: text(value(row, "product_type", "productType")),
    tags: asStringArray(value(row, "tags")),
    images,
    variants: asArray(value(row, "variants")),
    price: value(row, "price_min", "priceMin") ? `$${value(row, "price_min", "priceMin")}` : value(row, "price"),
    priceMin: value(row, "price_min", "priceMin") ?? null,
    priceMax: value(row, "price_max", "priceMax") ?? null,
    currency: text(value(row, "currency"), "USD"),
    availableForSale: value(row, "available_for_sale", "availableForSale") !== false
  };
}

async function upsert(repo: { getById(id: string, workspaceId?: string): Promise<WorkspaceRow | null>; create(row: WorkspaceRow): Promise<WorkspaceRow>; update(id: string, patch: WorkspaceRow): Promise<WorkspaceRow> }, row: WorkspaceRow) {
  const existing = await repo.getById(row.id, text(row.workspace_id ?? row.workspaceId) || undefined);
  return existing ? repo.update(row.id, row) : repo.create(row);
}

export async function syncStorefrontProductsFromShopify(input: CustomerDesignInput & { products?: WorkspaceRow[] | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  const products = input.products ?? [];
  if (!products.length) {
    const providers = createCommerceProviders(parseEnv());
    const result = await providers.storefront.getProducts();
    if (!result.ok) return { ok: false, error: result.error, products: [] };
    products.push(...result.data as WorkspaceRow[]);
  }
  const saved = [];
  for (const product of products) {
    const handle = text(value(product, "handle"));
    if (!handle) continue;
    saved.push(await upsert(input.repos.customerDesign.storefrontProductsCache, {
      id: id("sfpc", `${resolvedWorkspaceId}:${handle}`),
      workspace_id: resolvedWorkspaceId,
      shopify_product_id: text(value(product, "shopify_product_id", "shopifyProductId") ?? product.id, handle),
      handle,
      title: text(value(product, "title"), "Product"),
      description_excerpt: text(value(product, "description_excerpt", "descriptionExcerpt") ?? value(product, "description")).slice(0, 240),
      vendor: text(value(product, "vendor")) || null,
      product_type: text(value(product, "product_type", "productType")) || null,
      tags: asStringArray(value(product, "tags")),
      images: asArray(value(product, "images")),
      variants: asArray(value(product, "variants")),
      price_min: value(product, "price_min", "priceMin") ?? null,
      price_max: value(product, "price_max", "priceMax") ?? null,
      currency: text(value(product, "currency")) || null,
      available_for_sale: value(product, "available_for_sale", "availableForSale") !== false,
      source_updated_at: value(product, "source_updated_at", "sourceUpdatedAt") ?? null,
      synced_at: now()
    } as WorkspaceRow));
  }
  return { ok: true, products: saved.map(sanitizePublicProduct) };
}

export async function readStorefrontProducts(input: CustomerDesignInput & { handle?: string | undefined; collectionHandle?: string | undefined } = {} as CustomerDesignInput) {
  const resolvedWorkspaceId = workspaceId(input);
  const config = parseEnv();
  if (config.providers.shopifyStorefront.enabled) {
    const providers = createCommerceProviders(config);
    const result = input.collectionHandle
      ? await providers.storefront.getCollection(input.collectionHandle)
      : input.handle
        ? await providers.storefront.getProduct(input.handle)
        : await providers.storefront.getProducts();
    if (result.ok) {
      const collectionProducts = asArray((result.data as Record<string, unknown> | null | undefined)?.products);
      const rows = collectionProducts.length ? collectionProducts : Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
      if (rows.length) await syncStorefrontProductsFromShopify({ repos: input.repos, workspaceId: resolvedWorkspaceId, products: rows as WorkspaceRow[] });
    }
  }
  const cached = await input.repos.customerDesign.storefrontProductsCache.listByWorkspace(resolvedWorkspaceId);
  const collectionNeedle = text(input.collectionHandle).replaceAll("-", " ").toLowerCase();
  const products = cached.map(sanitizePublicProduct).filter((product) => {
    if (input.handle && product.handle !== input.handle) return false;
    if (!collectionNeedle) return true;
    return product.tags.some((tag) => tag.toLowerCase().includes(collectionNeedle)) || product.productType.toLowerCase().includes(collectionNeedle);
  });
  if (products.length || input.handle) {
    return { products, product: input.handle ? products[0] ?? null : null, source: products.length ? "cache_or_shopify" : "missing" };
  }
  const drafts = await input.repos.draft.listApprovedForStorefront(resolvedWorkspaceId).catch(() => []);
  return { products: drafts.map((row) => ({ ...row, availableForSale: true })), product: null, source: drafts.length ? "public_projection" : "not_configured" };
}

export function safeCustomerDesignSession(session: WorkspaceRow) {
  return {
    id: session.id,
    status: text(value(session, "status"), "active"),
    source_route: value(session, "source_route", "sourceRoute") ?? null,
    coarse_location: value(session, "coarse_location", "coarseLocation") ?? null,
    customer_intent_summary: value(session, "customer_intent_summary", "customerIntentSummary") ?? null,
    created_at: value(session, "created_at", "createdAt") ?? null,
    updated_at: value(session, "updated_at", "updatedAt") ?? null,
    expires_at: value(session, "expires_at", "expiresAt") ?? null
  };
}

function sessionStatus(session: WorkspaceRow) {
  return text(value(session, "status"), "active");
}

function expiresAtMs(session: WorkspaceRow) {
  const raw = value(session, "expires_at", "expiresAt");
  const parsed = raw ? Date.parse(String(raw)) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

async function assertSessionActive(input: CustomerDesignInput & { session: WorkspaceRow }) {
  const status = sessionStatus(input.session);
  if (status === "expired") throw new Error(CUSTOMER_DESIGN_SESSION_EXPIRED);
  if (["blocked", "abandoned"].includes(status)) throw new Error(CUSTOMER_DESIGN_SESSION_TERMINAL);
  const expiresMs = expiresAtMs(input.session);
  if (expiresMs != null && expiresMs <= Date.now()) {
    await input.repos.customerDesign.sessions.update(input.session.id, patchRow({ status: "expired" })).catch(() => input.session);
    throw new Error(CUSTOMER_DESIGN_SESSION_EXPIRED);
  }
}

async function ensureSessionLimit(input: CustomerDesignInput & { sessionId: string; limitType: "messages" | "generations" | "publishRequests" }) {
  const resolvedWorkspaceId = workspaceId(input);
  if (input.limitType === "messages") {
    const rows = await input.repos.customerDesign.messages.listByWorkspace(resolvedWorkspaceId);
    const count = rows.filter((row) => value(row, "session_id", "sessionId") === input.sessionId && text(value(row, "sender")) === "customer").length;
    if (count >= sessionLimit("CUSTOMER_CONCIERGE_MAX_MESSAGES_PER_SESSION", 20)) throw new Error(CUSTOMER_DESIGN_RATE_LIMITED);
  }
  if (input.limitType === "generations") {
    const rows = await input.repos.customerDesign.agentRuns.listByWorkspace(resolvedWorkspaceId);
    const count = rows.filter((row) => value(row, "session_id", "sessionId") === input.sessionId && text(value(row, "agent_role", "agentRole")) === "customer_design_brief_agent").length;
    if (count >= sessionLimit("CUSTOMER_CONCIERGE_MAX_GENERATIONS_PER_SESSION", 3)) throw new Error(CUSTOMER_DESIGN_RATE_LIMITED);
  }
  if (input.limitType === "publishRequests") {
    const rows = await input.repos.customerDesign.publishJobs.listByWorkspace(resolvedWorkspaceId);
    const count = rows.filter((row) => value(row, "session_id", "sessionId") === input.sessionId).length;
    if (count >= sessionLimit("CUSTOMER_CONCIERGE_MAX_PUBLISH_REQUESTS_PER_SESSION", 3)) throw new Error(CUSTOMER_DESIGN_RATE_LIMITED);
  }
}

export async function createCustomerDesignSession(input: CustomerDesignInput & {
  sourceRoute?: string | undefined;
  anonymousId?: string | undefined;
  coarseLocation?: Record<string, unknown> | undefined;
}) {
  const token = crypto.randomBytes(24).toString("base64url");
  const resolvedWorkspaceId = workspaceId(input);
  const session = await input.repos.customerDesign.sessions.create({
    id: id("cds"),
    workspace_id: resolvedWorkspaceId,
    session_token_hash: sessionTokenHash(token),
    anonymous_id: text(input.anonymousId) || null,
    source_route: text(input.sourceRoute, "/store/custom"),
    coarse_location: input.coarseLocation ? {
      city: text(input.coarseLocation.city),
      region: text(input.coarseLocation.region),
      country: text(input.coarseLocation.country)
    } : null,
    status: "active",
    expires_at: hoursFromNow(ttlHours())
  } as WorkspaceRow);
  await input.repos.customerDesign.messages.create({
    id: id("cdmsg", `${session.id}:welcome`),
    workspace_id: resolvedWorkspaceId,
    session_id: session.id,
    sender: "concierge",
    message_text: "Tell me what you want on the design. I can make a few safe custom ideas and keep it private for your purchase link.",
    structured_payload: { requiresCustomerInput: true }
  } as WorkspaceRow);
  return { session: safeCustomerDesignSession(session), sessionToken: token };
}

export async function verifyCustomerDesignSession(input: CustomerDesignInput & { sessionId: string; sessionToken: string }) {
  const resolvedWorkspaceId = workspaceId(input);
  const session = await input.repos.customerDesign.sessions.getById(input.sessionId, resolvedWorkspaceId);
  if (!session) throw new Error(CUSTOMER_DESIGN_SESSION_NOT_FOUND);
  if (text(value(session, "session_token_hash", "sessionTokenHash")) !== sessionTokenHash(input.sessionToken)) throw new Error(CUSTOMER_DESIGN_SESSION_INVALID);
  await assertSessionActive({ ...input, workspaceId: resolvedWorkspaceId, session });
  return session;
}

export async function appendCustomerDesignMessage(input: CustomerDesignInput & {
  sessionId: string;
  sessionToken?: string | undefined;
  sender: "customer" | "concierge" | "system" | "agent";
  messageText: string;
  structuredPayload?: Record<string, unknown> | undefined;
}) {
  const resolvedWorkspaceId = workspaceId(input);
  if (input.sessionToken) await verifyCustomerDesignSession({ ...input, workspaceId: resolvedWorkspaceId, sessionToken: input.sessionToken });
  return input.repos.customerDesign.messages.create({
    id: id("cdmsg"),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    sender: input.sender,
    message_text: text(input.messageText),
    structured_payload: input.structuredPayload ?? null
  } as WorkspaceRow);
}

function extractTerms(message: string) {
  const lower = message.toLowerCase();
  const includes = (terms: string[]) => terms.filter((term) => lower.includes(term));
  const forbiddenTerms = includes(["disney", "barbie", "taylor swift", "nfl", "mlb", "ncaa", "yellowstone", "nike", "stetson", "stanley", "buc-ee", "official", "licensed", "dupe", "inspired-by", "inspired by", "knockoff", "replica", "counterfeit", "are you", "women over 40", "40-year-old woman", "divorced moms", "anxious people", "overweight", "people with diabetes"]);
  const productType = lower.includes("hoodie") ? "hoodie" : lower.includes("hat") || lower.includes("cap") ? "hat" : lower.includes("tote") ? "tote" : lower.includes("shirt") || lower.includes("tee") || lower.includes("t-shirt") ? "shirt" : "";
  const location = ["tampa bay", "clearwater", "florida", "hudson", "texas", "charleston", "outer banks"].find((entry) => lower.includes(entry)) ?? "";
  return {
    productType,
    location,
    recipient: lower.includes("dad") ? "dad" : lower.includes("girls") || lower.includes("bachelorette") ? "group trip" : "",
    intendedUse: lower.includes("trip") ? "trip" : lower.includes("charter") ? "charter" : lower.includes("bachelorette") ? "bachelorette trip" : "",
    themeTerms: includes(["redfish", "snook", "tarpon", "fishing", "fish", "coastal cowgirl", "bachelorette", "charter", "rasta", "reggae"]),
    styleTerms: includes(["funny", "classic", "vintage", "bold", "clean", "retro", "coastal", "western"]),
    colorTerms: includes(["red", "green", "yellow", "blue", "black", "white", "sand", "teal", "reggae colors"]),
    phrasePreferences: lower.includes("text") || lower.includes("phrase") || lower.includes("funny") ? ["include short text"] : [],
    forbiddenTerms
  };
}

export async function extractCustomerDesignRequirements(input: CustomerDesignInput & { sessionId: string; messageText?: string | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  const messages = await input.repos.customerDesign.messages.listByWorkspace(resolvedWorkspaceId);
  const textBody = text(input.messageText) || messages.filter((row) => value(row, "session_id", "sessionId") === input.sessionId && value(row, "sender") === "customer").map((row) => text(value(row, "message_text", "messageText"))).join(" ");
  const extracted = extractTerms(textBody);
  const confidence = [extracted.productType, extracted.themeTerms.length, extracted.styleTerms.length, extracted.location].filter(Boolean).length / 4;
  const row = await input.repos.customerDesign.requirements.create({
    id: id("cdreq", `${input.sessionId}:${hash(textBody)}:${Date.now()}`),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    product_type: extracted.productType || null,
    intended_use: extracted.intendedUse || null,
    recipient: extracted.recipient || null,
    location_context: extracted.location || null,
    theme_terms: extracted.themeTerms,
    style_terms: extracted.styleTerms,
    color_terms: extracted.colorTerms,
    phrase_preferences: extracted.phrasePreferences,
    forbidden_terms: extracted.forbiddenTerms,
    confidence_score: confidence.toFixed(4)
  } as WorkspaceRow);
  await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({
    status: extracted.productType && extracted.themeTerms.length ? "generating_candidates" : "awaiting_customer_input",
    customer_intent_summary: compactIntent(row)
  }));
  return row;
}

function compactIntent(requirement: WorkspaceRow) {
  return [
    text(value(requirement, "product_type", "productType")),
    asStringArray(value(requirement, "theme_terms", "themeTerms")).join(", "),
    text(value(requirement, "location_context", "locationContext")),
    asStringArray(value(requirement, "forbidden_terms", "forbiddenTerms")).join(", ")
  ].filter(Boolean).join(" / ");
}

export function clarifyingQuestionForRequirement(requirement: WorkspaceRow) {
  if (!text(value(requirement, "product_type", "productType"))) return "What product should this go on: shirt, hoodie, hat, or tote?";
  if (!asStringArray(value(requirement, "theme_terms", "themeTerms")).length) return "What should the design be inspired by: fish, place, trip, event, or phrase?";
  return "Want text on the design, or should it stay image-only?";
}

export async function handleCustomerDesignMessage(input: CustomerDesignInput & { sessionId: string; sessionToken: string; messageText: string }) {
  const session = await verifyCustomerDesignSession(input);
  await ensureSessionLimit({ ...input, limitType: "messages" });
  const customerMessage = await appendCustomerDesignMessage({ ...input, sender: "customer" });
  const requirement = await extractCustomerDesignRequirements({ ...input, messageText: input.messageText });
  const needsClarification = !text(value(requirement, "product_type", "productType")) || !asStringArray(value(requirement, "theme_terms", "themeTerms")).length;
  const reply = needsClarification
    ? clarifyingQuestionForRequirement(requirement)
    : "I have enough to make a few safe custom design directions. I will avoid official brands, teams, celebrities, and copyrighted references.";
  const conciergeMessage = await appendCustomerDesignMessage({
    ...input,
    sender: "concierge",
    messageText: reply,
    structuredPayload: { requirementId: requirement.id, readyForCandidates: !needsClarification }
  });
  return { session, customerMessage, requirement, conciergeMessage, readyForCandidates: !needsClarification };
}

async function createPolicyReviewForText(input: CustomerDesignInput & { targetType: string; targetId: string; text: string }) {
  const resolvedWorkspaceId = workspaceId(input);
  const result = runDeterministicPolicyRules({ text: input.text, location: input.targetType });
  const row = await upsert(input.repos.marketing.policyReviewResults, {
    id: id("policy", `${resolvedWorkspaceId}:${input.targetType}:${input.targetId}:${hash(input.text)}`),
    workspace_id: resolvedWorkspaceId,
    target_type: input.targetType,
    target_id: input.targetId,
    platform: "customer_design_concierge",
    verdict: result.verdict,
    severity: result.risk_level === "severe" ? "critical" : result.risk_level,
    policy_codes: result.policy_codes,
    evidence: { sourceTextHash: hash(input.text), customerDesign: true },
    fix_suggestions: result.fix_suggestions,
    owner_override: null,
    blocked: result.risk_level !== "none",
    source_text_hash: hash(input.text),
    ruleset_version: "policy_claims_ip_v1",
    flagged_terms: result.flagged_terms,
    unsupported_claims: result.unsupported_claims,
    personal_attribute_flags: result.personal_attribute_flags,
    ip_flags: result.ip_flags,
    risk_level: result.risk_level,
    suggested_rewrite: null,
    rewrite_recheck_status: "not_needed"
  } as WorkspaceRow);
  return { policyReview: row, result };
}

function safeCandidateTemplates(requirement: WorkspaceRow) {
  const productType = text(value(requirement, "product_type", "productType"), "shirt");
  const location = text(value(requirement, "location_context", "locationContext"));
  const themes = asStringArray(value(requirement, "theme_terms", "themeTerms"));
  const styles = asStringArray(value(requirement, "style_terms", "styleTerms"));
  const colors = asStringArray(value(requirement, "color_terms", "colorTerms"));
  const subject = themes.includes("redfish") ? "redfish" : themes.includes("snook") ? "snook" : themes.includes("coastal cowgirl") ? "coastal cowgirl" : themes.includes("fishing") || themes.includes("fish") ? "fishing" : themes[0] || "coastal";
  const place = location ? `${titleCase(location)} ` : "";
  const tone = styles[0] || "clean";
  const palette = colors.length ? colors : ["seafoam", "sand", "navy"];
  return [
    {
      title: `${place}${titleCase(subject)} Trip ${titleCase(productType)}`,
      concept: `A ${tone} ${productType} concept with original ${subject} artwork and trip-friendly wording.`,
      designText: subject === "redfish" ? "Reel Good Day" : subject === "snook" ? "Snook Season Crew" : "Coast Mode",
      motifs: [subject, "waterline", "sun-washed texture"],
      palette
    },
    {
      title: `${titleCase(subject)} Dock Badge`,
      concept: "A badge-style design that feels local and giftable while avoiding protected team, brand, or rights-holder references.",
      designText: "Dock Days",
      motifs: [subject, "dock badge", "rope border"],
      palette
    },
    {
      title: `${place}Weekend Catch`,
      concept: `A relaxed custom ${productType} direction for a trip, charter, or family gift.`,
      designText: "Weekend Catch",
      motifs: [subject, "retro sun", "small waves"],
      palette
    },
    {
      title: `Original Coastal Charter`,
      concept: "A simple charter-inspired layout with original motifs and no public catalog promotion.",
      designText: "Custom Crew",
      motifs: [subject, "boat wake", "hand-lettered text"],
      palette
    },
    {
      title: `${titleCase(tone)} Saltwater Keepsake`,
      concept: "A cleaner keepsake-style option for customers who want less text and more visual balance.",
      designText: "",
      motifs: [subject, "coastal frame", "soft texture"],
      palette
    }
  ].slice(0, maxCandidates());
}

function titleCase(input: string) {
  return input.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export async function generateCustomerDesignCandidates(input: CustomerDesignInput & { sessionId: string; sessionToken?: string | undefined; requirementId?: string | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  if (!input.sessionToken) throw new Error(CUSTOMER_DESIGN_SESSION_INVALID);
  await verifyCustomerDesignSession({ ...input, workspaceId: resolvedWorkspaceId, sessionToken: input.sessionToken });
  await ensureSessionLimit({ ...input, workspaceId: resolvedWorkspaceId, limitType: "generations" });
  const requirements = await input.repos.customerDesign.requirements.listByWorkspace(resolvedWorkspaceId);
  const requirement = text(input.requirementId)
    ? await input.repos.customerDesign.requirements.getById(text(input.requirementId), resolvedWorkspaceId)
    : requirements.filter((row) => value(row, "session_id", "sessionId") === input.sessionId).at(-1) ?? null;
  if (!requirement) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
  const sourceText = compactIntent(requirement);
  const requestPolicy = await createPolicyReviewForText({ ...input, workspaceId: resolvedWorkspaceId, targetType: "customer_design_request", targetId: requirement.id, text: sourceText });
  const candidates = [];
  if (requestPolicy.result.risk_level !== "none") {
    const blocked = await input.repos.customerDesign.candidates.create({
      id: id("cdcand"),
      workspace_id: resolvedWorkspaceId,
      session_id: input.sessionId,
      requirement_id: requirement.id,
      candidate_index: 0,
      title: "Protected reference blocked",
      concept_summary: "I cannot create designs using official teams, celebrities, Disney, Barbie, brand names, or dupe/inspired-by language. I can make an original design with a similar general vibe.",
      design_text: "",
      visual_motifs: [],
      palette: [],
      policy_review_id: requestPolicy.policyReview.id,
      status: "blocked",
      risk_flags: requestPolicy.result.policy_codes
    } as WorkspaceRow);
    candidates.push(blocked);
  }
  for (const [index, candidate] of safeCandidateTemplates(requirement).entries()) {
    const policyText = [candidate.title, candidate.concept, candidate.designText, candidate.motifs.join(" ")].join("\n");
    const policy = await createPolicyReviewForText({ ...input, workspaceId: resolvedWorkspaceId, targetType: "customer_design_candidate", targetId: `${input.sessionId}:${index + 1}`, text: policyText });
    candidates.push(await input.repos.customerDesign.candidates.create({
      id: id("cdcand", `${input.sessionId}:${index + 1}:${hash(policyText)}:${Date.now()}`),
      workspace_id: resolvedWorkspaceId,
      session_id: input.sessionId,
      requirement_id: requirement.id,
      candidate_index: index + 1,
      title: candidate.title,
      concept_summary: candidate.concept,
      prompt_text: `Original ${candidate.concept}. Motifs: ${candidate.motifs.join(", ")}.`,
      negative_prompt_text: "Avoid protected brands, teams, celebrities, copyrighted characters, copycat language, and direct personal-attribute copy.",
      design_text: candidate.designText,
      visual_motifs: candidate.motifs,
      palette: candidate.palette,
      policy_review_id: policy.policyReview.id,
      status: policy.result.risk_level === "none" ? "shown_to_customer" : "blocked",
      risk_flags: policy.result.policy_codes
    } as WorkspaceRow));
  }
  await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({ status: "awaiting_customer_approval" }));
  await input.repos.customerDesign.agentRuns.create({
    id: id("cdrun"),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    agent_role: "customer_design_brief_agent",
    status: "completed",
    input_refs: [{ type: "customer_design_requirement", id: requirement.id }],
    output_refs: candidates.map((candidate) => ({ type: "customer_design_candidate", id: candidate.id }))
  } as WorkspaceRow);
  return { requirement, candidates, requestPolicyReview: requestPolicy.policyReview };
}

export async function attachPreviewAssetToCandidate(input: CustomerDesignInput & { sessionId: string; sessionToken?: string | undefined; candidateId: string; mode?: "fixture" | "disabled" | "existing_pipeline" | "live" | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  if (!input.sessionToken) throw new Error(CUSTOMER_DESIGN_SESSION_INVALID);
  await verifyCustomerDesignSession({ ...input, workspaceId: resolvedWorkspaceId, sessionToken: input.sessionToken });
  const candidate = await input.repos.customerDesign.candidates.getById(input.candidateId, resolvedWorkspaceId);
  if (!candidate || value(candidate, "session_id", "sessionId") !== input.sessionId) throw new Error(CUSTOMER_DESIGN_CANDIDATE_NOT_FOUND);
  if (text(value(candidate, "status")) === "blocked") throw new Error(CUSTOMER_DESIGN_CANDIDATE_BLOCKED);
  const policy = await input.repos.marketing.policyReviewResults.getById(text(value(candidate, "policy_review_id", "policyReviewId")), resolvedWorkspaceId);
  const policySafe = policy && text(value(policy, "risk_level", "riskLevel"), "none") === "none" && !bool(value(policy, "blocked")) && asArray(value(policy, "flagged_terms", "flaggedTerms")).length === 0;
  if (!policySafe) throw new Error(CUSTOMER_DESIGN_CANDIDATE_BLOCKED);
  const requestedMode = input.mode ?? (process.env.CUSTOMER_CONCIERGE_IMAGE_MODE as "fixture" | undefined) ?? (process.env.NODE_ENV === "test" ? "fixture" : "disabled");
  if (requestedMode !== "fixture") return { candidate, imageGenerationMode: requestedMode, previewAttached: false };
  if (parseEnv().APP_ENV === "production") return { candidate, imageGenerationMode: "disabled", previewAttached: false };
  const asset = await input.repos.asset.create({
    id: id("cdasset", candidate.id),
    workspace_id: resolvedWorkspaceId,
    entity_type: "customer_design_candidate",
    entity_id: candidate.id,
    asset_type: "fixture_preview",
    title: text(value(candidate, "title"), "Custom design preview"),
    description: "Fixture-only preview for customer design concierge test/dev flow.",
    file_ref: `/api/store/customer-design/preview-fixture/${candidate.id}.png`,
    status: "approved",
    qa_status: "passed",
    visibility: "private",
    metadata: { fixturePreview: true, providerMutation: false, hfTouched: false }
  } as WorkspaceRow);
  const updated = await input.repos.customerDesign.candidates.update(candidate.id, patchRow({
    preview_asset_id: asset.id,
    preview_image_url: `/store/custom/preview/${candidate.id}`,
    status: value(candidate, "status") === "blocked" ? "blocked" : "shown_to_customer"
  }));
  return { candidate: updated, asset, imageGenerationMode: "fixture", previewAttached: true };
}

export async function recordCustomerDesignApproval(input: CustomerDesignInput & { sessionId: string; sessionToken: string; candidateId: string; eventType?: string | undefined; customerNote?: string | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  await verifyCustomerDesignSession({ ...input, workspaceId: resolvedWorkspaceId });
  const candidate = await input.repos.customerDesign.candidates.getById(input.candidateId, resolvedWorkspaceId);
  if (!candidate || value(candidate, "session_id", "sessionId") !== input.sessionId) throw new Error(CUSTOMER_DESIGN_CANDIDATE_NOT_FOUND);
  const eventType = text(input.eventType, "approved_for_purchase_product");
  const isApproval = eventType === "approved_for_purchase_product" || eventType === "selected";
  if (isApproval) {
    if (text(value(candidate, "status")) === "blocked") throw new Error(CUSTOMER_DESIGN_CANDIDATE_BLOCKED);
    const policy = await input.repos.marketing.policyReviewResults.getById(text(value(candidate, "policy_review_id", "policyReviewId")), resolvedWorkspaceId);
    const policySafe = policy && text(value(policy, "risk_level", "riskLevel"), "none") === "none" && !bool(value(policy, "blocked")) && asArray(value(policy, "flagged_terms", "flaggedTerms")).length === 0;
    if (!policySafe) throw new Error(CUSTOMER_DESIGN_CANDIDATE_BLOCKED);
  }
  const event = await input.repos.customerDesign.approvalEvents.create({
    id: id("cdevent"),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    candidate_id: candidate.id,
    event_type: eventType,
    customer_note: text(input.customerNote) || null
  } as WorkspaceRow);
  const status = isApproval ? "customer_selected" : eventType === "rejected" ? "customer_rejected" : "shown_to_customer";
  const updatedCandidate = await input.repos.customerDesign.candidates.update(candidate.id, patchRow({ status }));
  if (isApproval) {
    await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({ status: "approved_candidate" }));
  } else if (eventType === "rejected") {
    await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({ status: "awaiting_customer_approval" }));
  } else if (eventType === "requested_edit" || eventType === "requested_more") {
    await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({ status: "awaiting_customer_input" }));
  }
  return { event, candidate: updatedCandidate };
}

async function latestApproval(input: CustomerDesignInput & { sessionId: string; candidateId: string }) {
  const rows = await input.repos.customerDesign.approvalEvents.listByWorkspace(workspaceId(input));
  return rows.filter((row) =>
    value(row, "session_id", "sessionId") === input.sessionId &&
    value(row, "candidate_id", "candidateId") === input.candidateId &&
    ["selected", "approved_for_purchase_product"].includes(text(value(row, "event_type", "eventType")))
  ).at(-1) ?? null;
}

type CustomerEconomics = {
  price: string;
  cost: string;
  shippingCost: string;
  paymentFee: string;
  platformFee: string;
  source: "configured" | "fixture_test_configured";
};

function resolveCustomerEconomics(mode: ReturnType<typeof productCreateMode>) {
  const values = {
    price: moneyOrNull(process.env.CUSTOMER_CONCIERGE_DEFAULT_PRICE),
    cost: moneyOrNull(process.env.CUSTOMER_CONCIERGE_DEFAULT_COGS),
    shippingCost: moneyOrNull(process.env.CUSTOMER_CONCIERGE_DEFAULT_SHIPPING_COST),
    paymentFee: moneyOrNull(process.env.CUSTOMER_CONCIERGE_DEFAULT_PAYMENT_FEE),
    platformFee: moneyOrNull(process.env.CUSTOMER_CONCIERGE_DEFAULT_PLATFORM_FEE)
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return { ok: false as const, missing };
  return {
    ok: true as const,
    economics: {
      price: values.price!,
      cost: values.cost!,
      shippingCost: values.shippingCost!,
      paymentFee: values.paymentFee!,
      platformFee: values.platformFee!,
      source: mode === "test_adapter" && parseEnv().APP_ENV !== "production" ? "fixture_test_configured" : "configured"
    } satisfies CustomerEconomics
  };
}

async function resolveCandidateRequirement(input: CustomerDesignInput & { candidate: WorkspaceRow }) {
  const resolvedWorkspaceId = workspaceId(input);
  const requirementId = text(value(input.candidate, "requirement_id", "requirementId"));
  return requirementId ? await input.repos.customerDesign.requirements.getById(requirementId, resolvedWorkspaceId) : null;
}

async function resolveCustomerProductType(input: CustomerDesignInput & { candidate: WorkspaceRow }) {
  const requirement = await resolveCandidateRequirement(input);
  const requested = text(value(requirement, "product_type", "productType")).toLowerCase();
  const configuredDefault = text(process.env.CUSTOMER_CONCIERGE_DEFAULT_PRODUCT_TYPE, "shirt").toLowerCase();
  const productType = requested || configuredDefault;
  return { productType, productTypeDefaulted: !requested, requirement };
}

async function createCandidateDraftForChecks(input: CustomerDesignInput & { sessionId: string; candidate: WorkspaceRow; economics: CustomerEconomics; productType: string; productTypeDefaulted: boolean }) {
  const resolvedWorkspaceId = workspaceId(input);
  const draftId = id("cddraft", input.candidate.id);
  const variantId = id("cdvariant", input.candidate.id);
  const marginId = id("cdmargin", input.candidate.id);
  const mockupId = id("cdmockup", input.candidate.id);
  const price = input.economics.price;
  const cost = input.economics.cost;
  await upsert(input.repos.draft, {
    id: draftId,
    workspace_id: resolvedWorkspaceId,
    title: text(value(input.candidate, "title"), "Custom purchase product"),
    description: text(value(input.candidate, "concept_summary", "conceptSummary"), "Customer-specific custom product for private purchase link."),
    product_type: input.productType,
    category: input.productType,
    tags: ["customer-specific", "customer-generated", "private-custom"],
    price,
    asset_id: text(value(input.candidate, "preview_asset_id", "previewAssetId")) || null,
    mockup_ids: [mockupId],
    approval_status: "approved",
    status: "approved",
    public_projection: {},
    metadata: {
      customerDesignSessionId: input.sessionId,
      customerDesignCandidateId: input.candidate.id,
      publicCatalogPromoted: false,
      productTypeDefaulted: input.productTypeDefaulted,
      customerDesignEconomicsSource: input.economics.source
    }
  } as WorkspaceRow);
  await upsert(input.repos.variant, {
    id: variantId,
    workspace_id: resolvedWorkspaceId,
    product_draft_id: draftId,
    title: "Default",
    price,
    cost,
    status: "active"
  } as WorkspaceRow);
  await upsert(input.repos.margin, {
    id: marginId,
    workspace_id: resolvedWorkspaceId,
    product_draft_id: draftId,
    price,
    cost,
    printify_shipping_estimate: input.economics.shippingCost,
    shopify_fee_estimate: input.economics.paymentFee,
    platform_fee_estimate: input.economics.platformFee,
    status: "passed",
    blocked: false,
    metadata: { customerDesignEconomicsSource: input.economics.source, fixtureEconomics: input.economics.source === "fixture_test_configured" }
  } as WorkspaceRow);
  await upsert(input.repos.mockup, {
    id: mockupId,
    workspace_id: resolvedWorkspaceId,
    product_draft_id: draftId,
    asset_id: text(value(input.candidate, "preview_asset_id", "previewAssetId")) || null,
    status: "approved",
    approved_for_product: true,
    quality_status: "passed"
  } as WorkspaceRow);
  return { draftId };
}

async function blockPublishJob(input: CustomerDesignInput & { sessionId: string; candidateId: string; reason: string; safetyChecks?: Record<string, unknown> | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  const job = await input.repos.customerDesign.publishJobs.create({
    id: id("cdjob"),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    candidate_id: input.candidateId,
    status: "blocked",
    block_reason: input.reason,
    product_visibility: "owner_review_required",
    safety_checks: input.safetyChecks ?? {}
  } as WorkspaceRow);
  await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({ status: "blocked" }));
  return { ok: false as const, job, blockingReason: input.reason };
}

export async function requestCustomerSpecificProductCreation(input: CustomerDesignInput & { sessionId: string; sessionToken: string; candidateId: string; shopifyAdmin?: { createProductDraft(product: unknown): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> } | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  await verifyCustomerDesignSession({ ...input, workspaceId: resolvedWorkspaceId });
  await ensureSessionLimit({ ...input, workspaceId: resolvedWorkspaceId, limitType: "publishRequests" });
  const candidate = await input.repos.customerDesign.candidates.getById(input.candidateId, resolvedWorkspaceId);
  if (!candidate || value(candidate, "session_id", "sessionId") !== input.sessionId) throw new Error(CUSTOMER_DESIGN_CANDIDATE_NOT_FOUND);
  const approval = await latestApproval({ ...input, workspaceId: resolvedWorkspaceId });
  if (!approval) return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "customer_approval_required" });
  const autoPublishEnabled = enabledFlag("CUSTOMER_CONCIERGE_AUTO_PUBLISH_ENABLED", false);
  const allowShopifyCreate = enabledFlag("CUSTOMER_CONCIERGE_ALLOW_SHOPIFY_PRODUCT_CREATE", false);
  const mode = productCreateMode();
  if (!autoPublishEnabled || !allowShopifyCreate || mode === "disabled") return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "customer_concierge_auto_publish_disabled" });
  const policy = await input.repos.marketing.policyReviewResults.getById(text(value(candidate, "policy_review_id", "policyReviewId")), resolvedWorkspaceId);
  const policyPassed = policy ? text(value(policy, "risk_level", "riskLevel"), "none") === "none" && !bool(value(policy, "blocked")) && asArray(value(policy, "flagged_terms", "flaggedTerms")).length === 0 : false;
  if (!policyPassed) return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "policy_review_failed_or_flagged", safetyChecks: { policyPassed } });
  const { productType, productTypeDefaulted } = await resolveCustomerProductType({ ...input, workspaceId: resolvedWorkspaceId, candidate });
  if (!allowedProductTypes().includes(productType)) return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "product_type_not_allowed", safetyChecks: { productType } });
  const economics = resolveCustomerEconomics(mode);
  if (!economics.ok) return blockPublishJob({
    ...input,
    workspaceId: resolvedWorkspaceId,
    reason: CUSTOMER_DESIGN_MARGIN_DATA_MISSING,
    safetyChecks: { missingEconomics: economics.missing, marginPassed: false, productType, productTypeDefaulted }
  });
  const previewAssetId = text(value(candidate, "preview_asset_id", "previewAssetId"));
  const previewAsset = previewAssetId ? await input.repos.asset.getById(previewAssetId, resolvedWorkspaceId) : null;
  const previewQaPassed = Boolean(previewAsset && ["passed", "approved"].includes(text(value(previewAsset, "qa_status", "qaStatus") ?? value(previewAsset, "status"))));
  if (!previewQaPassed) return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "preview_qa_required", safetyChecks: { previewQaPassed } });
  const { draftId } = await createCandidateDraftForChecks({ ...input, workspaceId: resolvedWorkspaceId, candidate, economics: economics.economics, productType, productTypeDefaulted });
  const deterministicInput = { repos: input.repos, workspaceId: resolvedWorkspaceId, actorId: input.actorId, sourceEntityType: "product_draft", sourceEntityId: draftId };
  const [readiness, margin, draftPolicy] = await Promise.all([
    runDeterministicReadinessCheck(deterministicInput),
    calculateMarginEconomics(deterministicInput),
    runUnifiedPolicyIpCheck({ ...deterministicInput, content: [value(candidate, "title"), value(candidate, "concept_summary", "conceptSummary"), value(candidate, "design_text", "designText")].filter(Boolean).join("\n") })
  ]);
  const readinessPassed = readiness.deterministic.verdict === "ready";
  const marginPassed = margin.deterministic.missing_cost_data === false && margin.deterministic.floor_breach === false && !["unknown", "not_ready"].includes(text(margin.deterministic.paid_readiness));
  const finalPolicyPassed = text(value(draftPolicy.policyReview, "risk_level", "riskLevel"), "none") === "none" && !bool(value(draftPolicy.policyReview, "blocked")) && asArray(value(draftPolicy.policyReview, "flagged_terms", "flaggedTerms")).length === 0;
  const safetyChecks = {
    customerApproval: true,
    policyPassed: finalPolicyPassed,
    readinessPassed,
    marginPassed,
    previewQaPassed,
    publicCatalogPromoted: false,
    productType,
    productTypeDefaulted,
    economicsSource: economics.economics.source,
    missingCostData: margin.deterministic.missing_cost_data === true,
    floorBreach: margin.deterministic.floor_breach === true,
    paidReadiness: margin.deterministic.paid_readiness
  };
  if (!readinessPassed || !marginPassed || !finalPolicyPassed) {
    return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "deterministic_gate_failed", safetyChecks });
  }
  const handle = `custom-${hash(`${input.sessionId}:${candidate.id}`)}`;
  const accessToken = purchaseAccessToken();
  const purchaseAccessTokenHash = sessionTokenHash(accessToken);
  let shopifyProductId = `test_${handle}`;
  let purchaseUrl = `/store/custom/purchase/${handle}`;
  let returnedPurchaseUrl = `/store/custom/purchase/${handle}?accessToken=${encodeURIComponent(accessToken)}`;
  let purchaseUrlMode: "test_adapter_product_page" | "shopify_product_link" | "shopify_checkout" = "test_adapter_product_page";
  if (mode === "live") {
    if (process.env.RUN_LIVE_CUSTOMER_CONCIERGE_SHOPIFY_SMOKE !== "true") return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: "live_shopify_smoke_not_enabled", safetyChecks });
    const admin = input.shopifyAdmin ?? createCommerceProviders(parseEnv()).admin;
    const created = await admin.createProductDraft({
      title: text(value(candidate, "title")),
      description: text(value(candidate, "concept_summary", "conceptSummary")),
      productType,
      price: "30.00",
      tags: ["customer-generated", "customer-specific", "hidden-unlisted", "owner-review-required"],
      images: text(value(candidate, "preview_image_url", "previewImageUrl")) ? [{ url: text(value(candidate, "preview_image_url", "previewImageUrl")), approved: true }] : [],
      seoTitle: text(value(candidate, "title")).slice(0, 70),
      seoDescription: "Customer-specific custom purchase product. Owner review required before any public promotion."
    });
    if (!created.ok) return blockPublishJob({ ...input, workspaceId: resolvedWorkspaceId, reason: created.error || "shopify_product_create_failed", safetyChecks });
    const product = asRecord((created.data as Record<string, unknown>)?.product ?? created.data);
    shopifyProductId = text(product.id, shopifyProductId);
    purchaseUrl = text(product.handle) ? `/products/${text(product.handle)}` : purchaseUrl;
    purchaseUrlMode = "shopify_product_link";
  }
  const job = await input.repos.customerDesign.publishJobs.create({
    id: id("cdjob"),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    candidate_id: candidate.id,
    status: "product_created",
    shopify_product_id: shopifyProductId,
    shopify_handle: handle,
    purchase_url: purchaseUrl,
    product_visibility: "customer_specific",
    safety_checks: { ...safetyChecks, purchaseAccessTokenHash, purchaseUrlMode }
  } as WorkspaceRow);
  const product = await input.repos.customerDesign.customerSpecificProducts.create({
    id: id("cdprod", job.id),
    workspace_id: resolvedWorkspaceId,
    session_id: input.sessionId,
    candidate_id: candidate.id,
    publish_job_id: job.id,
    shopify_product_id: shopifyProductId,
    shopify_handle: handle,
    purchase_url: purchaseUrl,
    expires_at: hoursFromNow(72),
    promoted_to_public: false,
    owner_review_status: "not_requested"
  } as WorkspaceRow);
  await input.repos.customerDesign.candidates.update(candidate.id, patchRow({ readiness_check_id: readiness.readinessCheck.id, margin_analysis_id: margin.marginAnalysis.id }));
  await input.repos.customerDesign.sessions.update(input.sessionId, patchRow({ status: "product_created" }));
  return { ok: true as const, job, customerSpecificProduct: product, purchaseUrl: returnedPurchaseUrl, storedPurchaseUrl: purchaseUrl, safetyChecks, shopifyProductCreateMode: mode, productCreateMode: mode, purchaseUrlMode };
}

export async function getCustomerDesignSessionDetail(input: CustomerDesignInput & { sessionId: string; sessionToken?: string | undefined; ownerView?: boolean | undefined }) {
  const resolvedWorkspaceId = workspaceId(input);
  if (!input.ownerView) await verifyCustomerDesignSession({ ...input, workspaceId: resolvedWorkspaceId, sessionToken: text(input.sessionToken) });
  const session = await input.repos.customerDesign.sessions.getById(input.sessionId, resolvedWorkspaceId);
  if (!session) throw new Error(CUSTOMER_DESIGN_SESSION_NOT_FOUND);
  const bySession = (row: WorkspaceRow) => value(row, "session_id", "sessionId") === input.sessionId;
  const [messages, requirements, candidates, approvals, jobs, products] = await Promise.all([
    input.repos.customerDesign.messages.listByWorkspace(resolvedWorkspaceId),
    input.repos.customerDesign.requirements.listByWorkspace(resolvedWorkspaceId),
    input.repos.customerDesign.candidates.listByWorkspace(resolvedWorkspaceId),
    input.repos.customerDesign.approvalEvents.listByWorkspace(resolvedWorkspaceId),
    input.repos.customerDesign.publishJobs.listByWorkspace(resolvedWorkspaceId),
    input.repos.customerDesign.customerSpecificProducts.listByWorkspace(resolvedWorkspaceId)
  ]);
  return {
    session: safeSession(session),
    messages: messages.filter(bySession),
    requirements: requirements.filter(bySession),
    candidates: candidates.filter(bySession),
    approvals: approvals.filter(bySession),
    publishJobs: jobs.filter(bySession),
    customerSpecificProducts: products.filter(bySession)
  };
}

function safeSession(session: WorkspaceRow) {
  return safeCustomerDesignSession(session);
}

export async function listCustomerDesignSessions(input: CustomerDesignInput) {
  const sessions = await input.repos.customerDesign.sessions.listByWorkspace(workspaceId(input));
  return sessions.map(safeSession);
}

export async function updateCustomerSpecificProductReview(input: CustomerDesignInput & { productId: string; status: "pending_review" | "approved" | "rejected" }) {
  const product = await input.repos.customerDesign.customerSpecificProducts.getById(input.productId, workspaceId(input));
  if (!product) throw new Error("customer_specific_product_not_found");
  return input.repos.customerDesign.customerSpecificProducts.update(product.id, patchRow({
    owner_review_status: input.status,
    promoted_to_public: false
  }));
}

export async function getCustomerPurchaseLinkDetail(input: CustomerDesignInput & { handle: string; accessToken: string }) {
  const resolvedWorkspaceId = workspaceId(input);
  const products = await input.repos.customerDesign.customerSpecificProducts.listByWorkspace(resolvedWorkspaceId);
  const product = products.find((row) => text(value(row, "shopify_handle", "shopifyHandle")) === input.handle);
  if (!product) throw new Error(CUSTOMER_DESIGN_PURCHASE_LINK_FORBIDDEN);
  const expiresMs = expiresAtMs(product);
  if (expiresMs != null && expiresMs <= Date.now()) throw new Error(CUSTOMER_DESIGN_PURCHASE_LINK_FORBIDDEN);
  const jobId = text(value(product, "publish_job_id", "publishJobId"));
  const job = jobId ? await input.repos.customerDesign.publishJobs.getById(jobId, resolvedWorkspaceId) : null;
  const checks = asRecord(value(job, "safety_checks", "safetyChecks"));
  const expectedHash = text(checks.purchaseAccessTokenHash);
  if (!expectedHash || expectedHash !== sessionTokenHash(input.accessToken)) throw new Error(CUSTOMER_DESIGN_PURCHASE_LINK_FORBIDDEN);
  const candidateId = text(value(product, "candidate_id", "candidateId"));
  const candidate = candidateId ? await input.repos.customerDesign.candidates.getById(candidateId, resolvedWorkspaceId) : null;
  return {
    product: {
      id: product.id,
      shopify_handle: value(product, "shopify_handle", "shopifyHandle") ?? null,
      purchase_url: value(product, "purchase_url", "purchaseUrl") ?? null,
      owner_review_status: value(product, "owner_review_status", "ownerReviewStatus") ?? null,
      promoted_to_public: value(product, "promoted_to_public", "promotedToPublic") === true
    },
    job: {
      id: job?.id ?? null,
      status: value(job, "status") ?? null,
      purchaseUrlMode: text(checks.purchaseUrlMode, "test_adapter_product_page"),
      productVisibility: value(job, "product_visibility", "productVisibility") ?? null
    },
    candidate: candidate ? {
      id: candidate.id,
      title: value(candidate, "title") ?? "Custom design",
      concept_summary: value(candidate, "concept_summary", "conceptSummary") ?? "",
      design_text: value(candidate, "design_text", "designText") ?? "",
      preview_image_url: value(candidate, "preview_image_url", "previewImageUrl") ?? null
    } : null
  };
}

export function reportContainsToken(report: Record<string, unknown>) {
  const serialized = JSON.stringify(report);
  if (serialized.includes("session_token_hash") || serialized.includes("sessionTokenHash")) return true;
  const candidates = [
    process.env.SHOPIFY_ADMIN_TOKEN,
    process.env.SHOPIFY_STOREFRONT_TOKEN,
    process.env.HF_API_TOKEN,
    process.env.HUGGING_FACE_API_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ].filter((entry): entry is string => Boolean(entry && entry.length > 6));
  return candidates.some((secret) => serialized.includes(secret));
}
