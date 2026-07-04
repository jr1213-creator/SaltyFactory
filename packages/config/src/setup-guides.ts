import type { FeatureReadiness, FeatureReadinessReport, FeatureReadinessStatus } from "./feature-readiness";
import { primaryHuggingFaceImageModel, publicHuggingFaceImageModelRecommendations } from "./hugging-face-image";

export type OwnerSetupStatus =
  | "ready"
  | "needs_setup"
  | "validating"
  | "connected"
  | "invalid"
  | "owner_gated"
  | "admin_setup_required"
  | "future"
  | "disabled_for_safety";

export type SetupMode = "secure_token" | "oauth" | "server_env" | "manual" | "future";
export type SetupSensitivity = "public" | "secret" | "sensitive" | "high_authority";

export type SetupFieldGuide = {
  fieldKey: string;
  providerKey: string;
  label: string;
  plainEnglishDescription: string;
  whyNeeded: string;
  whereToGetIt: string;
  providerUrl?: string;
  stepsToFindIt: string[];
  recommendedScopes: string[];
  securityNote: string;
  validationAction?: string;
  commonProblems: string[];
  troubleshootingSteps: string[];
  setupMode: SetupMode;
  sensitivity: SetupSensitivity;
  showInOwnerSetup: boolean;
  showInAdvancedOnly: boolean;
  relatedFeature: string;
  requiredFor: string[];
  envVars: string[];
};

export type SetupAction = {
  label: string;
  href: string;
  kind: "primary" | "secondary" | "guide" | "validate" | "help" | "advanced";
};

export type OwnerSetupCard = {
  providerKey: string;
  label: string;
  status: OwnerSetupStatus;
  explanation: string;
  whyItMatters: string;
  primaryAction: SetupAction;
  setupGuideAction: SetupAction;
  validationAction?: SetupAction | undefined;
  requestHelpAction: SetupAction;
  advancedDetails: {
    summary: string;
    envVars: string[];
    deploymentNotes: string[];
  };
  setupRequired: string[];
  dangerousActionsBlocked: string[];
  safeErrorMessage?: string | undefined;
  maskedDisplayValue?: string | null | undefined;
  safeLocalRoute?: string | undefined;
};

const guide = (input: SetupFieldGuide) => input;

