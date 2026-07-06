import { parseEnv } from "@saltyfactory/config";
import { createRepositories, now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import {
  getAgentRoleDefinition
} from "./agent-roles";
import {
  createModelRuntimeProvider,
  ensureDefaultModelRuntimeRecords,
  type ModelRuntimeMessage,
  type ModelRuntimeProvider,
  type ModelTextResult
} from "./model-runtime";
import {
  type AgentToolContext,
  type AgentToolDefinition,
  toModelRuntimeTools,
  validateToolArguments
} from "./agent-tools";

export type RunLocalOllamaAgentTaskInput = {
  workspaceId: string;
  actorId?: string | undefined;
  roleKey: string;
  taskType: string;
  taskInput: {
    productDraftId?: string | undefined;
    assetId?: string | undefined;
    mockupId?: string | undefined;
    instructions?: string | undefined;
  };
  maxTurns?: number | undefined;
  repos?: RepositoryBundle | undefined;
  modelProvider?: ModelRuntimeProvider | undefined;
};

export type AgentTaskResult = {
  ok: boolean;
  status: "completed" | "blocked" | "failed" | "incomplete";
  agentRunId: string;
  providerUsed?: "ollama" | undefined;
  modelUsed?: string | undefined;
  turnCount: number;
  toolCallsExecuted: string[];
  finalText?: string | undefined;
  finalOutputId?: string | undefined;
  blockingReason?: string | undefined;
  errorCode?: string | undefined;
  requiresHumanReview?: boolean | undefined;
};

type OllamaRuntimeSelection =
  | { ok: true; provider: ModelRuntimeProvider; providerRow: WorkspaceRow; modelKey: string }
  | { ok: false; code: string; message: string };

const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const stringArray = (input: unknown): string[] => Array.isArray(input) ? input.map(String) : [];

function sanitizeForTranscript(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(sanitizeForTranscript);
  if (!input || typeof input !== "object") return input;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (/token|secret|password|credential|authorization|api[_-]?key|service[_-]?role/i.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = sanitizeForTranscript(raw);
  }
  return out;
}

function parsePositiveInt(input: unknown, fallback: number) {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function appendTranscriptEvent(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  runId: string;
  turnIndex: number;
  eventType: "system_message" | "user_message" | "model_message" | "tool_call" | "tool_result" | "blocked" | "final" | "error";
  role?: string;
  toolName?: string;
  content: Record<string, unknown>;
}) {
  return input.repos.aiEmployee.transcriptEvents.create({
    id: id("agent_evt"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    turn_index: input.turnIndex,
    event_type: input.eventType,
    role: input.role ?? null,
    tool_name: input.toolName ?? null,
    content: sanitizeForTranscript(input.content) as Record<string, unknown>
  } as WorkspaceRow);
}

async function updateRun(repos: RepositoryBundle, runId: string, patch: Partial<WorkspaceRow>) {
  return repos.aiEmployee.runs.update(runId, {
    ...patch,
    updated_at: now(),
    updatedAt: now()
  } as WorkspaceRow);
}

function buildUserMessage(input: RunLocalOllamaAgentTaskInput) {
  return JSON.stringify({
    taskType: input.taskType,
    productDraftId: input.taskInput.productDraftId ?? null,
    assetId: input.taskInput.assetId ?? null,
    mockupId: input.taskInput.mockupId ?? null,
    instructions: input.taskInput.instructions ?? "Draft title, description, SEO metadata, and readiness blockers for human review.",
    requirement: "Use the available tools before producing the final draft."
  });
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const candidates = [unfenced];
  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(unfenced.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return asRecord(parsed);
    } catch {
      // keep trying
    }
  }
  return null;
}

async function persistFinalOutput(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  runId: string;
  actorId?: string | undefined;
  productDraftId?: string | undefined;
  finalText: string;
  parsed: Record<string, unknown> | null;
}) {
  return input.repos.aiEmployee.outputs.create({
    id: id("aiout_ollama_listing"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    output_type: "product_listing_draft",
    ref_type: input.productDraftId ? "product_draft" : "workspace",
    ref_id: input.productDraftId ?? input.workspaceId,
    output_json: {
      ...(input.parsed ?? { rawFinalText: input.finalText }),
      source: "local_ollama_agent",
      requiresHumanReview: true,
      warnings: input.parsed ? [] : ["final_output_not_json"]
    },
    status: "pending_review",
    metadata: {
      providerUsed: "ollama",
      finalOutputNotJson: !input.parsed,
      createdBy: input.actorId ?? "system",
      noProviderAction: true,
      noPublishAction: true
    }
  } as WorkspaceRow);
}

async function resolveOllamaRuntime(input: {
  workspaceId: string;
  repos: RepositoryBundle;
  modelProvider?: ModelRuntimeProvider | undefined;
}): Promise<OllamaRuntimeSelection> {
  const config = parseEnv();
  if (!config.AI_EMPLOYEES_REAL_AGENT_ENABLED) {
    return { ok: false, code: "real_agent_disabled", message: "Real local AI employees are disabled. Enable AI_EMPLOYEES_REAL_AGENT_ENABLED server-side." };
  }
  if (config.AI_EMPLOYEES_MODEL_PROVIDER !== "ollama") {
    return { ok: false, code: "unsupported_model_provider", message: "Real AI employees only support local Ollama in this build." };
  }
  if (input.modelProvider) {
    return {
      ok: true,
      provider: input.modelProvider,
      providerRow: {
        id: "provider_ollama_injected",
        workspace_id: input.workspaceId,
        provider_key: "ollama",
        provider_type: "local",
        enabled: true,
        configured_status: "configured"
      },
      modelKey: config.OLLAMA_MODEL
    };
  }

  await ensureDefaultModelRuntimeRecords(input.workspaceId, input.repos);
  const providerRows = (await input.repos.aiModelRuntime.providers.listByWorkspace(input.workspaceId))
    .filter((row) => String(value(row, "provider_key")) === "ollama")
    .filter((row) => value(row, "enabled") === true || value(row, "enabled") === "true")
    .filter((row) => String(value(row, "configured_status")) === "configured");
  const providerRow = providerRows[0] ?? {
    id: "provider_ollama_env",
    workspace_id: input.workspaceId,
    provider_key: "ollama",
    display_name: "Ollama local runtime",
    provider_type: "local",
    base_url: config.OLLAMA_BASE_URL,
    enabled: true,
    configured_status: "configured",
    supports_tools: true,
    supports_json: true
  } as WorkspaceRow;
  const models = (await input.repos.aiModelRuntime.models.list())
    .filter((row) => String(value(row, "provider_id")) === providerRow.id)
    .filter((row) => String(value(row, "status") ?? "approved") === "approved");
  const modelKey = String(value(models[0], "model_key") ?? config.OLLAMA_MODEL);
  return { ok: true, provider: createModelRuntimeProvider(providerRow), providerRow, modelKey };
}

function providerFailureStatus(result: ModelTextResult): AgentTaskResult["status"] {
  if (result.error?.code === "ollama_unavailable" || result.error?.code === "model_not_configured" || result.error?.code === "disabled") return "blocked";
  return "failed";
}

async function createBlockedRoleValidationRun(input: {
  repos: RepositoryBundle;
  runId: string;
  workspaceId: string;
  actorId?: string | undefined;
  roleKey: string;
  taskType: string;
  taskInput: RunLocalOllamaAgentTaskInput["taskInput"];
  code: "unknown_agent_role" | "unsupported_agent_task_type";
  message: string;
  maxTurns: number;
}) {
  const completedAt = now();
  await input.repos.aiEmployee.createRun({
    id: input.runId,
    workspace_id: input.workspaceId,
    employee_type: input.roleKey,
    task_type: input.taskType,
    input_ref_type: input.taskInput.productDraftId ? "product_draft" : input.taskInput.assetId ? "asset" : "workspace",
    input_ref_id: input.taskInput.productDraftId ?? input.taskInput.assetId ?? input.workspaceId,
    status: "blocked",
    provider_used: null,
    model_used: null,
    output_json: { taskInput: input.taskInput },
    blocked_reasons: [input.code],
    requires_human_review: true,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    started_at: completedAt,
    completed_at: completedAt,
    error: input.message,
    metadata: {
      realLocalAgent: true,
      maxTurns: input.maxTurns,
      turnCount: 0,
      blockingReason: input.code,
      deterministicFallback: false
    }
  } as WorkspaceRow);
  await appendTranscriptEvent({
    repos: input.repos,
    workspaceId: input.workspaceId,
    runId: input.runId,
    turnIndex: 0,
    eventType: "blocked",
    content: {
      code: input.code,
      message: input.message,
      roleKey: input.roleKey,
      taskType: input.taskType
    }
  });
}

export async function runLocalOllamaAgentTask(input: RunLocalOllamaAgentTaskInput): Promise<AgentTaskResult> {
  const repos = input.repos ?? createRepositories();
  const maxTurns = Math.min(parsePositiveInt(input.maxTurns ?? process.env.OLLAMA_AGENT_MAX_TURNS, 6), 12);
  const runId = id("agent_run");
  const roleDefinition = getAgentRoleDefinition(input.roleKey);
  if (!roleDefinition) {
    const message = `Unknown agent role: ${input.roleKey}`;
    await createBlockedRoleValidationRun({
      repos,
      runId,
      workspaceId: input.workspaceId,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      roleKey: input.roleKey,
      taskType: input.taskType,
      taskInput: input.taskInput,
      code: "unknown_agent_role",
      message,
      maxTurns
    });
    return { ok: false, status: "blocked", agentRunId: runId, turnCount: 0, toolCallsExecuted: [], blockingReason: "unknown_agent_role", errorCode: "unknown_agent_role" };
  }
  if (!roleDefinition.taskTypes.includes(input.taskType)) {
    const message = `Task type ${input.taskType} is not allowed for agent role ${input.roleKey}`;
    await createBlockedRoleValidationRun({
      repos,
      runId,
      workspaceId: input.workspaceId,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      roleKey: input.roleKey,
      taskType: input.taskType,
      taskInput: input.taskInput,
      code: "unsupported_agent_task_type",
      message,
      maxTurns
    });
    return { ok: false, status: "blocked", agentRunId: runId, turnCount: 0, toolCallsExecuted: [], blockingReason: "unsupported_agent_task_type", errorCode: "unsupported_agent_task_type" };
  }
  const startedAt = now();
  await repos.aiEmployee.createRun({
    id: runId,
    workspace_id: input.workspaceId,
    employee_type: input.roleKey,
    task_type: input.taskType,
    input_ref_type: input.taskInput.productDraftId ? "product_draft" : input.taskInput.assetId ? "asset" : "workspace",
    input_ref_id: input.taskInput.productDraftId ?? input.taskInput.assetId ?? input.workspaceId,
    status: "running",
    provider_used: "ollama",
    model_used: null,
    output_json: { taskInput: input.taskInput },
    blocked_reasons: [],
    requires_human_review: true,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    started_at: startedAt,
    metadata: {
      realLocalAgent: true,
      maxTurns,
      turnCount: 0,
      deterministicFallback: false
    }
  } as WorkspaceRow);

  const systemPrompt = roleDefinition.buildSystemPrompt({
    roleKey: input.roleKey,
    taskType: input.taskType,
    taskInput: input.taskInput
  });
  const userMessage = buildUserMessage(input);
  await appendTranscriptEvent({
    repos,
    workspaceId: input.workspaceId,
    runId,
    turnIndex: 0,
    eventType: "system_message",
    role: "system",
    content: { text: systemPrompt }
  });
  await appendTranscriptEvent({
    repos,
    workspaceId: input.workspaceId,
    runId,
    turnIndex: 0,
    eventType: "user_message",
    role: "user",
    content: { text: userMessage }
  });

  const runtime = await resolveOllamaRuntime({
    workspaceId: input.workspaceId,
    repos,
    ...(input.modelProvider ? { modelProvider: input.modelProvider } : {})
  });
  if (!runtime.ok) {
    await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: 0, eventType: "blocked", content: { code: runtime.code, message: runtime.message } });
    await updateRun(repos, runId, {
      status: "blocked",
      blocked_reasons: [runtime.code],
      error: runtime.message,
      completed_at: now(),
      metadata: { realLocalAgent: true, maxTurns, turnCount: 0, blockingReason: runtime.code, deterministicFallback: false }
    });
    return { ok: false, status: "blocked", agentRunId: runId, turnCount: 0, toolCallsExecuted: [], blockingReason: runtime.code, errorCode: runtime.code };
  }

  const tools = roleDefinition.tools;
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const modelMessages: ModelRuntimeMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];
  const ctx: AgentToolContext = {
    workspaceId: input.workspaceId,
    agentRunId: runId,
    roleKey: input.roleKey,
    repos,
    state: { savedOutputIds: [] },
    ...(input.actorId ? { actorId: input.actorId } : {})
  };
  const toolCallsExecuted: string[] = [];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const result = await runtime.provider.generateText({
      prompt: userMessage,
      messages: modelMessages,
      tools: toModelRuntimeTools(tools),
      modelKey: runtime.modelKey,
      taskType: input.taskType,
      riskLevel: roleDefinition.defaultRiskLevel,
      inputSensitivity: roleDefinition.defaultInputSensitivity,
      timeoutMs: parsePositiveInt(process.env.OLLAMA_AGENT_TIMEOUT_MS, 120000),
      keepAlive: process.env.OLLAMA_AGENT_KEEP_ALIVE || "5m",
      think: process.env.OLLAMA_AGENT_THINK === "true"
    });
    await appendTranscriptEvent({
      repos,
      workspaceId: input.workspaceId,
      runId,
      turnIndex: turn,
      eventType: result.ok ? "model_message" : "error",
      role: "assistant",
      content: {
        ok: result.ok,
        text: result.text ?? "",
        toolCalls: result.toolCalls?.map((call) => ({ id: call.id, name: call.name, arguments: call.arguments })) ?? [],
        error: result.error ?? null
      }
    });

    if (!result.ok) {
      const status = providerFailureStatus(result);
      const code = result.error?.code ?? result.errorCode ?? "model_runtime_unavailable";
      await updateRun(repos, runId, {
        status,
        model_used: result.modelUsed ?? runtime.modelKey,
        blocked_reasons: status === "blocked" ? [code] : [],
        error: result.error?.message ?? code,
        completed_at: now(),
        metadata: { realLocalAgent: true, maxTurns, turnCount: turn, blockingReason: code, deterministicFallback: false }
      });
      return { ok: false, status, agentRunId: runId, providerUsed: "ollama", modelUsed: result.modelUsed ?? runtime.modelKey, turnCount: turn, toolCallsExecuted, blockingReason: code, errorCode: code };
    }

    const toolCalls = result.toolCalls ?? [];
    if (toolCalls.length > 0) {
      modelMessages.push({
        role: "assistant",
        content: result.text ?? ""
      });
      for (const call of toolCalls) {
        const tool = toolsByName.get(call.name);
        if (!tool) {
          const code = "forbidden_tool_requested";
          await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: turn, eventType: "blocked", toolName: call.name, content: { code, requestedTool: call.name } });
          await updateRun(repos, runId, {
            status: "blocked",
            model_used: result.modelUsed ?? runtime.modelKey,
            blocked_reasons: [code],
            error: `Unknown or forbidden tool requested: ${call.name}`,
            completed_at: now(),
            metadata: { realLocalAgent: true, maxTurns, turnCount: turn, blockingReason: code, deterministicFallback: false }
          });
          return { ok: false, status: "blocked", agentRunId: runId, providerUsed: "ollama", modelUsed: result.modelUsed ?? runtime.modelKey, turnCount: turn, toolCallsExecuted, blockingReason: code, errorCode: code };
        }
        const validation = validateToolArguments(tool.parameters, call.arguments);
        if (!validation.ok) {
          await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: turn, eventType: "blocked", toolName: tool.name, content: { code: validation.code, message: validation.message } });
          await updateRun(repos, runId, {
            status: "blocked",
            model_used: result.modelUsed ?? runtime.modelKey,
            blocked_reasons: [validation.code],
            error: validation.message,
            completed_at: now(),
            metadata: { realLocalAgent: true, maxTurns, turnCount: turn, blockingReason: validation.code, deterministicFallback: false }
          });
          return { ok: false, status: "blocked", agentRunId: runId, providerUsed: "ollama", modelUsed: result.modelUsed ?? runtime.modelKey, turnCount: turn, toolCallsExecuted, blockingReason: validation.code, errorCode: validation.code };
        }
        await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: turn, eventType: "tool_call", toolName: tool.name, content: { name: tool.name, arguments: validation.value } });
        const toolResult = await tool.execute(ctx, validation.value);
        toolCallsExecuted.push(tool.name);
        await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: turn, eventType: "tool_result", toolName: tool.name, content: { ok: toolResult.ok, data: toolResult.data ?? null, error: toolResult.error ?? null } });
        modelMessages.push({
          role: "tool",
          name: tool.name,
          toolCallId: call.id ?? tool.name,
          content: JSON.stringify({ tool: tool.name, result: toolResult })
        });
      }
      continue;
    }

    const finalText = result.text?.trim() ?? "";
    if (finalText) {
      const parsed = extractJsonObject(finalText);
      const savedOutputId = ctx.state?.savedOutputIds?.[0];
      const output = savedOutputId
        ? await repos.aiEmployee.outputs.getById(savedOutputId, input.workspaceId)
        : await persistFinalOutput({
          repos,
          workspaceId: input.workspaceId,
          runId,
          ...(input.actorId ? { actorId: input.actorId } : {}),
          ...(input.taskInput.productDraftId ? { productDraftId: input.taskInput.productDraftId } : {}),
          finalText,
          parsed
        });
      await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: turn, eventType: "final", role: "assistant", content: { text: finalText, parsedJson: Boolean(parsed), finalOutputId: output?.id ?? savedOutputId ?? null } });
      await updateRun(repos, runId, {
        status: "completed",
        provider_used: "ollama",
        model_used: result.modelUsed ?? runtime.modelKey,
        output_json: { finalOutputId: output?.id ?? savedOutputId ?? null, toolCallsExecuted, finalOutputNotJson: !parsed },
        completed_at: now(),
        metadata: { realLocalAgent: true, maxTurns, turnCount: turn, finalOutputId: output?.id ?? savedOutputId ?? null, deterministicFallback: false }
      });
      return {
        ok: true,
        status: "completed",
        agentRunId: runId,
        providerUsed: "ollama",
        modelUsed: result.modelUsed ?? runtime.modelKey,
        turnCount: turn,
        toolCallsExecuted,
        finalText,
        ...(output?.id ?? savedOutputId ? { finalOutputId: output?.id ?? savedOutputId } : {}),
        requiresHumanReview: true
      };
    }
  }

  await appendTranscriptEvent({ repos, workspaceId: input.workspaceId, runId, turnIndex: maxTurns, eventType: "blocked", content: { code: "max_turns_exceeded", maxTurns } });
  await updateRun(repos, runId, {
    status: "incomplete",
    blocked_reasons: ["max_turns_exceeded"],
    error: "The local model did not produce a final answer within the configured turn limit.",
    completed_at: now(),
    metadata: { realLocalAgent: true, maxTurns, turnCount: maxTurns, blockingReason: "max_turns_exceeded", deterministicFallback: false }
  });
  return { ok: false, status: "incomplete", agentRunId: runId, providerUsed: "ollama", modelUsed: runtime.modelKey, turnCount: maxTurns, toolCallsExecuted, blockingReason: "max_turns_exceeded", errorCode: "max_turns_exceeded" };
}

