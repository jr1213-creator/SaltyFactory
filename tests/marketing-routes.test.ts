import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createApprovalRequest, runPolicyReview } from "@saltyfactory/ai-free";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { runWorkerOnce } from "../apps/worker/src/index";
import { GET as marketingSourcesGet } from "../apps/studio/app/api/studio/marketing/sources/route";
import { POST as createLaunchPlanPost } from "../apps/studio/app/api/studio/marketing/launch-plans/create/route";
import { GET as getLaunchPlanGet } from "../apps/studio/app/api/studio/marketing/launch-plans/[id]/route";
import { POST as generateLaunchPlanPost } from "../apps/studio/app/api/studio/marketing/launch-plans/[id]/generate/route";
import { GET as campaignBuildSheetGet } from "../apps/studio/app/api/studio/marketing/campaign-drafts/[id]/build-sheet/route";
import { POST as decideApprovalPost } from "../apps/studio/app/api/studio/marketing/approval-requests/[id]/decide/route";
import {
  marketingActorId,
  marketingFinalJson,
  marketingLaunchToolCalls,
  marketingWorkspaceId,
  ScriptedMarketingProvider,
  seedApprovedMarketingConcept,
  seedMarketingLaunchPlan
} from "./marketing-test-helpers";

const actor = { id: "marketing_route_owner", email: "owner@saltycowhide.com", emailVerified: true };

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("marketing routes", () => {
  it("requires Studio auth for source registry and launch-plan creation", async () => {
    const sourcesResponse = await marketingSourcesGet(new Request("http://localhost:3001/api/studio/marketing/sources"));
    const createResponse = await createLaunchPlanPost(new Request("http://localhost:3001/api/studio/marketing/launch-plans/create", { method: "POST" }));

    expect(sourcesResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
  });

  it("creates a launch plan, queues generation, persists outputs, and exposes a manual-only build sheet", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_AGENT_EXECUTION_MODE", "queued");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");

    const repos = createRepositories();
    const fixture = await seedApprovedMarketingConcept({ repos });

    const createResponse = await createLaunchPlanPost(authedRequest("/api/studio/marketing/launch-plans/create", "POST", {
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId,
      campaignType: "hybrid",
      spendType: "owner_time_only",
      launchName: "Route Marketing Launch"
    }));
    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.ok).toBe(true);
    expect(createBody.launchPlan).toMatchObject({
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    });

    const launchPlanId = String(createBody.launchPlan.id);
    const generateResponse = await generateLaunchPlanPost(authedRequest(`/api/studio/marketing/launch-plans/${launchPlanId}/generate`, "POST"), {
      params: Promise.resolve({ id: launchPlanId })
    });
    expect(generateResponse.status).toBe(200);
    const generateBody = await generateResponse.json();
    expect(generateBody).toMatchObject({
      ok: true,
      status: "queued",
      launchPlanId,
      nextAction: "poll_transcript"
    });

    const workerResult = await runWorkerOnce(undefined, {
      agentModelProvider: new ScriptedMarketingProvider([
        {
          ok: true,
          providerUsed: "ollama",
          modelUsed: "qwen3:8b",
          text: "",
          toolCalls: marketingLaunchToolCalls(launchPlanId)
        },
        {
          ok: true,
          providerUsed: "ollama",
          modelUsed: "qwen3:8b",
          text: marketingFinalJson(launchPlanId)
        }
      ])
    });
    expect(workerResult).toMatchObject({ processed: 1, status: "completed", agentRunId: generateBody.agentRunId });

    const detailResponse = await getLaunchPlanGet(authedRequest(`/api/studio/marketing/launch-plans/${launchPlanId}`, "GET"), {
      params: Promise.resolve({ id: launchPlanId })
    });
    expect(detailResponse.status).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody.ok).toBe(true);
    expect(detailBody.organicContentDrafts.length).toBeGreaterThan(0);
    expect(detailBody.lifecycleCampaignFlows.length).toBeGreaterThan(0);
    expect(detailBody.adCopyVariants.length).toBeGreaterThan(0);
    expect(detailBody.creativeBriefs.length).toBeGreaterThan(0);
    expect(detailBody.campaignDrafts.length).toBeGreaterThan(0);
    expect(detailBody.approvalRequests.length).toBeGreaterThan(0);
    expect(JSON.stringify(detailBody)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+|service[_-]?role|api[_-]?key|access[_-]?token/i);

    const campaignDraftId = String(detailBody.campaignDrafts[0].id);
    const buildSheetResponse = await campaignBuildSheetGet(authedRequest(`/api/studio/marketing/campaign-drafts/${campaignDraftId}/build-sheet`, "GET"), {
      params: Promise.resolve({ id: campaignDraftId })
    });
    expect(buildSheetResponse.status).toBe(200);
    const buildSheetBody = await buildSheetResponse.json();
    expect(buildSheetBody.ok).toBe(true);
    expect(buildSheetBody.campaignDraft.platform_object_ids ?? buildSheetBody.campaignDraft.platformObjectIds ?? null).toBeNull();
    expect(["manual_build_sheet", "draft_export"]).toContain(String(buildSheetBody.campaignDraft.write_mode ?? buildSheetBody.campaignDraft.writeMode));

    const approvalId = String(detailBody.approvalRequests[0].id);
    const decideResponse = await decideApprovalPost(authedRequest(`/api/studio/marketing/approval-requests/${approvalId}/decide`, "POST", {
      ownerDecision: "needs_changes",
      notes: "Refine owner-facing copy before public use."
    }), {
      params: Promise.resolve({ id: approvalId })
    });
    expect(decideResponse.status).toBe(200);
    const decideBody = await decideResponse.json();
    expect(decideBody.ok).toBe(true);
    expect(decideBody.approvalRequest.owner_decision ?? decideBody.approvalRequest.ownerDecision).toBe("needs_changes");
  });

  it("requires the exact requested source entity to exist and be approved before launch-plan creation", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");

    const repos = createRepositories();
    const suffix = `exact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const approvedConcept = await seedApprovedMarketingConcept({ repos, title: `Approved Concept ${suffix}` });
    const approvedDraftId = `draft_approved_${suffix}`;
    const unapprovedConceptId = `concept_ready_for_review_${suffix}`;
    const unapprovedDraftId = `draft_unapproved_${suffix}`;
    const unapprovedListingId = `listing_ready_for_review_${suffix}`;
    const missingConceptId = `concept_missing_${suffix}`;

    await repos.trendIntelligence.concepts.create({
      id: unapprovedConceptId,
      workspace_id: marketingWorkspaceId,
      profile_id: approvedConcept.profileId,
      cluster_id: approvedConcept.clusterId,
      trend_score_id: approvedConcept.scoreId,
      title: "Ready for review is not approved",
      customer_segment: "Owner review shopper",
      product_category: "accessories",
      suggested_product_types: ["car charm"],
      personalization_potential: "medium",
      phrases: ["coastal cowgirl"],
      visual_motifs: ["turquoise"],
      palette: ["sand"],
      print_style: "boutique charm",
      recommended_blank_or_base_product: "acrylic charm",
      margin_hypothesis: "Owner review required.",
      source_evidence: {
        cluster_id: approvedConcept.clusterId,
        source_keys: ["etsy_v3"],
        signal_ids: [],
        citation_ids: [approvedConcept.citationId],
        evidence_summary: "Persisted evidence."
      },
      reason_it_may_sell: "It is not approved yet.",
      risk_notes: "Owner review required.",
      owner_action_needed: "approve",
      review_status: "ready_for_review",
      created_by_kind: "ollama_agent",
      created_by: marketingActorId,
      updated_by: marketingActorId
    } as WorkspaceRow);

    await repos.draft.create({
      id: unapprovedDraftId,
      workspace_id: marketingWorkspaceId,
      title: "Draft is not approved",
      description: "A product draft still in draft state.",
      product_type: "tee",
      tags: ["coastal"],
      status: "draft",
      approval_status: "draft"
    } as WorkspaceRow);
    await repos.listingDraftV1.create({
      id: unapprovedListingId,
      workspace_id: marketingWorkspaceId,
      title: "Listing ready for review",
      description: "A listing draft still waiting for approval.",
      product_type: "car charm",
      tags: ["coastal"],
      status: "ready_for_review",
      approval_status: "ready_for_review"
    } as WorkspaceRow);
    await repos.draft.create({
      id: approvedDraftId,
      workspace_id: marketingWorkspaceId,
      title: "Approved exact product draft",
      description: "An approved exact product draft.",
      product_type: "tee",
      tags: ["coastal"],
      status: "approved",
      approval_status: "approved",
      mockup_ids: ["mockup_approved_exact"],
      variant_ids: ["variant_approved_exact"]
    } as WorkspaceRow);

    const rejectCases = [
      { sourceEntityType: "product_concept_candidate", sourceEntityId: unapprovedConceptId, message: "marketing_source_entity_not_approved" },
      { sourceEntityType: "product_draft", sourceEntityId: unapprovedDraftId, message: "marketing_source_entity_not_approved" },
      { sourceEntityType: "listing_draft", sourceEntityId: unapprovedListingId, message: "marketing_source_entity_not_approved" },
      { sourceEntityType: "product_concept_candidate", sourceEntityId: missingConceptId, message: "marketing_source_entity_not_found" }
    ];

    for (const body of rejectCases) {
      const beforeCount = (await repos.marketing.launchPlans.listByWorkspace(marketingWorkspaceId)).length;
      const response = await createLaunchPlanPost(authedRequest("/api/studio/marketing/launch-plans/create", "POST", {
        ...body,
        campaignType: "organic",
        spendType: "no_spend",
        launchName: `Rejected ${body.sourceEntityId}`
      }));
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({ ok: false, status: "failed", message: body.message });
      expect(await repos.marketing.launchPlans.listByWorkspace(marketingWorkspaceId)).toHaveLength(beforeCount);
    }

    const approvedDraftResponse = await createLaunchPlanPost(authedRequest("/api/studio/marketing/launch-plans/create", "POST", {
      sourceEntityType: "product_draft",
      sourceEntityId: approvedDraftId,
      campaignType: "organic",
      spendType: "no_spend",
      launchName: "Approved exact product draft launch"
    }));
    expect(approvedDraftResponse.status).toBe(200);
    await expect(approvedDraftResponse.json()).resolves.toMatchObject({
      ok: true,
      launchPlan: {
        sourceEntityType: "product_draft",
        sourceEntityId: approvedDraftId
      }
    });
  });

  it("returns a typed conflict when an ad-copy approval is attempted before passing policy review", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");

    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    await repos.marketing.adCopyVariants.create({
      id: "route_policy_adcopy",
      workspace_id: marketingWorkspaceId,
      launch_plan_id: fixture.launchPlanId,
      channel: "meta",
      headline: "Only 3 left",
      primary_text: "Official Disney-inspired free shipping drop.",
      description: null,
      cta: "Shop now",
      platform_constraints: {},
      policy_review_result_id: null,
      review_status: "pending_review",
      created_by: marketingActorId,
      updated_by: marketingActorId
    } as WorkspaceRow);
    await runPolicyReview({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      launchPlanId: fixture.launchPlanId
    });
    const approval = await createApprovalRequest({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      launchPlanId: fixture.launchPlanId,
      targets: [{ targetType: "ad_copy_variant", targetId: "route_policy_adcopy" }]
    });

    const response = await decideApprovalPost(authedRequest(`/api/studio/marketing/approval-requests/${approval.approvalRequestIds[0]}/decide`, "POST", {
      ownerDecision: "approved"
    }), {
      params: Promise.resolve({ id: approval.approvalRequestIds[0]! })
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      status: "failed",
      message: "policy_review_required"
    });
  });

  it("rejects invalid ownerDecision values without mutating approval request or target review state", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");

    const repos = createRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos, title: "Invalid Decision Fixture" });
    const draftId = `organic_invalid_decision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await repos.marketing.organicContentDrafts.create({
      id: draftId,
      workspace_id: marketingWorkspaceId,
      launch_plan_id: fixture.launchPlanId,
      channel: "instagram",
      content_type: "caption",
      draft_copy: "Owner-reviewable social caption.",
      source_evidence_refs: [],
      review_status: "pending_review",
      created_by: marketingActorId,
      updated_by: marketingActorId
    } as WorkspaceRow);
    const approval = await createApprovalRequest({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      launchPlanId: fixture.launchPlanId,
      targets: [{ targetType: "organic_content_draft", targetId: draftId }]
    });
    const approvalId = approval.approvalRequestIds[0]!;

    const response = await decideApprovalPost(authedRequest(`/api/studio/marketing/approval-requests/${approvalId}/decide`, "POST", {
      ownerDecision: "approve"
    }), {
      params: Promise.resolve({ id: approvalId })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      status: "failed",
      message: "marketing_invalid_approval_decision"
    });
    await expect(repos.marketing.approvalRequests.getById(approvalId, marketingWorkspaceId)).resolves.toMatchObject({
      owner_decision: "pending",
      reviewer: null,
      decided_at: null
    });
    await expect(repos.marketing.organicContentDrafts.getById(draftId, marketingWorkspaceId)).resolves.toMatchObject({
      review_status: "pending_review"
    });
  });
});
