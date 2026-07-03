import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireWorkspaceMember, type StudioUser } from "@saltyfactory/auth";
import { buildFeatureReadiness, buildOwnerSetupCards, parseEnv, setupGuidesForProvider, type RuntimeConfig } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { decryptCredential, encryptCredential, sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../_auth";
import {
  createShopifyAdminProviderForWorkspace,
  encodeShopifyCredentialPayload,
  isSafeShopifyCollectionId,
  isShopifyClientId,
  isShopifyStoreDomain,
  sanitizeShopifyStoreDomain
} from "../_shopify-admin";

export const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

type ValidationStatus = "connected" | "missing" | "invalid" | "blocked" | "owner_gated" | "config_blocked";

type ProviderKey = "printify" | "shopify" | "image_generation" | "storage" | "banking" | "external_orders" | "live_publish";

const providerLabels: Record<string, string> = {
  printify: "Printify",
  shopify: "Shopify Admin",
  image_generation: "Image Generation",
  storage: "Private Media Storage",
  banking: "Banking / Plaid",
  external_orders: "External Orders",
  live_publish: "Live Publish"
};

function canonicalProviderKey(value: string): ProviderKey {
  const normalized = value.replace(/-/g, "_");
  const aliases: Record<string, ProviderKey> = {
    shopify_admin: "shopify",
    hugging_face: "image_generation",
    huggingface: "image_generation",
    image: "image_generation",
    plaid: "banking",
    novo: "banking",
    staples: "external_orders"
  };
  return (aliases[normalized] ?? normalized) as ProviderKey;
}

function safeJson(data: unknown, status = 200) {
  const text = JSON.stringify(data);
  if (/shpat_|sk_live_|hf_[A-Za-z0-9]|printify_[A-Za-z0-9]|"?(access_token|refresh_token)"?\s*:|"(api[_-]?token|clientSecret|client_secret)"\s*:/i.test(text)) {
    return NextResponse.json({ ok: false, status: "error", safeMessage: "A secret-like value was blocked from the response." }, { status: 500 });
  }
  return NextResponse.json(data, { status });
}

function validationResponse(input: {
  ok: boolean;
  status: ValidationStatus;
  safeMessage: string;
  setupRequired?: string[];
  nextStep?: string;
  maskedDisplayValue?: string | null;
  providerMetadata?: Record<string, unknown>;
}, httpStatus = 200) {
  return safeJson({
    ok: input.ok,
    status: input.status,
    safeMessage: sanitizeProviderError(input.safeMessage),
    setupRequired: input.setupRequired ?? [],
    nextStep: input.nextStep ?? null,
    maskedDisplayValue: input.maskedDisplayValue ?? null,
    providerMetadata: input.providerMetadata ?? {}
  }, httpStatus);
}

function storageReady(config: RuntimeConfig) {
  return Boolean(config.CREDENTIAL_STORAGE_ENABLED && config.CREDENTIAL_ENCRYPTION_KEY && config.CREDENTIAL_ENCRYPTION_KEY.trim().length >= 32);
}

function storageBlockedResponse() {
  return validationResponse({
    ok: false,
    status: "config_blocked",
    safeMessage: "Secure credential storage is not configured. An administrator must enable encrypted credential storage before owner-entered secrets can be saved.",
    setupRequired: ["Enable encrypted credential storage", "Configure the server encryption key", "Ask an administrator to complete server setup"],
    nextStep: "Request setup help"
  }, 503);
}

function maskSavedCredential() {
  return "Saved securely";
}

function auditRow(workspaceId: string, actorId: string, action: string, entityId: string, afterState: Record<string, unknown> = {}) {
  return {
    id: `audit_${action}_${Date.now()}`,
    workspace_id: workspaceId,
    entity_type: "provider_connection",
    entity_id: entityId,
    action,
    actor_type: "human",
    actor_id: actorId,
    after_state: JSON.stringify(afterState),
    metadata: { source: "setup_concierge" }
  };
}

function safeConnection(row: WorkspaceRow | null) {
  if (!row) return null;
  const configuration = (row.configuration ?? row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    provider: row.provider_type ?? row.providerType ?? row.provider ?? "",
    displayName: row.provider_name ?? row.providerName ?? providerLabels[String(row.provider_type ?? row.providerType ?? row.provider ?? "")] ?? "Provider",
    status: row.status ?? "not_started",
    enabled: Boolean(row.enabled),
    credentialStored: Boolean(row.secret_ref ?? row.secretRef),
    credentialRef: row.secret_ref || row.secretRef ? "[stored]" : null,
    maskedDisplayValue: configuration.maskedDisplayValue ?? null,
    lastValidatedAt: row.last_health_check_at ?? row.lastHealthCheckAt ?? row.verified_at ?? row.verifiedAt ?? null,
    safeErrorMessage: row.last_health_check_status === "failed" ? "Last validation failed. Review setup guide and validate again." : null,
    providerMetadata: {
      credentialMode: configuration.credentialMode ?? null,
      selectedShopId: configuration.selectedShopId ?? configuration.shopId ?? null,
      storeDomain: configuration.storeDomain ?? null,
      selectedCollectionId: configuration.selectedCollectionId ?? configuration.collectionId ?? null,
      discoveredCollectionCount: configuration.discoveredCollectionCount ?? null,
      imageProvider: configuration.imageProvider ?? null,
      imageModel: configuration.imageModel ?? null
    }
  };
}

async function createOrUpdateConnection(input: {
  repos: RepositoryBundle;
  provider: ProviderKey;
  workspaceId: string;
  actorId: string;
  status: string;
  enabled?: boolean;
  credentialRef?: string | null;
  configuration?: Record<string, unknown>;
  healthStatus?: string;
}) {
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, input.provider);
  const row: WorkspaceRow = {
    id: existing?.id ? String(existing.id) : `conn_${input.provider}_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_type: input.provider,
    provider_name: providerLabels[input.provider] ?? input.provider,
    enabled: input.enabled ?? input.status === "connected",
    status: input.status,
    secret_ref: input.credentialRef ?? existing?.secret_ref ?? existing?.secretRef ?? null,
    last_health_check_at: new Date().toISOString(),
    last_health_check_status: input.healthStatus ?? input.status,
    configuration: {
      ...((existing?.configuration ?? {}) as Record<string, unknown>),
      ...(input.configuration ?? {})
    },
    updated_by: input.actorId
  };
  if (existing) return input.repos.integration.updateProviderConnectionStatus(input.workspaceId, input.provider, row, auditRow(input.workspaceId, input.actorId, "provider_connection_updated", input.provider, { status: input.status }));
  return input.repos.integration.createProviderConnection({ ...row, created_by: input.actorId }, auditRow(input.workspaceId, input.actorId, "provider_connection_created", input.provider, { status: input.status }));
}

async function saveSecretCredential(input: {
  repos: RepositoryBundle;
  config: RuntimeConfig;
  provider: ProviderKey;
  workspaceId: string;
  actorId: string;
  secret: string;
}) {
  if (!storageReady(input.config)) throw new Error("credential_storage_unavailable");
  const credentialRef = `cred_${input.provider}_${Date.now()}`;
  const envelope = encryptCredential({
    secret: input.secret,
    key: input.config.CREDENTIAL_ENCRYPTION_KEY,
    provider: input.provider,
    workspaceId: input.workspaceId,
    createdBy: input.actorId
  });
  await input.repos.integration.saveEncryptedCredential({
    id: `ecred_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_key: input.provider,
    credential_ref: credentialRef,
    encrypted_payload: envelope,
    status: "active",
    created_by: input.actorId,
    updated_by: input.actorId
  }, auditRow(input.workspaceId, input.actorId, "credential_saved", input.provider, { provider: input.provider, credentialStored: true }));
  return credentialRef;
}

