import { describe, expect, it, vi } from "vitest";
import type { ModelRuntimeProvider, ModelStructuredInput, ModelStructuredResult, ModelTextInput, ModelTextResult, ProviderCheck } from "@saltyfactory/ai-free";
import { enqueueLocalOllamaAgentRun } from "@saltyfactory/ai-free";
import { DatabaseBackedQueue } from "@saltyfactory/queue";
import { runWorkerOnce } from "../apps/worker/src/index";
import { createMemoryRepositories, createRepositoryStore, type WorkspaceRow } from "../packages/db/src/repositories/memory";

const originalEnv = { ...process.env };

class ScriptedProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  constructor(private readonly responses: ModelTextResult[]) {}

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(_input: ModelTextInput): Promise<ModelTextResult> {
    return this.responses.shift() ?? { ok: false, providerUsed: "ollama", modelUsed: "qwen3:8b", error: { code: "ollama_invalid_response", message: "No scripted response." } };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return this.generateText(input) as Promise<ModelStructuredResult<T>>;
  }
}

class DeferredProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  private resolver: ((result: ModelTextResult) => void) | null = null;
  private onCall: (() => void) | null = null;
  readonly waitForCall = new Promise<void>((resolve) => { this.onCall = resolve; });

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(_input: ModelTextInput): Promise<ModelTextResult> {
    this.onCall?.();
    return new Promise<ModelTextResult>((resolve) => {
      this.resolver = resolve;
    });
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return this.generateText(input) as Promise<ModelStructuredResult<T>>;
  }

  resolve(result: ModelTextResult) {
    this.resolver?.(result);
  }
}

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

