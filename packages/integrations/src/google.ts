import type { RuntimeConfig } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { decryptCredential, encryptCredential } from "@saltyfactory/security";
import { sanitizeProviderError, type CredentialEnvelope } from "@saltyfactory/security";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/business.manage"
];
export const GOOGLE_ANALYTICS_SETUP_SCOPES = ["https://www.googleapis.com/auth/analytics.edit"];
export const GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES = ["https://www.googleapis.com/auth/webmasters"];
export const GOOGLE_MERCHANT_CENTER_SETUP_SCOPES = ["https://www.googleapis.com/auth/content"];
export const SALTY_COWHIDE_TARGET_DOMAIN = "saltycowhide.com";

type GoogleIntegrationStatus = "connected" | "configured_not_verified" | "disconnected";

type GoogleIntegrationState = {
  key: "google_oauth";
  label: "Google OAuth";
  status: GoogleIntegrationStatus;
  capabilities: string[];
  setupRequired: string[];
  scopes: string[];
  selectedPropertyId?: string | null;
  selectedSiteUrl?: string | null;
  selectedAccountId?: string | null;
  selectedLocationId?: string | null;
};

export type GoogleFetch = typeof fetch;

export type GoogleOAuthServerConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  enabled: boolean;
};

export type GoogleTokenSet = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: string;
  token_type?: string;
  scope?: string;
  id_token?: string;
};

export type GoogleWorkspaceConfig = {
  ga4PropertyId: string;
  searchConsoleSiteUrl: string;
  businessProfileAccountId: string;
  businessProfileLocationId: string;
  merchantCenterAccountId?: string;
};

export type GoogleConnectionBundle =
  | { ok: true; connection: WorkspaceRow; credential: WorkspaceRow; tokens: GoogleTokenSet; workspaceConfig: GoogleWorkspaceConfig; googleEmail?: string | null; scopes: string[] }
  | { ok: false; status: "not_configured" | "configured_not_verified" | "auth_required"; message: string; setupRequired: string[]; connection?: WorkspaceRow | null };

export type GoogleDiscoveryCandidate = {
  id: string;
  label: string;
  type: "ga4_property" | "search_console_site" | "gbp_location";
  confidence: "high" | "medium" | "low";
  matchStrength: "exact_domain_match" | "brand_match" | "likely_related" | "unrelated" | "unknown";
  matchReason: string;
  url?: string | null;
  accountId?: string | null;
  propertyId?: string | null;
  siteUrl?: string | null;
  locationId?: string | null;
};

export type GoogleDiscoverySourceResult = {
  status: "auto_detected" | "needs_selection" | "manual_setup" | "access_limited" | "setup_needed" | "optional_not_required";
  message: string;
  candidates: GoogleDiscoveryCandidate[];
  selected?: GoogleDiscoveryCandidate | null;
  saved?: boolean;
  setupRequired: string[];
};

export type GoogleAutoDetectResult =
  | {
      ok: true;
      status: "completed";
      provider: "google_oauth";
      message: string;
      googleEmail?: string | null;
      autoSaved: Partial<GoogleWorkspaceConfig>;
      dataSources: {
        ga4: GoogleDiscoverySourceResult;
        searchConsole: GoogleDiscoverySourceResult;
        businessProfile: GoogleDiscoverySourceResult;
      };
    }
  | { ok: false; status: "not_configured" | "configured_not_verified" | "auth_required" | "access_limited" | "error"; provider: "google_oauth"; message: string; setupRequired: string[] };

export type GoogleLaunchSetupAction = "ga4_create" | "search_console_add" | "merchant_center_setup" | "gbp_eligibility";
export type GoogleLaunchSetupResult =
  | {
      ok: true;
      status: "configured_not_verified" | "verification_required" | "optional_for_online_only" | "requires_owner_action" | "requires_scope";
      provider: string;
      message: string;
      targetDomain: string;
      authorizationUrl?: string | undefined;
      setupRequired: string[];
      ownerActions: string[];
      configuration?: Record<string, unknown>;
      warnings?: string[];
    }
  | {
      ok: false;
      status: "not_configured" | "configured_not_verified" | "auth_required" | "access_limited" | "requires_scope" | "requires_owner_action" | "manual_setup_needed" | "error";
      provider: string;
      message: string;
      targetDomain: string;
      authorizationUrl?: string | undefined;
      setupRequired: string[];
      ownerActions?: string[];
      warnings?: string[];
    };

export class GoogleProviderError extends Error {
  constructor(
    public readonly status: "access_denied" | "access_limited" | "auth_required" | "configured_not_verified" | "provider_error",
    message: string,
    public readonly httpStatus?: number
  ) {
    super(message);
  }
}

export function googleOAuthConfig(config: RuntimeConfig): GoogleOAuthServerConfig {
  const clientId = config.GOOGLE_OAUTH_CLIENT_ID || config.GOOGLE_CLIENT_ID || "";
  const clientSecret = config.GOOGLE_OAUTH_CLIENT_SECRET || config.GOOGLE_CLIENT_SECRET || "";
  return {
    clientId,
    clientSecret,
    redirectUri: config.GOOGLE_OAUTH_REDIRECT_URI || "",
    enabled: Boolean(config.GOOGLE_INTEGRATIONS_ENABLED || config.GA4_ENABLED || config.GSC_ENABLED || config.GBP_ENABLED || config.GOOGLE_ANALYTICS_ENABLED || config.GOOGLE_SEARCH_CONSOLE_ENABLED || config.GOOGLE_BUSINESS_PROFILE_ENABLED)
  };
}

export function googleOAuthSetupRequired(config: RuntimeConfig) {
  const oauth = googleOAuthConfig(config);
  const required: string[] = [];
  if (!oauth.enabled) required.push("GOOGLE_INTEGRATIONS_ENABLED=true");
  if (!oauth.clientId) required.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!oauth.clientSecret) required.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!oauth.redirectUri) required.push("GOOGLE_OAUTH_REDIRECT_URI");
  if (!config.CREDENTIAL_ENCRYPTION_KEY) required.push("CREDENTIAL_ENCRYPTION_KEY");
  return required;
}

export function googleOAuthReady(config: RuntimeConfig) {
  return googleOAuthSetupRequired(config).length === 0;
}

export function buildGoogleAuthorizationUrl(config: RuntimeConfig, state: string, scopes = GOOGLE_OAUTH_SCOPES) {
  const oauth = googleOAuthConfig(config);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", oauth.clientId);
  url.searchParams.set("redirect_uri", oauth.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", Array.from(new Set(scopes)).join(" "));
  url.searchParams.set("state", state);
  return url;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new GoogleProviderError("provider_error", "Google returned a non-JSON response.", response.status);
  }
}

function classifyGoogleError(status: number, body: Record<string, any>) {
  const raw = body.error;
  const code = typeof raw === "object" ? String(raw.status ?? raw.code ?? "") : String(raw ?? "");
  const message = typeof raw === "object" ? String(raw.message ?? "Google provider error.") : String(body.error_description ?? (raw || "Google provider error."));
  if (status === 401 || /invalid_grant|unauthorized|unauthenticated/i.test(code + message)) return new GoogleProviderError("auth_required", message, status);
  if (status === 403 && /quota|rate|limit|disabled|not enabled/i.test(code + message)) return new GoogleProviderError("access_limited", message, status);
  if (status === 403) return new GoogleProviderError("access_denied", message, status);
  return new GoogleProviderError("provider_error", message, status);
}

async function googleJson(fetcher: GoogleFetch, url: string, init: RequestInit = {}) {
  const response = await fetcher(url, init);
  const body = await readJson(response);
  if (!response.ok) throw classifyGoogleError(response.status, body);
  return body;
}

function bearer(accessToken: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    }
  };
}

function toIsoExpiry(expiresIn?: number) {
  return new Date(Date.now() + Math.max(60, Number(expiresIn ?? 3600)) * 1000).toISOString();
}

function tokenFromResponse(body: Record<string, any>, existingRefreshToken = ""): GoogleTokenSet {
  const accessToken = String(body.access_token || "");
  const refreshToken = String(body.refresh_token || existingRefreshToken || "");
  if (!accessToken) throw new GoogleProviderError("auth_required", "Google did not return an access token.");
  if (!refreshToken) throw new GoogleProviderError("auth_required", "Google did not return a refresh token for offline sync.");
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(body.expires_in ?? 3600),
    expires_at: toIsoExpiry(Number(body.expires_in ?? 3600)),
    token_type: String(body.token_type || "Bearer"),
    scope: String(body.scope || GOOGLE_OAUTH_SCOPES.join(" "))
  };
}