export const setupFieldGuides: SetupFieldGuide[] = [
  guide({
    fieldKey: "printify_api_token",
    providerKey: "printify",
    label: "Printify API token",
    plainEnglishDescription: "A private token that lets SaltyFactory validate your Printify account and create draft products after owner approval.",
    whyNeeded: "Printify uses this token to confirm your shops, browse catalog data, upload approved artwork, and create draft products.",
    whereToGetIt: "In Printify, open your account settings and create a Personal Access Token/API token.",
    providerUrl: "https://printify.com/app/account/api",
    stepsToFindIt: ["Open Printify.", "Open Account or Profile settings.", "Choose API or Personal Access Tokens.", "Create a new token for SaltyFactory.", "Copy it once and paste it into the secure field."],
    recommendedScopes: ["shops.read", "catalog.read", "products.read", "products.write"],
    securityNote: "The token is write-only in SaltyFactory. After saving, only connected/invalid status and a masked indicator are shown.",
    validationAction: "/api/studio/provider-connections/printify/validate-token",
    commonProblems: ["Token was copied with an extra space.", "Token lacks product/catalog scopes.", "The selected Printify shop belongs to a different account."],
    troubleshootingSteps: ["Generate a fresh token.", "Confirm shop and catalog/product scopes.", "Validate again before selecting a shop."],
    setupMode: "secure_token",
    sensitivity: "secret",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Printify",
    requiredFor: ["Shop discovery", "Catalog browsing", "Artwork upload", "Draft product creation"],
    envVars: ["PRINTIFY_ENABLED", "PRINTIFY_API_TOKEN"]
  }),
  guide({
    fieldKey: "printify_shop",
    providerKey: "printify",
    label: "Printify shop",
    plainEnglishDescription: "The Printify shop SaltyFactory should use when creating product drafts.",
    whyNeeded: "Printify product creation happens inside a specific shop. SaltyFactory needs the selected shop before product creation can run.",
    whereToGetIt: "After the token is validated, SaltyFactory can discover shops server-side and let you choose one.",
    providerUrl: "https://printify.com/app/stores",
    stepsToFindIt: ["Validate the Printify token.", "Click Discover shops.", "Choose the shop that should receive Salty Cowhide drafts."],
    recommendedScopes: ["shops.read"],
    securityNote: "Shop IDs are not secret, but they still stay workspace-scoped.",
    validationAction: "/api/studio/provider-connections/printify/discover-shops",
    commonProblems: ["No shops returned for the token.", "Wrong account token was used."],
    troubleshootingSteps: ["Confirm the token account has a Printify shop.", "Generate a token from the correct Printify login."],
    setupMode: "manual",
    sensitivity: "public",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Printify",
    requiredFor: ["Draft product creation", "Catalog/product routing"],
    envVars: ["PRINTIFY_SHOP_ID"]
  }),
  guide({
    fieldKey: "shopify_store_domain",
    providerKey: "shopify",
    label: "Shopify store domain",
    plainEnglishDescription: "Your Shopify admin domain, usually ending in .myshopify.com.",
    whyNeeded: "SaltyFactory needs the store domain to validate the Admin API and create draft products in the right Shopify store.",
    whereToGetIt: "Open Shopify Admin and copy the .myshopify.com domain from store settings or the browser address.",
    providerUrl: "https://admin.shopify.com/",
    stepsToFindIt: ["Open Shopify Admin.", "Open Settings.", "Find store details.", "Copy the .myshopify.com domain."],
    recommendedScopes: [],
    securityNote: "The store domain is not a secret.",
    validationAction: "/api/studio/provider-connections/shopify/validate-admin",
    commonProblems: ["Using a custom storefront domain instead of the myshopify.com admin domain.", "Including https:// or a trailing slash."],
    troubleshootingSteps: ["Use the .myshopify.com domain.", "Remove https:// and any path after the domain."],
    setupMode: "manual",
    sensitivity: "public",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Shopify",
    requiredFor: ["Shopify Admin validation", "Draft product creation", "Media upload"],
    envVars: ["SHOPIFY_STORE_DOMAIN"]
  }),
  guide({
    fieldKey: "shopify_client_id",
    providerKey: "shopify",
    label: "Shopify Client ID",
    plainEnglishDescription: "The Client ID from a Shopify Dev Dashboard app. New Shopify app setup screens commonly show Client ID and Client Secret instead of an Admin token.",
    whyNeeded: "SaltyFactory uses the Client ID with the Client Secret server-side to request a Shopify Admin access token for draft product work.",
    whereToGetIt: "Open the Shopify Dev Dashboard app for your store and copy the Client ID shown on the app credentials screen.",
    providerUrl: "https://dev.shopify.com/dashboard",
    stepsToFindIt: ["Open the Shopify Dev Dashboard.", "Choose the app connected to the Salty Cowhide store.", "Open the app credentials or API credentials screen.", "Copy the Client ID and paste it into SaltyFactory."],
    recommendedScopes: ["read_products", "write_products", "read_publications", "read_content"],
    securityNote: "The Client ID is stored as part of the encrypted Shopify credential bundle and is never used in the browser for token exchange.",
    validationAction: "/api/studio/provider-connections/shopify/exchange-client-credentials",
    commonProblems: ["Using credentials from the wrong app.", "Store domain and app do not belong together.", "The app does not have product permissions."],
    troubleshootingSteps: ["Confirm the app belongs to the same Shopify store.", "Confirm product read/write scopes.", "Validate again before creating drafts."],
    setupMode: "oauth",
    sensitivity: "sensitive",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Shopify",
    requiredFor: ["Draft creation", "Media upload", "Collection assignment"],
    envVars: ["SHOPIFY_ADMIN_ENABLED", "SHOPIFY_CLIENT_ID"]
  }),
  guide({
    fieldKey: "shopify_client_secret",
    providerKey: "shopify",
    label: "Shopify Client Secret",
    plainEnglishDescription: "The write-only Client Secret from a Shopify Dev Dashboard app.",
    whyNeeded: "Shopify requires the Client Secret for the server-side access token exchange. SaltyFactory never performs this exchange in the browser.",
    whereToGetIt: "Open the Shopify Dev Dashboard app credentials screen and copy the Client Secret once.",
    providerUrl: "https://dev.shopify.com/dashboard",
    stepsToFindIt: ["Open the Shopify Dev Dashboard.", "Choose the app connected to the store.", "Open app credentials.", "Reveal or copy the Client Secret.", "Paste it into the secure write-only field."],
    recommendedScopes: ["read_products", "write_products", "read_publications", "read_content"],
    securityNote: "The Client Secret is encrypted server-side, never displayed after save, and never returned in API responses.",
    validationAction: "/api/studio/provider-connections/shopify/exchange-client-credentials",
    commonProblems: ["The secret was copied with an extra space.", "The app has not been granted product permissions.", "The app belongs to a different store."],
    troubleshootingSteps: ["Copy the secret again.", "Confirm product read/write scopes.", "Validate again from Shopify onboarding."],
    setupMode: "oauth",
    sensitivity: "secret",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Shopify",
    requiredFor: ["Server-side token exchange", "Draft creation", "Media upload", "Collection assignment"],
    envVars: ["SHOPIFY_CLIENT_SECRET"]
  }),
  guide({
    fieldKey: "shopify_admin_token",
    providerKey: "shopify",
    label: "Legacy Shopify Admin token",
    plainEnglishDescription: "An older custom-app Admin API token path. Use this only if Shopify exposes an Admin API access token for your installed app.",
    whyNeeded: "Legacy stores can still authenticate directly with an Admin API token for draft product creation, media upload, and collection assignment.",
    whereToGetIt: "Create and install a custom app in Shopify Admin only if your Shopify setup still exposes an Admin API access token.",
    providerUrl: "https://admin.shopify.com/",
    stepsToFindIt: ["Open Shopify Admin.", "Open Settings, then Apps and sales channels.", "Choose Develop apps or create a custom app.", "Grant product and collection permissions.", "Install the app and copy the Admin API access token if Shopify shows one."],
    recommendedScopes: ["read_products", "write_products", "read_publications", "read_content"],
    securityNote: "The legacy Admin token is write-only. It is encrypted server-side when credential storage is enabled and is never returned to the browser.",
    validationAction: "/api/studio/provider-connections/shopify/validate-admin",
    commonProblems: ["The current Shopify Dev Dashboard app shows Client ID and Client Secret instead of an Admin token.", "Store domain and token do not belong to the same store.", "Token lacks product write permission."],
    troubleshootingSteps: ["Use the Client ID/Secret setup first for new Dev Dashboard apps.", "Confirm write_products permission.", "Validate again before creating drafts."],
    setupMode: "secure_token",
    sensitivity: "secret",
    showInOwnerSetup: true,
    showInAdvancedOnly: true,
    relatedFeature: "Shopify",
    requiredFor: ["Legacy draft creation", "Legacy media upload", "Legacy collection assignment"],
    envVars: ["SHOPIFY_ADMIN_ENABLED", "SHOPIFY_ADMIN_TOKEN"]
  }),
  guide({
    fieldKey: "shopify_collection",
    providerKey: "shopify",
    label: "Default Shopify collection",
    plainEnglishDescription: "The collection where approved SaltyFactory draft products should be assigned.",
    whyNeeded: "Collection assignment is part of publish readiness and prevents drafts from being created without a storefront plan.",
    whereToGetIt: "After Shopify Admin is connected, SaltyFactory can discover collections server-side.",
    providerUrl: "https://admin.shopify.com/",
    stepsToFindIt: ["Validate Shopify Admin.", "Click Discover collections.", "Choose the collection for Salty Cowhide products."],
    recommendedScopes: ["read_products", "write_products"],
    securityNote: "Collection IDs are not secret, but selection is workspace-scoped.",
    validationAction: "/api/studio/provider-connections/shopify/discover-collections",
    commonProblems: ["Collection not created yet.", "Token lacks collection/product access."],
    troubleshootingSteps: ["Create the collection in Shopify.", "Validate Shopify credentials again."],
    setupMode: "manual",
    sensitivity: "public",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Shopify",
    requiredFor: ["Collection assignment", "Publish review readiness"],
    envVars: ["SHOPIFY_DEFAULT_COLLECTION_ID"]
  }),
  guide({
    fieldKey: "huggingface_token",
    providerKey: "image_generation",
    label: "Image generation token",
    plainEnglishDescription: "A private provider token for the approved image generation provider.",
    whyNeeded: "SaltyFactory must use a real configured image provider to generate original artwork. It does not create fake placeholder art.",
    whereToGetIt: "For Hugging Face, create a fine-grained access token from your account settings with the Inference Providers permission enabled.",
    providerUrl: "https://huggingface.co/settings/tokens",
    stepsToFindIt: ["Open Hugging Face settings.", "Open Access Tokens.", "Create a fine-grained token.", "Enable Make calls to Inference Providers.", "Paste it into the secure field."],
    recommendedScopes: ["Make calls to Inference Providers"],
    securityNote: "The token is write-only and encrypted when credential storage is enabled.",
    validationAction: "/api/studio/provider-connections/image-generation/validate",
    commonProblems: ["Model key is missing.", "Token lacks Inference Providers permission.", "The model is gated or unsupported by the selected Hugging Face provider.", "Provider billing, quota, or router availability blocks the request."],
    troubleshootingSteps: ["Check token permission: Inference Providers.", `Try a recommended model such as ${primaryHuggingFaceImageModel()}.`, "Accept model terms on Hugging Face if the model is gated.", "Validate again after provider quota or billing is fixed."],
    setupMode: "secure_token",
    sensitivity: "secret",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Image Generation",
    requiredFor: ["Artwork generation", "Worker generation"],
    envVars: ["AI_IMAGE_ENABLED", "HF_API_TOKEN", "HF_IMAGE_MODEL"]
  }),
  guide({
    fieldKey: "private_storage",
    providerKey: "storage",
    label: "Private media storage",
    plainEnglishDescription: "Private storage for generated and unapproved artwork.",
    whyNeeded: "Generated assets must stay private until owner approval. This requires server-side storage credentials.",
    whereToGetIt: "This is configured by the workspace administrator or deployment owner.",
    stepsToFindIt: ["Open deployment settings.", "Configure Supabase storage service credentials.", "Create private and public asset buckets.", "Validate storage from Studio."],
    recommendedScopes: ["private asset write", "signed URL read"],
    securityNote: "Service-role credentials are server-only and never accepted in the owner-facing browser setup.",
    commonProblems: ["Service role key missing.", "Buckets missing.", "Storage policy not configured."],
    troubleshootingSteps: ["Ask the administrator to configure storage.", "Validate from Setup after deployment changes."],
    setupMode: "server_env",
    sensitivity: "high_authority",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Storage",
    requiredFor: ["Generated asset storage", "Mockup storage"],
    envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET", "SUPABASE_PUBLIC_ASSETS_BUCKET"]
  }),
  guide({
    fieldKey: "plaid_read_only",
    providerKey: "banking",
    label: "Read-only banking connection",
    plainEnglishDescription: "Optional read-only bank transaction access through Plaid or manual import.",
    whyNeeded: "Banking data can support cost classification and business intelligence without enabling money movement.",
    whereToGetIt: "Use manual CSV import now, or connect Plaid only when Plaid credentials and owner consent are configured.",
    stepsToFindIt: ["Open Business Banking.", "Choose manual import, or request Plaid setup.", "Never paste bank login credentials into help requests."],
    recommendedScopes: ["transactions.read"],
    securityNote: "No transfers, ACH, wires, checks, payments, card creation, or money movement exist in v1.",
    commonProblems: ["Plaid is not configured.", "Owner consent missing.", "CSV import fields do not match."],
    troubleshootingSteps: ["Use manual import first.", "Request Plaid setup from an administrator.", "Keep banking read-only."],
    setupMode: "manual",
    sensitivity: "sensitive",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "Banking",
    requiredFor: ["Business transaction summaries", "Manual cost classification"],
    envVars: ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV", "BANKING_LIVE_SYNC_ENABLED"]
  }),
  guide({
    fieldKey: "external_order_submission",
    providerKey: "external_orders",
    label: "External order submission",
    plainEnglishDescription: "Direct Staples or external print ordering is not available in v1.",
    whyNeeded: "Print-ready packets can be generated safely, but placing external orders would spend money and must remain future/owner-gated.",
    whereToGetIt: "Use the generated handoff packet and complete ordering manually with the print vendor.",
    stepsToFindIt: ["Generate a print-ready packet.", "Open handoff instructions.", "Upload files manually to your chosen print vendor."],
    recommendedScopes: [],
    securityNote: "No external order, payment, or checkout submission is performed by SaltyFactory v1.",
    commonProblems: ["Expecting Staples API ordering.", "Assuming packet-ready means ordered."],
    troubleshootingSteps: ["Use the handoff packet.", "Request concierge help if you want assistance placing the manual order."],
    setupMode: "future",
    sensitivity: "public",
    showInOwnerSetup: true,
    showInAdvancedOnly: false,
    relatedFeature: "External Orders",
    requiredFor: ["Manual print vendor handoff"],
    envVars: ["EXTERNAL_ORDER_SUBMISSION_ENABLED"]
  })
];

