import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { parseEnv } from "@saltyfactory/config";
import { encryptCredential } from "@saltyfactory/security";
import { encodeShopifyCredentialPayload } from "../apps/studio/app/api/studio/_shopify-admin";
import { getWorkspaceProviderReadiness } from "../apps/studio/app/studio/_provider-readiness";
import IntegrationsPage from "../apps/studio/app/studio/integrations/page";
import PodLaunchStudioPage from "../apps/studio/app/studio/pod-launch-studio/page";
import ShopifyProductsPage from "../apps/studio/app/studio/shopify-products/page";
import StudioSetupPage from "../apps/studio/app/studio/setup/page";

const originalEnv = { ...process.env };
const workspaceId = "wks_default";
const actorId = "provider_unification_owner";
const encryptionKey = "0123456789abcdef0123456789abcdef";

function envForCredentialStore() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("REPOSITORY_ADAPTER", "memory");
  vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
  vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
  vi.stubEnv("PRINTIFY_ENABLED", "false");
  vi.stubEnv("PRINTIFY_API_TOKEN", "");
  vi.stubEnv("PRINTIFY_SHOP_ID", "");
  vi.stubEnv("SHOPIFY_ADMIN_ENABLED", "false");
  vi.stubEnv("SHOPIFY_STORE_DOMAIN", "");
  vi.stubEnv("SHOPIFY_CLIENT_ID", "");
  vi.stubEnv("SHOPIFY_CLIENT_SECRET", "");
  vi.stubEnv("SHOPIFY_ADMIN_TOKEN", "");
  vi.stubEnv("SHOPIFY_DEFAULT_COLLECTION_ID", "");
  vi.stubEnv("AI_IMAGE_ENABLED", "false");
  vi.stubEnv("HF_API_TOKEN", "");
  vi.stubEnv("HF_IMAGE_MODEL", "");
  vi.stubEnv("IMAGE_GENERATION_ENABLED", "false");
}