export async function exchangeGoogleOAuthCode(input: { code: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined; existingRefreshToken?: string | undefined }) {
  const oauth = googleOAuthConfig(input.config);
  const body = new URLSearchParams({
    code: input.code,
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    redirect_uri: oauth.redirectUri,
    grant_type: "authorization_code"
  });
  const response = await (input.fetcher ?? fetch)("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await readJson(response);
  if (!response.ok) throw classifyGoogleError(response.status, json);
  return tokenFromResponse(json, input.existingRefreshToken);
}

export async function refreshGoogleAccessToken(input: { refreshToken: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined }) {
  const oauth = googleOAuthConfig(input.config);
  const body = new URLSearchParams({
    refresh_token: input.refreshToken,
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    grant_type: "refresh_token"
  });
  const response = await (input.fetcher ?? fetch)("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await readJson(response);
  if (!response.ok) throw classifyGoogleError(response.status, json);
  return tokenFromResponse(json, input.refreshToken);
}

export async function verifyGoogleOAuthToken(input: { accessToken: string; fetcher?: GoogleFetch | undefined }) {
  const json = await googleJson(input.fetcher ?? fetch, "https://www.googleapis.com/oauth2/v2/userinfo", bearer(input.accessToken, { method: "GET" }));
  return {
    email: typeof json.email === "string" ? json.email : null,
    verifiedEmail: Boolean(json.verified_email)
  };
}

function parseStoredTokens(row: WorkspaceRow, encryptionKey: string) {
  const payload = row.encrypted_payload ?? row.encryptedPayload;
  const decrypted = decryptCredential(payload as CredentialEnvelope, encryptionKey);
  return JSON.parse(decrypted) as GoogleTokenSet & { google_email?: string | null; scopes?: string[] };
}

function connectionConfig(connection: WorkspaceRow | null | undefined): Record<string, any> {
  return (connection?.configuration ?? connection?.configurationJson ?? {}) as Record<string, any>;
}

export function workspaceGoogleConfig(config: RuntimeConfig, connection?: WorkspaceRow | null): GoogleWorkspaceConfig {
  const stored = connectionConfig(connection);
  return {
    ga4PropertyId: String(stored.ga4PropertyId ?? stored.selectedPropertyId ?? config.GA4_PROPERTY_ID ?? ""),
    searchConsoleSiteUrl: String(stored.searchConsoleSiteUrl ?? stored.selectedSiteUrl ?? config.GSC_SITE_URL ?? ""),
    businessProfileAccountId: String(stored.businessProfileAccountId ?? stored.selectedAccountId ?? config.GBP_ACCOUNT_ID ?? ""),
    businessProfileLocationId: String(stored.businessProfileLocationId ?? stored.selectedLocationId ?? config.GBP_LOCATION_ID ?? ""),
    merchantCenterAccountId: String(stored.merchantCenterAccountId ?? stored.selectedMerchantCenterAccountId ?? "")
  };
}

export async function getGoogleConnectionBundle(input: { repos: RepositoryBundle; workspaceId: string; config: RuntimeConfig }): Promise<GoogleConnectionBundle> {
  const setupRequired = googleOAuthSetupRequired(input.config);
  if (setupRequired.length) {
    return { ok: false, status: "not_configured", message: "Google OAuth server configuration is incomplete.", setupRequired };
  }
  const connection = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "google_oauth");
  if (!connection?.secret_ref && !connection?.secretRef) {
    return { ok: false, status: "not_configured", message: "Google OAuth is not connected for this workspace.", setupRequired: ["Connect Google in Studio."], connection };
  }
  if (connection.status && !["connected", "configured_not_verified", "needs_reauth"].includes(String(connection.status))) {
    return { ok: false, status: "configured_not_verified", message: "Google OAuth exists but has not been verified.", setupRequired: ["Test Google connection."], connection };
  }
  const credentialRef = String(connection.secret_ref ?? connection.secretRef);
  const credential = await input.repos.integration.getCredentialForServerUseOnly(input.workspaceId, credentialRef);
  if (!credential || credential.status === "revoked") {
    return { ok: false, status: "auth_required", message: "Google OAuth credential is missing or revoked.", setupRequired: ["Reconnect Google."], connection };
  }
  const tokens = parseStoredTokens(credential, input.config.CREDENTIAL_ENCRYPTION_KEY);
  return {
    ok: true,
    connection,
    credential,
    tokens,
    workspaceConfig: workspaceGoogleConfig(input.config, connection),
    googleEmail: tokens.google_email ?? null,
    scopes: Array.isArray(tokens.scopes) ? tokens.scopes : String(tokens.scope || "").split(/\s+/).filter(Boolean)
  };
}

async function upsertGoogleProviderConnection(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  state: GoogleIntegrationState;
  credentialSecret?: string;
  encryptionKey?: string;
}) {
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "google_oauth");
  let credentialRef = existing?.secret_ref ?? existing?.secretRef ?? null;
  if (input.credentialSecret) {
    if (!input.encryptionKey) throw new Error("credential_encryption_key_required");
    credentialRef = `cred_google_oauth_${Date.now()}`;
    const envelope = encryptCredential({
      secret: input.credentialSecret,
      key: input.encryptionKey,
      provider: "google_oauth",
      workspaceId: input.workspaceId,
      createdBy: input.actorId
    });
    await input.repos.integration.saveEncryptedCredential({
      id: `ecred_google_oauth_${Date.now()}`,
      workspace_id: input.workspaceId,
      provider_key: "google_oauth",
      credential_ref: credentialRef,
      encrypted_payload: envelope,
      status: "active",
      created_by: input.actorId,
      updated_by: input.actorId
    });
  }
  const row: WorkspaceRow = {
    id: existing?.id ? String(existing.id) : `conn_google_oauth_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_type: "google_oauth",
    provider_name: "Google OAuth",
    enabled: input.state.status === "connected",
    status: input.state.status,
    secret_ref: credentialRef,
    configuration: {
      capabilities: input.state.capabilities,
      scopes: input.state.scopes,
      selectedPropertyId: input.state.selectedPropertyId ?? null,
      selectedSiteUrl: input.state.selectedSiteUrl ?? null,
      selectedAccountId: input.state.selectedAccountId ?? null,
      selectedLocationId: input.state.selectedLocationId ?? null
    },
    created_by: input.actorId,
    updated_by: input.actorId
  };
  return existing
    ? input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_oauth", row)
    : input.repos.integration.createProviderConnection(row);
}

function safeGoogleState(state: GoogleIntegrationState) {
  return {
    key: state.key,
    label: state.label,
    status: state.status,
    capabilities: state.capabilities,
    setupRequired: state.setupRequired,
    scopes: state.scopes,
    selectedPropertyId: state.selectedPropertyId ?? null,
    selectedSiteUrl: state.selectedSiteUrl ?? null,
    selectedAccountId: state.selectedAccountId ?? null,
    selectedLocationId: state.selectedLocationId ?? null
  };
}

async function getUsableTokens(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined }) {
  const bundle = await getGoogleConnectionBundle(input);
  if (!bundle.ok) return bundle;
  const expiresAt = Date.parse(String(bundle.tokens.expires_at || ""));
  if (!Number.isFinite(expiresAt) || expiresAt > Date.now() + 60_000) return bundle;
  const refreshed = await refreshGoogleAccessToken({ refreshToken: bundle.tokens.refresh_token, config: input.config, fetcher: input.fetcher });
  const updatedTokens = {
    ...bundle.tokens,
    ...refreshed,
    refresh_token: refreshed.refresh_token || bundle.tokens.refresh_token,
    google_email: bundle.googleEmail ?? null,
    scopes: bundle.scopes
  };
  await upsertGoogleProviderConnection({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    state: googleStateFromConnection(bundle.connection, "connected"),
    credentialSecret: JSON.stringify(updatedTokens),
    encryptionKey: input.config.CREDENTIAL_ENCRYPTION_KEY
  });
  const refreshedBundle = await getGoogleConnectionBundle(input);
  return refreshedBundle;
}

function googleStateFromConnection(connection: WorkspaceRow | null | undefined, status: GoogleIntegrationStatus): GoogleIntegrationState {
  const config = connectionConfig(connection);
  return {
    key: "google_oauth",
    label: "Google OAuth",
    status,
    capabilities: ["oauth_authorization", "token_refresh", "read_only_google_data_sync"],
    setupRequired: [],
    scopes: GOOGLE_OAUTH_SCOPES,
    selectedPropertyId: String(config.ga4PropertyId ?? config.selectedPropertyId ?? "") || null,
    selectedSiteUrl: String(config.searchConsoleSiteUrl ?? config.selectedSiteUrl ?? "") || null,
    selectedAccountId: String(config.businessProfileAccountId ?? config.selectedAccountId ?? "") || null,
    selectedLocationId: String(config.businessProfileLocationId ?? config.selectedLocationId ?? "") || null
  };
}

async function upsertGoogleDataSourceConnection(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  providerKey: "ga4" | "google_search_console" | "google_business_profile";
  providerName: string;
  configuration: Record<string, unknown>;
  actorId: string;
}) {
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, input.providerKey);
  const row: WorkspaceRow = {
    id: existing?.id ? String(existing.id) : `conn_${input.providerKey}_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_type: input.providerKey,
    provider_name: input.providerName,
    enabled: true,
    status: "configured_not_verified",
    last_health_check_status: "configured_not_verified",
    configuration: {
      ...connectionConfig(existing),
      ...input.configuration
    },
    created_by: input.actorId,
    updated_by: input.actorId
  };
  return existing
    ? input.repos.integration.updateProviderConnectionStatus(input.workspaceId, input.providerKey, row)
    : input.repos.integration.createProviderConnection(row);
}

