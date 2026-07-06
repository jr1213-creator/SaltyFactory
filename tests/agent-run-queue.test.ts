import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueLocalOllamaAgentRun } from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore, type WorkspaceRow } from "../packages/db/src/repositories/memory";

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("agent run queue", () => {
  it("creates a queued run row and a durable agent task payload", async () => {
    const repos = seedRepos();
    const result = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1", instructions: "Draft listing copy." },
      maxTurns: 4
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const run = await repos.aiEmployee.runs.getById(result.agentRunId, "wks_default");
    expect(run?.status).toBe("queued");
    expect(run?.provider_used).toBe("ollama");
    expect(run?.model_used).toBeTruthy();
    expect(run?.task_id).toBe(result.taskQueueId);

    const task = await repos.aiEmployee.tasks.getById(result.taskQueueId, "wks_default");
    expect(task?.status).toBe("queued");
    expect(task?.task_type).toBe("agent_run");
    expect((task?.input_json as Record<string, unknown>)?.agentRunId).toBe(result.agentRunId);
    expect((task?.input_json as Record<string, unknown>)?.taskType).toBe("draft_product_listing");
  });

  it("blocks unknown roles before enqueueing a worker task", async () => {
    const repos = seedRepos();
    const result = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "unknown_role",
      taskType: "draft_product_listing",
      taskInput: {}
    });

    expect(result).toMatchObject({ ok: false, status: "blocked", errorCode: "unknown_agent_role" });
    expect(await repos.aiEmployee.tasks.listByWorkspace("wks_default")).toHaveLength(0);
  });

  it("blocks unsupported task types before enqueueing a worker task", async () => {
    const repos = seedRepos();
    const result = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "unsupported_task_type",
      taskInput: {}
    });

    expect(result).toMatchObject({ ok: false, status: "blocked", errorCode: "unsupported_agent_task_type" });
    expect(await repos.aiEmployee.tasks.listByWorkspace("wks_default")).toHaveLength(0);
  });

  it("returns agent_daily_limit_exceeded when the workspace cap is reached", async () => {
    vi.stubEnv("AI_EMPLOYEES_AGENT_MAX_RUNS_PER_WORKSPACE_PER_DAY", "1");
    const repos = seedRepos();
    await repos.aiEmployee.runs.create({
      id: "agent_run_existing",
      workspace_id: "wks_default",
      employee_type: "product_listing_assistant",
      task_type: "draft_product_listing",
      status: "completed",
      provider_used: "ollama",
      model_used: "qwen3:8b",
      output_json: {},
      blocked_reasons: [],
      requires_human_review: true,
      metadata: { realLocalAgent: true, deterministicFallback: false }
    } as WorkspaceRow);

    const result = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: {}
    });

    expect(result).toMatchObject({ ok: false, status: "blocked", errorCode: "agent_daily_limit_exceeded" });
    expect(await repos.aiEmployee.tasks.listByWorkspace("wks_default")).toHaveLength(0);
  });
});
