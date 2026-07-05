import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { assertNoDeadConfigStates, buildFeatureReadiness, buildOwnerSetupCards, parseEnv, setupFieldGuides, setupGuidesForProvider } from "@saltyfactory/config";
import OnboardingPage from "../apps/studio/app/studio/onboarding/page";
import QuickStartPage from "../apps/studio/app/studio/onboarding/quick-start/page";
import GuidedSetupPage from "../apps/studio/app/studio/onboarding/guided/page";
import ProvidersPage from "../apps/studio/app/studio/onboarding/providers/page";
import PrintifySetupPage from "../apps/studio/app/studio/onboarding/providers/printify/page";
import ShopifySetupPage from "../apps/studio/app/studio/onboarding/providers/shopify/page";
import ImageGenerationSetupPage from "../apps/studio/app/studio/onboarding/providers/image-generation/page";
import BusinessProfileOnboardingPage from "../apps/studio/app/studio/onboarding/business-profile/page";
import FirstLaunchOnboardingPage from "../apps/studio/app/studio/onboarding/first-launch/page";
import SetupHelpPage from "../apps/studio/app/studio/onboarding/help/page";
import StudioSetupPage from "../apps/studio/app/studio/setup/page";
import { GET as providerConnectionsGet } from "../apps/studio/app/api/studio/provider-connections/route";
import { POST as printifyValidatePost } from "../apps/studio/app/api/studio/provider-connections/printify/validate-token/route";
import { POST as shopifyValidatePost } from "../apps/studio/app/api/studio/provider-connections/shopify/validate-admin/route";
import { POST as shopifyClientCredentialsPost } from "../apps/studio/app/api/studio/provider-connections/shopify/exchange-client-credentials/route";
import { POST as shopifySelectCollectionPost } from "../apps/studio/app/api/studio/provider-connections/shopify/select-collection/route";
import { POST as imageValidatePost } from "../apps/studio/app/api/studio/provider-connections/image-generation/validate/route";
import { POST as helpPost } from "../apps/studio/app/api/studio/onboarding/request-help/route";

const originalEnv = { ...process.env };

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "setup_owner", email: "owner@saltycowhide.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId,
    supabaseUserId: user.id
  }));
}

function authedRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cookie", `${SUPABASE_ACCESS_COOKIE}=valid`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request(`http://localhost:3001${path}`, { ...init, headers });
}