async function upsertConfiguredGoogleDataSources(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: GoogleWorkspaceConfig }) {
  const writes: Promise<WorkspaceRow>[] = [];
  if (input.config.ga4PropertyId) {
    writes.push(upsertGoogleDataSourceConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "ga4",
      providerName: "Google Analytics 4",
      configuration: { selectedPropertyId: input.config.ga4PropertyId, ga4PropertyId: input.config.ga4PropertyId }
    }));
  }
  if (input.config.searchConsoleSiteUrl) {
    writes.push(upsertGoogleDataSourceConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "google_search_console",
      providerName: "Google Search Console",
      configuration: { selectedSiteUrl: input.config.searchConsoleSiteUrl, searchConsoleSiteUrl: input.config.searchConsoleSiteUrl }
    }));
  }
  if (input.config.businessProfileAccountId || input.config.businessProfileLocationId) {
    writes.push(upsertGoogleDataSourceConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "google_business_profile",
      providerName: "Google Business Profile",
      configuration: {
        selectedAccountId: input.config.businessProfileAccountId,
        selectedLocationId: input.config.businessProfileLocationId,
        businessProfileAccountId: input.config.businessProfileAccountId,
        businessProfileLocationId: input.config.businessProfileLocationId,
        optionalForOnlineOnlyPod: true
      }
    }));
  }
  await Promise.all(writes);
}

export async function storeVerifiedGoogleOAuth(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  config: RuntimeConfig;
  tokens: GoogleTokenSet;
  fetcher?: GoogleFetch | undefined;
}) {
  const profile = await verifyGoogleOAuthToken({ accessToken: input.tokens.access_token, fetcher: input.fetcher });
  const scopes = String(input.tokens.scope || GOOGLE_OAUTH_SCOPES.join(" ")).split(/\s+/).filter(Boolean);
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "google_oauth");
  const workspaceConfig = workspaceGoogleConfig(input.config, existing);
  const state: GoogleIntegrationState = {
    key: "google_oauth",
    label: "Google OAuth",
    status: "connected",
    capabilities: ["oauth_authorization", "token_refresh", "read_only_google_data_sync"],
    setupRequired: [],
    scopes,
    selectedPropertyId: workspaceConfig.ga4PropertyId || null,
    selectedSiteUrl: workspaceConfig.searchConsoleSiteUrl || null,
    selectedAccountId: workspaceConfig.businessProfileAccountId || null,
    selectedLocationId: workspaceConfig.businessProfileLocationId || null
  };
  const connection = await upsertGoogleProviderConnection({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    state,
    credentialSecret: JSON.stringify({ ...input.tokens, google_email: profile.email, scopes }),
    encryptionKey: input.config.CREDENTIAL_ENCRYPTION_KEY
  });
  await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_oauth", {
    ...connection,
    configuration: {
      ...connectionConfig(connection),
      googleEmail: profile.email,
      scopes
    }
  });
  await input.repos.integration.statuses.create({
    id: `pstatus_google_oauth_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_connection_id: connection.id,
    provider_type: "google_oauth",
    status: "connected",
    response_metadata: { googleEmail: profile.email, scopes }
  });
  return {
    connection,
    safeConnection: {
      id: connection.id,
      workspace_id: input.workspaceId,
      provider: "google_oauth",
      status: "connected",
      googleEmail: profile.email,
      scopes,
      credential_ref: connection.secret_ref || connection.secretRef ? "[stored]" : null
    }
  };
}

export async function testGoogleConnection(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined }) {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) return bundle;
  const profile = await verifyGoogleOAuthToken({ accessToken: bundle.tokens.access_token, fetcher: input.fetcher });
  await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_oauth", {
    ...bundle.connection,
    enabled: true,
    status: "connected",
    last_health_check_at: new Date().toISOString(),
    last_health_check_status: "success",
    configuration: {
      ...connectionConfig(bundle.connection),
      googleEmail: profile.email,
      scopes: bundle.scopes
    }
  });
  return {
    ok: true as const,
    status: "connected" as const,
    googleEmail: profile.email,
    scopes: bundle.scopes,
    connection: safeGoogleState(googleStateFromConnection(bundle.connection, "connected"))
  };
}

function dateDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function metricValue(row: any, index: number) {
  return Number(row?.metricValues?.[index]?.value ?? 0);
}

function dimensionValue(row: any, index: number) {
  return String(row?.dimensionValues?.[index]?.value ?? "");
}

async function persistMetric(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; metricKey: string; metricValue: number; source: string; dimensionJson?: Record<string, unknown>; metadata?: Record<string, unknown>; measuredAt?: string }) {
  return input.repos.workspaceMetric.create({
    id: `metric_${input.source}_${input.metricKey}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    workspace_id: input.workspaceId,
    metric_key: input.metricKey,
    metric_value: input.metricValue,
    dimension_json: input.dimensionJson ?? {},
    measured_at: input.measuredAt ?? new Date().toISOString(),
    source: input.source,
    metadata: input.metadata ?? {},
    created_by: input.actorId,
    updated_by: input.actorId
  });
}

