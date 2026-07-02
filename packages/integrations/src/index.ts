import type { RuntimeConfig } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { encryptCredential, sanitizeProviderError, type CredentialEnvelope } from "@saltyfactory/security";

export type IntegrationKey =
  | "website_url"
  | "google_oauth"
  | "ga4"
  | "google_search_console"
  | "google_business_profile"
  | "shopify"
  | "printify"
  | "supabase_storage"
  | "hugging_face"
  | "trend_sources"
  | "page_speed_optional"
  | "meta_ads_disabled_future"
  | "pinterest_disabled_future"
  | "tiktok_disabled_future"
  | "email_sms_disabled_future"
  | "website"
  | "gsc"
  | "shopify_admin"
  | "shopify_storefront";

export type IntegrationStatus = "connected" | "configured" | "configured_not_verified" | "disconnected" | "missing_credentials" | "needs_reauth" | "auth_required" | "access_denied" | "access_limited" | "error" | "disabled" | "provider_disabled" | "not_configured" | "unsupported" | "not_implemented";

export type IntegrationState = {
  key: IntegrationKey;
  label: string;
  status: IntegrationStatus;
  capabilities: string[];
  setupRequired: string[];
  scopes?: string[];
  selectedAccountId?: string | null;
  selectedPropertyId?: string | null;
  selectedSiteUrl?: string | null;
  selectedLocationId?: string | null;
  selectedShopId?: string | null;
  lastSuccessfulSync?: string | null;
  lastFailedSync?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
};

export type IntegrationResult<T> =
  | { ok: true; status: "success"; data: T }
  | { ok: false; status: "disabled" | "provider_disabled" | "configured_not_verified" | "not_configured" | "missing_credentials" | "unsupported" | "not_implemented" | "needs_reauth" | "auth_required" | "access_denied" | "access_limited" | "blocked" | "error"; message: string; setupRequired?: string[]; blockingReasons?: string[] };

const stateFromProvider = (enabled: boolean, reason: string | undefined, required: string[]): IntegrationStatus => {
  if (enabled) return "configured_not_verified";
  return reason === "missing_required_config" ? "missing_credentials" : "disabled";
};

const setupIfMissing = (enabled: boolean, required: string[]) => enabled ? [] : required;

export const googleScopes = {
  identity: ["openid", "email", "profile"],
  ga4: ["https://www.googleapis.com/auth/analytics.readonly"],
  searchConsole: ["https://www.googleapis.com/auth/webmasters.readonly"],
  businessProfile: ["https://www.googleapis.com/auth/business.manage"]
} as const;

