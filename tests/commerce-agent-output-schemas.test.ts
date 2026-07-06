import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ModelRuntimeProvider,
  ModelStructuredInput,
  ModelStructuredResult,
  ModelTextInput,
  ModelTextResult,
  ProviderCheck
} from "@saltyfactory/ai-free";
import {
  COMMERCE_AGENT_INVALID_JSON,
  runLocalOllamaAgentTask
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";

const workspaceId = "wks_default";
const actorId = "shop_manager_schema_test";

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
      text: "still not json"
    };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return this.generateText(input) as Promise<ModelStructuredResult<T>>;
  }
}

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("commerce agent output schemas", () => {
  it("rejects malformed Ollama JSON, retries once, and does not persist malformed output", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_MODEL_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");

    const repos = seedRepos();
    const provider = new ScriptedProvider([
      { ok: true, providerUsed: "ollama", modelUsed: "qwen3:8b", text: "not json" },
      { ok: true, providerUsed: "ollama", modelUsed: "qwen3:8b", text: "still not json" }
    ]);

    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId,
      actorId,
      roleKey: "product_readiness_launch_gate",
      taskType: "run_commerce_agent_os_task",
      taskInput: { instructions: "Return malformed output for schema failure proof." },
      maxTurns: 3
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe(COMMERCE_AGENT_INVALID_JSON);
    expect(result.blockingReason).toBe(COMMERCE_AGENT_INVALID_JSON);
    expect(provider.calls).toHaveLength(2);
    const repairCall = provider.calls[1]!;
    expect(repairCall.messages?.at(-1)?.content).toContain("valid JSON");
    expect(await repos.aiEmployee.outputs.listByWorkspace(workspaceId)).toHaveLength(0);

    const runs = await repos.aiEmployee.runs.listByWorkspace(workspaceId);
    expect(runs[0]?.status).toBe("failed");
    expect(JSON.stringify(runs)).not.toContain("rawFinalText");
  });
});