async function syncRun(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; providerKey: string; syncType: string; status: string; recordsRead?: number; recordsWritten?: number; error?: unknown; setupRequired?: string[]; resultSummary?: Record<string, unknown> }) {
  const sanitized = input.error ? sanitizeProviderError(input.error) : null;
  return input.repos.integration.createIntegrationSyncRun({
    id: `sync_${input.providerKey}_${input.syncType}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    workspace_id: input.workspaceId,
    provider_key: input.providerKey,
    sync_type: input.syncType,
    status: input.status,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    records_read: input.recordsRead ?? 0,
    records_written: input.recordsWritten ?? 0,
    error_code: sanitized ? (input.error instanceof GoogleProviderError ? input.error.status : "provider_error") : null,
    sanitized_error_message: sanitized,
    setup_required: input.setupRequired ?? [],
    result_summary: input.resultSummary ?? {},
    created_by: input.actorId,
    updated_by: input.actorId
  });
}

function resultFromGoogleError(error: unknown) {
  if (error instanceof GoogleProviderError) {
    return {
      ok: false as const,
      status: error.status,
      message: sanitizeProviderError(error),
      setupRequired: error.status === "auth_required" ? ["Reconnect Google."] : ["Verify Google API access and workspace permissions."]
    };
  }
  return { ok: false as const, status: "error" as const, message: sanitizeProviderError(error), setupRequired: ["Review Google integration setup."] };
}

export async function syncGoogleAnalytics(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined }) {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) {
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "ga4", syncType: "manual", status: "blocked", error: bundle.message, setupRequired: bundle.setupRequired });
    return { ok: false as const, status: bundle.status, message: bundle.message, setupRequired: bundle.setupRequired };
  }
  const propertyId = bundle.workspaceConfig.ga4PropertyId;
  if (!propertyId) {
    const setupRequired = ["Configure GA4 property ID."];
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "ga4", syncType: "manual", status: "blocked", error: "missing_ga4_property_id", setupRequired });
    return { ok: false as const, status: "not_configured" as const, message: "GA4 property ID is required before sync.", setupRequired };
  }
  try {
    const fetcher = input.fetcher ?? fetch;
    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
    const dateRanges = [{ startDate: dateDaysAgo(28), endDate: "today" }];
    const summary = await googleJson(fetcher, endpoint, bearer(bundle.tokens.access_token, {
      method: "POST",
      body: JSON.stringify({
        dateRanges,
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "eventCount" }]
      })
    }));
    const topPages = await googleJson(fetcher, endpoint, bearer(bundle.tokens.access_token, {
      method: "POST",
      body: JSON.stringify({
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        limit: 10
      })
    }));
    const acquisition = await googleJson(fetcher, endpoint, bearer(bundle.tokens.access_token, {
      method: "POST",
      body: JSON.stringify({
        dateRanges,
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        limit: 10
      })
    }));
    const row = summary.rows?.[0] ?? {};
    const totals = {
      activeUsers: metricValue(row, 0),
      sessions: metricValue(row, 1),
      views: metricValue(row, 2),
      eventCount: metricValue(row, 3)
    };
    let written = 0;
    for (const [key, value] of Object.entries(totals)) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: `ga4.${key}.28d`, metricValue: value, source: "ga4", metadata: { propertyId } });
      written += 1;
    }
    const pageRows = (topPages.rows ?? []).map((page: any) => ({ pagePath: dimensionValue(page, 0), views: metricValue(page, 0), activeUsers: metricValue(page, 1) }));
    for (const page of pageRows) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "ga4.top_pages.views", metricValue: page.views, source: "ga4", dimensionJson: { pagePath: page.pagePath }, metadata: { propertyId } });
      written += 1;
    }
    const sourceRows = (acquisition.rows ?? []).map((source: any) => ({ sourceMedium: dimensionValue(source, 0), sessions: metricValue(source, 0), activeUsers: metricValue(source, 1) }));
    for (const source of sourceRows) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "ga4.acquisition.sessions", metricValue: source.sessions, source: "ga4", dimensionJson: { sourceMedium: source.sourceMedium }, metadata: { propertyId } });
      written += 1;
    }
    const run = await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "ga4", syncType: "manual", status: "completed", recordsRead: 1 + pageRows.length + sourceRows.length, recordsWritten: written, resultSummary: { propertyId, totals, topPages: pageRows, acquisition: sourceRows } });
    await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "ga4", {
      id: `conn_ga4_${Date.now()}`,
      workspace_id: input.workspaceId,
      provider_type: "ga4",
      provider_name: "Google Analytics 4",
      enabled: true,
      status: "connected",
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: "success",
      configuration: { selectedPropertyId: propertyId }
    });
    return { ok: true as const, status: "success" as const, provider: "ga4", totals, topPages: pageRows, acquisition: sourceRows, syncRun: run };
  } catch (error) {
    const result = resultFromGoogleError(error);
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "ga4", syncType: "manual", status: "failed", error, setupRequired: result.setupRequired });
    return result;
  }
}

export async function syncGoogleSearchConsole(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined }) {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) {
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_search_console", syncType: "manual", status: "blocked", error: bundle.message, setupRequired: bundle.setupRequired });
    return { ok: false as const, status: bundle.status, message: bundle.message, setupRequired: bundle.setupRequired };
  }
  const siteUrl = bundle.workspaceConfig.searchConsoleSiteUrl;
  if (!siteUrl) {
    const setupRequired = ["Configure Search Console site URL."];
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_search_console", syncType: "manual", status: "blocked", error: "missing_search_console_site_url", setupRequired });
    return { ok: false as const, status: "not_configured" as const, message: "Search Console site URL is required before sync.", setupRequired };
  }
  try {
    const fetcher = input.fetcher ?? fetch;
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const baseBody = { startDate: dateDaysAgo(28), endDate: dateDaysAgo(1), rowLimit: 10 };
    const summary = await googleJson(fetcher, endpoint, bearer(bundle.tokens.access_token, { method: "POST", body: JSON.stringify(baseBody) }));
    const queryData = await googleJson(fetcher, endpoint, bearer(bundle.tokens.access_token, { method: "POST", body: JSON.stringify({ ...baseBody, dimensions: ["query"] }) }));
    const pageData = await googleJson(fetcher, endpoint, bearer(bundle.tokens.access_token, { method: "POST", body: JSON.stringify({ ...baseBody, dimensions: ["page"] }) }));
    const row = summary.rows?.[0] ?? {};
    const totals = {
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0)
    };
    let written = 0;
    for (const [key, value] of Object.entries(totals)) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: `gsc.${key}.28d`, metricValue: value, source: "google_search_console", metadata: { siteUrl } });
      written += 1;
    }
    const queries = (queryData.rows ?? []).map((item: any) => ({ query: String(item.keys?.[0] ?? ""), clicks: Number(item.clicks ?? 0), impressions: Number(item.impressions ?? 0), ctr: Number(item.ctr ?? 0), position: Number(item.position ?? 0) }));
    for (const query of queries) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "gsc.top_queries.clicks", metricValue: query.clicks, source: "google_search_console", dimensionJson: { query: query.query }, metadata: { siteUrl, impressions: query.impressions, ctr: query.ctr, position: query.position } });
      written += 1;
    }
    const pages = (pageData.rows ?? []).map((item: any) => ({ page: String(item.keys?.[0] ?? ""), clicks: Number(item.clicks ?? 0), impressions: Number(item.impressions ?? 0), ctr: Number(item.ctr ?? 0), position: Number(item.position ?? 0) }));
    for (const page of pages) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "gsc.top_pages.clicks", metricValue: page.clicks, source: "google_search_console", dimensionJson: { page: page.page }, metadata: { siteUrl, impressions: page.impressions, ctr: page.ctr, position: page.position } });
      written += 1;
    }
    const run = await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_search_console", syncType: "manual", status: "completed", recordsRead: 1 + queries.length + pages.length, recordsWritten: written, resultSummary: { siteUrl, totals, queries, pages } });
    await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_search_console", {
      id: `conn_gsc_${Date.now()}`,
      workspace_id: input.workspaceId,
      provider_type: "google_search_console",
      provider_name: "Google Search Console",
      enabled: true,
      status: "connected",
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: "success",
      configuration: { selectedSiteUrl: siteUrl }
    });
    return { ok: true as const, status: "success" as const, provider: "google_search_console", totals, queries, pages, syncRun: run };
  } catch (error) {
    const result = resultFromGoogleError(error);
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_search_console", syncType: "manual", status: "failed", error, setupRequired: result.setupRequired });
    return result;
  }
}

function accountName(accountId: string) {
  return accountId.startsWith("accounts/") ? accountId : `accounts/${accountId}`;
}

function locationName(accountId: string, locationId: string) {
  if (locationId.startsWith("locations/")) return `${accountName(accountId)}/${locationId}`;
  if (locationId.startsWith("accounts/")) return locationId;
  return `${accountName(accountId)}/locations/${locationId}`;
}

function performanceLocationName(locationId: string) {
  const match = locationId.match(/locations\/([^/]+)$/);
  if (match?.[1]) return `locations/${match[1]}`;
  return locationId.startsWith("locations/") ? locationId : `locations/${locationId}`;
}

function dateParts(daysAgo: number) {
  const [year, month, day] = dateDaysAgo(daysAgo).split("-").map((value) => Number(value));
  return { year, month, day };
}

const GBP_DAILY_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_DIRECTION_REQUESTS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS"
];

function gbpMetricKey(metric: string) {
  return `gbp.performance.${metric.toLowerCase()}.28d`;
}

function parseGbpPerformance(response: Record<string, any>) {
  const totals: Record<string, number> = {};
  for (const group of response.multiDailyMetricTimeSeries ?? []) {
    for (const series of group.dailyMetricTimeSeries ?? []) {
      const metric = String(series.dailyMetric ?? "DAILY_METRIC_UNKNOWN");
      const values = series.timeSeries?.datedValues ?? [];
      totals[metric] = values.reduce((sum: number, value: any) => sum + Number(value.value ?? 0), totals[metric] ?? 0);
    }
  }
  return totals;
}

async function fetchGbpPerformance(input: { fetcher: GoogleFetch; accessToken: string; locationId: string }) {
  const start = dateParts(28);
  const end = dateParts(1);
  const url = new URL(`https://businessprofileperformance.googleapis.com/v1/${performanceLocationName(input.locationId)}:fetchMultiDailyMetricsTimeSeries`);
  for (const metric of GBP_DAILY_METRICS) url.searchParams.append("dailyMetrics", metric);
  url.searchParams.set("dailyRange.start_date.year", String(start.year));
  url.searchParams.set("dailyRange.start_date.month", String(start.month));
  url.searchParams.set("dailyRange.start_date.day", String(start.day));
  url.searchParams.set("dailyRange.end_date.year", String(end.year));
  url.searchParams.set("dailyRange.end_date.month", String(end.month));
  url.searchParams.set("dailyRange.end_date.day", String(end.day));
  const response = await googleJson(input.fetcher, url.toString(), bearer(input.accessToken, { method: "GET" }));
  return parseGbpPerformance(response);
}

export async function syncGoogleBusinessProfile(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined }) {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) {
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_business_profile", syncType: "manual", status: "blocked", error: bundle.message, setupRequired: bundle.setupRequired });
    return { ok: false as const, status: bundle.status, message: bundle.message, setupRequired: bundle.setupRequired };
  }
  try {
    const fetcher = input.fetcher ?? fetch;
    const accountsResponse = await googleJson(fetcher, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts", bearer(bundle.tokens.access_token, { method: "GET" }));
    const accounts = (accountsResponse.accounts ?? []).map((account: any) => ({ name: String(account.name ?? ""), accountName: String(account.accountName ?? account.name ?? ""), type: String(account.type ?? "") }));
    const selectedAccount = bundle.workspaceConfig.businessProfileAccountId || (accounts.length === 1 ? accounts[0]?.name ?? "" : "");
    if (!selectedAccount) {
      const setupRequired = ["Select a Google Business Profile account."];
      const run = await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_business_profile", syncType: "manual", status: "blocked", recordsRead: accounts.length, setupRequired, resultSummary: { accounts } });
      return { ok: false as const, status: "not_configured" as const, message: "Select a Google Business Profile account before location/review sync.", setupRequired, accounts, syncRun: run };
    }
    const locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName(selectedAccount)}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,metadata`;
    const locationsResponse = await googleJson(fetcher, locationsUrl, bearer(bundle.tokens.access_token, { method: "GET" }));
    const locations = (locationsResponse.locations ?? []).map((location: any) => ({
      name: String(location.name ?? ""),
      title: String(location.title ?? ""),
      websiteUri: String(location.websiteUri ?? ""),
      metadata: location.metadata ?? {}
    }));
    const selectedLocation = bundle.workspaceConfig.businessProfileLocationId || (locations.length === 1 ? locations[0]?.name ?? "" : "");
    if (!selectedLocation) {
      const setupRequired = ["Select a Google Business Profile location."];
      const run = await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_business_profile", syncType: "manual", status: "blocked", recordsRead: accounts.length + locations.length, setupRequired, resultSummary: { accounts, locations } });
      return { ok: false as const, status: "not_configured" as const, message: "Select a Google Business Profile location before review sync.", setupRequired, accounts, locations, syncRun: run };
    }
    const fullLocationName = locationName(selectedAccount, selectedLocation);
    let reviews: any[] = [];
    let reviewSummary = { reviewCount: 0, averageRating: 0 };
    const accessLimitedMessages: string[] = [];
    let performanceSummary: Record<string, number> = {};
    try {
      const reviewsResponse = await googleJson(fetcher, `https://mybusiness.googleapis.com/v4/${fullLocationName}/reviews?pageSize=50`, bearer(bundle.tokens.access_token, { method: "GET" }));
      reviews = reviewsResponse.reviews ?? [];
      const ratings = reviews.map((review: any) => Number(review.starRatingNumeric ?? review.rating ?? 0)).filter((value: number) => value > 0);
      reviewSummary = {
        reviewCount: reviews.length,
        averageRating: ratings.length ? Number((ratings.reduce((sum: number, value: number) => sum + value, 0) / ratings.length).toFixed(2)) : 0
      };
    } catch (error) {
      if (error instanceof GoogleProviderError && ["access_limited", "access_denied"].includes(error.status)) {
        accessLimitedMessages.push(sanitizeProviderError(error));
      } else {
        throw error;
      }
    }
    try {
      performanceSummary = await fetchGbpPerformance({ fetcher, accessToken: bundle.tokens.access_token, locationId: fullLocationName });
    } catch (error) {
      if (error instanceof GoogleProviderError && ["access_limited", "access_denied"].includes(error.status)) {
        accessLimitedMessages.push(sanitizeProviderError(error));
      } else {
        throw error;
      }
    }
    await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "gbp.accounts.count", metricValue: accounts.length, source: "google_business_profile", metadata: { selectedAccount } });
    await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "gbp.locations.count", metricValue: locations.length, source: "google_business_profile", metadata: { selectedAccount, selectedLocation: fullLocationName } });
    await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "gbp.reviews.count", metricValue: reviewSummary.reviewCount, source: "google_business_profile", metadata: { selectedAccount, selectedLocation: fullLocationName } });
    await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: "gbp.reviews.average_rating", metricValue: reviewSummary.averageRating, source: "google_business_profile", metadata: { selectedAccount, selectedLocation: fullLocationName } });
    let written = 4;
    for (const [metric, value] of Object.entries(performanceSummary)) {
      await persistMetric({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, metricKey: gbpMetricKey(metric), metricValue: value, source: "google_business_profile", metadata: { selectedAccount, selectedLocation: fullLocationName, metric } });
      written += 1;
    }
    const accessLimitedMessage = accessLimitedMessages.length ? Array.from(new Set(accessLimitedMessages)).join(" ") : null;
    const status = accessLimitedMessage ? "access_limited" : "completed";
    const run = await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_business_profile", syncType: "manual", status, recordsRead: accounts.length + locations.length + reviews.length + Object.keys(performanceSummary).length, recordsWritten: written, error: accessLimitedMessage ?? undefined, setupRequired: accessLimitedMessage ? ["Enable Google Business Profile review/performance API access if available."] : [], resultSummary: { accounts, locations, selectedAccount, selectedLocation: fullLocationName, reviewSummary, performanceSummary } });
    await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_business_profile", {
      id: `conn_gbp_${Date.now()}`,
      workspace_id: input.workspaceId,
      provider_type: "google_business_profile",
      provider_name: "Google Business Profile",
      enabled: true,
      status: accessLimitedMessage ? "access_limited" : "connected",
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: accessLimitedMessage ? "access_limited" : "success",
      configuration: { selectedAccountId: selectedAccount, selectedLocationId: fullLocationName }
    });
    if (accessLimitedMessage) {
      return { ok: false as const, status: "access_limited" as const, message: accessLimitedMessage, setupRequired: ["Enable Google Business Profile review/performance API access if available."], accounts, locations, reviewSummary, performanceSummary, syncRun: run };
    }
    return { ok: true as const, status: "success" as const, provider: "google_business_profile", accounts, locations, reviewSummary, performanceSummary, syncRun: run };
  } catch (error) {
    const result = resultFromGoogleError(error);
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_business_profile", syncType: "manual", status: "failed", error, setupRequired: result.setupRequired });
    return result;
  }
}

