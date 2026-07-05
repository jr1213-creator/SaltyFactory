import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { publicPrintifyProviderResolution, resolvePrintifyProvider } from "@saltyfactory/commerce";
import { parseEnv, type RuntimeConfig, type ShopifyRuntimeReadiness } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { checkStorageReadiness, type StorageReadinessDiagnostic } from "@saltyfactory/storage";
import { studioWorkspaceId } from "../api/studio/design-suggestions/_shared";
import { createShopifyAdminProviderForWorkspace } from "../api/studio/_shopify-admin";

export type StudioProviderReadinessStatus =
  | "ready"
  | "needs_setup"
  | "connected"
  | "invalid"
  | "owner_gated"
  | "admin_setup_required"
  | "future"
  | "disabled_for_safety";

export type StudioProviderCredentialSource = "credential_store" | "env" | "local_demo" | "local_folder" | "none";

export type StudioProviderConnectionMode =
  | "secure_token"
  | "client_credentials"
  | "legacy_admin_token"
  | "oauth"
  | "server_env"
  | "manual"
  | "future";

export type WorkspaceProviderReadinessItem = {
  providerKey: string;
  label: string;
  status: StudioProviderReadinessStatus;
  credentialSource: StudioProviderCredentialSource;
  connectionMode: StudioProviderConnectionMode;
  safeMessage: string;
  businessFacingSetupRequired: string[];
  advancedEnvFallback?: string[];
  setupRoute: string;
  requestHelpRoute?: string;
  lastValidatedAt?: string;
  providerMetadata?: Record<string, unknown>;
  dangerousActionsBlocked: string[];
};

export type WorkspaceProviderReadinessProviders = {
  printify: WorkspaceProviderReadinessItem;
  shopify: WorkspaceProviderReadinessItem;
  image_generation: WorkspaceProviderReadinessItem;
  storage: WorkspaceProviderReadinessItem;
  live_publish: WorkspaceProviderReadinessItem;
  banking: WorkspaceProviderReadinessItem;
  external_orders: WorkspaceProviderReadinessItem;
};

export type WorkspaceProviderReadiness = {
  workspaceId: string;
  generatedAt: string;
  providers: WorkspaceProviderReadinessProviders;
};

function canOpenRepositories() {
  return process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory" || Boolean(process.env.DATABASE_URL) || process.env.APP_ENV === "production";
}

export function openProviderReadinessRepositoriesSafely(): RepositoryBundle | undefined {
  if (!canOpenRepositories()) return undefined;
  try {
    return createRepositories();
  } catch {
    return undefined;
  }
}

function connectionModeLabel(mode: string | undefined): StudioProviderConnectionMode {
  if (mode === "dev_dashboard_client_credentials") return "client_credentials";
  if (mode === "legacy_admin_token") return "legacy_admin_token";
  return "server_env";
}

function storageSetupRequired(storage: StorageReadinessDiagnostic) {
  const required: string[] = [];
  if (!storage.environment.SUPABASE_URL.present) required.push("Ask an administrator to configure the Supabase project URL.");
  if (!storage.environment.SUPABASE_SERVICE_ROLE_KEY.present) required.push("Ask an administrator to configure the server-side storage service role key.");
  if (!storage.environment.SUPABASE_PRIVATE_ASSETS_BUCKET.name) required.push("Ask an administrator to choose the private generated-assets bucket.");
  if (!storage.environment.SUPABASE_PUBLIC_ASSETS_BUCKET.name) required.push("Ask an administrator to choose the public approved-assets bucket.");
  if (storage.environment.SUPABASE_URL.present && storage.environment.SUPABASE_SERVICE_ROLE_KEY.present && !storage.checks.privateBucketExists) {
    required.push(`Create or grant access to private bucket ${storage.environment.SUPABASE_PRIVATE_ASSETS_BUCKET.name || "for generated assets"}.`);
  }
  if (storage.environment.SUPABASE_URL.present && storage.environment.SUPABASE_SERVICE_ROLE_KEY.present && !storage.checks.publicBucketExists) {
    required.push(`Create or grant access to public bucket ${storage.environment.SUPABASE_PUBLIC_ASSETS_BUCKET.name || "for approved assets"}.`);
  }
  if (storage.checks.privateBucketExists && !storage.checks.canWriteTestObjectToPrivateBucket) required.push("Allow the server storage client to write private generated assets.");
  if (storage.checks.canWriteTestObjectToPrivateBucket && !storage.checks.canDeleteTestObject) required.push("Allow the server storage client to delete diagnostic test objects.");
  return required.length ? required : ["Run the storage readiness diagnostic."];
}

