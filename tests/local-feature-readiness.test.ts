import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { buildFeatureReadiness, featureReadinessEnvVars, parseEnv } from "@saltyfactory/config";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { GET as featureReadinessGet } from "../apps/studio/app/api/studio/config/feature-readiness/route";
import StudioSetupPage from "../apps/studio/app/studio/setup/page";

const originalEnv = { ...process.env };
const root = process.cwd();

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "auth_user_01", email: "owner@saltycowhide.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId,
    supabaseUserId: user.id
  }));
}

function authedGet(path = "/api/studio/config/feature-readiness", token = "valid") {
  return new Request(`http://localhost:3001${path}`, {
    method: "GET",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=${token}` }
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("local feature readiness service", () => {
  it("reports missing provider config and disabled dangerous flags without leaking values", () => {
    const env = {
      NODE_ENV: "development",
      APP_ENV: "development",
      REPOSITORY_ADAPTER: "memory",
      HF_API_TOKEN: "hf_live_should_not_leak",
      SHOPIFY_ADMIN_TOKEN: "shpat_should_not_leak",
      PRINTIFY_API_TOKEN: "printify_should_not_leak",
      PLAID_SECRET: "plaid_should_not_leak"
    };
    const report = buildFeatureReadiness(parseEnv(env), env);
    const image = report.features.find((feature) => feature.featureKey === "imageGeneration")!;
    const printify = report.features.find((feature) => feature.featureKey === "printify")!;
    const shopify = report.features.find((feature) => feature.featureKey === "shopify")!;
    const livePublish = report.features.find((feature) => feature.featureKey === "livePublish")!;
    const banking = report.features.find((feature) => feature.featureKey === "bankingPlaidNovo")!;

    expect(image.status).toBe("config_blocked");
    expect(image.setupRequired).toEqual(expect.arrayContaining(["AI_IMAGE_ENABLED=true", "HF_API_TOKEN", "HF_IMAGE_MODEL"]));
    expect(printify.status).toBe("disabled");
    expect(printify.setupRequired).toEqual(expect.arrayContaining(["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]));
    expect(shopify.status).toBe("disabled");
    expect(shopify.setupRequired.join(" ")).toContain("SHOPIFY_ADMIN_ENABLED=true");
    expect(livePublish.status).toBe("disabled");
    expect(livePublish.disabledFlags).toEqual(expect.arrayContaining(["LIVE_PUBLISHING_ENABLED=false", "SHOPIFY_ALLOW_PRODUCT_PUBLISH=false", "PRINTIFY_ALLOW_PUBLISH=false"]));
    expect(banking.canTestWithoutProvider).toBe(true);
    expect(banking.disabledFlags).toEqual(expect.arrayContaining(["BANKING_MONEY_MOVEMENT_ENABLED=false"]));

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("hf_live_should_not_leak");
    expect(serialized).not.toContain("shpat_should_not_leak");
    expect(serialized).not.toContain("printify_should_not_leak");
    expect(serialized).not.toContain("plaid_should_not_leak");
    expect(serialized).not.toMatch(/12-3456789|account_number|routing_number/i);
  });

  it("recognizes internal business and AI desks as locally testable without provider keys", () => {
    const env = { NODE_ENV: "development", APP_ENV: "development", REPOSITORY_ADAPTER: "memory" };
    const report = buildFeatureReadiness(parseEnv(env), env);
    const safeKeys = report.safeLocalTesting.map((item) => item.featureKey);
    expect(safeKeys).toEqual(expect.arrayContaining(["aiEmployees", "businessCommandCenter", "documentOps", "printStudio", "authorityRequests"]));
    expect(report.recommendedSetupOrder[0]).toBe("Internal AI Business OS pages");
  });
});

describe("feature readiness API", () => {
  it("requires authentication", async () => {
    const response = await featureReadinessGet(new Request("http://localhost:3001/api/studio/config/feature-readiness"));
    expect(response.status).toBe(401);
  });

  it("returns redacted readiness for an authenticated owner", async () => {
    process.env.HF_API_TOKEN = "hf_secret_value";
    process.env.SHOPIFY_ADMIN_TOKEN = "shopify_secret_value";
    authorizeAsOwner();
    const response = await featureReadinessGet(authedGet());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.workspaceId).toBe("wks_default");
    expect(body.features.some((feature: any) => feature.featureKey === "shopify")).toBe(true);
    expect(JSON.stringify(body)).not.toContain("hf_secret_value");
    expect(JSON.stringify(body)).not.toContain("shopify_secret_value");
    expect(JSON.stringify(body)).not.toMatch(/token_[A-Za-z0-9]|secret_value|ein_secret_ref/i);
  });
});

describe("setup UI and docs consistency", () => {
  it("renders setup cards, blocker names, feature links, and safety panel", () => {
    const html = renderToStaticMarkup(StudioSetupPage());
    expect(html).toContain("Setup / Feature Readiness");
    expect(html).toContain("Feature Readiness Cards");
    expect(html).toContain("Image Generation");
    expect(html).toContain("Printify Catalog / Upload / Product Creation");
    expect(html).toContain("Shopify Draft Products / Media / Collection Assignment");
    expect(html).toContain("Safety Panel");
    expect(html).toContain("LIVE_PUBLISHING_ENABLED=false");
    expect(html).toContain("/studio/ai-employees");
    expect(html).toContain("/studio/business");
    expect(html).not.toMatch(/HF_API_TOKEN=[A-Za-z0-9]|SHOPIFY_ADMIN_TOKEN=[A-Za-z0-9]|PRINTIFY_API_TOKEN=[A-Za-z0-9]|PLAID_SECRET=[A-Za-z0-9]/);
  });

  it("keeps env examples and local setup docs aligned with readiness env inventory", () => {
    const localExample = readFileSync(join(root, ".env.local.example"), "utf8");
    const productionExample = readFileSync(join(root, ".env.example"), "utf8");
    const doc = readFileSync(join(root, "docs/local-feature-config-v1.md"), "utf8");

    for (const key of featureReadinessEnvVars) {
      expect(localExample, key).toContain(`${key}=`);
    }
    for (const key of ["LIVE_PUBLISHING_ENABLED", "BANKING_MONEY_MOVEMENT_ENABLED", "EXTERNAL_ORDER_SUBMISSION_ENABLED", "SHOPIFY_DEFAULT_COLLECTION_ID"]) {
      expect(productionExample, key).toContain(`${key}=`);
      expect(doc, key).toContain(key);
    }
    expect(localExample).toContain("LOCAL_DEV_IMAGE_GENERATION=false");
    expect(doc).toContain("No fake upload IDs");
    expect(doc).toContain("Does not place Staples orders");
  });

  it("adds a real setup route and navigation link", () => {
    expect(existsSync(join(root, "apps/studio/app/studio/setup/page.tsx"))).toBe(true);
    const nav = readFileSync(join(root, "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(nav).toContain('["Feature Readiness", "/studio/setup"]');
  });
});