function normalizeGa4PropertyId(value: string) {
  const match = value.match(/properties\/(\d+)/);
  return match?.[1] ?? value.replace(/[^\d]/g, "");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hostFromUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("sc-domain:")) return value.replace("sc-domain:", "").replace(/^www\./, "").toLowerCase();
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function googleDetectionHints(input: { repos: RepositoryBundle; workspaceId: string; config: RuntimeConfig }) {
  const profile = (await input.repos.businessProfileV1.listByWorkspace(input.workspaceId))[0] as any;
  const profileJson = (profile?.profile_json ?? profile?.profileJson ?? {}) as Record<string, unknown>;
  const brandValues = [
    SALTY_COWHIDE_TARGET_DOMAIN,
    `https://${SALTY_COWHIDE_TARGET_DOMAIN}/`,
    `https://www.${SALTY_COWHIDE_TARGET_DOMAIN}/`,
    `sc-domain:${SALTY_COWHIDE_TARGET_DOMAIN}`,
    "Salty Cowhide",
    "SaltyCowhide.com",
    input.config.NEXT_PUBLIC_STOREFRONT_BASE_URL,
    String(profile?.public_brand_name ?? profile?.publicBrandName ?? ""),
    String(profileJson.publicBrandName ?? ""),
    String(profileJson.businessName ?? ""),
    String(profileJson.websiteUrl ?? profileJson.storefrontUrl ?? "")
  ].filter(Boolean);
  const domains = Array.from(new Set([SALTY_COWHIDE_TARGET_DOMAIN, ...brandValues.map((value) => hostFromUrl(String(value))).filter(Boolean)]));
  const terms = Array.from(new Set(brandValues.map((value) => normalizeText(String(value))).filter((value) => value.length > 2)));
  return { domains, terms };
}

function candidateDomain(value: string | null | undefined) {
  return hostFromUrl(value ?? "");
}

function isStrongGoogleMatch(matchStrength: GoogleDiscoveryCandidate["matchStrength"]) {
  return matchStrength === "exact_domain_match" || matchStrength === "brand_match";
}

function scoreCandidate(text: string, url: string | null | undefined, hints: Awaited<ReturnType<typeof googleDetectionHints>>) {
  const normalizedText = normalizeText(`${text} ${url ?? ""}`);
  const host = candidateDomain(url);
  const domainMatch = hints.domains.find((domain) => host === domain || host === `www.${domain}`);
  if (domainMatch) return { confidence: "high" as const, matchStrength: "exact_domain_match" as const, matchReason: `Matched ${domainMatch}.` };
  const primaryDomainText = normalizeText(SALTY_COWHIDE_TARGET_DOMAIN);
  if (normalizedText.includes(primaryDomainText)) return { confidence: "high" as const, matchStrength: "exact_domain_match" as const, matchReason: `Matched ${SALTY_COWHIDE_TARGET_DOMAIN}.` };
  if (/\bsalty\s*cowhide\b/i.test(text) || normalizedText.includes("salty cowhide")) return { confidence: "high" as const, matchStrength: "brand_match" as const, matchReason: "Matched Salty Cowhide brand name." };
  if (/ruffles\s*and\s*pixie\s*dust|rufflesandpixiedust/i.test(text + " " + (url ?? ""))) return { confidence: "low" as const, matchStrength: "likely_related" as const, matchReason: "Historically related account, but not the primary Salty Cowhide target." };
  if (/blogspot|sellerinsiderhub|thelocalupgrade/i.test(text + " " + (url ?? ""))) return { confidence: "low" as const, matchStrength: "unrelated" as const, matchReason: "Does not match the Salty Cowhide target domain." };
  if (host && host !== SALTY_COWHIDE_TARGET_DOMAIN) return { confidence: "low" as const, matchStrength: "unrelated" as const, matchReason: "Different domain than SaltyCowhide.com." };
  const termMatch = hints.terms.find((term) => term && normalizedText.includes(term) && /salty|cowhide/i.test(term));
  if (termMatch) return { confidence: "medium" as const, matchStrength: "brand_match" as const, matchReason: "Matched Salty Cowhide business profile hints." };
  return { confidence: "low" as const, matchStrength: "unknown" as const, matchReason: "Available to this Google account, but not matched to Salty Cowhide." };
}

function finalizeDiscovery(candidates: GoogleDiscoveryCandidate[], options: { emptyStatus?: GoogleDiscoverySourceResult["status"]; emptyMessage: string; multiMessage: string; singleMessage: string }) {
  const strong = candidates.filter((candidate) => isStrongGoogleMatch(candidate.matchStrength));
  const selected = strong.length === 1 ? strong[0] : null;
  if (selected) {
    return {
      status: "auto_detected" as const,
      message: options.singleMessage,
      candidates: candidates.map((candidate) => candidate.id === selected.id ? selected : candidate),
      selected,
      saved: false,
      setupRequired: ["Run sync to verify live provider access."]
    };
  }
  if (strong.length > 1) {
    return { status: "needs_selection" as const, message: options.multiMessage, candidates, selected: null, saved: false, setupRequired: ["Select the correct Google resource, then sync."] };
  }
  if (candidates.length) {
    return {
      status: "manual_setup" as const,
      message: `${options.emptyMessage} Other Google resources are available on this account, but they do not appear to match Salty Cowhide.`,
      candidates,
      selected: null,
      saved: false,
      setupRequired: ["Create or verify SaltyCowhide.com Google resources, or manually override with owner intent."]
    };
  }
  return { status: options.emptyStatus ?? "manual_setup", message: options.emptyMessage, candidates: [], selected: null, saved: false, setupRequired: ["Manual setup required."] };
}

