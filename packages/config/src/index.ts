import { z } from "zod";

const asBool = (fallback = false) => z.preprocess(
  (value) => value === undefined || value === "" ? fallback : value === true || value === "true",
  z.boolean()
);

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  REPOSITORY_ADAPTER: z.enum(["auto", "memory", "drizzle"]).default("auto"),
  DATABASE_URL: z.string().optional().default(""),
  DIRECT_DATABASE_URL: z.string().optional().default(""),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  CREDENTIAL_STORAGE_ENABLED: asBool(false),
  CREDENTIAL_ENCRYPTION_KEY: z.string().optional().default(""),
  SUPABASE_PRIVATE_ASSETS_BUCKET: z.string().default("saltyfactory-private-assets"),
  SUPABASE_PUBLIC_ASSETS_BUCKET: z.string().default("saltyfactory-public-assets"),
  STUDIO_AUTH_ENABLED: asBool(true),
  STUDIO_ADMIN_EMAIL: z.string().optional().default(""),
  AUTH_SECRET: z.string().optional().default(""),
  AI_TEXT_ENABLED: asBool(false),
  AI_IMAGE_ENABLED: asBool(false),
  IMAGE_GENERATION_ENABLED: asBool(false),
  IMAGE_GENERATION_PROVIDER: z.enum(["disabled", "local_dev_mock", "hugging_face"]).default("disabled"),
  LOCAL_DEV_IMAGE_GENERATION: asBool(false),
  IMAGE_GENERATION_TIMEOUT_MS: z.string().optional().default("60000"),
  IMAGE_GENERATION_MAX_OUTPUT_BYTES: z.string().optional().default("15000000"),
  BACKGROUND_REMOVAL_ENABLED: asBool(false),
  UPSCALE_ENABLED: asBool(false),
  HF_API_TOKEN: z.string().optional().default(""),
  HF_TEXT_MODEL: z.string().optional().default(""),
  HF_IMAGE_MODEL: z.string().optional().default(""),
  HUGGING_FACE_API_TOKEN: z.string().optional().default(""),
  HUGGING_FACE_IMAGE_MODEL: z.string().optional().default(""),
  HF_REMBG_MODEL: z.string().optional().default(""),
  HF_ESRGAN_MODEL: z.string().optional().default(""),
  REPLICATE_API_TOKEN: z.string().optional().default(""),
  REMOVE_BG_API_KEY: z.string().optional().default(""),
  SHOPIFY_STOREFRONT_ENABLED: asBool(false),
  SHOPIFY_ADMIN_ENABLED: asBool(false),
  SHOPIFY_STORE_DOMAIN: z.string().optional().default(""),
  SHOPIFY_STOREFRONT_TOKEN: z.string().optional().default(""),
  SHOPIFY_ADMIN_TOKEN: z.string().optional().default(""),
  SHOPIFY_CREDENTIAL_MODE: z.enum(["legacy_admin_token", "dev_dashboard_client_credentials"]).default("legacy_admin_token"),
  SHOPIFY_CLIENT_ID: z.string().optional().default(""),
  SHOPIFY_CLIENT_SECRET: z.string().optional().default(""),
  SHOPIFY_DEFAULT_COLLECTION_ID: z.string().optional().default(""),
  SHOPIFY_ALLOW_PRODUCT_PUBLISH: asBool(false),
  PRINTIFY_ENABLED: asBool(false),
  PRINTIFY_API_TOKEN: z.string().optional().default(""),
  PRINTIFY_SHOP_ID: z.string().optional().default(""),
  PRINTIFY_ALLOW_PUBLISH: asBool(false),
  GA4_ENABLED: asBool(false),
  GOOGLE_ANALYTICS_ENABLED: asBool(false),
  GA4_PROPERTY_ID: z.string().optional().default(""),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional().default(""),
  GSC_ENABLED: asBool(false),
  GOOGLE_SEARCH_CONSOLE_ENABLED: asBool(false),
  GSC_SITE_URL: z.string().optional().default(""),
  GBP_ENABLED: asBool(false),
  GOOGLE_BUSINESS_PROFILE_ENABLED: asBool(false),
  GBP_ACCOUNT_ID: z.string().optional().default(""),
  GBP_LOCATION_ID: z.string().optional().default(""),
  GOOGLE_INTEGRATIONS_ENABLED: asBool(false),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional().default(""),
  PLAID_CLIENT_ID: z.string().optional().default(""),
  PLAID_SECRET: z.string().optional().default(""),
  PLAID_ENV: z.string().optional().default(""),
  BANKING_LIVE_SYNC_ENABLED: asBool(false),
  BANKING_MONEY_MOVEMENT_ENABLED: asBool(false),
  EXTERNAL_ORDER_SUBMISSION_ENABLED: asBool(false),
  LIVE_PUBLISHING_ENABLED: asBool(false),
  WEBHOOK_SECRET_SHOPIFY: z.string().optional().default(""),
  WEBHOOK_SECRET_PRINTIFY: z.string().optional().default(""),
  NEXT_PUBLIC_STOREFRONT_BASE_URL: z.string().url().default("https://saltycowhide.com")
});

