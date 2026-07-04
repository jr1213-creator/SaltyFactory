import type { RuntimeConfig } from "./index";
import {
  isRecommendedHuggingFaceImageModel,
  primaryHuggingFaceImageModel,
  publicHuggingFaceImageModelRecommendations,
  unsupportedHuggingFaceImageModelReason
} from "./hugging-face-image";

export type FeatureReadinessStatus = "ready" | "config_blocked" | "owner_gated" | "disabled" | "partial" | "future" | "error";

export type FeatureReadiness = {
  featureKey: string;
  label: string;
  status: FeatureReadinessStatus;
  requiredEnv: string[];
  missingEnv: string[];
  enabledFlags: string[];
  disabledFlags: string[];
  setupRequired: string[];
  canTestWithoutProvider: boolean;
  safeLocalRoute?: string;
  dangerousActionsBlocked: string[];
  notes: string[];
};

export type FeatureReadinessReport = {
  ok: true;
  generatedAt: string;
  workspaceId: string;
  features: FeatureReadiness[];
  summary: {
    ready: number;
    configBlocked: number;
    ownerGated: number;
    disabled: number;
    partial: number;
    future: number;
  };
  safeLocalTesting: Array<{ featureKey: string; label: string; route?: string }>;
  recommendedSetupOrder: string[];
};

export type ImageGenerationRuntimeReadiness = {
  status: "ready" | "local_demo" | "config_required" | "invalid" | "owner_gated";
  provider: "huggingface" | "local_dev_mock" | "disabled";
  model?: string;
  credentialSource: "credential_store" | "env" | "local_demo" | "none";
  safeMessage: string;
  setupAction: string;
  setupRequired: string[];
  blockingReasons: string[];
};

export const featureReadinessEnvVars = [
  "NODE_ENV",
  "APP_ENV",
  "REPOSITORY_ADAPTER",
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CREDENTIAL_STORAGE_ENABLED",
  "CREDENTIAL_ENCRYPTION_KEY",
  "SUPABASE_PRIVATE_ASSETS_BUCKET",
  "SUPABASE_PUBLIC_ASSETS_BUCKET",
  "SUPABASE_STORAGE_BUCKET",
  "STUDIO_AUTH_ENABLED",
  "STUDIO_ADMIN_EMAIL",
  "AUTH_SECRET",
  "STUDIO_WORKSPACE_ID",
  "STUDIO_DATA_DIAGNOSTICS",
  "AI_TEXT_ENABLED",
  "AI_IMAGE_ENABLED",
  "IMAGE_GENERATION_ENABLED",
  "IMAGE_GENERATION_PROVIDER",
  "LOCAL_DEV_IMAGE_GENERATION",
  "IMAGE_GENERATION_TIMEOUT_MS",
  "IMAGE_GENERATION_MAX_OUTPUT_BYTES",
  "BACKGROUND_REMOVAL_ENABLED",
  "UPSCALE_ENABLED",
  "HF_API_TOKEN",
  "HF_TEXT_MODEL",
  "HF_IMAGE_MODEL",
  "HUGGING_FACE_API_TOKEN",
  "HUGGING_FACE_IMAGE_MODEL",
  "HF_REMBG_MODEL",
  "HF_ESRGAN_MODEL",
  "REPLICATE_API_TOKEN",
  "REMOVE_BG_API_KEY",
  "PRINTIFY_ENABLED",
  "PRINTIFY_API_TOKEN",
  "PRINTIFY_SHOP_ID",
  "PRINTIFY_ALLOW_PUBLISH",
  "SHOPIFY_STOREFRONT_ENABLED",
  "SHOPIFY_ADMIN_ENABLED",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_STOREFRONT_TOKEN",
  "SHOPIFY_ADMIN_TOKEN",
  "SHOPIFY_CREDENTIAL_MODE",
  "SHOPIFY_CLIENT_ID",
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_DEFAULT_COLLECTION_ID",
  "SHOPIFY_ALLOW_PRODUCT_PUBLISH",
  "LIVE_PUBLISHING_ENABLED",
  "WEBHOOK_SECRET_SHOPIFY",
  "WEBHOOK_SECRET_PRINTIFY",
  "NEXT_PUBLIC_STOREFRONT_BASE_URL",
  "PLAID_CLIENT_ID",
  "PLAID_SECRET",
  "PLAID_ENV",
  "BANKING_LIVE_SYNC_ENABLED",
  "BANKING_MONEY_MOVEMENT_ENABLED",
  "EXTERNAL_ORDER_SUBMISSION_ENABLED",
  "GA4_ENABLED",
  "GOOGLE_ANALYTICS_ENABLED",
  "GA4_PROPERTY_ID",
  "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  "GSC_ENABLED",
  "GOOGLE_SEARCH_CONSOLE_ENABLED",
  "GSC_SITE_URL",
  "GBP_ENABLED",
  "GOOGLE_BUSINESS_PROFILE_ENABLED",
  "GBP_ACCOUNT_ID",
  "GBP_LOCATION_ID",
  "GOOGLE_INTEGRATIONS_ENABLED",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI"
] as const;

