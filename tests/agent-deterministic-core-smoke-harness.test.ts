import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelRuntimeProvider, ModelStructuredInput, ModelStructuredResult, ModelTextInput, ModelTextResult, ProviderCheck } from "@saltyfactory/ai-free";
import { createDeterministicCoreRepos } from "./agent-deterministic-core-test-helpers";
import { runAgentDeterministicCoreSmoke } from "../scripts/smoke-agent-deterministic-core";

class ScriptedCoreSmokeProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  calls: ModelTextInput[] = [];

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    this.calls.push(input);
    return {
      ok: true,
      text: JSON.stringify({
        roleKey: "product_readiness_launch_gate",
        summary: "Deterministic core checked.",
        createdIds: [],
        warnings: [],
        requiresHumanDecision: true,
        providerMutationAttempted: false
      }),
      modelUsed: "scripted-core-smoke"
    };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    const text = await this.generateText(input);
    return { ...text, data: input.example };
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deterministic agent core smoke harness", () => {
  it("reports deterministic proof without overclaiming Drizzle or provider instrumentation", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_MODEL_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");
    const provider = new ScriptedCoreSmokeProvider();
    const report = await runAgentDeterministicCoreSmoke({
      repos: createDeterministicCoreRepos(),
      modelProvider: provider,
      requireEnvGate: false
    });

    expect(report.ok).toBe(true);
    expect(report.deterministicRuns).toBe(3);
    expect(report.deterministicFieldsIdentical).toBe(true);
    expect(report.repositoryAdapter).toBe("memory");
    expect(report.drizzleSmokeRequested).toBe(false);
    expect(report.drizzleSmokeProven).toBe(false);
    expect(report.ollamaCalled).toBe(true);
    expect(report.ollamaProbeSucceeded).toBe(true);
    expect(report.agentExecutionMode).toBe("deterministic_code_path");
    expect(report.agentExecutionUsedOllamaRuntime).toBe(false);
    expect(report.noForbiddenActionPathDetectedBySmoke).toBe(true);
    expect(report.forbiddenActionInstrumentation).toBe("not_available");
    expect(report.providerMutationsAttempted).toBe(false);
    expect(report.shopifyMutationAttempted).toBe(false);
    expect(report.printifyTouched).toBe(false);
    expect(report.hfTouched).toBe(false);
    expect(report.imageGenerationAttempted).toBe(false);
    expect(report.sendSpendPublishAttempted).toBe(false);
    expect(report.tokenEchoDetected).toBe(false);
    expect(provider.calls.length).toBeGreaterThan(0);
  });
});
