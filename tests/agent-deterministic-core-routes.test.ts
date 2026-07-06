import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { GET as bundleGet } from "../apps/studio/app/api/studio/agent-core/bundle/route";
import { POST as deterministicCorePost } from "../apps/studio/app/api/studio/agent-core/deterministic-core/run/route";
import { POST as marginPost } from "../apps/studio/app/api/studio/agent-core/margin/run/route";
import { seedDeterministicDraft } from "./agent-deterministic-core-test-helpers";

const actor = { id: "agent_core_route_owner", email: "owner@saltycowhide.com", emailVerified: true };

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? actor : null);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId,
    supabaseUserId: user.id
  }));
}

function stubMemoryRuntime() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("REPOSITORY_ADAPTER", "memory");
  vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
  vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "false");
}

function authedRequest(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  return new Request(`http://localhost:3001${path}`, {
    method,
    headers: {
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function authedRawRequest(path: string, body: string) {
  return new Request(`http://localhost:3001${path}`, {
    method: "POST",
    headers: {
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
      "content-type": "application/json"
    },
    body
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("deterministic agent core routes", () => {
  it("requires auth and rejects invalid JSON or missing source without persistence", async () => {
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "false");
    const unauthenticated = await marginPost(new Request("http://localhost:3001/api/studio/agent-core/margin/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceEntityType: "product_draft", sourceEntityId: "missing" })
    }));
    expect(unauthenticated.status).toBe(401);

    vi.unstubAllEnvs();
    stubMemoryRuntime();
    authorizeAsOwner();
    const repos = createRepositories();
    const before = await repos.commerceAgent.marginAnalysis.listByWorkspace("wks_default");
    const invalid = await marginPost(authedRawRequest("/api/studio/agent-core/margin/run", "{"));
    expect(invalid.status).toBe(400);
    expect(await repos.commerceAgent.marginAnalysis.listByWorkspace("wks_default")).toEqual(before);

    const missing = await marginPost(authedRequest("/api/studio/agent-core/margin/run", "POST", { content: "copy only" }));
    expect(missing.status).toBe(400);
    expect(await repos.commerceAgent.marginAnalysis.listByWorkspace("wks_default")).toEqual(before);
  });

  it("runs all four deterministic core outputs and bundle reads them back without provider mutation", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedDeterministicDraft({ repos, suffix: "route_bundle", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const beforeShopify = await repos.shopify.listByWorkspace("wks_default");
    const beforePrintify = await repos.printify.listByWorkspace("wks_default");

    const response = await deterministicCorePost(authedRequest("/api/studio/agent-core/deterministic-core/run", "POST", {
      sourceEntityType: fixture.sourceEntityType,
      sourceEntityId: fixture.sourceEntityId
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.output.readiness.readinessCheck.id).toBeTruthy();
    expect(body.output.margin.marginAnalysis.id).toBeTruthy();
    expect(body.output.policy.policyReview.id).toBeTruthy();
    expect(body.output.seo.seoRecommendation.id).toBeTruthy();

    const bundle = await bundleGet(authedRequest(`/api/studio/agent-core/bundle?sourceEntityType=${fixture.sourceEntityType}&sourceEntityId=${fixture.sourceEntityId}`, "GET"));
    expect(bundle.status).toBe(200);
    const bundleBody = await bundle.json();
    expect(bundleBody.output.latestReadiness.id).toBeTruthy();
    expect(bundleBody.output.latestMarginAnalysis.id).toBeTruthy();
    expect(bundleBody.output.latestPolicyReview.id).toBeTruthy();
    expect(bundleBody.output.latestSeoRecommendation.id).toBeTruthy();
    expect(await repos.shopify.listByWorkspace("wks_default")).toEqual(beforeShopify);
    expect(await repos.printify.listByWorkspace("wks_default")).toEqual(beforePrintify);
  });
});