const unique = (values: Array<string | false | null | undefined>) => [...new Set(values.filter(Boolean) as string[])];
const has = (env: Record<string, string | undefined>, key: string) => Boolean((env[key] ?? "").trim());
const flagEnabled = (env: Record<string, string | undefined>, key: string, fallback = false) => {
  const value = env[key];
  if (value === undefined || value === "") return fallback;
  return value === "true";
};

function missing(env: Record<string, string | undefined>, keys: string[]) {
  return keys.filter((key) => !has(env, key));
}

function feature(input: Omit<FeatureReadiness, "missingEnv"> & { env: Record<string, string | undefined> }): FeatureReadiness {
  const { env, ...publicInput } = input;
  return {
    ...publicInput,
    missingEnv: missing(env, input.requiredEnv)
  };
}

export function buildFeatureReadiness(config: RuntimeConfig, env: Record<string, string | undefined> = process.env, workspaceId = env.STUDIO_WORKSPACE_ID || "wks_default"): FeatureReadinessReport {
  const nonProduction = config.APP_ENV !== "production" && config.NODE_ENV !== "production";
  const databaseConfigured = has(env, "DATABASE_URL") || has(env, "DIRECT_DATABASE_URL");
  const memoryDev = config.REPOSITORY_ADAPTER === "memory" && nonProduction;
  const supabaseAuthReady = (has(env, "NEXT_PUBLIC_SUPABASE_URL") || has(env, "SUPABASE_URL")) && (has(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY") || has(env, "SUPABASE_ANON_KEY"));
  const storageReady = has(env, "SUPABASE_URL") && has(env, "SUPABASE_SERVICE_ROLE_KEY");
  const localImageReady = flagEnabled(env, "IMAGE_GENERATION_ENABLED") && env.IMAGE_GENERATION_PROVIDER === "local_dev_mock" && flagEnabled(env, "LOCAL_DEV_IMAGE_GENERATION") && nonProduction;
  const hfImageModel = env.HUGGING_FACE_IMAGE_MODEL || env.HF_IMAGE_MODEL || "";
  const hfImageConfigPresent = (flagEnabled(env, "AI_IMAGE_ENABLED") && has(env, "HF_API_TOKEN") && has(env, "HF_IMAGE_MODEL"))
    || (flagEnabled(env, "IMAGE_GENERATION_ENABLED") && env.IMAGE_GENERATION_PROVIDER === "hugging_face" && (has(env, "HUGGING_FACE_API_TOKEN") || has(env, "HF_API_TOKEN")) && (has(env, "HUGGING_FACE_IMAGE_MODEL") || has(env, "HF_IMAGE_MODEL")));
  const hfImageModelUnsupportedReason = hfImageModel ? unsupportedHuggingFaceImageModelReason(hfImageModel) : null;
  const hfImageModelRecommended = hfImageModel ? isRecommendedHuggingFaceImageModel(hfImageModel) : false;
  const hfImageReady = hfImageConfigPresent && hfImageModelRecommended && !hfImageModelUnsupportedReason;
  const hfImageModelSetupRequired = hfImageConfigPresent && !hfImageReady
    ? [
      hfImageModelUnsupportedReason ?? `Use a recommended Hugging Face HF Inference text-to-image model such as ${primaryHuggingFaceImageModel()}.`,
      "Validate the Hugging Face provider from /studio/onboarding/providers/image-generation before treating it as connected."
    ]
    : [];
  const printifyReady = config.PRINTIFY_ENABLED && has(env, "PRINTIFY_API_TOKEN") && has(env, "PRINTIFY_SHOP_ID");
  const shopifyLegacyReady = has(env, "SHOPIFY_ADMIN_TOKEN");
  const shopifyClientCredentialsReady = has(env, "SHOPIFY_CLIENT_ID") && has(env, "SHOPIFY_CLIENT_SECRET");
  const shopifyReady = config.SHOPIFY_ADMIN_ENABLED && has(env, "SHOPIFY_STORE_DOMAIN") && (shopifyLegacyReady || shopifyClientCredentialsReady);
  const shopifyCollectionReady = has(env, "SHOPIFY_DEFAULT_COLLECTION_ID");
  const plaidConfigured = has(env, "PLAID_CLIENT_ID") && has(env, "PLAID_SECRET") && has(env, "PLAID_ENV");

  const features: FeatureReadiness[] = [
    feature({
      env,
      featureKey: "core",
      label: "Core App Runtime",
      status: "ready",
      requiredEnv: ["NODE_ENV", "APP_ENV", "REPOSITORY_ADAPTER", "NEXT_PUBLIC_STOREFRONT_BASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: [],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio",
      dangerousActionsBlocked: ["live_publish", "external_order_submission", "money_movement"],
      notes: ["Core runtime does not require live commerce providers."]
    }),
    feature({
      env,
      featureKey: "database",
      label: "Database / Repository Layer",
      status: databaseConfigured ? "ready" : memoryDev ? "partial" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: memoryDev ? ["REPOSITORY_ADAPTER=memory"] : [],
      disabledFlags: [],
      setupRequired: databaseConfigured ? [] : memoryDev ? ["Memory repositories are local-only and non-persistent. Use DATABASE_URL for persisted local data."] : ["DATABASE_URL"],
      canTestWithoutProvider: memoryDev,
      safeLocalRoute: "/studio/setup",
      dangerousActionsBlocked: ["production_memory_repository"],
      notes: ["Production must use Drizzle/Postgres. Local memory is allowed only for development fixtures."]
    }),
    feature({
      env,
      featureKey: "auth",
      label: "Studio Login / Supabase Auth",
      status: config.STUDIO_AUTH_ENABLED && supabaseAuthReady ? "ready" : "config_blocked",
      requiredEnv: ["STUDIO_AUTH_ENABLED", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      enabledFlags: config.STUDIO_AUTH_ENABLED ? ["STUDIO_AUTH_ENABLED=true"] : [],
      disabledFlags: config.STUDIO_AUTH_ENABLED ? [] : ["STUDIO_AUTH_ENABLED=false"],
      setupRequired: supabaseAuthReady ? [] : ["NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY"],
      canTestWithoutProvider: false,
      safeLocalRoute: "/login",
      dangerousActionsBlocked: ["auth_bypass"],
      notes: ["Studio auth uses Supabase Auth. Test hooks are available only in automated tests."]
    }),
    feature({
      env,
      featureKey: "storage",
      label: "Supabase Private/Public Storage",
      status: storageReady ? "ready" : localImageReady ? "partial" : "config_blocked",
      requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET", "SUPABASE_PUBLIC_ASSETS_BUCKET"],
      enabledFlags: storageReady ? ["server_storage_config_present"] : [],
      disabledFlags: storageReady ? [] : ["storage_provider_disabled"],
      setupRequired: storageReady ? [] : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET", "SUPABASE_PUBLIC_ASSETS_BUCKET"],
      canTestWithoutProvider: localImageReady,
      safeLocalRoute: "/studio/assets",
      dangerousActionsBlocked: ["public_url_for_unapproved_asset"],
      notes: ["Private generated assets require signed/private storage. Local dev image fixtures can write local private files outside production."]
    }),
    feature({
      env,
      featureKey: "imageGeneration",
      label: "Image Generation",
      status: hfImageReady || localImageReady ? "ready" : "config_blocked",
      requiredEnv: localImageReady ? ["IMAGE_GENERATION_ENABLED", "IMAGE_GENERATION_PROVIDER", "LOCAL_DEV_IMAGE_GENERATION"] : ["AI_IMAGE_ENABLED", "HF_API_TOKEN", "HF_IMAGE_MODEL"],
      enabledFlags: unique([flagEnabled(env, "AI_IMAGE_ENABLED") && "AI_IMAGE_ENABLED=true", flagEnabled(env, "IMAGE_GENERATION_ENABLED") && "IMAGE_GENERATION_ENABLED=true", localImageReady && "LOCAL_DEV_IMAGE_GENERATION=true"]),
      disabledFlags: unique([!flagEnabled(env, "AI_IMAGE_ENABLED") && "AI_IMAGE_ENABLED=false", !flagEnabled(env, "IMAGE_GENERATION_ENABLED") && "IMAGE_GENERATION_ENABLED=false"]),
      setupRequired: hfImageReady || localImageReady ? [] : hfImageModelSetupRequired.length ? hfImageModelSetupRequired : ["AI_IMAGE_ENABLED=true", "HF_API_TOKEN", "HF_IMAGE_MODEL", "or local dev only: IMAGE_GENERATION_ENABLED=true, IMAGE_GENERATION_PROVIDER=local_dev_mock, LOCAL_DEV_IMAGE_GENERATION=true"],
      canTestWithoutProvider: localImageReady,
      safeLocalRoute: "/studio/image-generation",
      dangerousActionsBlocked: ["placeholder_provider_success", "public_generation_endpoint", "production_local_dev_mock"],
      notes: [
        "Core provider path is Hugging Face Inference Providers or local dev fixture. No OpenAI or Anthropic provider is allowed.",
        `Recommended HF Inference text-to-image models: ${publicHuggingFaceImageModelRecommendations().map((item) => item.model).join(", ")}.`
      ]
    }),
    feature({
      env,
      featureKey: "worker",
      label: "Worker Generation",
      status: hfImageReady && storageReady ? "ready" : localImageReady ? "partial" : "config_blocked",
      requiredEnv: ["AI_IMAGE_ENABLED", "HF_API_TOKEN", "HF_IMAGE_MODEL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      enabledFlags: unique([hfImageReady && "hugging_face_image_ready", localImageReady && "local_dev_image_fixture_ready"]),
      disabledFlags: unique([!hfImageReady && "worker_image_provider_blocked", !storageReady && "private_storage_blocked"]),
      setupRequired: hfImageReady && storageReady ? [] : ["HF_API_TOKEN/HF_IMAGE_MODEL for provider generation", "SUPABASE_SERVICE_ROLE_KEY for private asset storage"],
      canTestWithoutProvider: localImageReady,
      safeLocalRoute: "/studio/generate",
      dangerousActionsBlocked: ["complete_job_without_asset", "publish_worker_job"],
      notes: ["Worker marks generation complete only after an asset exists."]
    }),
    feature({
      env,
      featureKey: "printify",
      label: "Printify Catalog / Upload / Product Creation",
      status: printifyReady ? "ready" : config.PRINTIFY_ENABLED ? "config_blocked" : "disabled",
      requiredEnv: ["PRINTIFY_ENABLED", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
      enabledFlags: config.PRINTIFY_ENABLED ? ["PRINTIFY_ENABLED=true"] : [],
      disabledFlags: unique([!config.PRINTIFY_ENABLED && "PRINTIFY_ENABLED=false", !config.PRINTIFY_ALLOW_PUBLISH && "PRINTIFY_ALLOW_PUBLISH=false"]),
      setupRequired: printifyReady ? [] : ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
      canTestWithoutProvider: false,
      safeLocalRoute: "/studio/printify-catalog",
      dangerousActionsBlocked: ["fake_printify_ids", "printify_live_publish", "printify_auto_shopify_publish"],
      notes: ["Catalog, upload, and draft product creation require real Printify config. The publish flag remains disabled by default."]
    }),
    feature({
      env,
      featureKey: "shopify",
      label: "Shopify Draft Products / Media / Collection Assignment",
      status: shopifyReady && shopifyCollectionReady ? "ready" : shopifyReady ? "partial" : config.SHOPIFY_ADMIN_ENABLED ? "config_blocked" : "disabled",
      requiredEnv: shopifyLegacyReady ? ["SHOPIFY_ADMIN_ENABLED", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"] : ["SHOPIFY_ADMIN_ENABLED", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"],
      enabledFlags: config.SHOPIFY_ADMIN_ENABLED ? ["SHOPIFY_ADMIN_ENABLED=true"] : [],
      disabledFlags: unique([!config.SHOPIFY_ADMIN_ENABLED && "SHOPIFY_ADMIN_ENABLED=false", !config.SHOPIFY_ALLOW_PRODUCT_PUBLISH && "SHOPIFY_ALLOW_PRODUCT_PUBLISH=false"]),
      setupRequired: unique([!shopifyReady && "Connect Shopify in Studio with Dev Dashboard Client ID/Secret, or use protected legacy Admin token config.", !shopifyCollectionReady && "SHOPIFY_DEFAULT_COLLECTION_ID or owner-entered Shopify collection ID"]),
      canTestWithoutProvider: false,
      safeLocalRoute: "/studio/shopify-products",
      dangerousActionsBlocked: ["shopify_live_publish", "fake_shopify_ids"],
      notes: ["Draft creation does not publish. Dev Dashboard Client ID/Secret is preferred when configured; legacy Admin token remains available under advanced setup."]
    }),
    feature({
      env,
      featureKey: "podWorkflow",
      label: "POD Launch Studio / Batches / Launch Packet",
      status: databaseConfigured || memoryDev ? "ready" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/pod-launch-studio",
      dangerousActionsBlocked: ["bulk_publish_by_default", "provider_success_without_config"],
      notes: ["Internal batches, blockers, and launch packets can be reviewed without live providers."]
    }),
    feature({
      env,
      featureKey: "aiEmployees",
      label: "AI Employees / Hiring / Improvement Desks",
      status: databaseConfigured || memoryDev ? "ready" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/ai-employees",
      dangerousActionsBlocked: ["self_grant_permissions", "publish", "send", "spend", "sync", "delete"],
      notes: ["AI employees can draft/recommend internally and require owner approval for workforce changes."]
    }),
    feature({
      env,
      featureKey: "aiModelRuntime",
      label: "AI Model Runtime Registry",
      status: hfImageReady || flagEnabled(env, "AI_TEXT_ENABLED") ? "partial" : "disabled",
      requiredEnv: ["AI_TEXT_ENABLED", "HF_API_TOKEN", "HF_TEXT_MODEL"],
      enabledFlags: unique([flagEnabled(env, "AI_TEXT_ENABLED") && "AI_TEXT_ENABLED=true", flagEnabled(env, "AI_IMAGE_ENABLED") && "AI_IMAGE_ENABLED=true"]),
      disabledFlags: unique([!flagEnabled(env, "AI_TEXT_ENABLED") && "AI_TEXT_ENABLED=false", !flagEnabled(env, "AI_IMAGE_ENABLED") && "AI_IMAGE_ENABLED=false"]),
      setupRequired: flagEnabled(env, "AI_TEXT_ENABLED") ? missing(env, ["HF_API_TOKEN", "HF_TEXT_MODEL"]) : ["AI_TEXT_ENABLED=true", "HF_API_TOKEN", "HF_TEXT_MODEL"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/ai-employees/models",
      dangerousActionsBlocked: ["forbidden_paid_provider_runtime", "secret_prompt_exposure", "dangerous_action_model_routing"],
      notes: ["Rules-based/internal workflows work without a text provider. External model calls require HuggingFace-compatible config."]
    }),
    feature({
      env,
      featureKey: "businessCommandCenter",
      label: "Business Command Center",
      status: databaseConfigured || memoryDev ? "ready" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business",
      dangerousActionsBlocked: ["financial_advice_claims", "automatic_spend", "live_price_changes"],
      notes: ["Business calculations store assumptions and are owner-reviewed decision support only."]
    }),
    feature({
      env,
      featureKey: "businessIdentity",
      label: "Business Identity / Authority Requests",
      status: databaseConfigured || memoryDev ? "ready" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business/profile",
      dangerousActionsBlocked: ["plaintext_ein_response", "full_bank_account_response", "sensitive_use_without_authority"],
      notes: ["Sensitive values are represented by secret refs and masked displays."]
    }),
    feature({
      env,
      featureKey: "documentOps",
      label: "Document Ops",
      status: databaseConfigured || memoryDev ? "ready" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business/documents",
      dangerousActionsBlocked: ["external_document_send", "sensitive_document_without_authority"],
      notes: ["Document exports are internal manifests unless a future export/storage renderer is configured."]
    }),
    feature({
      env,
      featureKey: "printStudio",
      label: "Business Card / Print Studio",
      status: databaseConfigured || memoryDev ? "partial" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: unique([!config.EXTERNAL_ORDER_SUBMISSION_ENABLED && "EXTERNAL_ORDER_SUBMISSION_ENABLED=false"]),
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business/print-studio",
      dangerousActionsBlocked: ["staples_api_order", "external_order_submission", "payment"],
      notes: ["Business card SVG preview/export manifest works internally. Staples ordering is owner handoff/future only."]
    }),
    feature({
      env,
      featureKey: "bankingPlaidNovo",
      label: "Banking / Novo / Plaid",
      status: plaidConfigured && config.BANKING_LIVE_SYNC_ENABLED ? "owner_gated" : "partial",
      requiredEnv: ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV"],
      enabledFlags: unique([config.BANKING_LIVE_SYNC_ENABLED && "BANKING_LIVE_SYNC_ENABLED=true"]),
      disabledFlags: unique([!config.BANKING_LIVE_SYNC_ENABLED && "BANKING_LIVE_SYNC_ENABLED=false", !config.BANKING_MONEY_MOVEMENT_ENABLED && "BANKING_MONEY_MOVEMENT_ENABLED=false"]),
      setupRequired: plaidConfigured ? ["Owner consent required before any Plaid sync. Banking remains read-only."] : ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV", "Owner consent required. Novo direct API is not verified in v1."],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business/banking",
      dangerousActionsBlocked: ["novo_scraping", "bank_login_storage", "transfers", "payments", "ach", "wires", "card_creation"],
      notes: ["Manual bank import can be tested without Plaid. Novo direct API is future unless verified official API credentials exist."]
    }),
    feature({
      env,
      featureKey: "authorityRequests",
      label: "Authority Requests",
      status: databaseConfigured || memoryDev ? "ready" : "config_blocked",
      requiredEnv: memoryDev ? ["REPOSITORY_ADAPTER"] : ["DATABASE_URL"],
      enabledFlags: [],
      disabledFlags: [],
      setupRequired: databaseConfigured || memoryDev ? [] : ["DATABASE_URL or development-only REPOSITORY_ADAPTER=memory"],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business/authority-requests",
      dangerousActionsBlocked: ["sensitive_access_without_owner_approval", "secret_logging"],
      notes: ["Authority approvals are owner-gated and audit-tracked."]
    }),
    feature({
      env,
      featureKey: "livePublish",
      label: "Live Publish",
      status: config.LIVE_PUBLISHING_ENABLED || config.SHOPIFY_ALLOW_PRODUCT_PUBLISH || config.PRINTIFY_ALLOW_PUBLISH ? "owner_gated" : "disabled",
      requiredEnv: ["LIVE_PUBLISHING_ENABLED", "SHOPIFY_ALLOW_PRODUCT_PUBLISH", "PRINTIFY_ALLOW_PUBLISH"],
      enabledFlags: unique([config.LIVE_PUBLISHING_ENABLED && "LIVE_PUBLISHING_ENABLED=true", config.SHOPIFY_ALLOW_PRODUCT_PUBLISH && "SHOPIFY_ALLOW_PRODUCT_PUBLISH=true", config.PRINTIFY_ALLOW_PUBLISH && "PRINTIFY_ALLOW_PUBLISH=true"]),
      disabledFlags: unique([!config.LIVE_PUBLISHING_ENABLED && "LIVE_PUBLISHING_ENABLED=false", !config.SHOPIFY_ALLOW_PRODUCT_PUBLISH && "SHOPIFY_ALLOW_PRODUCT_PUBLISH=false", !config.PRINTIFY_ALLOW_PUBLISH && "PRINTIFY_ALLOW_PUBLISH=false"]),
      setupRequired: ["Keep disabled locally. If ever enabled, all publish gates and explicit owner confirmation are still required."],
      canTestWithoutProvider: false,
      safeLocalRoute: "/studio/publish-review",
      dangerousActionsBlocked: ["live_storefront_publish", "provider_sync_without_owner_confirmation"],
      notes: ["Draft creation is separate from live publish. Live publish remains disabled by default."]
    }),
    feature({
      env,
      featureKey: "externalOrders",
      label: "External Orders / Staples",
      status: "future",
      requiredEnv: ["EXTERNAL_ORDER_SUBMISSION_ENABLED"],
      enabledFlags: config.EXTERNAL_ORDER_SUBMISSION_ENABLED ? ["EXTERNAL_ORDER_SUBMISSION_ENABLED=true"] : [],
      disabledFlags: config.EXTERNAL_ORDER_SUBMISSION_ENABLED ? [] : ["EXTERNAL_ORDER_SUBMISSION_ENABLED=false"],
      setupRequired: ["No verified external order provider is implemented. Use owner handoff packets only."],
      canTestWithoutProvider: true,
      safeLocalRoute: "/studio/business/print-studio",
      dangerousActionsBlocked: ["staples_api_order", "payment", "external_checkout_submission"],
      notes: ["Print packets do not place external orders."]
    })
  ];

  const summary = {
    ready: features.filter((item) => item.status === "ready").length,
    configBlocked: features.filter((item) => item.status === "config_blocked").length,
    ownerGated: features.filter((item) => item.status === "owner_gated").length,
    disabled: features.filter((item) => item.status === "disabled").length,
    partial: features.filter((item) => item.status === "partial").length,
    future: features.filter((item) => item.status === "future").length
  };

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    workspaceId,
    features,
    summary,
    safeLocalTesting: features
      .filter((item) => item.canTestWithoutProvider)
      .map((item) => ({
        featureKey: item.featureKey,
        label: item.label,
        ...(item.safeLocalRoute ? { route: item.safeLocalRoute } : {})
      })),
    recommendedSetupOrder: [
      "Internal AI Business OS pages",
      "Image generation",
      "Printify catalog/upload/product creation",
      "Shopify draft creation",
      "Banking/Plaid later",
      "Live publish last, if ever enabled"
    ]
  };
}

function summarize(features: FeatureReadiness[]) {
  return {
    ready: features.filter((item) => item.status === "ready").length,
    configBlocked: features.filter((item) => item.status === "config_blocked").length,
    ownerGated: features.filter((item) => item.status === "owner_gated").length,
    disabled: features.filter((item) => item.status === "disabled").length,
    partial: features.filter((item) => item.status === "partial").length,
    future: features.filter((item) => item.status === "future").length
  };
}

export function applyImageGenerationRuntimeReadiness(
  report: FeatureReadinessReport,
  runtime: ImageGenerationRuntimeReadiness
): FeatureReadinessReport {
  const features = report.features.map((feature) => {
    if (feature.featureKey === "imageGeneration") {
      if (runtime.status === "ready") {
        const sourceLabel = runtime.credentialSource === "credential_store" ? "secure workspace credential" : "advanced server fallback";
        return {
          ...feature,
          status: "ready" as const,
          requiredEnv: [],
          missingEnv: [],
          enabledFlags: [`image_generation_provider:${runtime.provider}`, `credential_source:${runtime.credentialSource}`],
          disabledFlags: [],
          setupRequired: [],
          canTestWithoutProvider: runtime.credentialSource !== "credential_store",
          notes: [
            runtime.credentialSource === "credential_store"
              ? "Image generation connected through Launch Setup Concierge."
              : "Image generation is configured through advanced server environment fallback.",
            `Provider: ${runtime.provider}.`,
            runtime.model ? `Model: ${runtime.model}.` : "",
            `Credential source: ${sourceLabel}.`
          ].filter(Boolean)
        };
      }
      if (runtime.status === "local_demo") {
        return {
          ...feature,
          status: "partial" as const,
          requiredEnv: ["IMAGE_GENERATION_ENABLED", "IMAGE_GENERATION_PROVIDER", "LOCAL_DEV_IMAGE_GENERATION"],
          missingEnv: [],
          enabledFlags: ["LOCAL_DEV_IMAGE_GENERATION=true"],
          disabledFlags: [],
          setupRequired: runtime.setupRequired,
          canTestWithoutProvider: true,
          notes: [runtime.safeMessage]
        };
      }
      if (runtime.status === "invalid") {
        return {
          ...feature,
          status: "config_blocked" as const,
          requiredEnv: [],
          missingEnv: [],
          enabledFlags: [],
          disabledFlags: [],
          setupRequired: runtime.setupRequired.length ? runtime.setupRequired : runtime.blockingReasons,
          notes: [runtime.safeMessage]
        };
      }
    }
    if (feature.featureKey === "worker" && runtime.status === "ready") {
      const storageReady = report.features.find((item) => item.featureKey === "storage")?.status === "ready";
      return {
        ...feature,
        status: storageReady ? "ready" as const : "partial" as const,
        requiredEnv: storageReady ? [] : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"],
        missingEnv: storageReady ? [] : feature.missingEnv.filter((key) => key.includes("SUPABASE")),
        enabledFlags: [`image_generation_provider:${runtime.provider}`, `credential_source:${runtime.credentialSource}`],
        disabledFlags: storageReady ? [] : ["private_storage_blocked"],
        setupRequired: storageReady ? [] : ["Configure private generated-asset storage"],
        notes: [
          runtime.credentialSource === "credential_store"
            ? "Worker can use the Launch Setup Concierge image provider credential server-side."
            : "Worker can use the advanced server fallback image provider.",
          storageReady ? "Private storage is ready." : "Private storage is still required before real provider bytes can be persisted."
        ]
      };
    }
    return feature;
  });

  return {
    ...report,
    features,
    summary: summarize(features),
    safeLocalTesting: features
      .filter((item) => item.canTestWithoutProvider)
      .map((item) => ({
        featureKey: item.featureKey,
        label: item.label,
        ...(item.safeLocalRoute ? { route: item.safeLocalRoute } : {})
      }))
  };
}