async function resolveShopifyReadiness(input: { workspaceId: string; repos?: RepositoryBundle | undefined; config: RuntimeConfig }): Promise<WorkspaceProviderReadinessItem> {
  const base = {
    providerKey: "shopify",
    label: "Shopify Admin",
    setupRoute: "/studio/onboarding/providers/shopify",
    requestHelpRoute: "/studio/onboarding/help?provider=shopify",
    advancedEnvFallback: [
      "SHOPIFY_ADMIN_ENABLED",
      "SHOPIFY_STORE_DOMAIN",
      "SHOPIFY_CLIENT_ID",
      "SHOPIFY_CLIENT_SECRET",
      "SHOPIFY_ADMIN_TOKEN",
      "SHOPIFY_DEFAULT_COLLECTION_ID"
    ],
    dangerousActionsBlocked: ["shopify_live_publish", "public_publish_without_owner_approval", "fake_shopify_ids"]
  } satisfies Pick<WorkspaceProviderReadinessItem, "providerKey" | "label" | "setupRoute" | "requestHelpRoute" | "advancedEnvFallback" | "dangerousActionsBlocked">;

  if (!input.repos) {
    return {
      ...base,
      status: "needs_setup",
      credentialSource: "none",
      connectionMode: "manual",
      safeMessage: "Connect Shopify through Launch Setup Concierge before draft product creation.",
      businessFacingSetupRequired: ["Connect Shopify", "Validate Shopify credentials", "Select default Shopify collection"]
    };
  }

  const shopify = await createShopifyAdminProviderForWorkspace({
    workspaceId: input.workspaceId,
    repos: input.repos,
    config: input.config,
    requireEnabled: false
  });

  if (!shopify.ok) {
    return {
      ...base,
      status: shopify.status === "config_blocked" ? "admin_setup_required" : "needs_setup",
      credentialSource: "none",
      connectionMode: "manual",
      safeMessage: shopify.message,
      businessFacingSetupRequired: shopify.setupRequired.length ? shopify.setupRequired : ["Connect Shopify", "Validate Shopify credentials", "Select default Shopify collection"]
    };
  }

  const selectedCollectionId = shopify.selectedCollectionId || "";
  const source = shopify.source === "stored_connection" ? "credential_store" : "env";
  return {
    ...base,
    status: selectedCollectionId ? "connected" : "owner_gated",
    credentialSource: source,
    connectionMode: source === "credential_store" ? connectionModeLabel(shopify.credentialMode) : "server_env",
    safeMessage: source === "credential_store"
      ? selectedCollectionId
        ? "Shopify Admin connected through Launch Setup Concierge. Draft creation is ready after product gates pass."
        : "Shopify Admin connected through Launch Setup Concierge. Select the default collection before draft products are marked ready."
      : selectedCollectionId
        ? "Shopify Admin is configured through advanced server environment fallback. Draft creation is ready after product gates pass."
        : "Shopify Admin is configured through advanced server environment fallback. Select the default collection before draft products are marked ready.",
    businessFacingSetupRequired: selectedCollectionId ? [] : ["Select default Shopify collection"],
    providerMetadata: {
      storeDomain: shopify.storeDomain,
      credentialMode: shopify.credentialMode,
      selectedCollectionId: selectedCollectionId || null
    }
  };
}

