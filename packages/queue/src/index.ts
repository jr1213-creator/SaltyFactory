export type QueueJobType = "generation" | "qa" | "mockup" | "publish" | "background_removal" | "upscale";

export type QueueJob = {
  id: string;
  type: QueueJobType;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  retry_count: number;
  max_retries: number;
  payload: Record<string, unknown>;
  error?: string;
};

function assertInMemoryQueueAllowed() {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("in_memory_queue_forbidden_in_production");
  }
}

export class InMemoryWorkerQueue {
  readonly durable = false;
  readonly persistence = "memory";
  protected readonly jobs = new Map<string, QueueJob>();

  constructor() {
    assertInMemoryQueueAllowed();
  }

  async enqueue(job: Omit<QueueJob, "status" | "retry_count">) {
    const queued = { ...job, status: "queued" as const, retry_count: 0 };
    this.jobs.set(queued.id, queued);
    return queued;
  }

  enqueueGenerationJob(payload: Record<string, unknown>) {
    return this.enqueue({ id: `genjob_${Date.now()}`, type: "generation", max_retries: 3, payload });
  }

  enqueueQaJob(payload: Record<string, unknown>) {
    return this.enqueue({ id: `qa_${Date.now()}`, type: "qa", max_retries: 1, payload });
  }

  enqueueMockupJob(payload: Record<string, unknown>) {
    return this.enqueue({ id: `mockup_${Date.now()}`, type: "mockup", max_retries: 1, payload });
  }

  enqueuePublishJob(payload: Record<string, unknown>) {
    return this.enqueue({ id: `pub_${Date.now()}`, type: "publish", max_retries: 0, payload });
  }

  async claimQueuedJob() {
    const job = [...this.jobs.values()].find((item) => item.status === "queued");
    if (job) job.status = "running";
    return job ?? null;
  }

  async markCompleted(id: string) {
    const job = this.jobs.get(id);
    if (job) job.status = "completed";
    return job;
  }

  async markFailed(id: string, error: string, retryable: boolean) {
    const job = this.jobs.get(id);
    if (!job) return null;
    job.error = error;
    if (retryable && job.retry_count < job.max_retries) {
      job.retry_count++;
      job.status = "queued";
    } else {
      job.status = "failed";
    }
    return job;
  }

  async size() {
    return this.jobs.size;
  }
}

// Compatibility alias. This queue is not database-backed; durable worker jobs use the repository job table.
export class DatabaseBackedQueue extends InMemoryWorkerQueue {}

export async function safeShutdown() {
  return true;
}