function jsonPost(path: string, body: Record<string, unknown>) {
  return authedRequest(path, { method: "POST", body: JSON.stringify(body) });
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("guided setup concierge UI", () => {
  it("has setup guides for every provider field needed by current blockers", () => {
    expect(setupGuidesForProvider("printify").map((guide) => guide.fieldKey)).toEqual(expect.arrayContaining(["printify_api_token", "printify_shop"]));
    expect(setupGuidesForProvider("shopify").map((guide) => guide.fieldKey)).toEqual(expect.arrayContaining(["shopify_store_domain", "shopify_client_id", "shopify_client_secret", "shopify_admin_token", "shopify_collection"]));
    expect(setupGuidesForProvider("shopify").find((guide) => guide.fieldKey === "shopify_admin_token")?.showInAdvancedOnly).toBe(true);
    expect(setupGuidesForProvider("image_generation").map((guide) => guide.fieldKey)).toContain("huggingface_token");
    expect(setupGuidesForProvider("image_generation").find((guide) => guide.fieldKey === "huggingface_token")?.recommendedScopes).toContain("Make calls to Inference Providers");
    expect(setupFieldGuides.every((guide) => guide.stepsToFindIt.length > 0 && guide.securityNote.length > 0)).toBe(true);
  });

  it("renders onboarding routes with owner-facing setup actions and helper copy", async () => {
    const pages = [
      renderToStaticMarkup(await OnboardingPage()),
      renderToStaticMarkup(await QuickStartPage()),
      renderToStaticMarkup(await GuidedSetupPage()),
      renderToStaticMarkup(await ProvidersPage()),
      renderToStaticMarkup(await PrintifySetupPage()),
      renderToStaticMarkup(await ShopifySetupPage()),
      renderToStaticMarkup(await ImageGenerationSetupPage()),
      renderToStaticMarkup(await BusinessProfileOnboardingPage()),
      renderToStaticMarkup(await FirstLaunchOnboardingPage()),
      renderToStaticMarkup(await SetupHelpPage()),
      renderToStaticMarkup(await StudioSetupPage())
    ];
    const html = pages.join("\n");

    expect(html).toContain("Launch Setup Concierge");
    expect(html).toContain("Guided Setup");
    expect(html).toContain("Quick Setup");
    expect(html).toContain("Connect Printify");
    expect(html).toContain("Connect Shopify");
    expect(html).toContain("Shopify Client ID");
    expect(html).toContain("Shopify Client Secret");
    expect(html).toContain("Advanced / Legacy Admin token");
    expect(html).toContain("Configure image generation");
    expect(html).toContain("Use local demo mode");
    expect(html).toContain("Hugging Face provider");
    expect(html).toContain("Check token permission");
    expect(html).toContain("Try a recommended model");
    expect(html).toContain("black-forest-labs/FLUX.1-schnell");
    expect(html).toContain("Where do I get this?");
    expect(html).toContain("Save securely and validate");
    expect(html).toContain("Request setup help");
    expect(html).toContain("do not paste API tokens");
    expect(html).not.toMatch(/PRINTIFY_API_TOKEN=[A-Za-z0-9]|SHOPIFY_ADMIN_TOKEN=[A-Za-z0-9]|HF_API_TOKEN=[A-Za-z0-9]|PLAID_SECRET=[A-Za-z0-9]/);
  });

  it("does not create dead config states for setup blockers", () => {
    const report = buildFeatureReadiness(parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      REPOSITORY_ADAPTER: "memory",
      LIVE_PUBLISHING_ENABLED: "false",
      BANKING_MONEY_MOVEMENT_ENABLED: "false",
      EXTERNAL_ORDER_SUBMISSION_ENABLED: "false"
    }));
    const cards = buildOwnerSetupCards(report);
    expect(assertNoDeadConfigStates(cards)).toBe(true);
    for (const card of cards) {
      expect(card.primaryAction.href).toMatch(/^\/studio\//);
      expect(card.setupGuideAction.label).toBe("Where do I get this?");
      expect(card.requestHelpAction.href).toContain("/studio/onboarding/help");
    }
  });

  it("keeps safety-gated actions explicit", () => {
    const cards = buildOwnerSetupCards(buildFeatureReadiness(parseEnv({ NODE_ENV: "development", APP_ENV: "development" })));
    expect(cards.find((card) => card.providerKey === "live_publish")?.status).toBe("owner_gated");
    expect(cards.find((card) => card.providerKey === "banking")?.dangerousActionsBlocked).toEqual(expect.arrayContaining(["transfers", "payments", "ach", "wires"]));
    expect(cards.find((card) => card.providerKey === "external_orders")?.status).toBe("future");
  });
});