async function discoverGa4Properties(input: { fetcher: GoogleFetch; accessToken: string; hints: Awaited<ReturnType<typeof googleDetectionHints>> }): Promise<GoogleDiscoverySourceResult> {
  try {
    const accountsResponse = await googleJson(input.fetcher, "https://analyticsadmin.googleapis.com/v1beta/accounts", bearer(input.accessToken, { method: "GET" }));
    const accounts = (accountsResponse.accounts ?? []).map((account: any) => ({ name: String(account.name ?? ""), displayName: String(account.displayName ?? account.name ?? "") })).filter((account: any) => account.name);
    const candidates: GoogleDiscoveryCandidate[] = [];
    for (const account of accounts.slice(0, 20)) {
      const propertiesUrl = new URL("https://analyticsadmin.googleapis.com/v1beta/properties");
      propertiesUrl.searchParams.set("filter", `parent:${account.name}`);
      const propertiesResponse = await googleJson(input.fetcher, propertiesUrl.toString(), bearer(input.accessToken, { method: "GET" }));
      for (const property of propertiesResponse.properties ?? []) {
        const propertyName = String(property.name ?? "");
        const propertyId = normalizeGa4PropertyId(propertyName);
        let url: string | null = null;
        try {
          const streamsResponse = await googleJson(input.fetcher, `https://analyticsadmin.googleapis.com/v1beta/${propertyName}/dataStreams`, bearer(input.accessToken, { method: "GET" }));
          const webStream = (streamsResponse.dataStreams ?? []).find((stream: any) => stream.webStreamData?.defaultUri);
          url = webStream?.webStreamData?.defaultUri ? String(webStream.webStreamData.defaultUri) : null;
        } catch (error) {
          if (!(error instanceof GoogleProviderError) || !["access_denied", "access_limited"].includes(error.status)) throw error;
        }
        const label = String(property.displayName ?? propertyName);
        const score = scoreCandidate(`${label} ${account.displayName}`, url, input.hints);
        candidates.push({ id: propertyId, propertyId, label, type: "ga4_property", url, confidence: score.confidence, matchStrength: score.matchStrength, matchReason: score.matchReason, accountId: account.name });
      }
    }
    return finalizeDiscovery(candidates, {
      emptyMessage: "No GA4 properties were found for this Google account. Create or grant access to the SaltyCowhide.com GA4 property, then retry.",
      multiMessage: "Multiple GA4 properties are available. Select the SaltyCowhide.com property before syncing.",
      singleMessage: "One likely GA4 property was found and can be saved for verification."
    });
  } catch (error) {
    const result = resultFromGoogleError(error);
    return { status: result.status === "access_limited" ? "access_limited" : "setup_needed", message: result.status === "access_limited" ? "GA4 discovery requires Analytics Admin API access or manual property ID setup." : result.message, candidates: [], selected: null, saved: false, setupRequired: result.setupRequired };
  }
}

async function discoverSearchConsoleSites(input: { fetcher: GoogleFetch; accessToken: string; hints: Awaited<ReturnType<typeof googleDetectionHints>> }): Promise<GoogleDiscoverySourceResult> {
  try {
    const response = await googleJson(input.fetcher, "https://www.googleapis.com/webmasters/v3/sites", bearer(input.accessToken, { method: "GET" }));
    const candidates = (response.siteEntry ?? []).map((site: any) => {
      const siteUrl = String(site.siteUrl ?? "");
      const score = scoreCandidate(siteUrl, siteUrl, input.hints);
      return {
        id: siteUrl,
        label: siteUrl,
        type: "search_console_site" as const,
        siteUrl,
        url: siteUrl.startsWith("sc-domain:") ? null : siteUrl,
        confidence: score.confidence,
        matchStrength: score.matchStrength,
        matchReason: `${score.matchReason} Permission: ${String(site.permissionLevel ?? "available")}.`
      };
    }).filter((candidate: GoogleDiscoveryCandidate) => candidate.siteUrl);
    return finalizeDiscovery(candidates, {
      emptyMessage: "No Search Console properties found for this Google account. Add saltycowhide.com to Search Console, verify ownership, then retry.",
      multiMessage: "Multiple Search Console properties are available. Select the SaltyCowhide.com URL or sc-domain property before syncing.",
      singleMessage: "One likely Search Console property was found and can be saved for verification."
    });
  } catch (error) {
    const result = resultFromGoogleError(error);
    return { status: result.status === "access_limited" ? "access_limited" : "setup_needed", message: result.status === "access_limited" ? "Search Console discovery requires API access or manual site setup." : result.message, candidates: [], selected: null, saved: false, setupRequired: result.setupRequired };
  }
}

