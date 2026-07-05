import { normalizeShopifyCollectionType, ShopifyAdminProviderDisabled, ShopifyAdminProviderLive, type ShopifyAdminAuthConfig, type ShopifyCollectionType, type ShopifyCredentialMode } from "@saltyfactory/commerce";
import type { RuntimeConfig } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { decryptCredential, sanitizeProviderError } from "@saltyfactory/security";

export type ShopifyStoredCredentialPayload = {
  v: 1;
  credentialMode: ShopifyCredentialMode;
  adminToken?: string;
  clientId?: string;
  clientSecret?: string;
};

export type ShopifyAdminProviderResolution =
  | {
    ok: true;
    admin: ShopifyAdminProviderLive;
    storeDomain: string;
    credentialMode: ShopifyCredentialMode;
    selectedCollectionId: string;
    selectedCollectionType: ShopifyCollectionType;
    selectedCollectionAssignmentMode: "manual_collect" | "rule_managed" | "unknown";
    connection: WorkspaceRow | null;
    source: "stored_connection" | "server_env";
  }
  | {
    ok: false;
    status: "not_configured" | "config_blocked";
    setupRequired: string[];
    message: string;
  };

export function sanitizeShopifyStoreDomain(value: string) {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

export function isShopifyStoreDomain(value: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value);
}

export function isShopifyClientId(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{3,127}$/.test(value.trim());
}

export function isSafeShopifyCollectionId(value: string) {
  return /^[A-Za-z0-9:/_-]{1,160}$/.test(value.trim());
}

export function storageReadyForCredentials(config: RuntimeConfig) {
  return Boolean(config.CREDENTIAL_STORAGE_ENABLED && config.CREDENTIAL_ENCRYPTION_KEY && config.CREDENTIAL_ENCRYPTION_KEY.trim().length >= 32);
}

export function encodeShopifyCredentialPayload(payload: ShopifyStoredCredentialPayload) {
  return JSON.stringify(payload);
}

export function decodeShopifyCredentialPayload(raw: string): ShopifyStoredCredentialPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<ShopifyStoredCredentialPayload>;
    if (parsed?.credentialMode === "dev_dashboard_client_credentials" && parsed.clientId && parsed.clientSecret) {
      return {
        v: 1,
        credentialMode: "dev_dashboard_client_credentials",
        clientId: String(parsed.clientId),
        clientSecret: String(parsed.clientSecret)
      };
    }
    if (parsed?.credentialMode === "legacy_admin_token" && parsed.adminToken) {
      return {
        v: 1,
        credentialMode: "legacy_admin_token",
        adminToken: String(parsed.adminToken)
      };
    }
  } catch {
    // Existing Shopify credentials were stored as the raw legacy token before credential modes existed.
  }
  return { v: 1, credentialMode: "legacy_admin_token", adminToken: raw };
}

function authFromPayload(payload: ShopifyStoredCredentialPayload): ShopifyAdminAuthConfig {
  if (payload.credentialMode === "dev_dashboard_client_credentials") {
    return {
      credentialMode: "dev_dashboard_client_credentials",
      clientId: String(payload.clientId ?? ""),
      clientSecret: String(payload.clientSecret ?? "")
    };
  }
  return {
    credentialMode: "legacy_admin_token",
    adminToken: String(payload.adminToken ?? "")
  };
}

function envAuth(config: RuntimeConfig): { auth: ShopifyAdminAuthConfig; credentialMode: ShopifyCredentialMode } | null {
  if (!config.SHOPIFY_ADMIN_ENABLED || !config.SHOPIFY_STORE_DOMAIN) return null;
  if (config.SHOPIFY_CLIENT_ID && config.SHOPIFY_CLIENT_SECRET) {
    return {
      credentialMode: "dev_dashboard_client_credentials",
      auth: {
        credentialMode: "dev_dashboard_client_credentials",
        clientId: config.SHOPIFY_CLIENT_ID,
        clientSecret: config.SHOPIFY_CLIENT_SECRET
      }
    };
  }
  if (config.SHOPIFY_ADMIN_TOKEN) {
    return {
      credentialMode: "legacy_admin_token",
      auth: {
        credentialMode: "legacy_admin_token",
        adminToken: config.SHOPIFY_ADMIN_TOKEN
      }
    };
  }
  return null;
}