async function readStoredSecret(input: {
  repos: RepositoryBundle;
  config: RuntimeConfig;
  provider: ProviderKey;
  workspaceId: string;
}) {
  const connection = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, input.provider);
  const credentialRef = String(connection?.secret_ref ?? connection?.secretRef ?? "");
  if (!credentialRef) return null;
  if (!storageReady(input.config)) throw new Error("credential_storage_unavailable");
  const credential = await input.repos.integration.getCredentialForServerUseOnly(input.workspaceId, credentialRef);
  if (!credential || credential.status === "revoked") return null;
  return decryptCredential(credential.encrypted_payload as any, input.config.CREDENTIAL_ENCRYPTION_KEY);
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  return { response, body };
}

function printifyHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

function shopifyEndpoint(domain: string, path: string) {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return `https://${clean}/admin/api/2024-10/${path.replace(/^\//, "")}`;
}

function shopifyHeaders(token: string) {
  return { "X-Shopify-Access-Token": token, "content-type": "application/json" };
}

function sanitizeDomain(value: string) {
  return sanitizeShopifyStoreDomain(value);
}

function storeDomainValid(value: string) {
  return isShopifyStoreDomain(value);
}

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return req.json().catch(() => ({})) as Promise<Record<string, unknown>>;
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const data = await req.formData();
    return Object.fromEntries([...data.entries()].map(([key, value]) => [key, typeof value === "string" ? value : value.name]));
  }
  return {};
}

