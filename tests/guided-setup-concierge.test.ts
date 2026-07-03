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
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("guided setup concierge UI", () => {
  it("has setup guides for every provider field needed by current blockers", () => {
    expect(setupGuidesForProvider("printify").map((guide) => guide.fieldKey)).toEqual(expect.arrayContaining(["printify_api_token", "printify_shop"]));
    expect(setupGuidesForProvider("shopify").map((guide) => guide.fieldKey)).toEqual(expect.arrayContaining(["shopify_store_domain", "shopify_admin_token", "shopify_collection"]));
    expect(setupGuidesForProvider("image_generation").map((guide) => guide.fieldKey)).toContain("huggingface_token");
    expect(setupFieldGuides.every((guide) => guide.stepsToFindIt.length > 0 && guide.securityNote.length > 0)).toBe(true);
  });

  it("renders onboarding routes with owner-facing setup actions and helper copy", () => {
    const pages = [
      renderToStaticMarkup(OnboardingPage()),
      renderToStaticMarkup(QuickStartPage()),
      renderToStaticMarkup(GuidedSetupPage()),
      renderToStaticMarkup(ProvidersPage()),
      renderToStaticMarkup(PrintifySetupPage()),
      renderToStaticMarkup(ShopifySetupPage()),
      renderToStaticMarkup(ImageGenerationSetupPage()),
      renderToStaticMarkup(BusinessProfileOnboardingPage()),
      renderToStaticMarkup(FirstLaunchOnboardingPage()),
      renderToStaticMarkup(SetupHelpPage()),
      renderToStaticMarkup(StudioSetupPage())
    ];
    const html = pages.join("\n");

    expect(html).toContain("Launch Setup Concierge");
    expect(html).toContain("Guided Setup");
    expect(html).toContain("Quick Setup");
    expect(html).toContain("Connect Printify");
    expect(html).toContain("Connect Shopify");
    expect(html).toContain("Configure image generation");
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
    expect(listResponse.status).toBe(401);
    expect(validateResponse.status).toBe(401);
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

  it("validates Shopify Admin server-side and never returns the Admin token", async () => {
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
    expect(body.providerMetadata.storeDomain).toBe("saltycowhide.myshopify.com");
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