export type ProviderStatus = { enabled: boolean; reason?: string };
export type RuntimeConfig = z.infer<typeof envSchema> & {
  providers: {
    aiText: ProviderStatus;
    aiImage: ProviderStatus;
    backgroundRemoval: ProviderStatus;
    upscale: ProviderStatus;
    shopifyStorefront: ProviderStatus;
    shopifyAdmin: ProviderStatus;
    printify: ProviderStatus;
    ga4: ProviderStatus;
    gsc: ProviderStatus;
    googleBusinessProfile: ProviderStatus;
  };
};

const has = (value: string) => value.trim().length > 0;
const state = (flag: boolean, ...required: string[]): ProviderStatus =>
  !flag ? { enabled: false, reason: "feature_flag_disabled" } : required.every(has) ? { enabled: true } : { enabled: false, reason: "missing_required_config" };
const shopifyAdminState = (config: z.infer<typeof envSchema>): ProviderStatus => {
  if (!config.SHOPIFY_ADMIN_ENABLED) return { enabled: false, reason: "feature_flag_disabled" };
  const hasLegacyToken = has(config.SHOPIFY_ADMIN_TOKEN);
  const hasDevDashboardCredentials = has(config.SHOPIFY_CLIENT_ID) && has(config.SHOPIFY_CLIENT_SECRET);
  return has(config.SHOPIFY_STORE_DOMAIN) && (hasDevDashboardCredentials || hasLegacyToken)
    ? { enabled: true }
    : { enabled: false, reason: "missing_required_config" };
};

export function parseEnv(input: Record<string, string | undefined> = process.env): RuntimeConfig {
  const c = envSchema.parse(input);
  const googleClientId = c.GOOGLE_OAUTH_CLIENT_ID || c.GOOGLE_CLIENT_ID;
  const googleClientSecret = c.GOOGLE_OAUTH_CLIENT_SECRET || c.GOOGLE_CLIENT_SECRET;
  const googleEnabled = c.GOOGLE_INTEGRATIONS_ENABLED || c.GA4_ENABLED || c.GSC_ENABLED || c.GBP_ENABLED || c.GOOGLE_ANALYTICS_ENABLED || c.GOOGLE_SEARCH_CONSOLE_ENABLED || c.GOOGLE_BUSINESS_PROFILE_ENABLED;
  const ga4Enabled = googleEnabled && (c.GA4_ENABLED || c.GOOGLE_ANALYTICS_ENABLED);
  const gscEnabled = googleEnabled && (c.GSC_ENABLED || c.GOOGLE_SEARCH_CONSOLE_ENABLED);
  const gbpEnabled = googleEnabled && (c.GBP_ENABLED || c.GOOGLE_BUSINESS_PROFILE_ENABLED);
  return {
    ...c,
    providers: {
      aiText: state(c.AI_TEXT_ENABLED, c.HF_API_TOKEN, c.HF_TEXT_MODEL),
      aiImage: state(c.AI_IMAGE_ENABLED, c.HF_API_TOKEN, c.HF_IMAGE_MODEL),
      backgroundRemoval: state(c.BACKGROUND_REMOVAL_ENABLED, c.HF_API_TOKEN || c.REMOVE_BG_API_KEY, c.HF_REMBG_MODEL || c.REMOVE_BG_API_KEY),
      upscale: state(c.UPSCALE_ENABLED, c.HF_API_TOKEN, c.HF_ESRGAN_MODEL),
      shopifyStorefront: state(c.SHOPIFY_STOREFRONT_ENABLED, c.SHOPIFY_STORE_DOMAIN, c.SHOPIFY_STOREFRONT_TOKEN),
      shopifyAdmin: shopifyAdminState(c),
      printify: state(c.PRINTIFY_ENABLED, c.PRINTIFY_API_TOKEN, c.PRINTIFY_SHOP_ID),
      ga4: state(ga4Enabled, googleClientId, googleClientSecret, c.GOOGLE_OAUTH_REDIRECT_URI),
      gsc: state(gscEnabled, googleClientId, googleClientSecret, c.GOOGLE_OAUTH_REDIRECT_URI),
      googleBusinessProfile: state(gbpEnabled, googleClientId, googleClientSecret, c.GOOGLE_OAUTH_REDIRECT_URI)
    }
  };
}