export async function handleProviderConnectionsList(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    const connections = await repos.integration.listProviderConnectionsForWorkspace(workspaceId);
    const report = buildFeatureReadiness(parseEnv(), process.env, workspaceId);
    const cards = buildOwnerSetupCards(report).map((card) => ({
      ...card,
      connection: safeConnection(connections.find((row) => String(row.provider_type ?? row.providerType) === card.providerKey || String(row.provider_type ?? row.providerType) === canonicalProviderKey(card.providerKey)) ?? null)
    }));
    return safeJson({ ok: true, cards, connections: connections.map(safeConnection) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function handleProviderConnectionGet(req: Request, providerParam: string) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const provider = canonicalProviderKey(providerParam);
    const repos = createRepositories();
    const connection = await repos.integration.getProviderConnectionForWorkspace(workspaceId, provider);
    return safeJson({ ok: true, provider, connection: safeConnection(connection), guides: setupGuidesForProvider(provider) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function handleProviderConnectionSave(req: Request, providerParam: string) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const provider = canonicalProviderKey(providerParam);
    const body = await parseBody(req);
    const secret = typeof body.token === "string" ? body.token.trim() : typeof body.adminToken === "string" ? body.adminToken.trim() : "";
    const config = parseEnv();
    const repos = createRepositories();
    if (secret && !storageReady(config)) return storageBlockedResponse();
    let credentialRef: string | null = null;
    if (secret) {
      credentialRef = await saveSecretCredential({ repos, config, provider, workspaceId, actorId: user.id, secret });
    }
    const configuration: Record<string, unknown> = { maskedDisplayValue: secret ? maskSavedCredential() : undefined };
    if (typeof body.storeDomain === "string") configuration.storeDomain = sanitizeDomain(body.storeDomain);
    if (typeof body.shopId === "string") configuration.selectedShopId = body.shopId.trim();
    if (typeof body.collectionId === "string") configuration.selectedCollectionId = body.collectionId.trim();
    if (typeof body.imageProvider === "string") configuration.imageProvider = body.imageProvider.trim();
    if (typeof body.imageModel === "string") configuration.imageModel = body.imageModel.trim();
    const connection = await createOrUpdateConnection({ repos, provider, workspaceId, actorId: user.id, status: "configured_not_verified", enabled: false, credentialRef, configuration });
    return validationResponse({
      ok: true,
      status: "blocked",
      safeMessage: "Setup details were saved securely. Validate the connection before SaltyFactory treats it as connected.",
      setupRequired: ["Validate connection"],
      nextStep: "Validate connection",
      maskedDisplayValue: secret ? maskSavedCredential() : null,
      providerMetadata: safeConnection(connection)?.providerMetadata ?? {}
    });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Review setup guide and try again"] }, 500);
  }
}

export async function handleProviderConnectionValidate(req: Request, providerParam: string) {
  const provider = canonicalProviderKey(providerParam);
  if (provider === "printify") return handlePrintifyValidateToken(req);
  if (provider === "shopify") return handleShopifyValidateClientCredentials(req);
  if (provider === "image_generation") return handleImageGenerationValidate(req);
  return validationResponse({
    ok: false,
    status: provider === "live_publish" ? "owner_gated" : "blocked",
    safeMessage: `${providerLabels[provider] ?? provider} has no direct validation action in v1. Use the setup guide or request help.`,
    setupRequired: ["Use guided setup", "Request setup help"],
    nextStep: "Request setup help"
  }, 400);
}

export async function handleProviderConnectionDisconnect(req: Request, providerParam: string) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const provider = canonicalProviderKey(providerParam);
    const repos = createRepositories();
    const connection = await repos.integration.getProviderConnectionForWorkspace(workspaceId, provider);
    const credentialRef = String(connection?.secret_ref ?? connection?.secretRef ?? "");
    if (credentialRef) await repos.integration.deleteCredential(workspaceId, credentialRef, user.id);
    await createOrUpdateConnection({
      repos,
      provider,
      workspaceId,
      actorId: user.id,
      status: "revoked",
      enabled: false,
      credentialRef: null,
      configuration: { maskedDisplayValue: null }
    });
    return validationResponse({ ok: true, status: "blocked", safeMessage: "Connection was disconnected. Stored credentials were revoked.", setupRequired: ["Reconnect provider"], nextStep: "Reconnect provider" });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Try again or request help"] }, 500);
  }
}

export async function handlePrintifyValidateToken(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await parseBody(req);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const config = parseEnv();
    const repos = createRepositories();
    if (!token) return validationResponse({ ok: false, status: "missing", safeMessage: "Paste a Printify API token to validate it securely.", setupRequired: ["Printify API token"], nextStep: "Paste token" }, 400);
    if (!storageReady(config)) return storageBlockedResponse();
    const { response, body: data } = await fetchJson("https://api.printify.com/v1/shops.json", { method: "GET", headers: printifyHeaders(token) });
    if (!response.ok) return validationResponse({ ok: false, status: "invalid", safeMessage: "Printify did not accept this token. Generate a fresh token with shop and catalog permissions.", setupRequired: ["Valid Printify token"], nextStep: "Generate token again" }, 400);
    const shops = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    const credentialRef = await saveSecretCredential({ repos, config, provider: "printify", workspaceId, actorId: user.id, secret: token });
    await createOrUpdateConnection({
      repos,
      provider: "printify",
      workspaceId,
      actorId: user.id,
      status: shops.length ? "needs_input" : "configured_not_verified",
      enabled: false,
      credentialRef,
      configuration: { maskedDisplayValue: maskSavedCredential(), discoveredShopCount: shops.length },
      healthStatus: "token_valid"
    });
    return validationResponse({
      ok: true,
      status: shops.length ? "connected" : "blocked",
      safeMessage: shops.length ? "Printify token validated. Choose the shop SaltyFactory should use." : "Printify token validated, but no shops were returned.",
      setupRequired: shops.length ? ["Select Printify shop"] : ["Create or connect a Printify shop"],
      nextStep: shops.length ? "Select shop" : "Request setup help",
      maskedDisplayValue: maskSavedCredential(),
      providerMetadata: { shops: shops.map((shop: any) => ({ id: String(shop.id ?? ""), title: String(shop.title ?? shop.name ?? "Printify shop") })).filter((shop: any) => shop.id) }
    });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Validate token again"] }, 500);
  }
}

