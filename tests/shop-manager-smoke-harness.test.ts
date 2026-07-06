import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ModelRuntimeProvider,
  ModelStructuredInput,
  ModelStructuredResult,
  ModelTextInput,
  ModelTextResult,
  ProviderCheck
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";
import { runShopManagerAgentOsSmoke } from "../scripts/smoke-shop-manager-agent-os";

class ScriptedProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  calls: ModelTextInput[] = [];

  constructor(private readonly responses: ModelTextResult[]) {}

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    this.calls.push(input);
    return this.responses.shift() ?? {
      ok: true,
      providerUsed: "ollama",
      modelUsed: "qwen3:8b",
      text: JSON.stringify({ ok: true, summary: "fallback final JSON" })
    };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return this.generateText(input) as Promise<ModelStructuredResult<T>>;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shop manager agent OS smoke harness", () => {
  it("runs the representative chain, persists outputs, and reports blocked live actions as false", async () => {
    vi.stubEnv("RUN_SHOP_MANAGER_AGENT_OS_SMOKE", "true");
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_MODEL_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");

    const repos = createMemoryRepositories(createRepositoryStore());
    const provider = new ScriptedProvider([
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "",
        toolCalls: [{ name: "runProductReadinessCheck", arguments: {} }]
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "",
        toolCalls: [{
          name: "saveCommerceOutputForReview",
          arguments: {
            outputJson: {
              summary: "Product readiness checked for owner review.",
              requiresHumanDecision: true
            }
          }
        }]
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: JSON.stringify({
          ok: true,
          summary: "Local Ollama product-readiness task completed for owner review.",
          requiresHumanDecision: true
        })
      }
    ]);

    const report = await runShopManagerAgentOsSmoke({ repos, modelProvider: provider });

    expect(report.ok).toBe(true);
    expect(report.provider).toBe("ollama");
    expect(report.model).toBe("qwen3:8b");
    expect(report.repositoryAdapter).toBe("memory");
    expect(report.smokeRepositoryAdapter).toBe("memory");
    expect(report.drizzleSmokeRequested).toBe(false);
    expect(report.drizzleSchemaImplemented).toBe(true);
    expect(report.drizzleSmokeProven).toBe(false);
    expect(report.agentsRegistered).toBe(28);
    expect(report.agentsRun).toBeGreaterThan(0);
    expect(report.representativeRolesRun).toBe(report.agentsRun);
    expect(report.allRolesRun).toBe(false);
    expect(report.genericFallbackRoleCount).toBeGreaterThan(0);
    expect(report.genericFallbackRoles).toEqual(expect.arrayContaining(["customer_voice_review_mining", "performance_decision"]));
    expect(report.recommendationsCreated).toBeGreaterThan(0);
    expect(report.qualityChecksCreated).toBeGreaterThan(0);
    expect(report.organicContentDraftsCreated).toBeGreaterThan(0);
    expect(report.adCopyVariantsCreated).toBeGreaterThan(0);
    expect(report.policyReviewsCreated).toBeGreaterThan(0);
    expect(report.behavioralConsultationsCreated).toBeGreaterThan(0);
    expect(report.approvalPredictionsCreated).toBeGreaterThan(0);
    expect(report.ownerDecisionPatternsCreated).toBeGreaterThan(0);
    expect(report.processImprovementFindingsCreated).toBeGreaterThan(0);
    expect(report.noSpendPlanCreated).toBe(true);
    expect(report.paidDraftPlanCreated).toBe(true);
    expect(report.teamPsychologistConsultedByAgents).toBe(true);
    expect(report.behavioralConsultBypassedPolicyChecker).toBe(false);
    expect(report.behavioralPolicyReviewsCreated).toBeGreaterThan(0);
    expect(report.approvalPredictionAutoApproved).toBe(false);
    expect(report.forbiddenActionCountersInstrumented).toBe(false);
    expect(report.providerMutationInstrumentation).toBe("not_available");
    expect(report.noForbiddenActionPathDetectedBySmoke).toBe(true);
    expect(report.forbiddenActionCounters).toEqual({
      liveAdWritesAttempted: 0,
      shopifyMutationsAttempted: 0,
      publicPostsAttempted: 0,
      emailSendsAttempted: 0,
      smsSendsAttempted: 0,
      imageGenerationAttempted: 0,
      printifyTouched: 0,
      hfTouched: 0,
      productPublishAttempted: 0
    });
    expect(report.liveAdWritesAttempted).toBe(false);
    expect(report.shopifyMutationsAttempted).toBe(false);
    expect(report.publicPostsAttempted).toBe(false);
    expect(report.emailSendsAttempted).toBe(false);
    expect(report.smsSendsAttempted).toBe(false);
    expect(report.imageGenerationAttempted).toBe(false);
    expect(report.printifyTouched).toBe(false);
    expect(report.hfTouched).toBe(false);
    expect(report.productPublishAttempted).toBe(false);
    expect(report.tokenEchoDetected).toBe(false);
    expect(provider.calls.length).toBeGreaterThan(0);
  });
});