export function setupGuidesForProvider(providerKey: string) {
  return setupFieldGuides.filter((guide) => guide.providerKey === providerKey);
}

export function setupGuideByField(fieldKey: string) {
  return setupFieldGuides.find((guide) => guide.fieldKey === fieldKey) ?? null;
}

function mapFeatureStatus(status: FeatureReadinessStatus, featureKey: string): OwnerSetupStatus {
  if (featureKey === "livePublish") return "owner_gated";
  if (featureKey === "externalOrders") return "future";
  if (["storage"].includes(featureKey) && status === "config_blocked") return "admin_setup_required";
  if (status === "ready") return "ready";
  if (status === "owner_gated") return "owner_gated";
  if (status === "future") return "future";
  if (status === "disabled") return "disabled_for_safety";
  if (status === "partial") return "needs_setup";
  if (status === "error") return "invalid";
  return "needs_setup";
}

function featureByKey(report: FeatureReadinessReport, key: string) {
  return report.features.find((feature) => feature.featureKey === key);
}

function defaultFeature(key: string, label: string): FeatureReadiness {
  return {
    featureKey: key,
    label,
    status: "config_blocked",
    requiredEnv: [],
    missingEnv: [],
    enabledFlags: [],
    disabledFlags: [],
    setupRequired: [],
    canTestWithoutProvider: false,
    dangerousActionsBlocked: [],
    notes: []
  };
}