export async function handlePrintifyDiscoverShops(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    const repos = createRepositories();
    const token = await readStoredSecret({ repos, config, provider: "printify", workspaceId });
    if (!token) return validationResponse({ ok: false, status: "missing", safeMessage: "Printify token is not saved yet. Connect Printify first.", setupRequired: ["Connect Printify"], nextStep: "Connect Printify" }, 400);
    const { response, body } = await fetchJson("https://api.printify.com/v1/shops.json", { method: "GET", headers: printifyHeaders(token) });
    if (!response.ok) return validationResponse({ ok: false, status: "invalid", safeMessage: "Printify shop discovery failed. Validate the token again.", setupRequired: ["Valid Printify token"], nextStep: "Validate token" }, 400);
    const shops = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    await createOrUpdateConnection({ repos, provider: "printify", workspaceId, actorId: user.id, status: "needs_input", enabled: false, configuration: { discoveredShopCount: shops.length }, healthStatus: "shops_discovered" });
    return validationResponse({
      ok: true,
      status: shops.length ? "connected" : "blocked",
      safeMessage: shops.length ? "Printify shops discovered. Choose one to finish setup." : "No Printify shops were returned for this token.",
      setupRequired: shops.length ? ["Select Printify shop"] : ["Create Printify shop"],
      nextStep: shops.length ? "Select shop" : "Request setup help",
      providerMetadata: { shops: shops.map((shop: any) => ({ id: String(shop.id ?? ""), title: String(shop.title ?? shop.name ?? "Printify shop") })).filter((shop: any) => shop.id) }
    });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Reconnect Printify"] }, 500);
  }
}

