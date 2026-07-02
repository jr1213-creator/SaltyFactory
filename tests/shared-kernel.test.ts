import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import {
  buildCampaignProofPackContent,
  buildNoAdGrowthPlanContent,
  buildReadinessScore,
  buildRecommendationTask,
  buildUtmUrl,
  createVerticalPackAutomationRuleRows,
  createVerticalPackSeedRows,
  createVerticalPackTemplateRows,
  safeKernelRecordForClient,
  sanitizeKernelPayload
} from "@saltyfactory/domain";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { aiEmployeeTables, requiredStudioTables, sharedKernelTables } from "../packages/db/src/apply-local";
import { GET as listShared, POST as createShared } from "../apps/studio/app/api/studio/shared/[resource]/route";
import { POST as createSocialCareOpportunity } from "../apps/studio/app/api/studio/marketing/social-care/route";

const workspaceId = "wks_default";
const actor = { id: "auth_user_01", email: "owner@saltycowhide.com", emailVerified: true };

function request(body?: unknown) {
  const init: RequestInit = {
    method: "POST",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=valid`, "content-type": "application/json" }
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request("http://localhost:3001/api/studio/shared/source-records", init);
}

afterEach(() => {
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("shared kernel v1", () => {
  it("adds shared-kernel tables to db:migrate verification", () => {
    expect(sharedKernelTables).toEqual(expect.arrayContaining([
      "provider_connections",
      "source_records",
      "events",
      "approvals",
      "tasks",
      "recommendations",
      "readiness_scores",
      "export_packages",
      "assets",
      "templates",
      "automation_rules",
      "segments",
      "vertical_packs",
      "campaigns",
      "campaign_channels",
      "utm_links"
    ]));
    expect(requiredStudioTables).toEqual(expect.arrayContaining(sharedKernelTables));
  });

  it("adds AI employee workflow tables to db:migrate verification", () => {
    expect(aiEmployeeTables).toEqual(expect.arrayContaining([
      "ai_employees",
      "ai_employee_tasks",
      "ai_employee_runs",
      "ai_employee_outputs",
      "ai_employee_permissions",
      "ai_employee_audit_events"
    ]));
    expect(requiredStudioTables).toEqual(expect.arrayContaining(aiEmployeeTables));
  });

  it("persists polymorphic shared records with workspace isolation in repositories", async () => {
    const repos = createMemoryRepositories();
    await repos.shared.events.create({ id: "event_1", workspace_id: workspaceId, entity_type: "customer", entity_id: "cust_1", event_type: "note_added", event_label: "Note added" });
    await repos.shared.events.create({ id: "event_other", workspace_id: "other", entity_type: "customer", entity_id: "cust_1", event_type: "note_added", event_label: "Other" });
    await repos.shared.approvals.create({ id: "approval_1", workspace_id: workspaceId, entity_type: "campaign", entity_id: "camp_1", approval_type: "proof_pack", status: "pending" });
    await repos.shared.tasks.create({ id: "task_1", workspace_id: workspaceId, entity_type: "campaign", entity_id: "camp_1", title: "Review proof pack", status: "pending" });

    expect(await repos.shared.events.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.shared.approvals.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.shared.tasks.listByWorkspace(workspaceId)).toHaveLength(1);
  });

  it("sanitizes source payloads and provider records before client output", () => {
    const sanitized = sanitizeKernelPayload({ safe: "ok", nested: { access_token: "secret" }, raw: "client_secret=bad" });
    expect(JSON.stringify(sanitized)).not.toContain("secret");
    expect(JSON.stringify(safeKernelRecordForClient({ id: "row_1", workspace_id: workspaceId, api_token: "secret", status: "active" }))).not.toContain("api_token");
  });

  it("protects shared APIs and strips caller workspace/secrets on create", async () => {
    const unauthorized = await listShared(new Request("http://localhost:3001/api/studio/shared/source-records"), { params: Promise.resolve({ resource: "source-records" }) });
    expect(unauthorized.status).toBe(401);

    setSupabaseUserVerifierForTests(async () => actor);
    setWorkspaceAuthorizerForTests(async (user, workspace) => ({ id: user.id, email: user.email, role: "owner", workspaceId: workspace, supabaseUserId: user.id }));
    const response = await createShared(request({
      id: "source_test",
      workspace_id: "attacker_workspace",
      source_name: "Manual note",
      source_label: "Manual entry",
      origin: "manual",
      raw_payload: { api_token: "must_not_return" }
    }), { params: Promise.resolve({ resource: "source-records" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.record.workspace_id).toBe(workspaceId);
    expect(JSON.stringify(body)).not.toMatch(/attacker_workspace|must_not_return|api_token|access_token|refresh_token|client_secret/i);
  });

  it("keeps global vertical packs listable while parsing structured source payloads", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/shared/_shared.ts"), "utf8");
    expect(source).toContain('"vertical-packs": { key: "verticalPacks", prefix: "vpack", required: ["key", "name"], global: true }');
    expect(source).toContain("isGlobalResource(resource) ? repo.list() : repo.listByWorkspace(sharedWorkspaceId)");
    expect(source).toContain("raw_payload");
    expect(source).toContain("payload");
    expect(source).toContain("safeKernelRecordForClient");
  });

  it("builds deterministic vertical pack seeds and campaign control-plane artifacts", () => {
    const packs = createVerticalPackSeedRows();
    expect(packs.map((pack) => pack.key)).toEqual(["pod_boutique", "ai_readiness_consulting"]);
    expect(createVerticalPackTemplateRows(workspaceId).length).toBeGreaterThan(10);
    expect(createVerticalPackAutomationRuleRows(workspaceId).length).toBeGreaterThan(5);

    const score = buildReadinessScore({
      workspaceId,
      entityType: "campaign",
      entityId: "camp_1",
      scoreType: "ad",
      criteria: [
        { key: "offer", label: "Offer clear", passed: true },
        { key: "tracking", label: "Tracking ready", passed: false, blocker: "tracking_setup_needed" }
      ]
    });
    expect(score).toMatchObject({ score_value: 50, status: "setup_needed", blockers: ["tracking_setup_needed"] });

    expect(buildUtmUrl({ baseUrl: "https://saltycowhide.com/products/test", source: "pinterest", medium: "organic", campaignName: "Product Drop" })).toContain("utm_source=pinterest");
    expect(buildCampaignProofPackContent({ campaign: { name: "Launch", offer: "New drop" } }).featureClassification).toBe("manual_export_ready_feature");
    expect(buildNoAdGrowthPlanContent({ id: "camp_1", name: "Launch" }).sections).toContain("Pinterest organic");
    expect(buildRecommendationTask({ id: "rec_1", title: "Fix tracking", body: "Create UTM link", entity_type: "campaign", entity_id: "camp_1" }, workspaceId)).toMatchObject({ recommendation_id: "rec_1", title: "Fix tracking" });
  });

  it("stores vertical packs, campaign drafts, export packages, and UTM links without vertical-specific tables", async () => {
    const repos = createMemoryRepositories();
    for (const pack of createVerticalPackSeedRows()) await repos.shared.verticalPacks.create(pack as any);
    await repos.shared.campaigns.create({ id: "campaign_1", workspace_id: workspaceId, name: "Launch", campaign_type: "product_drop", goal: "manual export" });
    await repos.shared.campaignChannels.create({ id: "channel_1", workspace_id: workspaceId, campaign_id: "campaign_1", channel_type: "pinterest", draft_content: { noLivePublish: true }, status: "draft" });
    await repos.shared.exportPackages.create({ id: "export_1", workspace_id: workspaceId, entity_type: "campaign", entity_id: "campaign_1", package_type: "proof_pack", title: "Proof Pack", content: { manualExport: true }, status: "ready_for_review" });
    await repos.shared.utmLinks.create({ id: "utm_1", workspace_id: workspaceId, campaign_id: "campaign_1", base_url: "https://saltycowhide.com/", source: "saltyfactory", medium: "manual_export", campaign_name: "Launch", generated_url: buildUtmUrl({ baseUrl: "https://saltycowhide.com/", source: "saltyfactory", medium: "manual_export", campaignName: "Launch" }), status: "ready" });

    expect(await repos.shared.verticalPacks.listByWorkspace(workspaceId)).toHaveLength(0);
    expect(await repos.shared.verticalPacks.list()).toHaveLength(2);
    expect(await repos.shared.campaigns.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.shared.campaignChannels.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.shared.exportPackages.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.shared.utmLinks.listByWorkspace(workspaceId)).toHaveLength(1);
  });

  it("creates manual Social Care Opportunity records without live social provider calls", async () => {
    const unauthorized = await createSocialCareOpportunity(new Request("http://localhost:3001/api/studio/marketing/social-care", { method: "POST" }));
    expect(unauthorized.status).toBe(401);

    setSupabaseUserVerifierForTests(async () => actor);
    setWorkspaceAuthorizerForTests(async (user, workspace) => ({ id: user.id, email: user.email, role: "owner", workspaceId: workspace, supabaseUserId: user.id }));
    const response = await createSocialCareOpportunity(request({
      workspace_id: "attacker_workspace",
      platform: "instagram",
      classification: "buying_intent",
      comment_text: "Do you make this as a tote? client_secret=bad",
      response_draft: "Thanks for asking. We can review tote options and follow up.",
      linked_entity_type: "lead",
      linked_entity_id: "lead_1",
      api_token: "must_not_return",
      create_task: true,
      owner_verified: true
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "created",
      records: {
        sourceRecord: expect.stringContaining("source_socialcare_"),
        note: expect.stringContaining("note_socialcare_"),
        task: expect.stringContaining("task_socialcare_"),
        event: expect.stringContaining("event_socialcare_")
      }
    });
    expect(JSON.stringify(body)).not.toMatch(/attacker_workspace|must_not_return|api_token|client_secret|access_token|refresh_token/i);
    const source = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/marketing/social-care/route.ts"), "utf8");
    expect(source).toContain("manualOnly: true");
    expect(source).toContain("noLiveSocialInbox: true");
    expect(source).not.toMatch(/graph\.facebook\.com|pinterest\.com\/v5|tiktokapis|sendgrid|mailgun/i);
  });
});
