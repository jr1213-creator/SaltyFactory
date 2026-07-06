import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelRuntimeProvider, ModelStructuredInput, ModelStructuredResult, ModelTextInput, ModelTextResult, ProviderCheck } from "@saltyfactory/ai-free";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { runWorkerOnce } from "../apps/worker/src/index";
import { POST as runPost } from "../apps/studio/app/api/studio/ai-employees/product-listing-assistant/run/route";
import { GET as transcriptGet } from "../apps/studio/app/api/studio/ai-employees/agent-runs/[id]/transcript/route";

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "owner_user", email: "owner@example.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, workspace) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: workspace,
    supabaseUserId: user.id
  }));
}

function authedRequest(path: string, init: RequestInit = {}) {
  return new Request(`http://localhost:3001${path}`, {
    ...init,
    headers: {
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });
}

class ScriptedProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  calls: ModelTextInput[] = [];

  constructor(private readonly responses: ModelTextResult[]) {}

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    this.calls.push(input);
    return this.responses.shift() ?? { ok: false, providerUsed: "ollama", modelUsed: "qwen3:8b", error: { code: "ollama_invalid_response", message: "No scripted response." } };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    return this.generateText(input) as Promise<ModelStructuredResult<T>>;
  }
}

class DeferredProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  calls: ModelTextInput[] = [];
  private resolver: ((result: ModelTextResult) => void) | null = null;
  private onCall: (() => void) | null = null;
  readonly waitForCall = new Promise<void>((resolve) => { this.onCall = resolve; });

  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }

  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    this.calls.push(input);
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("Product Listing Assistant real-agent route", () => {
  it("requires auth", async () => {
    const response = await runPost(new Request("http://localhost:3001/api/studio/ai-employees/product-listing-assistant/run", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("enqueues the run, returns queued immediately, and completes through the worker", async () => {
    authorizeAsOwner();
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_AGENT_EXECUTION_MODE", "queued");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");

    const provider = new ScriptedProvider([
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: JSON.stringify({
          title: "Draft Tee",
          shortDescription: "Short draft.",
          longDescription: "Long draft for human review.",
          seoTitle: "Draft Tee",
          seoDescription: "SEO draft.",
          tags: ["pod"],
          readinessSummary: "Needs human review.",
          blockingReasons: ["product_data_missing"],
          humanReviewNotes: ["Review before use."]
        })
      }
    ]);

    const response = await runPost(authedRequest("/api/studio/ai-employees/product-listing-assistant/run", {
      method: "POST",
      body: JSON.stringify({ instructions: "Draft listing copy." })
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      status: "queued",
      nextAction: "poll_transcript"
    });
    expect(body.agentRunId).toMatch(/^agent_run_/);
    expect(provider.calls).toHaveLength(0);

    const queuedTranscript = await transcriptGet(authedRequest(`/api/studio/ai-employees/agent-runs/${body.agentRunId}/transcript`), { params: { id: body.agentRunId } });
    expect(queuedTranscript.status).toBe(200);
    const queuedBody = await queuedTranscript.json();
    expect(queuedBody.agentRun.status).toBe("queued");
    expect(queuedBody.agentRun.providerUsed).toBe("ollama");
    expect(queuedBody.agentRun.modelUsed).toBe("qwen3:8b");
    expect(queuedBody.events).toEqual([]);

    const workerResult = await runWorkerOnce(undefined, { agentModelProvider: provider });
    expect(workerResult).toMatchObject({ processed: 1, status: "completed", agentRunId: body.agentRunId });
    expect(provider.calls).toHaveLength(1);

    const transcript = await transcriptGet(authedRequest(`/api/studio/ai-employees/agent-runs/${body.agentRunId}/transcript`), { params: { id: body.agentRunId } });
    expect(transcript.status).toBe(200);
    const transcriptBody = await transcript.json();
    expect(transcriptBody.agentRun.status).toBe("completed");
    expect(transcriptBody.events.length).toBeGreaterThan(0);
    expect(JSON.stringify(transcriptBody)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+|service[_-]?role[_-]?key|sk_live|hf_[A-Za-z0-9]/i);
  });

  it("returns running transcript state while the worker is still executing", async () => {
    authorizeAsOwner();
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_AGENT_EXECUTION_MODE", "queued");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");

    const response = await runPost(authedRequest("/api/studio/ai-employees/product-listing-assistant/run", {
      method: "POST",
      body: JSON.stringify({ instructions: "Draft listing copy." })
    }));
    const body = await response.json();
    const provider = new DeferredProvider();

    const workerPromise = runWorkerOnce(undefined, { agentModelProvider: provider });
    await provider.waitForCall;

    const runningTranscript = await transcriptGet(authedRequest(`/api/studio/ai-employees/agent-runs/${body.agentRunId}/transcript`), { params: { id: body.agentRunId } });
    expect(runningTranscript.status).toBe(200);
    const runningBody = await runningTranscript.json();
    expect(runningBody.agentRun.status).toBe("running");
    expect(runningBody.events.map((event: { eventType: string }) => event.eventType)).toEqual(expect.arrayContaining(["system_message", "user_message"]));

    provider.resolve({
      ok: true,
      providerUsed: "ollama",
      modelUsed: "qwen3:8b",
      text: JSON.stringify({
        title: "Queued Draft Tee",
        shortDescription: "Short draft.",
        longDescription: "Long draft for human review.",
        seoTitle: "Queued Draft Tee",
        seoDescription: "SEO draft.",
        tags: ["pod"],
        readinessSummary: "Needs human review.",
        blockingReasons: [],
        humanReviewNotes: ["Review before use."]
      })
    });
    await workerPromise;
  });

  it("marks the run blocked after worker execution when local Ollama is unavailable", async () => {
    authorizeAsOwner();
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_AGENT_EXECUTION_MODE", "queued");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");

    const response = await runPost(authedRequest("/api/studio/ai-employees/product-listing-assistant/run", {
      method: "POST",
      body: JSON.stringify({ productDraftId: "draft_1" })
    }));
    expect(response.status).toBe(200);
    const body = await response.json();

    const workerResult = await runWorkerOnce(undefined, {
      agentModelProvider: new ScriptedProvider([
        { ok: false, providerUsed: "ollama", modelUsed: "qwen3:8b", error: { code: "ollama_unavailable", message: "No local runtime.", retryable: true } }
      ])
    });
    expect(workerResult).toMatchObject({ ok: false, processed: 1, status: "blocked", agentRunId: body.agentRunId });

    const transcript = await transcriptGet(authedRequest(`/api/studio/ai-employees/agent-runs/${body.agentRunId}/transcript`), { params: { id: body.agentRunId } });
    expect(transcript.status).toBe(200);
    const transcriptBody = await transcript.json();
    expect(transcriptBody.agentRun.status).toBe("blocked");
    expect(transcriptBody.agentRun.blockingReason).toBe("ollama_unavailable");
    expect(transcriptBody.agentRun.errorCode).toBe("ollama_unavailable");
    expect(JSON.stringify(transcriptBody)).not.toContain("deterministic_rules");
  });
});