export async function listAgentTranscript(input: { workspaceId: string; agentRunId: string; repos?: RepositoryBundle }) {
  const repos = input.repos ?? createRepositories();
  const run = await repos.aiEmployee.runs.getById(input.agentRunId, input.workspaceId);
  if (!run) return null;
  const events = (await repos.aiEmployee.transcriptEvents.listByWorkspace(input.workspaceId))
    .filter((event) => value(event, "run_id") === input.agentRunId)
    .sort((a, b) => Number(value(a, "turn_index") ?? 0) - Number(value(b, "turn_index") ?? 0) || String(value(a, "created_at") ?? "").localeCompare(String(value(b, "created_at") ?? "")));
  return { run, events };
}

export function summarizeTranscriptEvents(events: WorkspaceRow[]) {
  return {
    eventCount: events.length,
    toolCalls: events.filter((event) => value(event, "event_type") === "tool_call").map((event) => String(value(event, "tool_name") ?? "")),
    finalEvents: events.filter((event) => value(event, "event_type") === "final").length,
    blockedEvents: events.filter((event) => value(event, "event_type") === "blocked").length
  };
}

export function assertToolIsAllowedForRole(tool: AgentToolDefinition, roleKey: string) {
  if (!tool.allowedRoles.includes(roleKey)) throw new Error("forbidden_tool_requested");
  return true;
}