export async function handlePrintifySelectShop(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await parseBody(req);
    const shopId = typeof body.shopId === "string" ? body.shopId.trim() : "";
    if (!shopId) return validationResponse({ ok: false, status: "missing", safeMessage: "Choose a Printify shop before continuing.", setupRequired: ["Printify shop"], nextStep: "Select shop" }, 400);
    const repos = createRepositories();
    await createOrUpdateConnection({ repos, provider: "printify", workspaceId, actorId: user.id, status: "connected", enabled: true, configuration: { selectedShopId: shopId, maskedDisplayValue: maskSavedCredential() }, healthStatus: "connected" });
    return validationResponse({ ok: true, status: "connected", safeMessage: "Printify shop selected. Catalog browsing, artwork upload, and draft product creation can proceed when workflow gates are ready.", setupRequired: ["Live publish still requires owner gates"], nextStep: "Open Printify Catalog", maskedDisplayValue: maskSavedCredential(), providerMetadata: { selectedShopId: shopId } });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Try selecting the shop again"] }, 500);
  }
}

export async function handleShopifyValidateAdmin(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await parseBody(req);
    const storeDomain = sanitizeDomain(typeof body.storeDomain === "string" ? body.storeDomain : "");
    const token = typeof body.adminToken === "string" ? body.adminToken.trim() : "";
    const config = parseEnv();
    const repos = createRepositories();
    if (!storeDomainValid(storeDomain)) return validationResponse({ ok: false, status: "missing", safeMessage: "Enter your .myshopify.com Shopify Admin domain.", setupRequired: ["Shopify store domain"], nextStep: "Enter store domain" }, 400);
    if (!token) return validationResponse({ ok: false, status: "missing", safeMessage: "Paste the Shopify Admin token to validate it securely.", setupRequired: ["Shopify Admin token"], nextStep: "Paste Admin token" }, 400);
    if (!storageReady(config)) return storageBlockedResponse();
    const { response, body: data } = await fetchJson(shopifyEndpoint(storeDomain, "shop.json"), { method: "GET", headers: shopifyHeaders(token) });
    if (!response.ok) return validationResponse({ ok: false, status: "invalid", safeMessage: "Shopify did not accept this Admin token for the provided store domain.", setupRequired: ["Valid Shopify Admin token", "Matching .myshopify.com domain"], nextStep: "Review custom app permissions" }, 400);
    const credentialRef = await saveSecretCredential({
      repos,
      config,
      provider: "shopify",
      workspaceId,
      actorId: user.id,
      secret: encodeShopifyCredentialPayload({ v: 1, credentialMode: "legacy_admin_token", adminToken: token })
    });
    await createOrUpdateConnection({ repos, provider: "shopify", workspaceId, actorId: user.id, status: "needs_input", enabled: false, credentialRef, configuration: { storeDomain, credentialMode: "legacy_admin_token", maskedDisplayValue: maskSavedCredential(), shopName: data?.shop?.name ?? null }, healthStatus: "admin_valid" });
    return validationResponse({ ok: true, status: "connected", safeMessage: "Legacy Shopify Admin token validated. Choose the default collection before draft products are marked ready.", setupRequired: ["Select Shopify collection"], nextStep: "Discover collections", maskedDisplayValue: maskSavedCredential(), providerMetadata: { storeDomain, credentialMode: "legacy_admin_token", shopName: data?.shop?.name ?? null } });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Validate Shopify again"] }, 500);
  }
}