describe("worker flows", () => {
  it("worker run-once exits safely with no jobs", async () => {
    await expect(runWorkerOnce(new DatabaseBackedQueue())).resolves.toMatchObject({ ok: true, processed: 0 });
  });

  it("missing image provider returns setup_required for generation job", async () => {
    const queue = new DatabaseBackedQueue();
    await queue.enqueue({ id: "genjob_disabled", type: "generation", max_retries: 3, payload: { prompt: "x" } });
    await expect(runWorkerOnce(queue)).resolves.toMatchObject({ ok: false, processed: 1, error: "setup_required" });
  });

  it("retryable failure increments retry count", async () => {
    const queue = new DatabaseBackedQueue();
    await queue.enqueue({ id: "genjob_retry", type: "generation", max_retries: 3, payload: {} });
    await queue.markFailed("genjob_retry", "rate_limited", true);
    expect((await queue.claimQueuedJob())?.retry_count).toBe(1);
  });

  it("max retries marks failed", async () => {
    const queue = new DatabaseBackedQueue();
    await queue.enqueue({ id: "genjob_max", type: "generation", max_retries: 1, payload: {} });
    await queue.markFailed("genjob_max", "rate_limited", true);
    const failed = await queue.markFailed("genjob_max", "rate_limited", true);
    expect(failed).toMatchObject({ status: "failed", retry_count: 1 });
  });

  it("publish job is blocked when gates fail", async () => {
    const queue = new DatabaseBackedQueue();
    await queue.enqueue({ id: "pub_blocked", type: "publish", max_retries: 0, payload: {} });
    await expect(runWorkerOnce(queue)).resolves.toMatchObject({ ok: false, processed: 1, error: "publish blocked without approval" });
  });

  it("unhandled queue job types fail instead of completing without handler evidence", async () => {
    const queue = new DatabaseBackedQueue();
    await queue.enqueue({ id: "qa_unhandled", type: "qa", max_retries: 0, payload: {} });
    const result = await runWorkerOnce(queue);
    expect(result).toMatchObject({ ok: false, processed: 1, error: "worker_job_type_unhandled:qa", retryable: false });
    expect(await queue.claimQueuedJob()).toBeNull();
  });

  it("unknown job types fail loudly instead of being marked complete", async () => {
    const queue = new DatabaseBackedQueue();
    await queue.enqueue({ id: "unknown_job", type: "product_magic" as any, max_retries: 0, payload: {} });
    await expect(runWorkerOnce(queue)).resolves.toMatchObject({ ok: false, processed: 1, error: "worker_job_type_unhandled:product_magic" });
  });

  it("processes durable agent_run tasks through the worker and marks the queue task completed", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    const queued = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { instructions: "Draft listing copy." }
    });
    expect(queued.ok).toBe(true);

    const result = await runWorkerOnce(undefined, {
      repos,
      agentModelProvider: new ScriptedProvider([
        {
          ok: true,
          providerUsed: "ollama",
          modelUsed: "qwen3:8b",
          text: JSON.stringify({
            title: "Worker Draft Tee",
            shortDescription: "Short draft.",
            longDescription: "Long draft.",
            seoTitle: "Worker Draft Tee",
            seoDescription: "SEO draft.",
            tags: ["pod"],
            readinessSummary: "Needs human review.",
            blockingReasons: [],
            humanReviewNotes: ["Review before use."]
          })
        }
      ])
    });

    expect(result).toMatchObject({ processed: 1, status: "completed", agentRunId: queued.agentRunId });
    const task = await repos.aiEmployee.tasks.getById((queued as Extract<typeof queued, { ok: true }>).taskQueueId, "wks_default");
    expect(task?.status).toBe("completed");
    expect((task?.metadata as Record<string, unknown>)?.runStatus).toBe("completed");
  });

  it("unknown durable worker job types fail closed", async () => {
    const repos = seedRepos();
    await repos.aiEmployee.tasks.create({
      id: "agent_task_unknown",
      workspace_id: "wks_default",
      employee_type: "product_listing_assistant",
      task_type: "mystery",
      status: "queued",
      input_json: {},
      metadata: { workerQueue: true, workerQueueType: "mystery" }
    } as WorkspaceRow);

    const result = await runWorkerOnce(undefined, { repos });
    expect(result).toMatchObject({ ok: false, processed: 1, error: "worker_job_type_unhandled:mystery" });
    const task = await repos.aiEmployee.tasks.getById("agent_task_unknown", "wks_default");
    expect(task?.status).toBe("failed");
  });

  it("respects the local agent concurrency cap of one running worker job", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_AGENT_MAX_CONCURRENCY", "1");
    const repos = seedRepos();
    const first = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { instructions: "First run." }
    });
    const second = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: "wks_default",
      actorId: "owner_user",
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { instructions: "Second run." }
    });
    expect(first.ok && second.ok).toBe(true);

    const provider = new DeferredProvider();
    const firstWorker = runWorkerOnce(undefined, { repos, agentModelProvider: provider });
    await provider.waitForCall;

    const secondWorker = await runWorkerOnce(undefined, { repos, agentModelProvider: new ScriptedProvider([]) });
    expect(secondWorker).toMatchObject({ ok: true, processed: 0, message: "agent concurrency limit reached" });

    provider.resolve({
      ok: true,
      providerUsed: "ollama",
      modelUsed: "qwen3:8b",
      text: JSON.stringify({
        title: "First worker draft",
        shortDescription: "Short draft.",
        longDescription: "Long draft.",
        seoTitle: "First worker draft",
        seoDescription: "SEO draft.",
        tags: ["pod"],
        readinessSummary: "Needs human review.",
        blockingReasons: [],
        humanReviewNotes: ["Review before use."]
      })
    });
    await firstWorker;

    const thirdWorker = await runWorkerOnce(undefined, {
      repos,
      agentModelProvider: new ScriptedProvider([
        {
          ok: true,
          providerUsed: "ollama",
          modelUsed: "qwen3:8b",
          text: JSON.stringify({
            title: "Second worker draft",
            shortDescription: "Short draft.",
            longDescription: "Long draft.",
            seoTitle: "Second worker draft",
            seoDescription: "SEO draft.",
            tags: ["pod"],
            readinessSummary: "Needs human review.",
            blockingReasons: [],
            humanReviewNotes: ["Review before use."]
          })
        }
      ])
    });
    expect(thirdWorker).toMatchObject({ processed: 1, status: "completed" });
  });

  it("compatibility queue is explicitly in-memory and forbidden in production", () => {
    const queue = new DatabaseBackedQueue();
    expect(queue.durable).toBe(false);
    expect(queue.persistence).toBe("memory");

    process.env.APP_ENV = "production";
    try {
      expect(() => new DatabaseBackedQueue()).toThrow("in_memory_queue_forbidden_in_production");
    } finally {
      process.env = { ...originalEnv };
    }
  });
});
