import { describe, expect, it } from "vitest";
import { DatabaseBackedQueue } from "@saltyfactory/queue";
import { runWorkerOnce } from "../apps/worker/src/index";

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
});