export function getIntegrationStates(config: RuntimeConfig): IntegrationState[] {
  return [
    { key: "website_url", label: "Website URL", status: "configured", capabilities: ["site_audit", "robots_detection", "sitemap_detection", "llms_txt_detection"], setupRequired: [] },
    { key: "google_oauth", label: "Google OAuth", status: (config.GOOGLE_OAUTH_CLIENT_ID || config.GOOGLE_CLIENT_ID) && (config.GOOGLE_OAUTH_CLIENT_SECRET || config.GOOGLE_CLIENT_SECRET) && config.GOOGLE_OAUTH_REDIRECT_URI ? "configured_not_verified" : "missing_credentials", capabilities: ["oauth_authorization", "token_refresh", "read_only_google_data_sync"], setupRequired: (config.GOOGLE_OAUTH_CLIENT_ID || config.GOOGLE_CLIENT_ID) && (config.GOOGLE_OAUTH_CLIENT_SECRET || config.GOOGLE_CLIENT_SECRET) && config.GOOGLE_OAUTH_REDIRECT_URI ? [] : ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"], scopes: [...googleScopes.identity, ...googleScopes.ga4, ...googleScopes.searchConsole, ...googleScopes.businessProfile] },
    { key: "ga4", label: "Google Analytics 4", status: stateFromProvider(config.providers.ga4.enabled, config.providers.ga4.reason, ["GOOGLE_INTEGRATIONS_ENABLED", "GOOGLE_ANALYTICS_ENABLED", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"]), capabilities: ["daily_metrics_import", "channel_metrics", "landing_pages", "item_metrics"], setupRequired: setupIfMissing(config.providers.ga4.enabled, ["GOOGLE_INTEGRATIONS_ENABLED=true", "GOOGLE_ANALYTICS_ENABLED=true", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "Configure GA4 property ID"]), scopes: [...googleScopes.ga4], selectedPropertyId: config.GA4_PROPERTY_ID || null },
    { key: "google_search_console", label: "Google Search Console", status: stateFromProvider(config.providers.gsc.enabled, config.providers.gsc.reason, ["GOOGLE_INTEGRATIONS_ENABLED", "GOOGLE_SEARCH_CONSOLE_ENABLED", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"]), capabilities: ["query_metrics", "page_metrics", "sitemap_status"], setupRequired: setupIfMissing(config.providers.gsc.enabled, ["GOOGLE_INTEGRATIONS_ENABLED=true", "GOOGLE_SEARCH_CONSOLE_ENABLED=true", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "Configure Search Console site URL"]), scopes: [...googleScopes.searchConsole], selectedSiteUrl: config.GSC_SITE_URL || null },
    { key: "google_business_profile", label: "Google Business Profile", status: stateFromProvider(config.providers.googleBusinessProfile.enabled, config.providers.googleBusinessProfile.reason, ["GOOGLE_INTEGRATIONS_ENABLED", "GOOGLE_BUSINESS_PROFILE_ENABLED", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"]), capabilities: ["account_list_read", "location_list_read", "profile_read", "review_summary_read", "performance_read_when_available"], setupRequired: setupIfMissing(config.providers.googleBusinessProfile.enabled, ["GOOGLE_INTEGRATIONS_ENABLED=true", "GOOGLE_BUSINESS_PROFILE_ENABLED=true", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "Configure GBP account/location IDs"]), scopes: [...googleScopes.businessProfile], selectedAccountId: config.GBP_ACCOUNT_ID || null, selectedLocationId: config.GBP_LOCATION_ID || null },
    { key: "shopify", label: "Shopify", status: stateFromProvider(config.providers.shopifyAdmin.enabled, config.providers.shopifyAdmin.reason, ["SHOPIFY_ADMIN_ENABLED", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]), capabilities: ["catalog_import", "draft_export_guarded", "webhook_verification"], setupRequired: setupIfMissing(config.providers.shopifyAdmin.enabled, ["SHOPIFY_ADMIN_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]) },
    { key: "printify", label: "Printify", status: stateFromProvider(config.providers.printify.enabled, config.providers.printify.reason, ["PRINTIFY_ENABLED", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]), capabilities: ["shops", "blueprints", "variants", "shipping_profiles", "guarded_product_sync"], setupRequired: setupIfMissing(config.providers.printify.enabled, ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]), selectedShopId: config.PRINTIFY_SHOP_ID || null },
    { key: "supabase_storage", label: "Supabase Storage", status: config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY ? "configured_not_verified" : "missing_credentials", capabilities: ["private_assets", "public_approved_assets"], setupRequired: config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY ? [] : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] },
    { key: "hugging_face", label: "Hugging Face", status: config.providers.aiText.enabled || config.providers.aiImage.enabled ? "configured_not_verified" : "disabled", capabilities: ["draft_text_generation", "draft_image_generation"], setupRequired: config.providers.aiText.enabled || config.providers.aiImage.enabled ? [] : ["AI_TEXT_ENABLED or AI_IMAGE_ENABLED", "HF_API_TOKEN", "model env vars"] },
    { key: "trend_sources", label: "Trend Sources", status: "not_configured", capabilities: ["rss_import", "manual_upload", "analytics_feedback"], setupRequired: ["Configure allowed RSS/API/manual sources before ingestion."] },
    { key: "page_speed_optional", label: "PageSpeed", status: "unsupported", capabilities: ["future_performance_audit"], setupRequired: ["Optional future provider."] },
    { key: "meta_ads_disabled_future", label: "Meta Ads", status: "unsupported", capabilities: ["future_ads_read"], setupRequired: ["Future disabled integration."] },
    { key: "pinterest_disabled_future", label: "Pinterest", status: "unsupported", capabilities: ["future_ads_read"], setupRequired: ["Future disabled integration."] },
    { key: "tiktok_disabled_future", label: "TikTok", status: "unsupported", capabilities: ["future_ads_read"], setupRequired: ["Future disabled integration."] },
    { key: "email_sms_disabled_future", label: "Email/SMS", status: "unsupported", capabilities: ["future_campaign_read"], setupRequired: ["Future disabled integration."] }
  ];
}

export function safeIntegrationStateForClient(state: IntegrationState) {
  return {
    key: state.key,
    label: state.label,
    status: state.status,
    capabilities: state.capabilities,
    setupRequired: state.setupRequired,
    scopes: state.scopes ?? [],
    selectedAccountId: state.selectedAccountId ?? null,
    selectedPropertyId: state.selectedPropertyId ?? null,
    selectedSiteUrl: state.selectedSiteUrl ?? null,
    selectedLocationId: state.selectedLocationId ?? null,
    selectedShopId: state.selectedShopId ?? null,
    lastSuccessfulSync: state.lastSuccessfulSync ?? null,
    lastFailedSync: state.lastFailedSync ?? null,
    lastErrorCode: state.lastErrorCode ?? null,
    lastErrorMessage: state.lastErrorMessage ?? null
  };
}

type DisabledStatus = Exclude<IntegrationResult<never>["status"], "success">;

const disabled = <T>(status: DisabledStatus, message: string, setupRequired: string[] = []): IntegrationResult<T> => ({ ok: false, status, message, setupRequired });

export class ConfiguredReadOnlyProvider {
  constructor(private state: IntegrationState) {}
  async test(): Promise<IntegrationResult<{ status: IntegrationStatus }>> {
    if (this.state.status === "disabled") return disabled("provider_disabled", `${this.state.label} is disabled.`, this.state.setupRequired);
    if (["missing_credentials", "not_configured", "unsupported"].includes(this.state.status)) return disabled(this.state.status as any, `${this.state.label} is not ready.`, this.state.setupRequired);
    return disabled("configured_not_verified", "Provider configuration is present but no live provider validation adapter is implemented.", this.state.setupRequired);
  }
  async sync(): Promise<IntegrationResult<never>> {
    if (this.state.status === "disabled") return disabled("provider_disabled", `${this.state.label} is disabled.`, this.state.setupRequired);
    if (["missing_credentials", "not_configured", "unsupported"].includes(this.state.status)) return disabled(this.state.status as any, `${this.state.label} is not ready.`, this.state.setupRequired);
    return disabled("not_implemented", `${this.state.label} live sync requires a provider adapter and imported credentials before it can run.`, this.state.setupRequired);
  }
  async importMetrics() {
    if (["missing_credentials", "disabled", "not_configured"].includes(this.state.status)) return disabled("not_configured", `${this.state.label} is not configured.`, this.state.setupRequired);
    return this.test();
  }
  async importSearchAnalytics() {
    if (["missing_credentials", "disabled", "not_configured"].includes(this.state.status)) return disabled("not_configured", `${this.state.label} is not configured.`, this.state.setupRequired);
    return this.test();
  }
  async importProfile() {
    if (["missing_credentials", "disabled", "not_configured"].includes(this.state.status)) return disabled("not_configured", `${this.state.label} is not configured.`, this.state.setupRequired);
    return this.test();
  }
}

export async function upsertProviderConnection(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  state: IntegrationState;
  credentialSecret?: string;
  encryptionKey?: string;
}) {
  const existing = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, input.state.key);
  let credentialRef = existing?.secret_ref ?? existing?.secretRef ?? null;
  let envelope: CredentialEnvelope | null = null;
  if (input.credentialSecret) {
    if (!input.encryptionKey) throw new Error("credential_encryption_key_required");
    credentialRef = `cred_${input.state.key}_${Date.now()}`;
    envelope = encryptCredential({
      secret: input.credentialSecret,
      key: input.encryptionKey,
      provider: input.state.key,
      workspaceId: input.workspaceId,
      createdBy: input.actorId
    });
    await input.repos.integration.saveEncryptedCredential({
      id: `ecred_${Date.now()}`,
      workspace_id: input.workspaceId,
      provider_key: input.state.key,
      credential_ref: credentialRef,
      encrypted_payload: envelope,
      status: "active",
      created_by: input.actorId,
      updated_by: input.actorId
    });
  }
  const row: WorkspaceRow = {
    id: existing?.id ? String(existing.id) : `conn_${input.state.key}_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_type: input.state.key,
    provider_name: input.state.label,
    enabled: input.state.status !== "disabled" && input.state.status !== "unsupported",
    status: input.state.status,
    secret_ref: credentialRef,
    configuration: {
      capabilities: input.state.capabilities,
      scopes: input.state.scopes ?? [],
      selectedAccountId: input.state.selectedAccountId ?? null,
      selectedPropertyId: input.state.selectedPropertyId ?? null,
      selectedSiteUrl: input.state.selectedSiteUrl ?? null,
      selectedLocationId: input.state.selectedLocationId ?? null,
      selectedShopId: input.state.selectedShopId ?? null
    },
    created_by: input.actorId,
    updated_by: input.actorId
  };
  return existing
    ? input.repos.integration.updateProviderConnectionStatus(input.workspaceId, input.state.key, row)
    : input.repos.integration.createProviderConnection(row);
}

export async function createSyncRun(input: { repos: RepositoryBundle; workspaceId: string; providerKey: string; syncType: string; actorId: string; status?: string; error?: unknown; setupRequired?: string[] }) {
  const sanitized = input.error ? sanitizeProviderError(input.error) : null;
  return input.repos.integration.createIntegrationSyncRun({
    id: `sync_${input.providerKey}_${Date.now()}`,
    workspace_id: input.workspaceId,
    provider_key: input.providerKey,
    sync_type: input.syncType,
    status: input.status ?? (sanitized ? "failed" : "queued"),
    error_code: sanitized ? "provider_not_ready" : null,
    sanitized_error_message: sanitized,
    setup_required: input.setupRequired ?? [],
    created_by: input.actorId,
    updated_by: input.actorId
  });
}

export function createIntegrationProviders(config: RuntimeConfig) {
  const states = Object.fromEntries(getIntegrationStates(config).map((state) => [state.key, state])) as Record<IntegrationKey, IntegrationState>;
  return {
    states,
    ga4: new ConfiguredReadOnlyProvider(states.ga4),
    gsc: new ConfiguredReadOnlyProvider(states.google_search_console),
    googleBusinessProfile: new ConfiguredReadOnlyProvider(states.google_business_profile),
    shopify: new ConfiguredReadOnlyProvider(states.shopify),
    printify: new ConfiguredReadOnlyProvider(states.printify)
  };
}

export * from "./google";