function createCard(input: {
  feature: FeatureReadiness;
  providerKey: string;
  label: string;
  explanation: string;
  whyItMatters: string;
  primaryLabel: string;
  primaryHref: string;
  validateHref?: string | undefined;
  advancedSummary: string;
  deploymentNotes: string[];
  status?: OwnerSetupStatus | undefined;
  safeLocalRoute?: string | undefined;
}): OwnerSetupCard {
  return {
    providerKey: input.providerKey,
    label: input.label,
    status: input.status ?? mapFeatureStatus(input.feature.status, input.feature.featureKey),
    explanation: input.explanation,
    whyItMatters: input.whyItMatters,
    primaryAction: { label: input.primaryLabel, href: input.primaryHref, kind: "primary" },
    setupGuideAction: { label: "Where do I get this?", href: `${input.primaryHref}#field-guides`, kind: "guide" },
    validationAction: input.validateHref ? { label: "Validate connection", href: input.validateHref, kind: "validate" } : undefined,
    requestHelpAction: { label: "Request setup help", href: `/studio/onboarding/help?provider=${input.providerKey}`, kind: "help" },
    advancedDetails: {
      summary: input.advancedSummary,
      envVars: input.feature.requiredEnv,
      deploymentNotes: input.deploymentNotes
    },
    setupRequired: input.feature.setupRequired,
    dangerousActionsBlocked: input.feature.dangerousActionsBlocked,
    safeErrorMessage: input.feature.setupRequired[0],
    safeLocalRoute: input.safeLocalRoute ?? input.feature.safeLocalRoute
  };
}