async function discoverBusinessProfileLocations(input: { fetcher: GoogleFetch; accessToken: string; hints: Awaited<ReturnType<typeof googleDetectionHints>> }): Promise<GoogleDiscoverySourceResult> {
  try {
    const accountsResponse = await googleJson(input.fetcher, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts", bearer(input.accessToken, { method: "GET" }));
    const accounts = (accountsResponse.accounts ?? []).map((account: any) => ({ name: String(account.name ?? ""), accountName: String(account.accountName ?? account.name ?? "") })).filter((account: any) => account.name);
    if (!accounts.length) {
      return { status: "optional_not_required", message: "No Google Business Profile accounts were found. GBP is optional for an online-only Salty Cowhide POD launch.", candidates: [], selected: null, saved: false, setupRequired: [] };
    }
    const candidates: GoogleDiscoveryCandidate[] = [];
    for (const account of accounts.slice(0, 20)) {
      const locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName(account.name)}/locations?readMask=name,title,websiteUri,metadata`;
      const locationsResponse = await googleJson(input.fetcher, locationsUrl, bearer(input.accessToken, { method: "GET" }));
      for (const location of locationsResponse.locations ?? []) {
        const locationId = String(location.name ?? "");
        const label = String(location.title ?? locationId);
        const url = typeof location.websiteUri === "string" ? location.websiteUri : null;
        const score = scoreCandidate(`${label} ${account.accountName}`, url, input.hints);
        candidates.push({ id: `${account.name}:${locationId}`, label, type: "gbp_location", accountId: account.name, locationId, url, confidence: score.confidence, matchStrength: score.matchStrength, matchReason: score.matchReason });
      }
    }
    const result = finalizeDiscovery(candidates, {
      emptyStatus: "optional_not_required",
      emptyMessage: "No Google Business Profile locations were found. GBP is optional for online-only ecommerce/POD workspaces.",
      multiMessage: "Multiple Google Business Profile locations are available. Select one only if Salty Cowhide has an eligible public profile.",
      singleMessage: "One likely Google Business Profile location was found. GBP remains optional for online-only POD launch readiness."
    });
    if (result.status === "manual_setup") result.status = "optional_not_required";
    return result;
  } catch (error) {
    const result = resultFromGoogleError(error);
    return { status: "access_limited", message: "Google Business Profile discovery is unavailable or limited for this account. This is not a hard blocker for an online-only Salty Cowhide POD launch.", candidates: [], selected: null, saved: false, setupRequired: result.status === "auth_required" ? ["Reconnect Google."] : ["Use GBP only if the business is eligible and API access is available."] };
  }
}

export async function autoDetectGoogleSetup(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined; autoSave?: boolean | undefined }): Promise<GoogleAutoDetectResult> {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) {
    return { ok: false, status: bundle.status, provider: "google_oauth", message: bundle.message, setupRequired: bundle.setupRequired };
  }
  const fetcher = input.fetcher ?? fetch;
  const hints = await googleDetectionHints({ repos: input.repos, workspaceId: input.workspaceId, config: input.config });
  const [ga4, searchConsole, businessProfile] = await Promise.all([
    discoverGa4Properties({ fetcher, accessToken: bundle.tokens.access_token, hints }),
    discoverSearchConsoleSites({ fetcher, accessToken: bundle.tokens.access_token, hints }),
    discoverBusinessProfileLocations({ fetcher, accessToken: bundle.tokens.access_token, hints })
  ]);
  const autoSaved: Partial<GoogleWorkspaceConfig> = {};
  if (input.autoSave !== false) {
    if (ga4.selected?.propertyId) autoSaved.ga4PropertyId = ga4.selected.propertyId;
    if (searchConsole.selected?.siteUrl) autoSaved.searchConsoleSiteUrl = searchConsole.selected.siteUrl;
    if (businessProfile.selected?.accountId && businessProfile.selected.locationId) {
      autoSaved.businessProfileAccountId = businessProfile.selected.accountId;
      autoSaved.businessProfileLocationId = businessProfile.selected.locationId;
    }
    if (Object.keys(autoSaved).length) {
      await configureGoogleWorkspace({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, config: input.config, values: autoSaved });
      if (autoSaved.ga4PropertyId) ga4.saved = true;
      if (autoSaved.searchConsoleSiteUrl) searchConsole.saved = true;
      if (autoSaved.businessProfileAccountId || autoSaved.businessProfileLocationId) businessProfile.saved = true;
    }
  }
  await syncRun({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    providerKey: "google_oauth",
    syncType: "auto_detect",
    status: "completed",
    recordsRead: ga4.candidates.length + searchConsole.candidates.length + businessProfile.candidates.length,
    recordsWritten: Object.keys(autoSaved).length,
    resultSummary: {
      ga4: { status: ga4.status, candidates: ga4.candidates.length, saved: Boolean(autoSaved.ga4PropertyId) },
      searchConsole: { status: searchConsole.status, candidates: searchConsole.candidates.length, saved: Boolean(autoSaved.searchConsoleSiteUrl) },
      businessProfile: { status: businessProfile.status, candidates: businessProfile.candidates.length, saved: Boolean(autoSaved.businessProfileLocationId), optionalForOnlineOnlyPod: true }
    }
  });
  return {
    ok: true,
    status: "completed",
    provider: "google_oauth",
    message: "Google resource discovery completed. Saved only single confident matches; sync is still required before any data source is connected.",
    googleEmail: bundle.googleEmail ?? null,
    autoSaved,
    dataSources: { ga4, searchConsole, businessProfile }
  };
}

function hasGoogleScope(scopes: string[], scope: string) {
  return scopes.includes(scope);
}

function scopeResult(input: { provider: string; targetDomain?: string; scope: string; authorizationUrl?: string | undefined; message: string }): GoogleLaunchSetupResult {
  return {
    ok: false,
    status: "requires_scope",
    provider: input.provider,
    targetDomain: input.targetDomain ?? SALTY_COWHIDE_TARGET_DOMAIN,
    message: input.message,
    authorizationUrl: input.authorizationUrl,
    setupRequired: [input.scope],
    ownerActions: ["Approve the additional Google permission, then retry this setup action."]
  };
}

async function upsertGoogleSetupConnection(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  providerKey: string;
  providerName: string;
  status: string;
  enabled?: boolean;
  configuration: Record<string, unknown>;
}) {
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, input.providerKey);
  const row: WorkspaceRow = {
    id: existing?.id ? String(existing.id) : `conn_${input.providerKey}_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_type: input.providerKey,
    provider_name: input.providerName,
    enabled: input.enabled ?? false,
    status: input.status,
    last_health_check_status: input.status,
    configuration: { ...connectionConfig(existing), ...input.configuration },
    created_by: input.actorId,
    updated_by: input.actorId
  };
  return existing
    ? input.repos.integration.updateProviderConnectionStatus(input.workspaceId, input.providerKey, row)
    : input.repos.integration.createProviderConnection(row);
}

function safeLaunchError(input: { provider: string; error: unknown; fallback: string; targetDomain?: string }): GoogleLaunchSetupResult {
  const result = resultFromGoogleError(input.error);
  const status = result.status === "auth_required" ? "auth_required" : result.status === "access_denied" || result.status === "access_limited" ? "access_limited" : "error";
  return {
    ok: false,
    status,
    provider: input.provider,
    targetDomain: input.targetDomain ?? SALTY_COWHIDE_TARGET_DOMAIN,
    message: status === "access_limited" ? input.fallback : result.message,
    setupRequired: result.setupRequired,
    ownerActions: status === "access_limited" ? ["Use manual setup in Google, then save the resulting IDs in SaltyFactory."] : result.setupRequired
  };
}

async function bestAnalyticsAccount(input: { fetcher: GoogleFetch; accessToken: string; hints: Awaited<ReturnType<typeof googleDetectionHints>> }) {
  const accountsResponse = await googleJson(input.fetcher, "https://analyticsadmin.googleapis.com/v1beta/accounts", bearer(input.accessToken, { method: "GET" }));
  const accounts = (accountsResponse.accounts ?? []).map((account: any) => ({ name: String(account.name ?? ""), displayName: String(account.displayName ?? account.name ?? "") })).filter((account: any) => account.name);
  const scored = accounts.map((account: any) => ({ ...account, score: scoreCandidate(account.displayName, null, input.hints) }));
  const strong = scored.filter((account: any) => isStrongGoogleMatch(account.score.matchStrength));
  return { accounts: scored, selected: strong[0] ?? (scored.length === 1 ? scored[0] : null) };
}

export async function setupGoogleAnalyticsForSaltyCowhide(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined; authorizationUrl?: string | undefined }): Promise<GoogleLaunchSetupResult> {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) return { ok: false, status: bundle.status, provider: "ga4", targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, message: bundle.message, setupRequired: bundle.setupRequired };
  const editScope = GOOGLE_ANALYTICS_SETUP_SCOPES[0]!;
  if (!hasGoogleScope(bundle.scopes, editScope)) {
    return scopeResult({ provider: "ga4", scope: editScope, authorizationUrl: input.authorizationUrl, message: "Creating a GA4 property requires Google Analytics edit permission. SaltyFactory requests this only after the owner clicks setup." });
  }
  const fetcher = input.fetcher ?? fetch;
  try {
    const hints = await googleDetectionHints({ repos: input.repos, workspaceId: input.workspaceId, config: input.config });
    const { accounts, selected } = await bestAnalyticsAccount({ fetcher, accessToken: bundle.tokens.access_token, hints });
    if (!selected) {
      await upsertGoogleSetupConnection({
        repos: input.repos,
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        providerKey: "ga4",
        providerName: "Google Analytics 4",
        status: "requires_owner_action",
        configuration: { targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, availableAccounts: accounts.map((account: any) => ({ name: account.name, displayName: account.displayName, matchStrength: account.score.matchStrength })) }
      });
      return {
        ok: false,
        status: "requires_owner_action",
        provider: "ga4",
        targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
        message: "Choose or create a Google Analytics account for Salty Cowhide before SaltyFactory can create the GA4 property.",
        setupRequired: ["Google Analytics account selection or Terms acceptance."],
        ownerActions: ["Open Google Analytics Admin, create or choose the Salty Cowhide account, accept required terms, then retry."]
      };
    }
    const property = await googleJson(fetcher, "https://analyticsadmin.googleapis.com/v1beta/properties", bearer(bundle.tokens.access_token, {
      method: "POST",
      body: JSON.stringify({
        parent: selected.name,
        displayName: "Salty Cowhide - GA4",
        timeZone: "America/New_York",
        currencyCode: "USD"
      })
    }));
    const propertyName = String(property.name ?? "");
    const propertyId = normalizeGa4PropertyId(propertyName);
    const stream = await googleJson(fetcher, `https://analyticsadmin.googleapis.com/v1beta/${propertyName}/dataStreams`, bearer(bundle.tokens.access_token, {
      method: "POST",
      body: JSON.stringify({
        type: "WEB_DATA_STREAM",
        displayName: "SaltyCowhide.com web stream",
        webStreamData: { defaultUri: `https://${SALTY_COWHIDE_TARGET_DOMAIN}/` }
      })
    }));
    await configureGoogleWorkspace({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, config: input.config, values: { ga4PropertyId: propertyId } });
    await upsertGoogleDataSourceConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "ga4",
      providerName: "Google Analytics 4",
      configuration: {
        selectedPropertyId: propertyId,
        ga4PropertyId: propertyId,
        webDataStreamName: String(stream.name ?? ""),
        webStreamDefaultUri: `https://${SALTY_COWHIDE_TARGET_DOMAIN}/`,
        targetDomain: SALTY_COWHIDE_TARGET_DOMAIN
      }
    });
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "ga4", syncType: "setup_create", status: "configured_not_verified", recordsWritten: 2, resultSummary: { propertyId, streamName: String(stream.name ?? ""), targetDomain: SALTY_COWHIDE_TARGET_DOMAIN } });
    return {
      ok: true,
      status: "configured_not_verified",
      provider: "ga4",
      targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
      message: "GA4 property and web data stream were created for SaltyCowhide.com. Run Sync GA4 to verify live data access.",
      setupRequired: ["Run Sync GA4 to verify the property."],
      ownerActions: ["Install the GA4 tag or connect it through Shopify/Google tag manager before traffic can appear."],
      configuration: { propertyId, streamName: String(stream.name ?? ""), defaultUri: `https://${SALTY_COWHIDE_TARGET_DOMAIN}/` }
    };
  } catch (error) {
    return safeLaunchError({ provider: "ga4", error, fallback: "GA4 setup could not be completed through the API. Manual Google Analytics setup may be required." });
  }
}