export async function getWorkspaceProviderReadiness(
  workspaceId = studioWorkspaceId,
  input: { repos?: RepositoryBundle | undefined; config?: RuntimeConfig | undefined } = {}
): Promise<WorkspaceProviderReadiness> {
  const config = input.config ?? parseEnv();
  const repos = input.repos ?? openProviderReadinessRepositoriesSafely();
  const [printifyRuntime, imageRuntime, storageRuntime, shopify] = await Promise.all([
    resolvePrintifyProvider({ workspaceId, repos, config }),
    resolveImageGenerationProvider({ workspaceId, repos, config }),
    checkStorageReadiness(config),
    resolveShopifyReadiness({ workspaceId, repos, config })
  ]);
  const printify = publicPrintifyProviderResolution(printifyRuntime);
  const image = publicImageGenerationProviderResolution(imageRuntime);

  const storage: WorkspaceProviderReadinessItem = {
    providerKey: "storage",
    label: "Generated Asset Storage",
    status: storageRuntime.ok ? "ready" : "admin_setup_required",
    credentialSource: storageRuntime.environment.SUPABASE_SERVICE_ROLE_KEY.present ? "env" : "none",
    connectionMode: "server_env",
    safeMessage: storageRuntime.ok
      ? "Generated asset storage is ready. Private generated files and public approved assets can use the configured buckets."
      : "Generated asset storage needs administrator setup before real provider bytes can be persisted.",
    businessFacingSetupRequired: storageRuntime.ok ? [] : ["Set up generated asset storage", ...storageSetupRequired(storageRuntime)],
    advancedEnvFallback: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET", "SUPABASE_PUBLIC_ASSETS_BUCKET", "SUPABASE_STORAGE_BUCKET"],
    setupRoute: "/studio/setup",
    requestHelpRoute: "/studio/onboarding/help?provider=storage",
    providerMetadata: {
      privateBucket: storageRuntime.environment.SUPABASE_PRIVATE_ASSETS_BUCKET.name || null,
      publicBucket: storageRuntime.environment.SUPABASE_PUBLIC_ASSETS_BUCKET.name || null,
      checks: storageRuntime.checks
    },
    dangerousActionsBlocked: ["public_url_for_unapproved_asset", "generated_asset_without_private_storage"]
  };

  const imageReady = image.status === "ready";
  const imageLocalDemo = image.status === "local_demo";
  const imageLocalFolder = image.status === "local_folder";
  const imageGeneration: WorkspaceProviderReadinessItem = {
    providerKey: "image_generation",
    label: "Image Generation",
    status: imageReady || imageLocalFolder ? "connected" : imageLocalDemo ? "ready" : image.status === "invalid" ? "invalid" : "needs_setup",
    credentialSource: image.credentialSource,
    connectionMode: image.credentialSource === "credential_store" ? "secure_token" : image.credentialSource === "env" ? "server_env" : "manual",
    safeMessage: imageReady && image.credentialSource === "credential_store"
      ? "Image generation connected through Launch Setup Concierge."
      : imageReady
        ? "Image generation is configured through advanced server environment fallback."
        : imageLocalFolder
          ? "Dev-only local folder image import is ready. Imported artwork still runs through private storage, derivatives, and QA."
        : imageLocalDemo
          ? "Local demo image mode is available for development/test workflow previews only. It is not real provider success."
          : image.safeMessage,
    businessFacingSetupRequired: imageReady ? [] : image.setupRequired,
    advancedEnvFallback: ["AI_IMAGE_ENABLED", "IMAGE_GENERATION_ENABLED", "IMAGE_GENERATION_PROVIDER", "HF_API_TOKEN", "HF_IMAGE_MODEL", "HUGGING_FACE_API_TOKEN", "HUGGING_FACE_IMAGE_MODEL"],
    setupRoute: image.setupAction || "/studio/onboarding/providers/image-generation",
    requestHelpRoute: "/studio/onboarding/help?provider=image_generation",
    providerMetadata: {
      provider: image.provider,
      model: image.model ?? null,
      recommendedModels: image.recommendedModels
    },
    dangerousActionsBlocked: ["placeholder_provider_success", "public_generation_endpoint", "production_local_dev_mock", "production_local_folder_import"]
  };

  const printifyReady = printify.status === "ready";
  const printifyItem: WorkspaceProviderReadinessItem = {
    providerKey: "printify",
    label: "Printify",
    status: printifyReady ? "connected" : printify.status === "invalid" ? "invalid" : printify.status === "owner_gated" ? "owner_gated" : "needs_setup",
    credentialSource: printify.credentialSource,
    connectionMode: printify.credentialSource === "credential_store" ? "secure_token" : printify.credentialSource === "env" ? "server_env" : "manual",
    safeMessage: printifyReady && printify.credentialSource === "credential_store"
      ? "Printify connected through Launch Setup Concierge."
      : printifyReady
        ? "Printify is configured through advanced server environment fallback."
        : printify.safeMessage,
    businessFacingSetupRequired: printifyReady ? [] : printify.setupRequired,
    advancedEnvFallback: ["PRINTIFY_ENABLED", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
    setupRoute: printify.setupAction || "/studio/onboarding/providers/printify",
    requestHelpRoute: "/studio/onboarding/help?provider=printify",
    providerMetadata: {
      shopId: printify.shopId ?? null,
      shopName: printify.shopName ?? null
    },
    dangerousActionsBlocked: ["fake_printify_ids", "printify_live_publish", "printify_auto_shopify_publish"]
  };

  const livePublish: WorkspaceProviderReadinessItem = {
    providerKey: "live_publish",
    label: "Live Publish",
    status: config.LIVE_PUBLISHING_ENABLED || config.SHOPIFY_ALLOW_PRODUCT_PUBLISH || config.PRINTIFY_ALLOW_PUBLISH ? "owner_gated" : "disabled_for_safety",
    credentialSource: "none",
    connectionMode: "manual",
    safeMessage: "Live publish is separate from provider connection and remains blocked until explicit owner confirmation and all gates pass.",
    businessFacingSetupRequired: ["Owner confirmation required", "All publish review gates must pass"],
    advancedEnvFallback: ["LIVE_PUBLISHING_ENABLED", "SHOPIFY_ALLOW_PRODUCT_PUBLISH", "PRINTIFY_ALLOW_PUBLISH"],
    setupRoute: "/studio/publish-review",
    requestHelpRoute: "/studio/onboarding/help?provider=live_publish",
    dangerousActionsBlocked: ["live_storefront_publish", "provider_sync_without_owner_confirmation"]
  };

  const banking: WorkspaceProviderReadinessItem = {
    providerKey: "banking",
    label: "Banking / Plaid",
    status: "owner_gated",
    credentialSource: "none",
    connectionMode: "manual",
    safeMessage: "Banking is read-only/manual in v1. No money movement is implemented.",
    businessFacingSetupRequired: ["Use manual import or request read-only banking setup"],
    advancedEnvFallback: ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV", "BANKING_LIVE_SYNC_ENABLED"],
    setupRoute: "/studio/business/banking",
    requestHelpRoute: "/studio/onboarding/help?provider=banking",
    dangerousActionsBlocked: ["money_movement", "bank_login_storage", "transfers"]
  };

  const externalOrders: WorkspaceProviderReadinessItem = {
    providerKey: "external_orders",
    label: "External Orders",
    status: "future",
    credentialSource: "none",
    connectionMode: "future",
    safeMessage: "External order submission is not implemented in v1. Use owner handoff packets only.",
    businessFacingSetupRequired: ["Use manual vendor handoff"],
    advancedEnvFallback: ["EXTERNAL_ORDER_SUBMISSION_ENABLED"],
    setupRoute: "/studio/business/print-studio",
    requestHelpRoute: "/studio/onboarding/help?provider=external_orders",
    dangerousActionsBlocked: ["external_order_submission", "payment", "external_checkout_submission"]
  };

  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    providers: {
      printify: printifyItem,
      shopify,
      image_generation: imageGeneration,
      storage,
      live_publish: livePublish,
      banking,
      external_orders: externalOrders
    }
  };
}

