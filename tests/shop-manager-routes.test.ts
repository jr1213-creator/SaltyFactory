import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { POST as behavioralRunPost } from "../apps/studio/app/api/studio/behavioral-consultations/run/route";
import { GET as rolesGet } from "../apps/studio/app/api/studio/commerce-agents/roles/route";
import { POST as runAgentPost } from "../apps/studio/app/api/studio/commerce-agents/run/route";
import { POST as reviewRecommendationPost } from "../apps/studio/app/api/studio/commerce-agents/recommendations/[id]/review/route";
import { POST as learnFromApprovalPost } from "../apps/studio/app/api/studio/shop-manager/learn-from-approval/route";
import { POST as shopManagerRunPost } from "../apps/studio/app/api/studio/shop-manager/run/route";
import { marketingWorkspaceId, seedMarketingLaunchPlan } from "./marketing-test-helpers";

const actor = { id: "shop_manager_route_owner", email: "owner@saltycowhide.com", emailVerified: true };

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

function authedRawRequest(path: string, method: "POST", body: string, contentType = "application/json") {
  return new Request(`http://localhost:3001${path}`, {
    method,
    headers: {
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
      "content-type": contentType
    },
    body
  });
}

async function mutationProofCounts(repos: ReturnType<typeof createRepositories>) {
  const [
    agentRuns,
    recommendations,
    behavioralConsultations,
    approvalPredictions,
    shopManagerBriefs,
    policyReviews,
    processFindings
  ] = await Promise.all([
    repos.aiEmployee.runs.listByWorkspace(marketingWorkspaceId),
    repos.commerceAgent.recommendations.listByWorkspace(marketingWorkspaceId),
    repos.commerceAgent.behavioralConsultations.listByWorkspace(marketingWorkspaceId),
    repos.commerceAgent.approvalPredictionRecords.listByWorkspace(marketingWorkspaceId),
    repos.commerceAgent.shopManagerBriefs.listByWorkspace(marketingWorkspaceId),
    repos.marketing.policyReviewResults.listByWorkspace(marketingWorkspaceId),
    repos.commerceAgent.processImprovementFindings.listByWorkspace(marketingWorkspaceId)
  ]);
  return {
    agentRuns: agentRuns.length,
    recommendations: recommendations.length,
    behavioralConsultations: behavioralConsultations.length,
    approvalPredictions: approvalPredictions.length,
    shopManagerBriefs: shopManagerBriefs.length,
    policyReviews: policyReviews.length,
    processFindings: processFindings.length
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("shop manager and commerce agent routes", () => {
  it("requires Studio auth for role listing and run routes", async () => {
    const rolesResponse = await rolesGet(new Request("http://localhost:3001/api/studio/commerce-agents/roles"));
    const runResponse = await runAgentPost(new Request("http://localhost:3001/api/studio/commerce-agents/run", { method: "POST" }));

    expect(rolesResponse.status).toBe(401);
    expect(runResponse.status).toBe(401);
  });

  it("runs internal commerce agents, persists outputs, and does not mutate external providers", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    const shopifyBefore = await repos.shopify.listByWorkspace(marketingWorkspaceId);
    const printifyBefore = await repos.printify.listByWorkspace(marketingWorkspaceId);

    const response = await runAgentPost(authedRequest("/api/studio/commerce-agents/run", "POST", {
      roleKey: "product_readiness_launch_gate",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    expect((await repos.commerceAgent.recommendations.listByWorkspace(marketingWorkspaceId)).length).toBeGreaterThan(0);
    expect((await repos.commerceAgent.qualityChecks.listByWorkspace(marketingWorkspaceId)).length).toBeGreaterThan(0);
    expect(await repos.shopify.listByWorkspace(marketingWorkspaceId)).toEqual(shopifyBefore);
    expect(await repos.printify.listByWorkspace(marketingWorkspaceId)).toEqual(printifyBefore);
  });

  it("rejects invalid JSON and empty bodies on shop-manager/run without persisting outputs", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const before = await mutationProofCounts(repos);

    const invalidJson = await shopManagerRunPost(authedRawRequest("/api/studio/shop-manager/run", "POST", "{"));
    expect(invalidJson.status).toBe(400);
    expect(await mutationProofCounts(repos)).toEqual(before);

    const emptyBody = await shopManagerRunPost(new Request("http://localhost:3001/api/studio/shop-manager/run", {
      method: "POST",
      headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=valid` }
    }));
    expect(emptyBody.status).toBe(400);
    expect(await mutationProofCounts(repos)).toEqual(before);
  });

  it("review routes update recommendation review status only", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    await runAgentPost(authedRequest("/api/studio/commerce-agents/run", "POST", {
      roleKey: "seo_geo_pdp_optimization",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    }));
    const recommendation = (await repos.commerceAgent.recommendations.listByWorkspace(marketingWorkspaceId))[0]!;
    const beforeShopify = await repos.shopify.listByWorkspace(marketingWorkspaceId);
    const beforePrintify = await repos.printify.listByWorkspace(marketingWorkspaceId);

    const response = await reviewRecommendationPost(authedRequest(`/api/studio/commerce-agents/recommendations/${recommendation.id}/review`, "POST", {
      reviewStatus: "needs_changes",
      notes: "Route test owner note."
    }), {
      params: Promise.resolve({ id: recommendation.id })
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.externalMutationAttempted).toBe(false);

    const updated = await repos.commerceAgent.recommendations.getById(recommendation.id, marketingWorkspaceId);
    expect(updated?.review_status ?? updated?.reviewStatus).toBe("needs_changes");
    expect(await repos.shopify.listByWorkspace(marketingWorkspaceId)).toEqual(beforeShopify);
    expect(await repos.printify.listByWorkspace(marketingWorkspaceId)).toEqual(beforePrintify);
  });

  it("shop-manager/run accepts explicit intent and creates owner-facing brief records", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    await runAgentPost(authedRequest("/api/studio/commerce-agents/run", "POST", {
      roleKey: "product_readiness_launch_gate",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    }));

    const response = await shopManagerRunPost(authedRequest("/api/studio/shop-manager/run", "POST", {
      runIntent: "shop_manager_brief"
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect((await repos.commerceAgent.shopManagerBriefs.listByWorkspace(marketingWorkspaceId)).length).toBeGreaterThan(0);
  });

  it("commerce-agent behavioral role persists consultation and policy review after consultation", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });

    const response = await runAgentPost(authedRequest("/api/studio/commerce-agents/run", "POST", {
      roleKey: "behavioral_psychology_customer_empathy",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId,
      audienceContext: "women 40+ in Texas as targeting context only",
      content: "Are you a 40-year-old woman in Texas who needs this today?"
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(JSON.stringify(body.commerceResult)).toContain("policyReview");
    expect(JSON.stringify(body.commerceResult)).toContain("sensitive_personal_attribute");
    expect((await repos.commerceAgent.behavioralConsultations.listByWorkspace(marketingWorkspaceId)).length).toBeGreaterThan(0);
    const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(marketingWorkspaceId);
    expect(policyReviews.some((row) => (row.target_type ?? row.targetType) === "behavioral_consultation")).toBe(true);
  });

  it("behavioral consultation route persists consultation and reviews behavioral content even with launchPlanId", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });

    const response = await behavioralRunPost(authedRequest("/api/studio/behavioral-consultations/run", "POST", {
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId,
      audienceContext: "women 40+ in Texas as targeting context only",
      content: "Are you a 40-year-old woman in Texas who needs this official Barbie-inspired dupe today?"
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.behavioralConsultBypassedPolicyChecker).toBe(false);
    expect(JSON.stringify(body.policyReview)).toContain("sensitive_personal_attribute");
    expect(JSON.stringify(body.policyReview)).toContain("protected_ip_term");

    const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(marketingWorkspaceId);
    const behavioralPolicyReview = policyReviews.find((row) => (row.target_type ?? row.targetType) === "behavioral_consultation");
    expect(behavioralPolicyReview).toBeTruthy();
    expect(JSON.stringify(behavioralPolicyReview)).toContain("sensitive_personal_attribute");
  });

  it("rejects invalid or incomplete behavioral consultation bodies without persisting outputs", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const before = await mutationProofCounts(repos);

    const invalidJson = await behavioralRunPost(authedRawRequest("/api/studio/behavioral-consultations/run", "POST", "{"));
    expect(invalidJson.status).toBe(400);
    expect(await mutationProofCounts(repos)).toEqual(before);

    const missingSource = await behavioralRunPost(authedRequest("/api/studio/behavioral-consultations/run", "POST", {
      content: "For shoppers who love coastal western style."
    }));
    expect(missingSource.status).toBe(400);
    expect(await mutationProofCounts(repos)).toEqual(before);
  });

  it("approval feedback route records decisions without publishing, sending, spending, or provider mutation", async () => {
    authorizeAsOwner();
    stubMemoryRuntime();
    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    await runAgentPost(authedRequest("/api/studio/commerce-agents/run", "POST", {
      roleKey: "product_readiness_launch_gate",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    }));
    await runAgentPost(authedRequest("/api/studio/commerce-agents/run", "POST", {
      roleKey: "approval_queue",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    }));
    const approvalItem = (await repos.commerceAgent.approvalQueueItems.listByWorkspace(marketingWorkspaceId))[0]!;
    const beforeShopify = await repos.shopify.listByWorkspace(marketingWorkspaceId);
    const beforePrintify = await repos.printify.listByWorkspace(marketingWorkspaceId);

    const response = await learnFromApprovalPost(authedRequest("/api/studio/shop-manager/learn-from-approval", "POST", {
      approvalItemId: approvalItem.id,
      ownerDecision: "reject",
      ownerNotes: "Reject in route test."
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.externalMutationAttempted).toBe(false);

    const updated = await repos.commerceAgent.approvalQueueItems.getById(approvalItem.id, marketingWorkspaceId);
    expect(updated?.status).toBe("decided");
    expect(await repos.shopify.listByWorkspace(marketingWorkspaceId)).toEqual(beforeShopify);
    expect(await repos.printify.listByWorkspace(marketingWorkspaceId)).toEqual(beforePrintify);
  });
});