export async function handleShopifyValidateClientCredentials(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await parseBody(req);
    const storeDomain = sanitizeDomain(typeof body.storeDomain === "string" ? body.storeDomain : "");
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
    const config = parseEnv();
    const repos = createRepositories();
    if (!storeDomainValid(storeDomain)) return validationResponse({ ok: false, status: "missing", safeMessage: "Enter your .myshopify.com Shopify Admin domain.", setupRequired: ["Shopify store domain"], nextStep: "Enter store domain" }, 400);
    if (!isShopifyClientId(clientId)) return validationResponse({ ok: false, status: "missing", safeMessage: "Enter the Shopify Client ID from the Dev Dashboard app.", setupRequired: ["Shopify Client ID"], nextStep: "Enter Client ID" }, 400);
    if (!clientSecret) return validationResponse({ ok: false, status: "missing", safeMessage: "Paste the Shopify Client Secret into the secure write-only field.", setupRequired: ["Shopify Client Secret"], nextStep: "Paste Client Secret" }, 400);
    if (!storageReady(config)) return storageBlockedResponse();

    const provider = new (await import("@saltyfactory/commerce")).ShopifyAdminProviderLive(storeDomain, {
      credentialMode: "dev_dashboard_client_credentials",
      clientId,
      clientSecret
    }, false);
    const shop = await provider.fetchShopInfo();
    if (!shop.ok) {
      return validationResponse({
        ok: false,
        status: "invalid",
        safeMessage: "Shopify did not accept this Client ID and Client Secret for the provided store domain.",
        setupRequired: ["Valid Shopify Client ID", "Valid Shopify Client Secret", "Matching .myshopify.com domain"],
        nextStep: "Review Dev Dashboard app credentials"
      }, 400);
    }
    const collectionsResult = await provider.getCollections();
    if (!collectionsResult.ok) {
      return validationResponse({
        ok: false,
        status: "invalid",
        safeMessage: "Shopify credentials validated, but collection discovery failed. Confirm the app has product and collection access before saving.",
        setupRequired: collectionsResult.setupRequired ?? ["read_products/write_products permission"],
        nextStep: "Review app permissions"
      }, 400);
    }
    const credentialRef = await saveSecretCredential({
      repos,
      config,
      provider: "shopify",
      workspaceId,
      actorId: user.id,
      secret: encodeShopifyCredentialPayload({ v: 1, credentialMode: "dev_dashboard_client_credentials", clientId, clientSecret })
    });
    const shopName = (shop.data as any)?.shop?.name ?? null;
    await createOrUpdateConnection({
      repos,
      provider: "shopify",
      workspaceId,
      actorId: user.id,
      status: "needs_input",
      enabled: false,
      credentialRef,
      configuration: {
        storeDomain,
        credentialMode: "dev_dashboard_client_credentials",
        maskedDisplayValue: maskSavedCredential(),
        shopName,
        discoveredCollectionCount: collectionsResult.data.length
      },
      healthStatus: "client_credentials_valid"
    });
    return validationResponse({
      ok: true,
      status: "connected",
      safeMessage: "Shopify Dev Dashboard credentials validated. The Client Secret was saved securely and will not be shown again. Choose the default collection before draft products are marked ready.",
      setupRequired: ["Select Shopify collection"],
      nextStep: "Select collection",
      maskedDisplayValue: maskSavedCredential(),
      providerMetadata: {
        storeDomain,
        credentialMode: "dev_dashboard_client_credentials",
        shopName,
        collections: collectionsResult.data
      }
    });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Validate Shopify again"] }, 500);
  }
}