export function providerReadinessItems(readiness: WorkspaceProviderReadiness) {
  return [
    readiness.providers.printify,
    readiness.providers.shopify,
    readiness.providers.image_generation,
    readiness.providers.storage,
    readiness.providers.live_publish,
    readiness.providers.banking,
    readiness.providers.external_orders
  ].filter(Boolean) as WorkspaceProviderReadinessItem[];
}

export function isProviderReady(item: WorkspaceProviderReadinessItem | undefined) {
  return item?.status === "ready" || item?.status === "connected";
}

export function providerCredentialSourceLabel(source: StudioProviderCredentialSource) {
  if (source === "credential_store") return "secure workspace credential";
  if (source === "env") return "advanced server fallback";
  if (source === "local_demo") return "local demo mode";
  return "not connected";
}

export function shopifyRuntimeReadinessFromProviderItem(item: WorkspaceProviderReadinessItem): ShopifyRuntimeReadiness {
  const selectedCollectionId = typeof item.providerMetadata?.selectedCollectionId === "string" ? item.providerMetadata.selectedCollectionId : "";
  const credentialMode = typeof item.providerMetadata?.credentialMode === "string" ? item.providerMetadata.credentialMode : "";
  const storeDomain = typeof item.providerMetadata?.storeDomain === "string" ? item.providerMetadata.storeDomain : "";
  return {
    status: item.status === "connected" || item.status === "ready" ? "connected" : item.status === "admin_setup_required" ? "admin_setup_required" : item.status === "invalid" ? "invalid" : item.status === "owner_gated" ? "owner_gated" : "needs_setup",
    provider: item.credentialSource === "none" ? "disabled" : "shopify",
    credentialSource: item.credentialSource === "credential_store" || item.credentialSource === "env" ? item.credentialSource : "none",
    setupAction: item.setupRoute,
    safeMessage: item.safeMessage,
    setupRequired: [...item.businessFacingSetupRequired],
    blockingReasons: item.businessFacingSetupRequired.length ? [...item.businessFacingSetupRequired] : [],
    ...(storeDomain ? { storeDomain } : {}),
    ...(credentialMode ? { credentialMode } : {}),
    ...(selectedCollectionId ? { selectedCollectionId } : {})
  };
}
