import { afterEach, describe, expect, it } from "vitest";
import { runAgenticAiEmployeeWorkflow } from "@saltyfactory/ai-free";
import { setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests, SUPABASE_ACCESS_COOKIE } from "@saltyfactory/auth";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { reviewAiEmployeeOutput } from "../apps/studio/app/api/studio/ai-employees/_workflow";
import { evaluatePublishReadiness } from "../apps/studio/app/api/studio/publish-reviews/_readiness";
import { POST as launchCampaignPost } from "../apps/studio/app/api/studio/marketing/launch-campaign/route";
import { POST as socialCarePost } from "../apps/studio/app/api/studio/marketing/social-care/route";

const workspaceId = "wks_default";
const actorId = "auth_user_01";
const identity = { id: actorId, email: "owner@saltycowhide.com", emailVerified: true };
const originalEnv = { ...process.env };

function authedRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: {
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function authOwner() {
  setSupabaseUserVerifierForTests(async () => identity);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId,
    supabaseUserId: user.id
  }));
}

afterEach(() => {
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

async function seedPodPlanningInputs(repos: ReturnType<typeof createMemoryRepositories>) {
  await repos.trend.create({
    id: "tsig_workflow_1",
    workspace_id: workspaceId,
    source_id: "manual",
    keyword: "beach rodeo",
    confidence: 0.78,
    category: "fashion_pod",
    status: "new"
  });
  await repos.businessProfileV1.create({
    id: "bizprof_workflow",
    workspace_id: workspaceId,
    business_name: "Salty Factory",
    public_brand_name: "Salty Cowhide",
    business_type: "POD",
    fulfillment_model: "POD",
    support_email: "support@saltycowhide.com",
    readiness_score: 85,
    readiness_blockers: [],
    profile_json: {
      publicBrandName: "Salty Cowhide",
      targetCustomer: "coastal western shoppers",
      productCategories: ["tees", "totes"],
      productionPartnerDisclosureNotes: "Made to order by a POD production partner.",
      returnsPolicyNotes: "Returns follow posted policy.",
      brandColors: ["teal", "sand"]
    },
    status: "ready"
  });
}

describe("original POD AI automated business workflow", () => {
  it("runs AI POD planning, persists outputs, creates shared approvals, and approves a trend report without provider actions", async () => {
    const repos = createMemoryRepositories();
    await seedPodPlanningInputs(repos);

    const result = await runAgenticAiEmployeeWorkflow({
      repos,
      workspaceId,
      actorId,
      runMode: "daily_pod_planning",
      imageProviderConfigured: false,
      shopifyStatus: "not_configured",
      printifyStatus: "not_configured",
      googleStatus: "not_configured",
      merchantStatus: "not_configured"
    });

    expect(result.outputs.length).toBeGreaterThan(5);
    expect(await repos.aiEmployee.runs.listByWorkspace(workspaceId)).toHaveLength(1);
    expect((await repos.shared.approvals.listByWorkspace(workspaceId)).length).toBeGreaterThan(0);
    expect(result.outputs.find((output) => output.output_type === "image_generation_request")?.status).toBe("provider_not_configured");

    const trendOutput = result.outputs.find((output) => output.output_type === "trend_report");
    if (!trendOutput) throw new Error("trend output missing");
    const reviewed = await reviewAiEmployeeOutput({ repos, workspaceId, actorId, outputId: trendOutput.id, decision: "approve", notes: "Trend direction accepted." });
    expect(reviewed?.status).toBe("approved");
    expect((await repos.shared.approvals.getById(`approval_${trendOutput.id}`, workspaceId))?.status).toBe("approved");
    expect(await repos.shared.events.listByWorkspace(workspaceId)).not.toHaveLength(0);
    expect(await repos.shopify.listByWorkspace(workspaceId)).toHaveLength(0);
    expect(await repos.printify.listByWorkspace(workspaceId)).toHaveLength(0);
  });

  it("approves AI product/listing outputs into POD records and keeps disabled image generation blocked", async () => {
    const repos = createMemoryRepositories();
    await seedPodPlanningInputs(repos);
    const result = await runAgenticAiEmployeeWorkflow({ repos, workspaceId, actorId, imageProviderConfigured: false });

    const productIdeas = result.outputs.find((output) => output.output_type === "product_idea_recommendations");
    const listingDraft = result.outputs.find((output) => output.output_type === "listing_draft");
    const imageRequest = result.outputs.find((output) => output.output_type === "image_generation_request");
    if (!productIdeas || !listingDraft || !imageRequest) throw new Error("expected AI outputs missing");

    await reviewAiEmployeeOutput({ repos, workspaceId, actorId, outputId: productIdeas.id, decision: "approve" });
    await reviewAiEmployeeOutput({ repos, workspaceId, actorId, outputId: listingDraft.id, decision: "approve" });
    const blockedImageApproval = await reviewAiEmployeeOutput({ repos, workspaceId, actorId, outputId: imageRequest.id, decision: "approve" });
    const taskResult = await reviewAiEmployeeOutput({ repos, workspaceId, actorId, outputId: imageRequest.id, decision: "convert_to_task", notes: "Upload manual artwork when available." });

    expect((await repos.podMigration.listByWorkspace(workspaceId))[0]).toMatchObject({ source: "AI employee approved output", status: "ready_for_review" });
    expect((await repos.listingDraftV1.listByWorkspace(workspaceId))[0]).toMatchObject({ source_type: "AI employee approved output" });
    expect(blockedImageApproval?.blocked).toBe(true);
    expect(taskResult?.status).toBe("task_created");
    expect(await repos.asset.listByWorkspace(workspaceId)).toHaveLength(0);
  });

  it("keeps publish review blocked until persisted pricing exists, then reaches internal-ready gates without provider sync", async () => {
    const repos = createMemoryRepositories();
    await repos.asset.create({ id: "asset_ready", workspace_id: workspaceId, brief_id: "brief_1", qa_status: "passed", approved_for_mockup: true });
    await repos.qa.create({ id: "qa_ready", workspace_id: workspaceId, asset_id: "asset_ready", status: "passed", approved_for_product_draft: true });
    await repos.mockup.create({ id: "mockup_ready", workspace_id: workspaceId, asset_id: "asset_ready", template_id: "tmpl_1", approved_for_product: true, status: "approved" });
    await repos.risk.create({ id: "risk_ready", workspace_id: workspaceId, entity_type: "product_draft", entity_id: "draft_ready", status: "cleared" });
    await repos.draft.create({
      id: "draft_ready",
      workspace_id: workspaceId,
      brand: "Salty Cowhide Co.",
      title: "Beach Rodeo Tee",
      description: "Original coastal western tee.",
      product_type: "tee",
      collection: "Studio Drafts",
      tags: ["coastal", "western"],
      asset_id: "asset_ready",
      mockup_ids: ["mockup_ready"],
      shopify_status: "not_published",
      printify_status: "not_synced",
      status: "draft",
      metadata: { provider_target: "internal_only", mockups_required: true }
    });

    const blocked = await evaluatePublishReadiness({ repos, workspaceId, draftId: "draft_ready", reviewId: "pubrev_ready", humanApproved: true });
    expect(blocked.blockingReasons).toContain("margin_evidence_missing_or_failed");

    await repos.margin.create({
      id: "margin_ready",
      workspace_id: workspaceId,
      product_draft_id: "draft_ready",
      cost: 12,
      price: 34,
      shopify_fee_estimate: 0,
      printify_shipping_estimate: 5,
      platform_fee_estimate: 1,
      net_revenue_estimate: 16,
      margin_percent: 47,
      minimum_margin_threshold: 35,
      margin_ok: true,
      blocked: false,
      status: "passed"
    });
    const ready = await evaluatePublishReadiness({ repos, workspaceId, draftId: "draft_ready", reviewId: "pubrev_ready", humanApproved: true });
    expect(ready.evaluation.allowed).toBe(true);
    expect(ready.gates.human_approved).toBe(true);
    expect(await repos.integration.listIntegrationSyncRuns(workspaceId)).toHaveLength(0);
    expect(await repos.shopify.listByWorkspace(workspaceId)).toHaveLength(0);
    expect(await repos.printify.listByWorkspace(workspaceId)).toHaveLength(0);
  });

  it("creates a product-referenced marketing campaign packet without live publishing, sending, or spend", async () => {
    authOwner();
    const response = await launchCampaignPost(authedRequest("http://localhost:3001/api/studio/marketing/launch-campaign", {
      name: "Beach Rodeo Launch",
      product_ref: "listv1_ai_output_1",
      goal: "Launch the Beach Rodeo listing with proof-backed manual marketing.",
      audience: "coastal western shoppers",
      offer: "Beach Rodeo tee preorder",
      landing_url: "https://saltycowhide.com/products/beach-rodeo"
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      productRef: "listv1_ai_output_1",
      records: { approvals: 5, channels: 7, proofPack: expect.any(String), growthPlan: expect.any(String) }
    });
  });

  it("persists customer ops and manual social care opportunity records without sending messages", async () => {
    const repos = createMemoryRepositories();
    await repos.crm.customers.create({ id: "cust_workflow", workspace_id: workspaceId, name: "Jennie", email: "owner@example.com", source_label: "manual_entry" });
    await repos.crm.leads.create({ id: "lead_workflow", workspace_id: workspaceId, name: "Boutique Buyer", status: "new", source_label: "manual_entry" });
    await repos.crm.notes.create({ id: "crmnote_workflow", workspace_id: workspaceId, customer_id: "cust_workflow", body: "Asked about coastal western wholesale.", source_label: "manual_entry" });
    await repos.crm.tasks.create({ id: "crmtask_workflow", workspace_id: workspaceId, customer_id: "cust_workflow", title: "Follow up", status: "open", source_label: "manual_entry" });
    await repos.crm.tasks.update("crmtask_workflow", { status: "completed", completed_at: new Date().toISOString() });
    await repos.crm.timelineEvents.create({ id: "timeline_workflow", workspace_id: workspaceId, customer_id: "cust_workflow", event_type: "task_completed", title: "Follow up completed", source_label: "manual_entry" });

    expect(await repos.crm.customers.listByWorkspace(workspaceId)).toHaveLength(1);
    expect((await repos.crm.tasks.getById("crmtask_workflow", workspaceId))?.status).toBe("completed");
    expect(await repos.crm.timelineEvents.listByWorkspace(workspaceId)).toHaveLength(1);

    authOwner();
    const response = await socialCarePost(authedRequest("http://localhost:3001/api/studio/marketing/social-care", {
      platform: "manual",
      classification: "buying_intent",
      comment_text: "Do you have this tee in ivory?",
      response_draft: "Thanks for asking. I can help check available variants.",
      create_task: true,
      follow_up_title: "Manual follow-up on tee variant question"
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      records: { sourceRecord: expect.any(String), note: expect.any(String), task: expect.any(String), event: expect.any(String) }
    });
  });
});