describe("guided setup concierge APIs", () => {
  it("requires auth for provider readiness and validation routes", async () => {
    const listResponse = await providerConnectionsGet(new Request("http://localhost:3001/api/studio/provider-connections"));
    const validateResponse = await printifyValidatePost(new Request("http://localhost:3001/api/studio/provider-connections/printify/validate-token", {
      method: "POST",
      body: JSON.stringify({ token: "ptf_should_not_matter" }),
      headers: { "content-type": "application/json" }
    }));
    const shopifyExchangeResponse = await shopifyClientCredentialsPost(new Request("http://localhost:3001/api/studio/provider-connections/shopify/exchange-client-credentials", {
      method: "POST",
      body: JSON.stringify({ storeDomain: "saltycowhide.myshopify.com", clientId: "client_1234", clientSecret: "secret_should_not_matter" }),
      headers: { "content-type": "application/json" }
    }));
    const imageResponse = await imageValidatePost(new Request("http://localhost:3001/api/studio/provider-connections/image-generation/validate", {
      method: "POST",
      body: JSON.stringify({ provider: "hugging_face", model: "black-forest-labs/FLUX.1-schnell", token: "hf_should_not_matter" }),
      headers: { "content-type": "application/json" }
    }));
    expect(listResponse.status).toBe(401);
    expect(validateResponse.status).toBe(401);
    expect(shopifyExchangeResponse.status).toBe(401);
    expect(imageResponse.status).toBe(401);
  });

  it("blocks plaintext secret storage when encrypted credential storage is unavailable", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "false";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "";

    const response = await printifyValidatePost(jsonPost("/api/studio/provider-connections/printify/validate-token", { token: "ptf_test_secret_12345" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("config_blocked");
    expect(body.safeMessage).toContain("Secure credential storage is not configured");
    expect(JSON.stringify(body)).not.toContain("ptf_test_secret_12345");
  });

  it("validates Printify token server-side and returns only masked status", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify([{ id: "shop_123", title: "Salty Cowhide" }]), { status: 200 });
    });

    const token = "ptf_valid_secret_12345";
    const response = await printifyValidatePost(jsonPost("/api/studio/provider-connections/printify/validate-token", { token }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe("https://api.printify.com/v1/shops.json");
    expect(String((calls[0]?.init.headers as Record<string, string>).authorization)).toContain("Bearer");
    expect(body.ok).toBe(true);
    expect(body.maskedDisplayValue).toBe("Saved securely");
    expect(body.providerMetadata.shops[0]).toMatchObject({ id: "shop_123", title: "Salty Cowhide" });
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("validates Shopify Dev Dashboard credentials server-side and never returns the Client Secret or generated token", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/admin/oauth/access_token")) {
        return new Response(JSON.stringify({ access_token: "generated_admin_token", expires_in: 3600 }), { status: 200 });
      }
      if (String(url).includes("custom_collections.json")) {
        return new Response(JSON.stringify({ custom_collections: [{ id: 456, title: "Beach Rodeo" }] }), { status: 200 });
      }
      if (String(url).includes("smart_collections.json")) {
        return new Response(JSON.stringify({ smart_collections: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ shop: { name: "Salty Cowhide" } }), { status: 200 });
    });

    const clientSecret = "shpss_test_secret_12345";
    const response = await shopifyClientCredentialsPost(jsonPost("/api/studio/provider-connections/shopify/exchange-client-credentials", {
      storeDomain: "saltycowhide.myshopify.com",
      clientId: "client_1234",
      clientSecret
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe("https://saltycowhide.myshopify.com/admin/oauth/access_token");
    expect(String(calls[0]?.init.body)).toContain("grant_type=client_credentials");
    expect(calls[1]?.url).toBe("https://saltycowhide.myshopify.com/admin/api/2024-10/shop.json");
    expect(body.status).toBe("connected");
    expect(body.providerMetadata.storeDomain).toBe("saltycowhide.myshopify.com");
    expect(body.providerMetadata.collections[0]).toMatchObject({ id: "456", title: "Beach Rodeo" });
    expect(JSON.stringify(body)).not.toContain(clientSecret);
    expect(JSON.stringify(body)).not.toContain("generated_admin_token");
  });

  it("rejects smart Shopify collections for manual draft assignment", async () => {
    authorizeAsOwner();

    const response = await shopifySelectCollectionPost(jsonPost("/api/studio/provider-connections/shopify/select-collection", {
      collectionId: "gid://shopify/Collection/789",
      collectionType: "smart"
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.status).toBe("blocked");
    expect(body.safeMessage).toContain("Smart Shopify collections are rule-managed");
    expect(body.setupRequired).toContain("Select a custom Shopify collection");
    expect(JSON.stringify(body)).not.toMatch(/shpat_|client_secret|access_token/i);
  });

  it("returns a safe error for invalid Shopify Dev Dashboard credentials", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "invalid_client", client_secret: "shpss_bad_secret_12345" }), { status: 401 }));

    const response = await shopifyClientCredentialsPost(jsonPost("/api/studio/provider-connections/shopify/exchange-client-credentials", {
      storeDomain: "saltycowhide.myshopify.com",
      clientId: "client_1234",
      clientSecret: "shpss_bad_secret_12345"
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("invalid");
    expect(body.safeMessage).toContain("Shopify did not accept");
    expect(JSON.stringify(body)).not.toContain("shpss_bad_secret_12345");
  });

  it("validates legacy Shopify Admin token server-side and never returns the Admin token", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ shop: { name: "Salty Cowhide" } }), { status: 200 });
    });

    const token = "shpat_test_secret_12345";
    const response = await shopifyValidatePost(jsonPost("/api/studio/provider-connections/shopify/validate-admin", {
      storeDomain: "saltycowhide.myshopify.com",
      adminToken: token
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe("https://saltycowhide.myshopify.com/admin/api/2024-10/shop.json");
    expect(body.status).toBe("connected");
    expect(body.providerMetadata.credentialMode).toBe("legacy_admin_token");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("labels local image mode as development-only and not provider success", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "local_dev_mock"
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("blocked");
    expect(body.safeMessage).toContain("development workflow previews only");
    expect(body.setupRequired).toEqual(expect.arrayContaining(["Use real provider before production"]));
  });

  it("blocks local image mode in production", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "local_dev_mock"
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("blocked");
    expect(body.safeMessage).toContain("development-only");
  });

  it("returns token_missing before calling Hugging Face", async () => {
    authorizeAsOwner();
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request) => {
      calls.push(String(url));
      return new Response("{}", { status: 200 });
    });

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "hugging_face",
      model: "black-forest-labs/FLUX.1-schnell"
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("token_missing");
    expect(body.safeMessage).toContain("Inference Providers");
    expect(calls).toEqual([]);
  });

  it("returns permission_missing for a Hugging Face token without Inference Providers permission", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const token = "hf_permission_missing_secret";
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "Token missing permission to Make calls to Inference Providers" }), { status: 403 }));

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "hugging_face",
      model: "black-forest-labs/FLUX.1-schnell",
      token
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("permission_missing");
    expect(body.safeMessage).toContain("Inference Providers");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("returns token_invalid for invalid Hugging Face tokens without echoing the token", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const token = "hf_invalid_secret_value";
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "Invalid access token" }), { status: 401 }));

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "hugging_face",
      model: "black-forest-labs/FLUX.1-schnell",
      token
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("token_invalid");
    expect(body.safeMessage).toContain("did not accept");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("returns model_not_supported for the old SDXL default and recommends current models", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request) => {
      calls.push(String(url));
      return new Response("{}", { status: 200 });
    });

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "hugging_face",
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      token: "hf_sdxl_secret"
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("model_not_supported");
    expect(body.safeMessage).toContain("older SDXL base model");
    expect(body.providerMetadata.recommendedModels.map((item: any) => item.model)).toContain("black-forest-labs/FLUX.1-schnell");
    expect(calls).toEqual([]);
    expect(JSON.stringify(body)).not.toContain("hf_sdxl_secret");
  });

  it("returns provider_unreachable for network failures and never shows raw fetch failed", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const token = "hf_network_secret";
    vi.stubGlobal("fetch", async () => {
      throw new Error("fetch failed");
    });

    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "hugging_face",
      model: "black-forest-labs/FLUX.1-schnell",
      token
    }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.status).toBe("provider_unreachable");
    expect(body.safeMessage).toContain("could not reach Hugging Face");
    expect(serialized).not.toContain("fetch failed");
    expect(serialized).not.toContain(token);
  });

  it("validates Hugging Face image provider through the router and returns only masked status", async () => {
    authorizeAsOwner();
    process.env.CREDENTIAL_STORAGE_ENABLED = "true";
    process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(new Uint8Array([137, 80, 78, 71]).buffer, { status: 200, headers: { "content-type": "image/png" } });
    });

    const token = "hf_valid_secret_value";
    const response = await imageValidatePost(jsonPost("/api/studio/provider-connections/image-generation/validate", {
      provider: "hugging_face",
      model: "black-forest-labs/FLUX.1-schnell",
      token
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell");
    expect(String((calls[0]?.init.headers as Record<string, string>).authorization)).toContain("Bearer");
    expect(body.status).toBe("connected");
    expect(body.maskedDisplayValue).toBe("Saved securely");
    expect(body.providerMetadata.hfProvider).toBe("hf-inference");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("rejects setup help requests that include secrets and accepts safe requests", async () => {
    authorizeAsOwner();

    const bad = await helpPost(jsonPost("/api/studio/onboarding/request-help", {
      requestType: "setup_help",
      message: "My api token is shpat_test_secret_12345"
    }));
    const badBody = await bad.json();
    expect(bad.status).toBe(400);
    expect(badBody.safeMessage).toContain("cannot contain tokens");
    expect(JSON.stringify(badBody)).not.toContain("shpat_test_secret_12345");

    const good = await helpPost(jsonPost("/api/studio/onboarding/request-help", {
      requestType: "provider_issue",
      relatedProvider: "printify",
      message: "I need help choosing the right Printify shop."
    }));
    const goodBody = await good.json();
    expect(good.status).toBe(200);
    expect(goodBody.status).toBe("created");
    expect(goodBody.request.related_provider).toBe("printify");
    expect(JSON.stringify(goodBody)).not.toContain("shpat_test_secret_12345");
    expect(JSON.stringify(goodBody)).not.toMatch(/access_token|refresh_token|routing_number|account_number/i);
  });
});
