import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentRoleDefinition, AgentToolDefinition, ProviderCheck, ModelRuntimeProvider, ModelStructuredInput, ModelStructuredResult, ModelTextInput, ModelTextResult } from "@saltyfactory/ai-free";
import { listAgentTranscript, runLocalOllamaAgentTask, setAgentRoleDefinitionsForTests } from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore, type WorkspaceRow } from "../packages/db/src/repositories/memory";

const workspaceId = "wks_default";
const actorId = "owner_user";

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

function seedRepos() {
  const repos = createMemoryRepositories(createRepositoryStore());
  return repos;
}

async function seedProductDraft(repos: ReturnType<typeof seedRepos>) {
  await repos.draft.create({
    id: "draft_1",
    workspace_id: workspaceId,
    title: "Coastal Cowgirl Shell Tee",
    description: "A boutique western coastal tee.",
    product_type: "apparel",
    collection: "Summer Drop",
    tags: ["coastal", "cowgirl"],
    asset_id: "asset_1",
    status: "draft",
    printify_status: "mockups_ready",
    shopify_status: "not_created"
  } as WorkspaceRow);
  await repos.variant.create({
    id: "variant_1",
    workspace_id: workspaceId,
    product_draft_id: "draft_1",
    printify_variant_id: "123",
    title: "M / Sand",
    price_cents: 2800,
    cost_cents: 1200,
    status: "selected"
  } as WorkspaceRow);
}

afterEach(() => {
  setAgentRoleDefinitionsForTests(null);
  vi.unstubAllEnvs();
});

