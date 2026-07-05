import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
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

  it("runs through mocked Ollama HTTP and returns an Ollama-labeled output", async () => {
    authorizeAsOwner();
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubEnv("OLLAMA_MODEL", "qwen3:8b");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).endsWith("/api/tags")
      ? jsonResponse({ models: [{ name: "qwen3:8b" }] })
      : jsonResponse({
        model: "qwen3:8b",
        message: {
          role: "assistant",
          content: JSON.stringify({
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
      })) as unknown as typeof fetch);
    const response = await runPost(authedRequest("/api/studio/ai-employees/product-listing-assistant/run", {
      method: "POST",
      body: JSON.stringify({ instructions: "Draft listing copy." })
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.providerUsed).toBe("ollama");
    expect(body.modelUsed).toBe("qwen3:8b");
    expect(body.finalOutputId).toMatch(/^aiout_ollama_listing/);
    expect(JSON.stringify(body)).not.toContain("deterministic_rules");

    const transcript = await transcriptGet(authedRequest(`/api/studio/ai-employees/agent-runs/${body.agentRunId}/transcript`), { params: { id: body.agentRunId } });
    expect(transcript.status).toBe(200);
    const transcriptBody = await transcript.json();
    expect(transcriptBody.events.length).toBeGreaterThan(0);
    expect(JSON.stringify(transcriptBody)).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+|service[_-]?role[_-]?key|sk_live|hf_[A-Za-z0-9]/i);
  });

  it("returns blocked when local Ollama is unavailable", async () => {
    authorizeAsOwner();
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch);
    const response = await runPost(authedRequest("/api/studio/ai-employees/product-listing-assistant/run", {
      method: "POST",
      body: JSON.stringify({ productDraftId: "draft_1" })
    }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("blocked");
    expect(body.blockingReason).toBe("ollama_unavailable");
    expect(JSON.stringify(body)).not.toContain("deterministic_rules");
  });
});