async function readStoredShopifyCredential(input: {
  repos: RepositoryBundle;
  config: RuntimeConfig;
  workspaceId: string;
  connection: WorkspaceRow;
}) {
  const credentialRef = String(input.connection.secret_ref ?? input.connection.secretRef ?? "");
  if (!credentialRef) return null;
  if (!storageReadyForCredentials(input.config)) throw new Error("credential_storage_unavailable");
  const credential = await input.repos.integration.getCredentialForServerUseOnly(input.workspaceId, credentialRef);
  if (!credential || credential.status === "revoked") return null;
  return decodeShopifyCredentialPayload(decryptCredential(credential.encrypted_payload as any, input.config.CREDENTIAL_ENCRYPTION_KEY));
}

function setupRequired() {
  return [
    "Connect Shopify in Studio onboarding with Client ID and Client Secret",
    "Or configure protected legacy Shopify Admin token server-side",
    "Select a default Shopify collection before draft creation"
  ];
}

export async function createShopifyAdminProviderForWorkspace(input: {
  repos: RepositoryBundle;
  config: RuntimeConfig;
  workspaceId: string;
  fetcher?: typeof fetch;
  requireEnabled?: boolean;
}): Promise<ShopifyAdminProviderResolution> {
  const connection = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "shopify");
  const configuration = (connection?.configuration ?? {}) as Record<string, unknown>;
  const storeDomain = sanitizeShopifyStoreDomain(String(configuration.storeDomain ?? input.config.SHOPIFY_STORE_DOMAIN ?? ""));
  const selectedCollectionId = String(configuration.selectedCollectionId ?? configuration.collectionId ?? input.config.SHOPIFY_DEFAULT_COLLECTION_ID ?? "");
  const selectedCollectionType = normalizeShopifyCollectionType(configuration.selectedCollectionType ?? configuration.collectionType ?? configuration.collection_type);
  const selectedCollectionAssignmentMode =
    String(configuration.selectedCollectionAssignmentMode ?? configuration.collectionAssignmentMode ?? "") === "rule_managed"
      ? "rule_managed"
      : selectedCollectionType === "smart"
        ? "rule_managed"
        : selectedCollectionType === "custom"
          ? "manual_collect"
          : "unknown";
  const connectionEnabled = Boolean(connection?.enabled) || connection?.status === "connected";

  if (connection?.secret_ref || connection?.secretRef) {
    if (input.requireEnabled !== false && !connectionEnabled) {
      return {
        ok: false,
        status: "not_configured",
        setupRequired: ["Select a default Shopify collection to enable this connection."],
        message: "Shopify credentials are saved, but the connection is not enabled yet."
      };
    }
    if (!storeDomain || !isShopifyStoreDomain(storeDomain)) {
      return {
        ok: false,
        status: "not_configured",
        setupRequired: ["Valid .myshopify.com store domain"],
        message: "Shopify store domain is missing or invalid."
      };
    }
    try {
      const stored = await readStoredShopifyCredential({ repos: input.repos, config: input.config, workspaceId: input.workspaceId, connection });
      if (stored) {
        return {
          ok: true,
          admin: new ShopifyAdminProviderLive(storeDomain, authFromPayload(stored), input.config.LIVE_PUBLISHING_ENABLED, input.fetcher),
          storeDomain,
          credentialMode: stored.credentialMode,
          selectedCollectionId,
          selectedCollectionType,
          selectedCollectionAssignmentMode,
          connection,
          source: "stored_connection"
        };
      }
    } catch (error) {
      return {
        ok: false,
        status: "config_blocked",
        setupRequired: ["Enable encrypted credential storage", "Configure the server encryption key"],
        message: sanitizeProviderError(error)
      };
    }
  }

  const fallback = envAuth(input.config);
  if (fallback && isShopifyStoreDomain(sanitizeShopifyStoreDomain(input.config.SHOPIFY_STORE_DOMAIN))) {
    const envDomain = sanitizeShopifyStoreDomain(input.config.SHOPIFY_STORE_DOMAIN);
    return {
      ok: true,
      admin: new ShopifyAdminProviderLive(envDomain, fallback.auth, input.config.LIVE_PUBLISHING_ENABLED, input.fetcher),
      storeDomain: envDomain,
      credentialMode: fallback.credentialMode,
      selectedCollectionId,
      selectedCollectionType,
      selectedCollectionAssignmentMode,
      connection,
      source: "server_env"
    };
  }

  return {
    ok: false,
    status: "not_configured",
    setupRequired: setupRequired(),
    message: "Shopify Admin is not connected yet."
  };
}

export function disabledShopifyAdminProvider() {
  return new ShopifyAdminProviderDisabled();
}