export async function setupSearchConsoleForSaltyCowhide(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined; authorizationUrl?: string | undefined }): Promise<GoogleLaunchSetupResult> {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) return { ok: false, status: bundle.status, provider: "google_search_console", targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, message: bundle.message, setupRequired: bundle.setupRequired };
  const writeScope = GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES[0]!;
  if (!hasGoogleScope(bundle.scopes, writeScope)) {
    return scopeResult({ provider: "google_search_console", scope: writeScope, authorizationUrl: input.authorizationUrl, message: "Adding Search Console properties requires Search Console write permission. SaltyFactory requests this only after the owner clicks setup." });
  }
  const fetcher = input.fetcher ?? fetch;
  const properties = [`https://${SALTY_COWHIDE_TARGET_DOMAIN}/`, `sc-domain:${SALTY_COWHIDE_TARGET_DOMAIN}`];
  const added: string[] = [];
  const failed: string[] = [];
  for (const property of properties) {
    try {
      await googleJson(fetcher, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}`, bearer(bundle.tokens.access_token, { method: "PUT" }));
      added.push(property);
    } catch (error) {
      failed.push(sanitizeProviderError(error));
    }
  }
  if (!added.length) {
    await upsertGoogleSetupConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "google_search_console",
      providerName: "Google Search Console",
      status: "verification_required",
      configuration: { targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, attemptedProperties: properties, failedSetup: failed }
    });
    return {
      ok: false,
      status: "manual_setup_needed",
      provider: "google_search_console",
      targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
      message: "Search Console properties could not be added through the API. Add SaltyCowhide.com manually, verify ownership, then retry sync.",
      setupRequired: ["Search Console ownership verification."],
      ownerActions: ["Add a DNS TXT record, upload the HTML verification file, add the verification meta tag, or verify through Google Analytics if available."],
      warnings: failed.slice(0, 2)
    };
  }
  const selectedSiteUrl = added[0]!;
  await configureGoogleWorkspace({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, config: input.config, values: { searchConsoleSiteUrl: selectedSiteUrl } });
  await upsertGoogleDataSourceConnection({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    providerKey: "google_search_console",
    providerName: "Google Search Console",
    configuration: { selectedSiteUrl, searchConsoleSiteUrl: selectedSiteUrl, addedProperties: added, targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, verificationRequired: true }
  });
  await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_search_console", syncType: "setup_add_property", status: "verification_required", recordsWritten: added.length, resultSummary: { addedProperties: added, targetDomain: SALTY_COWHIDE_TARGET_DOMAIN } });
  return {
    ok: true,
    status: "verification_required",
      provider: "google_search_console",
    targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
    message: "SaltyCowhide.com was added to Search Console where Google allowed it. Ownership verification is still required before it is connected.",
    setupRequired: ["Verify Search Console ownership, then run Sync Search Console."],
    ownerActions: ["DNS TXT verification", "HTML file verification", "Meta tag verification", "Google Analytics verification if available"],
    configuration: { selectedSiteUrl, addedProperties: added }
  };
}

export async function setupMerchantCenterForSaltyCowhide(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; fetcher?: GoogleFetch | undefined; authorizationUrl?: string | undefined }): Promise<GoogleLaunchSetupResult> {
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) return { ok: false, status: bundle.status, provider: "google_merchant_center", targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, message: bundle.message, setupRequired: bundle.setupRequired };
  const contentScope = GOOGLE_MERCHANT_CENTER_SETUP_SCOPES[0]!;
  if (!hasGoogleScope(bundle.scopes, contentScope)) {
    return scopeResult({ provider: "google_merchant_center", scope: contentScope, authorizationUrl: input.authorizationUrl, message: "Merchant Center setup requires explicit Merchant Center permission. No product feeds are submitted by this action." });
  }
  try {
    const fetcher = input.fetcher ?? fetch;
    const authInfo = await googleJson(fetcher, "https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo", bearer(bundle.tokens.access_token, { method: "GET" }));
    const accounts = (authInfo.accountIdentifiers ?? []).map((account: any) => ({ merchantId: String(account.merchantId ?? ""), aggregatorId: String(account.aggregatorId ?? "") })).filter((account: any) => account.merchantId);
    if (!accounts.length) {
      await upsertGoogleSetupConnection({
        repos: input.repos,
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        providerKey: "google_merchant_center",
        providerName: "Google Merchant Center",
        status: "requires_owner_action",
        configuration: { targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, requiredOwnerActions: ["business_info_required", "website_claim_required", "shipping_required", "tax_required", "product_feed_needed", "policy_terms_required"] }
      });
      return {
        ok: false,
        status: "requires_owner_action",
        provider: "google_merchant_center",
        targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
        message: "No Merchant Center account is available to this Google account. Create or grant access in Google Merchant Center, then retry.",
        setupRequired: ["Merchant Center account access."],
        ownerActions: ["Business info required", "Website claim required", "Shipping required", "Tax required", "Product feed needed", "Policy/terms required"]
      };
    }
    const selected = accounts[0]!;
    await upsertGoogleSetupConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "google_merchant_center",
      providerName: "Google Merchant Center",
      status: "configured_not_verified",
      enabled: true,
      configuration: {
        selectedMerchantCenterAccountId: selected.merchantId,
        merchantCenterAccountId: selected.merchantId,
        targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
        requiredOwnerActions: ["business_info_required", "website_claim_required", "shipping_required", "tax_required", "product_feed_needed", "policy_terms_required"],
        feedSubmissionEnabled: false
      }
    });
    await syncRun({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, providerKey: "google_merchant_center", syncType: "setup_detect", status: "configured_not_verified", recordsRead: accounts.length, recordsWritten: 1, resultSummary: { merchantId: selected.merchantId, targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, feedSubmissionEnabled: false } });
    return {
      ok: true,
      status: "configured_not_verified",
      provider: "google_merchant_center",
      targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
      message: "Merchant Center account access was found and saved for setup tracking. No product feed was submitted.",
      setupRequired: ["Verify Merchant Center account readiness before product feeds."],
      ownerActions: ["Business info required", "Website claim required", "Shipping required", "Tax required", "Product feed needed", "Policy/terms required"],
      configuration: { merchantCenterAccountId: selected.merchantId, feedSubmissionEnabled: false }
    };
  } catch (error) {
    return safeLaunchError({ provider: "google_merchant_center", error, fallback: "Merchant Center setup could not be completed through the API. Manual Merchant Center setup may be required." });
  }
}

export async function checkGoogleBusinessProfileEligibilityForSaltyCowhide(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; eligibility: string; fetcher?: GoogleFetch | undefined }): Promise<GoogleLaunchSetupResult> {
  const onlineOnly = input.eligibility === "online_only_ecommerce_pod";
  if (onlineOnly) {
    await upsertGoogleSetupConnection({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      providerKey: "google_business_profile",
      providerName: "Google Business Profile",
      status: "optional_for_online_only",
      configuration: { targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, eligibility: input.eligibility, launchBlocker: false }
    });
    return {
      ok: true,
      status: "optional_for_online_only",
      provider: "google_business_profile",
      targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
      message: "Google Business Profile is optional for an online-only ecommerce/POD launch and should not block Salty Cowhide.",
      setupRequired: [],
      ownerActions: ["Set up GBP later only if Salty Cowhide has an eligible local storefront, service area, pickup location, showroom, market, or event presence."],
      configuration: { launchBlocker: false, eligibility: input.eligibility }
    };
  }
  const bundle = await getUsableTokens(input);
  if (!bundle.ok) return { ok: false, status: bundle.status, provider: "google_business_profile", targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, message: bundle.message, setupRequired: bundle.setupRequired };
  const hints = await googleDetectionHints({ repos: input.repos, workspaceId: input.workspaceId, config: input.config });
  const discovery = await discoverBusinessProfileLocations({ fetcher: input.fetcher ?? fetch, accessToken: bundle.tokens.access_token, hints });
  await upsertGoogleSetupConnection({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    providerKey: "google_business_profile",
    providerName: "Google Business Profile",
    status: discovery.candidates.length ? "configured_not_verified" : "requires_owner_action",
    configuration: { targetDomain: SALTY_COWHIDE_TARGET_DOMAIN, eligibility: input.eligibility, candidates: discovery.candidates, launchBlocker: false }
  });
  return {
    ok: true,
    status: discovery.candidates.length ? "configured_not_verified" : "requires_owner_action",
    provider: "google_business_profile",
    targetDomain: SALTY_COWHIDE_TARGET_DOMAIN,
    message: discovery.candidates.length ? "Eligible GBP path selected. Choose an existing eligible location before syncing." : "Eligible GBP path selected, but no existing eligible location was found through the API.",
    setupRequired: discovery.candidates.length ? ["Select and verify an eligible GBP location."] : ["Create or verify an eligible GBP location in Google if applicable."],
    ownerActions: ["Google may require profile verification. Do not create a local profile unless Salty Cowhide has an eligible local presence."],
    configuration: { candidates: discovery.candidates, eligibility: input.eligibility, launchBlocker: false }
  };
}

export async function configureGoogleWorkspace(input: { repos: RepositoryBundle; workspaceId: string; actorId: string; config: RuntimeConfig; values: Partial<GoogleWorkspaceConfig> }) {
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "google_oauth");
  const current = workspaceGoogleConfig(input.config, existing);
  const next: GoogleWorkspaceConfig = {
    ga4PropertyId: input.values.ga4PropertyId ?? current.ga4PropertyId,
    searchConsoleSiteUrl: input.values.searchConsoleSiteUrl ?? current.searchConsoleSiteUrl,
    businessProfileAccountId: input.values.businessProfileAccountId ?? current.businessProfileAccountId,
    businessProfileLocationId: input.values.businessProfileLocationId ?? current.businessProfileLocationId
  };
  const state = googleStateFromConnection({ ...existing, configuration: next } as WorkspaceRow, existing?.status === "connected" ? "connected" : "configured_not_verified");
  const connection = await upsertGoogleProviderConnection({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, state });
  await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_oauth", {
    ...connection,
    configuration: {
      ...connectionConfig(connection),
      ga4PropertyId: next.ga4PropertyId,
      searchConsoleSiteUrl: next.searchConsoleSiteUrl,
      businessProfileAccountId: next.businessProfileAccountId,
      businessProfileLocationId: next.businessProfileLocationId
    }
  });
  await upsertConfiguredGoogleDataSources({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, config: next });
  return { ok: true as const, status: "configured" as const, provider: "google_oauth", configuration: next };
}

export async function disconnectGoogleWorkspace(input: { repos: RepositoryBundle; workspaceId: string; actorId: string }) {
  const connection = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "google_oauth");
  const credentialRef = String(connection?.secret_ref ?? connection?.secretRef ?? "");
  if (credentialRef) await input.repos.integration.deleteCredential(input.workspaceId, credentialRef, input.actorId);
  await input.repos.integration.updateProviderConnectionStatus(input.workspaceId, "google_oauth", {
    id: connection?.id ? String(connection.id) : `conn_google_oauth_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_type: "google_oauth",
    provider_name: "Google OAuth",
    enabled: false,
    status: "disconnected",
    secret_ref: null,
    configuration: connectionConfig(connection)
  });
  return { ok: true as const, status: "disconnected" as const, provider: "google_oauth" };
}
