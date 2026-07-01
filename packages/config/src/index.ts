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
  BACKGROUND_REMOVAL_ENABLED: asBool(false),
  UPSCALE_ENABLED: asBool(false),
  HF_API_TOKEN: z.string().optional().default(""),
  HF_TEXT_MODEL: z.string().optional().default(""),
  HF_IMAGE_MODEL: z.string().optional().default(""),
  HF_REMBG_MODEL: z.string().optional().default(""),
  HF_ESRGAN_MODEL: z.string().optional().default(""),
  REPLICATE_API_TOKEN: z.string().optional().default(""),
  REMOVE_BG_API_KEY: z.string().optional().default(""),
  SHOPIFY_STOREFRONT_ENABLED: asBool(false),
  SHOPIFY_ADMIN_ENABLED: asBool(false),
  SHOPIFY_STORE_DOMAIN: z.string().optional().default(""),
  SHOPIFY_STOREFRONT_TOKEN: z.string().optional().default(""),
  SHOPIFY_ADMIN_TOKEN: z.string().optional().default(""),
  PRINTIFY_ENABLED: asBool(false),
  PRINTIFY_API_TOKEN: z.string().optional().default(""),
  PRINTIFY_SHOP_ID: z.string().optional().default(""),
  GA4_ENABLED: asBool(false),
  GA4_PROPERTY_ID: z.string().optional().default(""),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional().default(""),
  GSC_ENABLED: asBool(false),
  GSC_SITE_URL: z.string().optional().default(""),
  GBP_ENABLED: asBool(false),
  GBP_ACCOUNT_ID: z.string().optional().default(""),
  GBP_LOCATION_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional().default(""),
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

export function parseEnv(input: Record<string, string | undefined> = process.env): RuntimeConfig {
  const c = envSchema.parse(input);
  return {
    ...c,
    providers: {
      aiText: state(c.AI_TEXT_ENABLED, c.HF_API_TOKEN, c.HF_TEXT_MODEL),
      aiImage: state(c.AI_IMAGE_ENABLED, c.HF_API_TOKEN, c.HF_IMAGE_MODEL),
      backgroundRemoval: state(c.BACKGROUND_REMOVAL_ENABLED, c.HF_API_TOKEN || c.REMOVE_BG_API_KEY, c.HF_REMBG_MODEL || c.REMOVE_BG_API_KEY),
      upscale: state(c.UPSCALE_ENABLED, c.HF_API_TOKEN, c.HF_ESRGAN_MODEL),
      shopifyStorefront: state(c.SHOPIFY_STOREFRONT_ENABLED, c.SHOPIFY_STORE_DOMAIN, c.SHOPIFY_STOREFRONT_TOKEN),
      shopifyAdmin: state(c.SHOPIFY_ADMIN_ENABLED, c.SHOPIFY_STORE_DOMAIN, c.SHOPIFY_ADMIN_TOKEN),
      printify: state(c.PRINTIFY_ENABLED, c.PRINTIFY_API_TOKEN, c.PRINTIFY_SHOP_ID),
      ga4: state(c.GA4_ENABLED, c.GA4_PROPERTY_ID, c.GOOGLE_APPLICATION_CREDENTIALS_JSON),
      gsc: state(c.GSC_ENABLED, c.GSC_SITE_URL, c.GOOGLE_APPLICATION_CREDENTIALS_JSON),
      googleBusinessProfile: state(c.GBP_ENABLED, c.GBP_ACCOUNT_ID, c.GBP_LOCATION_ID, c.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    }
  };
}

export const redactConfig = (config: RuntimeConfig) => Object.fromEntries(Object.entries(config).map(([key, value]) =>
  [/TOKEN/, /KEY/, /SECRET/, /DATABASE_URL/, /CREDENTIALS/].some((pattern) => pattern.test(key)) && typeof value === "string" && value ? [key, "[redacted]"] : [key, value]
));

export const checkSecretExposure = (text: string) => ["OPENAI", "ANTHROPIC"].filter((key) => text.includes(key));

export const collectProductionWarnings = (config: RuntimeConfig) =>
  config.LIVE_PUBLISHING_ENABLED ? ["live publishing enabled; publish gates must pass"] : [];

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
