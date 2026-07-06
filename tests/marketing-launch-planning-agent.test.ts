import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMarketingLaunchPlanDetail,
  listAgentTranscript,
  MARKETING_INVALID_JSON,
  runLocalOllamaAgentTask
} from "@saltyfactory/ai-free";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  marketingActorId,
  marketingFinalJson,
  marketingLaunchToolCalls,
  marketingWorkspaceId,
  ScriptedMarketingProvider,
  seedMarketingLaunchPlan
} from "./marketing-test-helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("marketing launch planning agent", () => {
  it("creates a full owner-reviewable launch package without live mutations", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = createMemoryRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    const provider = new ScriptedMarketingProvider([
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "",
        toolCalls: marketingLaunchToolCalls(fixture.launchPlanId)
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: marketingFinalJson(fixture.launchPlanId)
      }
    ]);

    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "marketing_launch_planner",
      taskType: "generate_marketing_launch_package",
      taskInput: {
        launchPlanId: fixture.launchPlanId,
        sourceEntityType: "product_concept_candidate",
        sourceEntityId: fixture.conceptId,
        brandVoiceProfileId: fixture.brandVoiceProfileId
      }
    });

    expect(result.status).toBe("completed");
    expect(result.providerUsed).toBe("ollama");
    expect(result.toolCallsExecuted).toEqual(expect.arrayContaining([
      "draft_organic_launch_plan",
      "draft_seo_pdp_recommendations",
      "draft_social_content",
      "draft_email_sms_drafts",
      "draft_ad_copy_variants",
      "run_policy_review",
      "compile_campaign_build_sheet",
      "save_marketing_output_for_review"
    ]));

    const detail = await getMarketingLaunchPlanDetail({
      repos,
      workspaceId: marketingWorkspaceId,
      launchPlanId: fixture.launchPlanId
    });
    expect(detail?.launchPlan).toMatchObject({
      id: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    });
    expect(detail?.organicContentDrafts.length ?? 0).toBeGreaterThan(0);
    expect(detail?.lifecycleCampaignFlows.length ?? 0).toBeGreaterThan(0);
    expect(detail?.positioningStatements.length ?? 0).toBeGreaterThan(0);
    expect(detail?.offerHypotheses.length ?? 0).toBeGreaterThan(0);
    expect(detail?.audienceHypotheses.length ?? 0).toBeGreaterThan(0);
    expect(detail?.adAngles.length ?? 0).toBeGreaterThan(0);
    expect(detail?.adCopyVariants.length ?? 0).toBeGreaterThan(0);
    expect(detail?.creativeBriefs.length ?? 0).toBeGreaterThan(0);
    expect(detail?.budgetRecommendations.length ?? 0).toBeGreaterThan(0);
    expect(detail?.campaignDrafts.length ?? 0).toBeGreaterThan(0);
    expect(detail?.approvalRequests.length ?? 0).toBeGreaterThan(0);
    expect(detail?.policyReviewResults.length ?? 0).toBeGreaterThan(0);
    expect(detail?.campaignDrafts.every((draft) =>
      (draft.platformObjectIds ?? draft.platform_object_ids ?? null) === null &&
      ["manual_build_sheet", "draft_export"].includes(String(draft.writeMode ?? draft.write_mode))
    )).toBe(true);

    const transcript = await listAgentTranscript({
      repos,
      workspaceId: marketingWorkspaceId,
      agentRunId: result.agentRunId
    });
    expect(transcript?.run.status).toBe("completed");
    expect(JSON.stringify(transcript)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+|service[_-]?role|api[_-]?key|access[_-]?token/i);
  });

  it("fails closed when the model does not return valid JSON after one repair attempt", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = createMemoryRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos, title: "Invalid JSON Marketing Fixture" });
    const provider = new ScriptedMarketingProvider([
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "",
        toolCalls: marketingLaunchToolCalls(fixture.launchPlanId)
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "not valid marketing json"
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "still not valid json"
      }
    ]);

    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "marketing_launch_planner",
      taskType: "generate_marketing_launch_package",
      taskInput: {
        launchPlanId: fixture.launchPlanId,
        sourceEntityType: "product_concept_candidate",
        sourceEntityId: fixture.conceptId,
        brandVoiceProfileId: fixture.brandVoiceProfileId
      }
    });

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe(MARKETING_INVALID_JSON);
    expect(provider.calls).toHaveLength(3);
  });
});