export function buildOwnerSetupCards(report: FeatureReadinessReport): OwnerSetupCard[] {
  const image = featureByKey(report, "imageGeneration") ?? defaultFeature("imageGeneration", "Image Generation");
  const printify = featureByKey(report, "printify") ?? defaultFeature("printify", "Printify");
  const shopify = featureByKey(report, "shopify") ?? defaultFeature("shopify", "Shopify");
  const storage = featureByKey(report, "storage") ?? defaultFeature("storage", "Storage");
  const banking = featureByKey(report, "bankingPlaidNovo") ?? defaultFeature("bankingPlaidNovo", "Banking");
  const livePublish = featureByKey(report, "livePublish") ?? defaultFeature("livePublish", "Live Publish");
  const externalOrders = featureByKey(report, "externalOrders") ?? defaultFeature("externalOrders", "External Orders");

  return [
    createCard({
      feature: image,
      providerKey: "image_generation",
      label: "Image generation",
      explanation: image.status === "ready" ? "Image generation is connected." : "Image generation is not connected yet.",
      whyItMatters: "Generated artwork is the core SaltyFactory path. No placeholder images are treated as real provider output.",
      primaryLabel: "Configure image generation",
      primaryHref: "/studio/onboarding/providers/image-generation",
      validateHref: "/api/studio/provider-connections/image-generation/validate",
      advancedSummary: "Hugging Face Inference Providers or local development image mode can also be configured during deployment.",
      deploymentNotes: [
        "Use local demo image mode only in development or test.",
        "Production image generation requires a Hugging Face token with Inference Providers permission.",
        `Recommended HF Inference text-to-image models: ${publicHuggingFaceImageModelRecommendations().map((item) => item.model).join(", ")}.`
      ]
    }),
    createCard({
      feature: printify,
      providerKey: "printify",
      label: "Printify",
      explanation: printify.status === "ready" ? "Printify is connected." : "Printify is not connected yet.",
      whyItMatters: "Printify lets SaltyFactory browse catalog products, upload approved artwork, and create draft products.",
      primaryLabel: "Connect Printify",
      primaryHref: "/studio/onboarding/providers/printify",
      validateHref: "/api/studio/provider-connections/printify/validate-token",
      advancedSummary: "Server deployment can still use protected Printify env config, but owner setup should use the guided token flow when encrypted credential storage is enabled.",
      deploymentNotes: ["Live Printify publishing remains owner-gated.", "No fake Printify product IDs are created."]
    }),
    createCard({
      feature: shopify,
      providerKey: "shopify",
      label: "Shopify Admin",
      explanation: shopify.status === "ready" ? "Shopify Admin is connected." : "Shopify Admin is not connected yet.",
      whyItMatters: "Shopify Admin creates draft products with real media, variants, SEO, pricing, and collection assignment.",
      primaryLabel: "Connect Shopify",
      primaryHref: "/studio/onboarding/providers/shopify",
      validateHref: "/api/studio/provider-connections/shopify/exchange-client-credentials",
      advancedSummary: "Owner setup uses Shopify Dev Dashboard Client ID/Secret. Legacy protected Admin token config remains available only for stores that still expose it.",
      deploymentNotes: ["Draft creation does not publish.", "Live storefront publish requires separate owner confirmation and live publish flags.", "Token exchange is server-side only."]
    }),
    createCard({
      feature: storage,
      providerKey: "storage",
      label: "Private media storage",
      explanation: storage.status === "ready" ? "Private media storage is ready." : "Private media storage is not configured.",
      whyItMatters: "Generated and unapproved artwork must stay private until owner approval.",
      primaryLabel: "Request administrator setup",
      primaryHref: "/studio/onboarding/help?provider=storage",
      validateHref: undefined,
      advancedSummary: "Storage service credentials are server-only and cannot be safely entered by an owner in the browser.",
      deploymentNotes: ["Administrator must configure Supabase storage.", "Service-role keys are never exposed to the client."],
      status: storage.status === "ready" ? "ready" : "admin_setup_required"
    }),
    createCard({
      feature: banking,
      providerKey: "banking",
      label: "Banking / Novo / Plaid",
      explanation: "Banking is read-only in v1. Use manual import now, or connect Plaid only when configured and owner consent is present.",
      whyItMatters: "Banking can support cost classification and financial readiness, but SaltyFactory never moves money.",
      primaryLabel: "Open manual import",
      primaryHref: "/studio/business/banking",
      validateHref: undefined,
      advancedSummary: "Plaid credentials are deployment configuration. Novo direct API is future unless verified official credentials exist.",
      deploymentNotes: ["Money movement is blocked.", "Never store bank login credentials."],
      status: "needs_setup"
    }),
    createCard({
      feature: livePublish,
      providerKey: "live_publish",
      label: "Live storefront publishing",
      explanation: "Live storefront publishing is disabled for safety.",
      whyItMatters: "Products should be created as Shopify drafts first. Publishing requires owner confirmation and passed gates.",
      primaryLabel: "View publish gates",
      primaryHref: "/studio/publish-review",
      validateHref: undefined,
      advancedSummary: "Live publish flags are deployment-level safety switches and should stay off locally.",
      deploymentNotes: ["Owner must explicitly confirm live publish.", "AI approvals never publish products."],
      status: "owner_gated"
    }),
    createCard({
      feature: externalOrders,
      providerKey: "external_orders",
      label: "External orders / Staples",
      explanation: "Direct ordering is not available yet. SaltyFactory can generate print-ready packets and handoff instructions.",
      whyItMatters: "External ordering would spend money, so v1 keeps it as a manual owner handoff.",
      primaryLabel: "Generate print-ready packet",
      primaryHref: "/studio/business/print-studio",
      validateHref: undefined,
      advancedSummary: "External order submission is future and disabled by safety flags.",
      deploymentNotes: ["No payment or checkout submission exists.", "Use manual print vendor handoff."],
      status: "future"
    })
  ];
}

export function assertNoDeadConfigStates(cards: OwnerSetupCard[]) {
  for (const card of cards) {
    if (!card.primaryAction?.href || !card.setupGuideAction?.href || !card.requestHelpAction?.href) {
      throw new Error(`dead_config_state:${card.providerKey}`);
    }
  }
  return true;
}
