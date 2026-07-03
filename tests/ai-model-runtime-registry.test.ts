import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createMemoryRepositories, createRepositoryStore, type WorkspaceRow } from "../packages/db/src/repositories/memory";
import {
  assertEmployeeCannotSelfAssignModel,
  chooseModelForTask,
  createModelRuntimeProvider,
  recordModelUsage,
  requestModelEscalation,
  runAiEmployeeTaskWithModelRouting
} from "@saltyfactory/ai-free";
import { GET as modelsGet, POST as modelsPost } from "../apps/studio/app/api/studio/ai-employees/models/route";
import { POST as evalsPost } from "../apps/studio/app/api/studio/ai-employees/model-evals/route";

const workspaceId = "wks_default";
const originalEnv = { ...process.env };

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
      ...(init.headers ?? {})
    }
  });
}

async function seedApprovedLocalModel() {
  const store = createRepositoryStore();
  const repos = createMemoryRepositories(store);
  const provider = await repos.aiModelRuntime.providers.create({
    id: "provider_ollama_ready",
    workspace_id: workspaceId,
    provider_key: "ollama",
    display_name: "Ollama local runtime",
    provider_type: "local",
    base_url: "http://localhost:11434",
    enabled: true,
    configured_status: "configured",
    supports_json: true,
    supports_tools: false,
    supports_vision: false,
    supports_long_context: false,
    cost_tier: "free_local",
    data_sensitivity_allowed: "business_internal"
  } as WorkspaceRow);
  const model = await repos.aiModelRuntime.models.create({
    id: "model_llama_local",
    workspace_id: workspaceId,
    provider_id: provider.id,
    model_key: "llama3.1:8b",
    display_name: "Llama 3.1 8B Local",
    recommended_for: ["classify_blocker", "draft_task", "summarize_status"],
    forbidden_for: ["publish", "spend", "send", "sync", "delete", "bank_connect", "use_ein", "provider_credentials", "external_order", "submit_application"],
    status: "approved",
    task_strengths: ["classification"],
    weaknesses: [],
    cost_estimate: { tier: "free_local" },
    rate_limit_estimate: {},
    eval_score: { guardrails: 92 }
  } as WorkspaceRow);
  return { repos, provider, model };
}

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("AI model runtime registry routing", () => {
  it("selects an approved local/open model for a low-risk internal task", async () => {
    const { repos, model } = await seedApprovedLocalModel();
    const result = await chooseModelForTask({
      repos,
      workspaceId,
      employeeId: "employee_listing",
      taskType: "classify_blocker",
      riskLevel: "low",
      dataSensitivity: "internal"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected model route selection");
    expect(result.model.id).toBe(model.id);
    expect(result.sanitizedProvider.provider_key).toBe("ollama");
    expect(JSON.stringify(result.sanitizedProvider)).not.toContain("localhost:11434");
  });

  it("returns config-blocked when no approved configured model exists", async () => {
    const repos = createMemoryRepositories(createRepositoryStore());
    const result = await chooseModelForTask({
      repos,
      workspaceId,
      taskType: "draft_task",
      riskLevel: "low",
      dataSensitivity: "internal"
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("config_blocked");
    expect(result.setupRequired).toEqual(expect.arrayContaining(["Configure and approve a local/open model for this task, or create an owner-reviewed escalation request."]));
  });

  it("blocks sensitive data without authority approval", async () => {
    const { repos } = await seedApprovedLocalModel();
    const result = await chooseModelForTask({
      repos,
      workspaceId,
      taskType: "draft_business_doc",
      riskLevel: "medium",
      dataSensitivity: "sensitive"
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.blockingReasons).toContain("sensitive_input_requires_authority_approval");
  });

  it("never routes dangerous actions to model execution", async () => {
    const { repos } = await seedApprovedLocalModel();
    const result = await chooseModelForTask({
      repos,
      workspaceId,
      taskType: "publish",
      riskLevel: "high",
      dataSensitivity: "public"
    });
    expect(result.ok).toBe(false);
    expect(result.blockingReasons).toContain("dangerous_action_never_model_routed");
  });

  it("blocks an employee from assigning its own stronger model", () => {
    expect(assertEmployeeCannotSelfAssignModel({ actorEmployeeId: "employee_1", targetEmployeeId: "employee_1" })).toMatchObject({
      ok: false,
      blockingReasons: ["employee_cannot_assign_own_model"]
    });
  });

  it("creates a capability request instead of automatically escalating", async () => {
    const repos = createMemoryRepositories(createRepositoryStore());
    const result = await requestModelEscalation({
      repos,
      workspaceId,
      employeeId: "employee_strategy",
      taskType: "architecture_review",
      reason: "Needs stronger review model."
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("escalation_required");
    expect((await repos.aiWorkforce.capabilityRequests.listByWorkspace(workspaceId))).toHaveLength(1);
  });

  it("persists model usage events and employee run model metadata", async () => {
    const { repos, model, provider } = await seedApprovedLocalModel();
    await recordModelUsage({
      repos,
      workspaceId,
      employeeId: "employee_listing",
      model,
      provider,
      taskType: "draft_task",
      riskLevel: "low",
      inputSensitivity: "internal",
      status: "success",
      tokensIn: 20,
      tokensOut: 10
    });
    const usage = await repos.aiModelRuntime.usageEvents.listByWorkspace(workspaceId);
    expect(usage[0]?.model_id).toBe(model.id);
    const run = await runAiEmployeeTaskWithModelRouting({
      repos,
      workspaceId,
      employeeId: "employee_listing",
      taskType: "draft_task",
      riskLevel: "low",
      dataSensitivity: "internal",
      prompt: "Draft a listing task."
    });
    expect(run.ok).toBe(true);
    const runs = await repos.aiEmployee.runs.listByWorkspace(workspaceId);
    expect(runs.some((item: WorkspaceRow) => item.selected_model_id === model.id)).toBe(true);
  });

  it("disabled provider shell returns setupRequired", async () => {
    const provider = createModelRuntimeProvider({
      id: "provider_disabled",
      provider_key: "openrouter",
      configured_status: "disabled",
      enabled: false
    } as WorkspaceRow);
    const check = await provider.verifyConnection();
    expect(check.ok).toBe(false);
    expect(check.setupRequired.join(" ")).toContain("openrouter");
  });
});

describe("AI model runtime registry API", () => {
  it("requires auth and never returns provider base URLs or tokens", async () => {
    expect((await modelsGet(new Request("http://localhost:3001/api/studio/ai-employees/models"))).status).toBe(401);
    authorizeAsOwner();
    const post = await modelsPost(authedRequest("/api/studio/ai-employees/models", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerKey: "ollama",
        displayName: "Ollama local runtime",
        providerType: "local",
        baseUrl: "http://localhost:11434",
        modelKey: "llama3.1:8b"
      })
    }));
    expect(post.status).toBe(200);
    const get = await modelsGet(authedRequest("/api/studio/ai-employees/models"));
    const body = await get.json();
    const serialized = JSON.stringify(body);
    expect(serialized).toContain("Ollama local runtime");
    expect(serialized).not.toContain("localhost:11434");
    expect(serialized).not.toMatch(/api[_-]?token|access[_-]?key|secret[_-]?key|bearer\s+[a-z0-9._-]+/i);
  });

  it("persists eval results through the API", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    const created = await modelsPost(authedRequest("/api/studio/ai-employees/models", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerKey: "ollama", providerType: "local", modelKey: "eval-model" })
    }));
    const model = (await created.json()).model;
    const response = await evalsPost(authedRequest("/api/studio/ai-employees/model-evals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        modelId: model.id,
        evalName: "No dangerous action eval",
        taskType: "draft_task",
        passed: true,
        score: 91
      })
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.evaluation.passed).toBe(true);
    expect(body.evaluation.score).toBe(91);
  });
});