export const redactConfig = (config: RuntimeConfig) => Object.fromEntries(Object.entries(config).map(([key, value]) =>
  [/TOKEN/, /KEY/, /SECRET/, /DATABASE_URL/, /CREDENTIALS/].some((pattern) => pattern.test(key)) && typeof value === "string" && value ? [key, "[redacted]"] : [key, value]
));

export const checkSecretExposure = (text: string) => ["OPENAI", "ANTHROPIC"].filter((key) => text.includes(key));

export const collectProductionWarnings = (config: RuntimeConfig) =>
  [
    config.LIVE_PUBLISHING_ENABLED && "live publishing enabled; publish gates must pass",
    config.SHOPIFY_ALLOW_PRODUCT_PUBLISH && "Shopify live product publish flag is enabled; owner publish gates must still pass",
    config.PRINTIFY_ALLOW_PUBLISH && "Printify live publish flag is enabled; owner publish gates must still pass",
    config.BANKING_LIVE_SYNC_ENABLED && "banking live sync enabled; banking remains read-only",
    config.BANKING_MONEY_MOVEMENT_ENABLED && "money movement flag is enabled but no money movement route is implemented",
    config.EXTERNAL_ORDER_SUBMISSION_ENABLED && "external order submission flag is enabled but no external order route is implemented"
  ].filter(Boolean) as string[];

export function validateProductionReadiness(config = parseEnv()) {
  const failures: string[] = [];
  if (config.APP_ENV === "production") {
    if (!config.STUDIO_AUTH_ENABLED) failures.push("STUDIO_AUTH_ENABLED must be true in production");
    if (!has(config.DATABASE_URL)) failures.push("DATABASE_URL required for production managed Postgres");
    if (config.REPOSITORY_ADAPTER === "memory") failures.push("In-memory repositories are forbidden in production");
    if (!has(config.SUPABASE_URL) || !has(config.SUPABASE_SERVICE_ROLE_KEY)) failures.push("Supabase URL and service role key required server-side");
    if (config.CREDENTIAL_STORAGE_ENABLED && !has(config.CREDENTIAL_ENCRYPTION_KEY)) failures.push("CREDENTIAL_ENCRYPTION_KEY required when encrypted credential storage is enabled");
    if (!has(config.NEXT_PUBLIC_SUPABASE_URL) && !has(config.SUPABASE_URL)) failures.push("Supabase Auth URL required for Studio auth");
    if (!has(config.NEXT_PUBLIC_SUPABASE_ANON_KEY) && !has(config.SUPABASE_ANON_KEY)) failures.push("Supabase anon key required for Studio auth");
    if (config.BANKING_MONEY_MOVEMENT_ENABLED) failures.push("BANKING_MONEY_MOVEMENT_ENABLED must remain false in production");
    if (config.EXTERNAL_ORDER_SUBMISSION_ENABLED) failures.push("EXTERNAL_ORDER_SUBMISSION_ENABLED must remain false in production");
  }
  return { ok: failures.length === 0, failures, warnings: collectProductionWarnings(config) };
}

export function assertNoForbiddenAiConfig(keys = Object.keys(process.env)) {
  const bad = keys.filter((key) => key.includes("OPENAI") || key.includes("ANTHROPIC"));
  if (bad.length) throw new Error(`Forbidden AI config present: ${bad.join(",")}`);
}

export const providerEnabled = (config: RuntimeConfig, name: keyof RuntimeConfig["providers"]) => config.providers[name].enabled;
export const runStaticGuardrailCheck = (files: Record<string, string>) => Object.entries(files).flatMap(([file, text]) =>
  /OPENAI|ANTHROPIC/.test(text) ? [`${file}: forbidden AI reference`] : []
);

export {
  HUGGING_FACE_IMAGE_PROVIDER,
  isRecommendedHuggingFaceImageModel,
  primaryHuggingFaceImageModel,
  publicHuggingFaceImageModelRecommendations,
  recommendedHuggingFaceImageModels,
  unsupportedHuggingFaceImageModelReason
} from "./hugging-face-image";
export type {
  HuggingFaceImageModelRecommendation,
  HuggingFaceImageProviderId,
  HuggingFaceImageValidationStatus
} from "./hugging-face-image";
export {
  buildFeatureReadiness,
  featureReadinessEnvVars
} from "./feature-readiness";
export type {
  FeatureReadiness,
  FeatureReadinessReport,
  FeatureReadinessStatus
} from "./feature-readiness";
export {
  assertNoDeadConfigStates,
  buildOwnerSetupCards,
  setupFieldGuides,
  setupGuideByField,
  setupGuidesForProvider
} from "./setup-guides";
export type {
  OwnerSetupCard,
  OwnerSetupStatus,
  SetupAction,
  SetupFieldGuide,
  SetupMode,
  SetupSensitivity
} from "./setup-guides";
