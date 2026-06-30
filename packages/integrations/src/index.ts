import type { RuntimeConfig } from "@saltyfactory/config";

export type IntegrationKey =
  | "website"
  | "ga4"
  | "gsc"
  | "google_business_profile"
  | "shopify_admin"
  | "shopify_storefront"
  | "printify"
  | "supabase_storage"
  | "hugging_face"
  | "trend_sources";

export type IntegrationStatus = "configured" | "disconnected" | "missing_credentials" | "needs_reauth" | "error" | "disabled";

export type IntegrationState = {
  key: IntegrationKey;
  label: string;
  status: IntegrationStatus;
  capabilities: string[];
  setupRequired: string[];
  lastSuccessfulSync?: string | null;
  lastFailedSync?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
};

const configured = (enabled: boolean, missing: string[]) =>
  !enabled ? "disabled" : missing.length ? "missing_credentials" : "configured";

export function getIntegrationStates(config: RuntimeConfig): IntegrationState[] {
  const ga4Missing = ["GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON"];
  const gscMissing = ["GSC_SITE_URL", "GOOGLE_APPLICATION_CREDENTIALS_JSON"];
  const gbpMissing = ["GBP_ACCOUNT_ID", "GBP_LOCATION_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON"];
  return [
    {
      key: "website",
      label: "Website URL",
      status: "configured",
      capabilities: ["site_audit", "robots_detection", "sitemap_detection", "llms_txt_detection"],
      setupRequired: []
    },
    {
      key: "ga4",
      label: "Google Analytics 4",
      status: configured(config.providers.ga4.enabled, config.providers.ga4.enabled ? [] : ["GA4_ENABLED", "GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON"]),
      capabilities: ["daily_metrics_import", "channel_metrics", "landing_pages", "item_metrics"],
      setupRequired: config.providers.ga4.enabled ? [] : ga4Missing
    },
    {
      key: "gsc",
      label: "Google Search Console",
      status: configured(config.providers.gsc.enabled, config.providers.gsc.enabled ? [] : ["GSC_ENABLED", "GSC_SITE_URL", "GOOGLE_APPLICATION_CREDENTIALS_JSON"]),
      capabilities: ["query_metrics", "page_metrics", "sitemap_status", "url_inspection_when_scoped"],
      setupRequired: config.providers.gsc.enabled ? [] : gscMissing
    },
    {
      key: "google_business_profile",
      label: "Google Business Profile",
      status: configured(config.providers.googleBusinessProfile.enabled, config.providers.googleBusinessProfile.enabled ? [] : ["GBP_ENABLED", "GBP_ACCOUNT_ID", "GBP_LOCATION_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON"]),
      capabilities: ["profile_audit", "review_import", "draft_review_responses"],
      setupRequired: config.providers.googleBusinessProfile.enabled ? [] : gbpMissing
    },
    {
      key: "shopify_admin",
      label: "Shopify Admin",
      status: configured(config.providers.shopifyAdmin.enabled, config.providers.shopifyAdmin.enabled ? [] : ["SHOPIFY_ADMIN_ENABLED", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]),
      capabilities: ["catalog_import", "draft_export_guarded", "webhook_verification"],
      setupRequired: config.providers.shopifyAdmin.enabled ? [] : ["SHOPIFY_ADMIN_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]
    },
    {
      key: "shopify_storefront",
      label: "Shopify Storefront",
      status: configured(config.providers.shopifyStorefront.enabled, config.providers.shopifyStorefront.enabled ? [] : ["SHOPIFY_STOREFRONT_ENABLED", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_STOREFRONT_TOKEN"]),
      capabilities: ["public_catalog_read", "cart_when_configured"],
      setupRequired: config.providers.shopifyStorefront.enabled ? [] : ["SHOPIFY_STOREFRONT_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_STOREFRONT_TOKEN"]
    },
    {
      key: "printify",
      label: "Printify",
      status: configured(config.providers.printify.enabled, config.providers.printify.enabled ? [] : ["PRINTIFY_ENABLED", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]),
      capabilities: ["shops", "blueprints", "guarded_product_sync"],
      setupRequired: config.providers.printify.enabled ? [] : ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]
    },
    {
      key: "supabase_storage",
      label: "Supabase Storage",
      status: config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing_credentials",
      capabilities: ["private_assets", "public_approved_assets"],
      setupRequired: config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY ? [] : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    },
    {
      key: "hugging_face",
      label: "Hugging Face",
      status: config.providers.aiText.enabled || config.providers.aiImage.enabled ? "configured" : "disabled",
      capabilities: ["draft_text_generation", "draft_image_generation"],
      setupRequired: config.providers.aiText.enabled || config.providers.aiImage.enabled ? [] : ["AI_TEXT_ENABLED or AI_IMAGE_ENABLED", "HF_API_TOKEN", "model env vars"]
    },
    {
      key: "trend_sources",
      label: "Trend Sources",
      status: "disabled",
      capabilities: ["rss_import", "manual_upload", "analytics_feedback"],
      setupRequired: ["Configure allowed RSS/API/manual sources before ingestion."]
    }
  ];
}

export function safeIntegrationStateForClient(state: IntegrationState) {
  return {
    key: state.key,
    label: state.label,
    status: state.status,
    capabilities: state.capabilities,
    setupRequired: state.setupRequired,
    lastSuccessfulSync: state.lastSuccessfulSync ?? null,
    lastFailedSync: state.lastFailedSync ?? null,
    lastErrorCode: state.lastErrorCode ?? null,
    lastErrorMessage: state.lastErrorMessage ?? null
  };
}

export type IntegrationResult<T> =
  | { ok: true; status: "success"; data: T }
  | { ok: false; status: "disabled" | "not_configured" | "blocked" | "error"; message: string; setupRequired?: string[] };

const disabled = <T>(message: string, setupRequired: string[] = []): IntegrationResult<T> => ({
  ok: false,
  status: setupRequired.length ? "not_configured" : "disabled",
  message,
  setupRequired
});

export class Ga4Provider {
  constructor(private state: IntegrationState) {}
  async importMetrics(): Promise<IntegrationResult<never>> {
    return disabled("GA4 import requires configured Google Analytics Data API credentials.", this.state.setupRequired);
  }
}

export class SearchConsoleProvider {
  constructor(private state: IntegrationState) {}
  async importSearchAnalytics(): Promise<IntegrationResult<never>> {
    return disabled("Search Console import requires configured Google credentials and verified site access.", this.state.setupRequired);
  }
}

export class GoogleBusinessProfileProvider {
  constructor(private state: IntegrationState) {}
  async importProfile(): Promise<IntegrationResult<never>> {
    return disabled("Google Business Profile import requires configured account, location, and Google credentials.", this.state.setupRequired);
  }
  async createDraftReviewResponse(): Promise<IntegrationResult<never>> {
    return disabled("Review responses are drafts only and require Google Business Profile credentials plus human approval.", this.state.setupRequired);
  }
}

export function createIntegrationProviders(config: RuntimeConfig) {
  const states = Object.fromEntries(getIntegrationStates(config).map((state) => [state.key, state])) as Record<IntegrationKey, IntegrationState>;
  return {
    states,
    ga4: new Ga4Provider(states.ga4),
    gsc: new SearchConsoleProvider(states.gsc),
    googleBusinessProfile: new GoogleBusinessProfileProvider(states.google_business_profile)
  };
}
