import { describe, expect, it, vi } from "vitest";
import type { ModelRuntimeProvider, ModelStructuredInput, ModelStructuredResult, ModelTextInput, ModelTextResult, ProviderCheck } from "@saltyfactory/ai-free";
import { listAgentTranscript, runLocalOllamaAgentTask, summarizeTranscriptEvents } from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";

class BlockingProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }
  async generateText(_input: ModelTextInput): Promise<ModelTextResult> {
    return { ok: false, providerUsed: "ollama", modelUsed: "qwen3:8b", error: { code: "ollama_unavailable", message: "No local runtime.", retryable: true } };
  }
  async generateStructured<T>(_input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return { ok: false, providerUsed: "ollama", modelUsed: "qwen3:8b" } as ModelStructuredResult<T>;
  }
}

describe("agent transcript persistence", () => {
  it("creates an ai_employee_run row and stores blocked transcript events", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = createMemoryRepositories(createRepositoryStore());
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: new BlockingProvider(),
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_missing" }
    });
    expect(result.status).toBe("blocked");
    const run = await repos.aiEmployee.runs.getById(result.agentRunId, "wks_default");
    expect(run?.provider_used).toBe("ollama");
    expect(run?.status).toBe("blocked");
    const transcript = await listAgentTranscript({ repos, workspaceId: "wks_default", agentRunId: result.agentRunId });
    expect(transcript?.events.length).toBeGreaterThan(0);
    expect(summarizeTranscriptEvents(transcript?.events ?? []).blockedEvents).toBe(0);
    expect(transcript?.events.some((event) => event.event_type === "error")).toBe(true);
    expect(JSON.stringify(transcript)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+|service[_-]?role[_-]?key|sk_live|hf_[A-Za-z0-9]/i);
  });
});