describe("local Ollama agent runtime tool loop", () => {
  it("executes an allowlisted tool, records transcript events, and persists final output", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    await seedProductDraft(repos);
    const provider = new ScriptedProvider([
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "",
        toolCalls: [{ id: "call_1", name: "get_product_draft_summary", arguments: { productDraftId: "draft_1" } }]
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: JSON.stringify({
          title: "Coastal Cowgirl Shell Tee",
          shortDescription: "A coastal western tee draft.",
          longDescription: "A boutique POD listing draft for owner review.",
          seoTitle: "Coastal Cowgirl Shell Tee",
          seoDescription: "Coastal western tee for summer.",
          tags: ["coastal", "cowgirl"],
          readinessSummary: "Mockups are ready; Shopify draft is not created.",
          blockingReasons: ["shopify_draft_missing"],
          humanReviewNotes: ["Review final wording before publishing."]
        })
      }
    ]);
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId,
      actorId,
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1" }
    });
    expect(result.status).toBe("completed");
    expect(result.providerUsed).toBe("ollama");
    expect(result.toolCallsExecuted).toContain("get_product_draft_summary");
    expect(result.finalOutputId).toMatch(/^aiout_ollama_listing/);
    const transcript = await listAgentTranscript({ repos, workspaceId, agentRunId: result.agentRunId });
    expect(transcript?.events.map((event) => event.event_type)).toEqual(expect.arrayContaining(["system_message", "user_message", "model_message", "tool_call", "tool_result", "final"]));
    expect(await repos.aiEmployee.outputs.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(JSON.stringify(transcript)).not.toMatch(/deterministic_rules|Bearer\s+[A-Za-z0-9._-]+/);
    expect(provider.calls[0]?.riskLevel).toBe("low");
    expect(provider.calls[0]?.inputSensitivity).toBe("internal");
  });

  it("blocks unknown tool requests before execution", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    await seedProductDraft(repos);
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: new ScriptedProvider([{ ok: true, providerUsed: "ollama", modelUsed: "qwen3:8b", text: "", toolCalls: [{ name: "publish_live_product", arguments: {} }] }]),
      workspaceId,
      actorId,
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1" }
    });
    expect(result.status).toBe("blocked");
    expect(result.blockingReason).toBe("forbidden_tool_requested");
    expect(await repos.aiEmployee.outputs.listByWorkspace(workspaceId)).toHaveLength(0);
  });

  it("blocks invalid tool arguments before execution", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: new ScriptedProvider([{ ok: true, providerUsed: "ollama", modelUsed: "qwen3:8b", text: "", toolCalls: [{ name: "get_product_draft_summary", arguments: {} }] }]),
      workspaceId,
      actorId,
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1" }
    });
    expect(result.status).toBe("blocked");
    expect(result.blockingReason).toBe("invalid_tool_arguments");
  });

  it("marks provider unavailable as blocked and does not fall back to deterministic output", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: new ScriptedProvider([{ ok: false, providerUsed: "ollama", modelUsed: "qwen3:8b", error: { code: "ollama_unavailable", message: "Ollama unavailable.", retryable: true } }]),
      workspaceId,
      actorId,
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1" }
    });
    expect(result.status).toBe("blocked");
    expect(result.blockingReason).toBe("ollama_unavailable");
    const runs = await repos.aiEmployee.runs.listByWorkspace(workspaceId);
    expect(JSON.stringify(runs)).not.toContain("deterministic_rules");
  });

  it("enforces max turns and marks the run incomplete", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    await seedProductDraft(repos);
    const provider = new ScriptedProvider([
      { ok: true, providerUsed: "ollama", modelUsed: "qwen3:8b", text: "", toolCalls: [{ name: "get_product_draft_summary", arguments: { productDraftId: "draft_1" } }] },
      { ok: true, providerUsed: "ollama", modelUsed: "qwen3:8b", text: "", toolCalls: [{ name: "get_product_draft_summary", arguments: { productDraftId: "draft_1" } }] }
    ]);
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId,
      actorId,
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1" },
      maxTurns: 1
    });
    expect(result.status).toBe("incomplete");
    expect(result.errorCode).toBe("max_turns_exceeded");
  });

  it("reads system prompt, tools, risk level, and input sensitivity from the role registry", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    const testTool: AgentToolDefinition = {
      name: "test_registry_summary",
      description: "Returns a safe registry test payload.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          productDraftId: { type: "string", minLength: 1 }
        },
        required: ["productDraftId"]
      },
      riskLevel: "read_only",
      allowedRoles: ["test_registry_role"],
      forbidden: false,
      execute: async (_ctx, args) => ({ ok: true, data: { echoedProductDraftId: String((args as Record<string, unknown>).productDraftId ?? "") } })
    };
    const testRole: AgentRoleDefinition = {
      roleKey: "test_registry_role",
      taskTypes: ["test_registry_task"],
      buildSystemPrompt: () => "REGISTRY TEST SYSTEM PROMPT",
      tools: [testTool],
      defaultRiskLevel: "medium",
      defaultInputSensitivity: "sensitive"
    };
    setAgentRoleDefinitionsForTests([testRole]);
    const provider = new ScriptedProvider([
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: "",
        toolCalls: [{ id: "call_registry", name: "test_registry_summary", arguments: { productDraftId: "draft_test" } }]
      },
      {
        ok: true,
        providerUsed: "ollama",
        modelUsed: "qwen3:8b",
        text: JSON.stringify({
          title: "Registry test listing",
          shortDescription: "Short draft",
          longDescription: "Long draft",
          seoTitle: "SEO title",
          seoDescription: "SEO description",
          tags: ["registry"],
          readinessSummary: "Ready for human review.",
          blockingReasons: [],
          humanReviewNotes: ["Registry-driven run."]
        })
      }
    ]);
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId,
      actorId,
      roleKey: "test_registry_role",
      taskType: "test_registry_task",
      taskInput: { productDraftId: "draft_test" }
    });
    expect(result.status).toBe("completed");
    expect(result.toolCallsExecuted).toEqual(["test_registry_summary"]);
    expect(provider.calls[0]?.messages?.[0]?.content).toBe("REGISTRY TEST SYSTEM PROMPT");
    expect(provider.calls[0]?.tools?.map((tool) => tool.function.name)).toEqual(["test_registry_summary"]);
    expect(provider.calls[0]?.riskLevel).toBe("medium");
    expect(provider.calls[0]?.inputSensitivity).toBe("sensitive");
  });

  it("blocks unknown agent roles before model execution", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    const provider = new ScriptedProvider([]);
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId,
      actorId,
      roleKey: "unknown_role",
      taskType: "draft_product_listing",
      taskInput: { productDraftId: "draft_1" }
    });
    expect(result.status).toBe("blocked");
    expect(result.errorCode).toBe("unknown_agent_role");
    expect(provider.calls).toHaveLength(0);
  });

  it("blocks unsupported task types before model execution", async () => {
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    const repos = seedRepos();
    const provider = new ScriptedProvider([]);
    const result = await runLocalOllamaAgentTask({
      repos,
      modelProvider: provider,
      workspaceId,
      actorId,
      roleKey: "product_listing_assistant",
      taskType: "unsupported_task_type",
      taskInput: { productDraftId: "draft_1" }
    });
    expect(result.status).toBe("blocked");
    expect(result.errorCode).toBe("unsupported_agent_task_type");
    expect(provider.calls).toHaveLength(0);
  });
});