export async function handleShopifyDiscoverCollections(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    const repos = createRepositories();
    const shopify = await createShopifyAdminProviderForWorkspace({ repos, config, workspaceId, requireEnabled: false });
    if (!shopify.ok) return validationResponse({ ok: false, status: shopify.status === "config_blocked" ? "config_blocked" : "missing", safeMessage: shopify.message, setupRequired: shopify.setupRequired, nextStep: "Connect Shopify" }, shopify.status === "config_blocked" ? 503 : 400);
    const discovered = await shopify.admin.getCollections();
    if (!discovered.ok) return validationResponse({ ok: false, status: "invalid", safeMessage: "Shopify collection discovery failed. Validate Shopify credentials and permissions again.", setupRequired: discovered.setupRequired ?? ["read_products/write_products permission"], nextStep: "Validate Shopify" }, 400);
    const collections = discovered.data.map((collection: any) => ({ id: String(collection.id ?? ""), title: String(collection.title ?? "Shopify collection"), type: String(collection.type ?? "collection") })).filter((collection) => collection.id);
    await createOrUpdateConnection({ repos, provider: "shopify", workspaceId, actorId: user.id, status: "needs_input", enabled: false, configuration: { storeDomain: shopify.storeDomain, credentialMode: shopify.credentialMode, discoveredCollectionCount: collections.length }, healthStatus: "collections_discovered" });
    return validationResponse({ ok: true, status: collections.length ? "connected" : "blocked", safeMessage: collections.length ? "Shopify collections discovered. Choose the default collection for draft products." : "No Shopify collections were returned.", setupRequired: collections.length ? ["Select Shopify collection"] : ["Create Shopify collection"], nextStep: collections.length ? "Select collection" : "Create collection", providerMetadata: { collections } });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Reconnect Shopify"] }, 500);
  }
}

export async function handleShopifySelectCollection(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await parseBody(req);
    const collectionId = typeof body.collectionId === "string" ? body.collectionId.trim() : "";
    if (!collectionId) return validationResponse({ ok: false, status: "missing", safeMessage: "Choose a Shopify collection before continuing.", setupRequired: ["Shopify collection"], nextStep: "Select collection" }, 400);
    if (!isSafeShopifyCollectionId(collectionId)) return validationResponse({ ok: false, status: "invalid", safeMessage: "The Shopify collection ID has an invalid format.", setupRequired: ["Valid Shopify collection ID"], nextStep: "Select collection" }, 400);
    const repos = createRepositories();
    await createOrUpdateConnection({ repos, provider: "shopify", workspaceId, actorId: user.id, status: "connected", enabled: true, configuration: { selectedCollectionId: collectionId, maskedDisplayValue: maskSavedCredential() }, healthStatus: "connected" });
    return validationResponse({ ok: true, status: "connected", safeMessage: "Shopify collection selected. Draft creation and media upload can proceed when product gates are ready. Live publish remains owner-gated.", setupRequired: ["Live publish still requires owner confirmation"], nextStep: "Open Publish Review", maskedDisplayValue: maskSavedCredential(), providerMetadata: { selectedCollectionId: collectionId } });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Try selecting the collection again"] }, 500);
  }
}