async function saveCredential(repos: RepositoryBundle, provider: string, secret: string) {
  const credentialRef = `cred_${provider}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await repos.integration.saveEncryptedCredential({
    id: `ecred_${credentialRef}`,
    workspace_id: workspaceId,
    provider_key: provider,
    credential_ref: credentialRef,
    encrypted_payload: encryptCredential({
      secret,
      key: encryptionKey,
      provider,
      workspaceId,
      createdBy: actorId
    }),
    status: "active",
    created_by: actorId,
    updated_by: actorId
  });
  return credentialRef;
}

async function upsertConnection(repos: RepositoryBundle, provider: string, row: Record<string, unknown>) {
  const existing = await repos.integration.getProviderConnectionForWorkspace(workspaceId, provider);
  const next = {
    id: existing?.id ? String(existing.id) : `conn_${provider}_${Date.now()}`,
    workspace_id: workspaceId,
    provider_key: provider,
    provider_type: provider,
    provider_name: provider,
    enabled: true,
    status: "connected",
    created_by: actorId,
    updated_by: actorId,
    ...row
  };
  if (existing) return repos.integration.updateProviderConnectionStatus(workspaceId, provider, next);
  return repos.integration.createProviderConnection(next);
}

async function seedPrintify(repos: RepositoryBundle, token: string) {
  const credentialRef = await saveCredential(repos, "printify", token);
  await upsertConnection(repos, "printify", {
    provider_name: "Printify",
    secret_ref: credentialRef,
    configuration: {
      selectedShopId: "shop_unified_123",
      selectedShopName: "Unified Printify Shop",
      maskedDisplayValue: "Saved securely"
    }
  });
}

async function seedImageGeneration(repos: RepositoryBundle, token: string) {
  const credentialRef = await saveCredential(repos, "image_generation", token);
  await upsertConnection(repos, "image_generation", {
    provider_name: "Image Generation",
    secret_ref: credentialRef,
    configuration: {
      imageProvider: "hugging_face",
      hfProvider: "hf-inference",
      imageModel: "black-forest-labs/FLUX.1-schnell",
      maskedDisplayValue: "Saved securely"
    }
  });
}

async function seedShopify(repos: RepositoryBundle, secret: string) {
  const credentialRef = await saveCredential(repos, "shopify", encodeShopifyCredentialPayload({
    v: 1,
    credentialMode: "dev_dashboard_client_credentials",
    clientId: "shopify-client-id",
    clientSecret: secret
  }));
  await upsertConnection(repos, "shopify", {
    provider_name: "Shopify Admin",
    secret_ref: credentialRef,
    configuration: {
      storeDomain: "saltycowhide.myshopify.com",
      credentialMode: "dev_dashboard_client_credentials",
      selectedCollectionId: "gid://shopify/Collection/123456789",
      maskedDisplayValue: "Saved securely"
    }
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("unified provider readiness", () => {
  it("marks connected credential-store providers ready without env fallback variables", async () => {
    envForCredentialStore();
    const repos = createRepositories();
    await seedPrintify(repos, "printify_unified_secret_ready");
    await seedShopify(repos, "shopify_unified_secret_ready");
    await seedImageGeneration(repos, "hf_unified_secret_ready");

    const readiness = await getWorkspaceProviderReadiness(workspaceId, { repos, config: parseEnv() });

    expect(readiness.providers.printify).toMatchObject({ status: "connected", credentialSource: "credential_store" });
    expect(readiness.providers.shopify).toMatchObject({ status: "connected", credentialSource: "credential_store" });
    expect(readiness.providers.image_generation).toMatchObject({ status: "connected", credentialSource: "credential_store" });
    expect(JSON.stringify(readiness)).not.toMatch(/printify_unified_secret_ready|shopify_unified_secret_ready|hf_unified_secret_ready/);
    expect(readiness.providers.printify.businessFacingSetupRequired).toEqual([]);
    expect(readiness.providers.shopify.businessFacingSetupRequired).toEqual([]);
    expect(readiness.providers.image_generation.businessFacingSetupRequired).toEqual([]);
  });

  it("/studio/integrations uses unified readiness and does not show provider env blockers when connected", async () => {
    envForCredentialStore();
    const repos = createRepositories();
    await seedPrintify(repos, "printify_integrations_secret");
    await seedShopify(repos, "shopify_integrations_secret");
    await seedImageGeneration(repos, "hf_integrations_secret");

    const html = renderToStaticMarkup(await IntegrationsPage());

    expect(html).toContain("Provider runtime readiness");
    expect(html).toContain("Printify connected through Launch Setup Concierge.");
    expect(html).toContain("Shopify Admin connected through Launch Setup Concierge.");
    expect(html).toContain("Image generation connected through Launch Setup Concierge.");
    expect(html).toContain("Generated Asset Storage");
    expect(html).not.toMatch(/PRINTIFY_ENABLED|PRINTIFY_API_TOKEN|PRINTIFY_SHOP_ID|SHOPIFY_ADMIN_ENABLED|SHOPIFY_ADMIN_TOKEN|SHOPIFY_CLIENT_SECRET|SHOPIFY_STORE_DOMAIN|AI_IMAGE_ENABLED|HF_API_TOKEN|HF_IMAGE_MODEL|SUPABASE_SERVICE_ROLE_KEY/);
    expect(html).not.toMatch(/printify_integrations_secret|shopify_integrations_secret|hf_integrations_secret/);
  });

  it("workflow pages render guided Shopify/image readiness instead of old disabled states", async () => {
    envForCredentialStore();
    const repos = createRepositories();
    await seedPrintify(repos, "printify_workflow_secret");
    await seedShopify(repos, "shopify_workflow_secret");
    await seedImageGeneration(repos, "hf_workflow_secret");

    const podHtml = renderToStaticMarkup(await PodLaunchStudioPage());
    const shopifyHtml = renderToStaticMarkup(await ShopifyProductsPage());
    const setupHtml = renderToStaticMarkup(await StudioSetupPage());

    expect(podHtml).toContain("Image Engine");
    expect(podHtml).toContain("Approved prompts can queue generated artwork jobs through secure workspace credential.");
    expect(podHtml).toContain("Shopify Drafts");
    expect(podHtml).toContain("Draft products can be created with approved media, pricing, SEO, and variants.");
    expect(shopifyHtml).toContain("Shopify Admin");
    expect(shopifyHtml).toContain("Credential source: secure workspace credential.");
    expect(setupHtml).toContain("Shopify Admin is connected.");
    expect(setupHtml).not.toContain("Shopify Admin is not connected yet.");
    expect(`${podHtml}\n${shopifyHtml}`).not.toMatch(/SHOPIFY_ADMIN_ENABLED|SHOPIFY_ADMIN_TOKEN|SHOPIFY_CLIENT_SECRET|AI_IMAGE_ENABLED|HF_API_TOKEN|PRINTIFY_API_TOKEN/);
    expect(`${podHtml}\n${shopifyHtml}`).not.toMatch(/printify_workflow_secret|shopify_workflow_secret|hf_workflow_secret/);
  });

  it("storage readiness is shown separately from image provider readiness", async () => {
    envForCredentialStore();
    const repos = createRepositories();
    await seedImageGeneration(repos, "hf_storage_separate_secret");

    const html = renderToStaticMarkup(await IntegrationsPage());

    expect(html).toContain("Image generation connected through Launch Setup Concierge.");
    expect(html).toContain("Generated asset storage needs administrator setup before real provider bytes can be persisted.");
    expect(html).toContain("Set up generated asset storage");
    expect(html).not.toContain("hf_storage_separate_secret");
  });
});
