import { describe, expect, it } from "vitest";
import { DatabaseBackedQueue } from "@saltyfactory/queue";
import { runWorkerOnce } from "../apps/worker/src/index";

const originalEnv = { ...process.env };

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