export async function handleImageGenerationValidate(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await parseBody(req);
    const provider = String(body.provider || body.imageProvider || "hugging_face");
    const model = String(body.model || body.imageModel || "").trim();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const config = parseEnv();
    const repos = createRepositories();
    if (provider === "local_dev_mock") {
      if (config.APP_ENV === "production" || config.NODE_ENV === "production") return validationResponse({ ok: false, status: "blocked", safeMessage: "Local demo image mode is development-only and cannot be enabled in production.", setupRequired: ["Configure real image provider"], nextStep: "Configure provider" }, 400);
      await createOrUpdateConnection({ repos, provider: "image_generation", workspaceId, actorId: user.id, status: "configured_not_verified", enabled: false, configuration: { imageProvider: "local_dev_mock" }, healthStatus: "local_demo_only" });
      return validationResponse({ ok: true, status: "blocked", safeMessage: "Local demo image mode is available for development workflow previews only. It is not treated as real provider success.", setupRequired: ["Use real provider before production"], nextStep: "Open image generation", providerMetadata: { imageProvider: "local_dev_mock" } });
    }
    if (!token || !model) return validationResponse({ ok: false, status: "missing", safeMessage: "Enter both the image provider token and image model before validating.", setupRequired: ["Provider token", "Image model"], nextStep: "Enter provider details" }, 400);
    if (!storageReady(config)) return storageBlockedResponse();
    const { response } = await fetchJson(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, { method: "GET", headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return validationResponse({ ok: false, status: "invalid", safeMessage: "The image provider did not validate this token/model combination.", setupRequired: ["Valid provider token", "Supported image model"], nextStep: "Review token and model" }, 400);
    const credentialRef = await saveSecretCredential({ repos, config, provider: "image_generation", workspaceId, actorId: user.id, secret: token });
    await createOrUpdateConnection({ repos, provider: "image_generation", workspaceId, actorId: user.id, status: "connected", enabled: true, credentialRef, configuration: { imageProvider: "hugging_face", imageModel: model, maskedDisplayValue: maskSavedCredential() }, healthStatus: "connected" });
    return validationResponse({ ok: true, status: "connected", safeMessage: "Image generation provider validated. Generated artwork can be created after owner-approved prompts.", setupRequired: ["Owner prompt approval still required"], nextStep: "Open Image Generation", maskedDisplayValue: maskSavedCredential(), providerMetadata: { imageProvider: "hugging_face", imageModel: model } });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return validationResponse({ ok: false, status: "invalid", safeMessage: sanitizeProviderError(error), setupRequired: ["Validate image provider again"] }, 500);
  }
}

export async function handleSetupHelpList(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    const requests = await repos.shared.setupAssistanceRequests.listByWorkspace(workspaceId);
    return safeJson({ ok: true, requests });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function createSetupHelpRequest(req: Request, user?: StudioUser) {
  const actor = user ?? await requireWorkspaceMember(req, workspaceId);
  const body = await parseBody(req);
  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!rawMessage) return validationResponse({ ok: false, status: "missing", safeMessage: "Tell the setup concierge what you need help with. Do not paste tokens, passwords, EIN, or bank details.", setupRequired: ["Help message"], nextStep: "Write request" }, 400);
  if (/(shpat_|sk_live_|hf_[A-Za-z0-9]|access_token|refresh_token|api[_-]?token|password|secret|routing|account_number|ein)/i.test(rawMessage)) {
    return validationResponse({ ok: false, status: "blocked", safeMessage: "For safety, help requests cannot contain tokens, passwords, EIN, routing numbers, or bank account details.", setupRequired: ["Remove secrets from message"], nextStep: "Rewrite request" }, 400);
  }
  const repos = createRepositories();
  const request = await repos.shared.setupAssistanceRequests.create({
    id: `setup_help_${Date.now()}`,
    workspace_id: workspaceId,
    request_type: String(body.requestType || "setup_help"),
    message: rawMessage.slice(0, 2000),
    status: "open",
    related_provider: typeof body.relatedProvider === "string" ? canonicalProviderKey(body.relatedProvider) : null,
    related_step_key: typeof body.relatedStepKey === "string" ? body.relatedStepKey : null,
    created_by: actor.id,
    updated_by: actor.id,
    metadata: { source: "setup_concierge", warning: "Do not paste secrets into help requests." }
  }, auditRow(workspaceId, actor.id, "setup_help_requested", "setup_concierge", { relatedProvider: body.relatedProvider ?? null }));
  return safeJson({ ok: true, status: "created", safeMessage: "Setup help request created. Do not paste secrets into follow-up notes.", request });
}
