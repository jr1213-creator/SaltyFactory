import { parseEnv } from "@saltyfactory/config";
import { createRepositories, now, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import {
  getAgentRoleDefinition,
  type AgentRoleDefinition
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
    profileId?: string | undefined;
    launchPlanId?: string | undefined;
    sourceEntityType?: string | undefined;
    sourceEntityId?: string | undefined;
    brandVoiceProfileId?: string | undefined;
    approvalItemId?: string | undefined;
    recommendationId?: string | undefined;
    content?: string | undefined;
    audienceContext?: string | undefined;
    consultationType?: string | undefined;
    sourceKeys?: string[] | undefined;
    maxSignals?: number | undefined;
    maxConcepts?: number | undefined;
    instructions?: string | undefined;
  };
  maxTurns?: number | undefined;
  repos?: RepositoryBundle | undefined;
  modelProvider?: ModelRuntimeProvider | undefined;
  agentRunId?: string | undefined;
  taskQueueId?: string | undefined;
};

export type QueueLocalOllamaAgentRunInput = Omit<RunLocalOllamaAgentTaskInput, "modelProvider" | "agentRunId" | "taskQueueId">;

export type AgentRunJobPayload = {
  agentRunId: string;
  workspaceId: string;
  actorId?: string | undefined;
  roleKey: string;
  taskType: string;
  taskInput: {
    productDraftId?: string | undefined;
    assetId?: string | undefined;
    mockupId?: string | undefined;
    profileId?: string | undefined;
    launchPlanId?: string | undefined;
    sourceEntityType?: string | undefined;
    sourceEntityId?: string | undefined;
    brandVoiceProfileId?: string | undefined;
    approvalItemId?: string | undefined;
    recommendationId?: string | undefined;
    content?: string | undefined;
    audienceContext?: string | undefined;
    consultationType?: string | undefined;
    sourceKeys?: string[] | undefined;
    maxSignals?: number | undefined;
    maxConcepts?: number | undefined;
    instructions?: string | undefined;
  };
  maxTurns?: number | undefined;
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

export type QueuedAgentRunResult =
  | {
    ok: true;
    status: "queued";
    agentRunId: string;
    taskQueueId: string;
    providerUsed: "ollama";
    modelUsed: string;
    turnCount: 0;
    toolCallsExecuted: [];
    payload: AgentRunJobPayload;
  }
  | {
    ok: false;
    status: "blocked" | "failed";
    agentRunId?: string | undefined;
    turnCount: 0;
    toolCallsExecuted: [];
    blockingReason?: string | undefined;
    errorCode?: string | undefined;
    message: string;
  };

type OllamaRuntimeSelection =
  | { ok: true; provider: ModelRuntimeProvider; providerRow: WorkspaceRow; modelKey: string }
  | { ok: false; code: string; message: string };

type AgentRoleValidation =
  | { ok: true; roleDefinition: AgentRoleDefinition }
  | { ok: false; code: "unknown_agent_role" | "unsupported_agent_task_type"; message: string };

type AgentInputRef = { inputRefType: string; inputRefId: string };

const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const stringArray = (input: unknown): string[] => Array.isArray(input) ? input.map(String) : [];
const secretPattern = /Bearer\s+[A-Za-z0-9._~+/=-]{6,}|\bhf_[A-Za-z0-9]{6,}\b|access_token|refresh_token|api[_-]?token|client[_-]?secret|service[_-]?role|authorization/i;

function sanitizeForTranscript(input: unknown): unknown {
  if (typeof input === "string") return secretPattern.test(input) ? sanitizeProviderError(input) : input;
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

function normalizeMaxTurns(input: unknown) {
  return Math.min(parsePositiveInt(input ?? process.env.OLLAMA_AGENT_MAX_TURNS, 6), 12);
}

function agentInputRef(taskInput: RunLocalOllamaAgentTaskInput["taskInput"], workspaceId: string): AgentInputRef {
  if (taskInput.productDraftId) return { inputRefType: "product_draft", inputRefId: taskInput.productDraftId };
  if (taskInput.assetId) return { inputRefType: "asset", inputRefId: taskInput.assetId };
  if (taskInput.mockupId) return { inputRefType: "mockup", inputRefId: taskInput.mockupId };
  if (taskInput.profileId) return { inputRefType: "trend_watch_profile", inputRefId: taskInput.profileId };
  if (taskInput.launchPlanId) return { inputRefType: "marketing_launch_plan", inputRefId: taskInput.launchPlanId };
  if (taskInput.approvalItemId) return { inputRefType: "approval_queue_item", inputRefId: taskInput.approvalItemId };
  if (taskInput.recommendationId) return { inputRefType: "commerce_recommendation", inputRefId: taskInput.recommendationId };
  return { inputRefType: "workspace", inputRefId: workspaceId };
}

function buildUserMessage(input: Pick<RunLocalOllamaAgentTaskInput, "taskType" | "taskInput">) {
  return JSON.stringify({
    taskType: input.taskType,
    productDraftId: input.taskInput.productDraftId ?? null,
    assetId: input.taskInput.assetId ?? null,
    mockupId: input.taskInput.mockupId ?? null,
    profileId: input.taskInput.profileId ?? null,
    launchPlanId: input.taskInput.launchPlanId ?? null,
    sourceEntityType: input.taskInput.sourceEntityType ?? null,
    sourceEntityId: input.taskInput.sourceEntityId ?? null,
    brandVoiceProfileId: input.taskInput.brandVoiceProfileId ?? null,
    approvalItemId: input.taskInput.approvalItemId ?? null,
    recommendationId: input.taskInput.recommendationId ?? null,
    content: input.taskInput.content ?? null,
    audienceContext: input.taskInput.audienceContext ?? null,
    consultationType: input.taskInput.consultationType ?? null,
    sourceKeys: input.taskInput.sourceKeys ?? [],
    maxSignals: input.taskInput.maxSignals ?? null,
    maxConcepts: input.taskInput.maxConcepts ?? null,
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
      // Keep trying likely model output variants.
    }
  }
  return null;
}

function buildJsonRepairMessage(roleDefinition: AgentRoleDefinition) {
  return [
    "Your previous response was not valid JSON.",
    "Return valid JSON only with no markdown, no commentary, and no extra prose.",
    `Follow the ${roleDefinition.roleKey} final output schema exactly.`
  ].join(" ");
}

function buildRunMetadata(base: Record<string, unknown>, patch: Record<string, unknown> = {}) {
  return {
    ...base,
    ...patch,
    realLocalAgent: true,
    deterministicFallback: false
  };
}

function createdDayKey(row: WorkspaceRow) {
  const stamp = String(value(row, "created_at") ?? value(row, "started_at") ?? value(row, "updated_at") ?? "");
  return stamp ? new Date(stamp).toISOString().slice(0, 10) : "";
}

function validateAgentInput(input: Pick<RunLocalOllamaAgentTaskInput, "roleKey" | "taskType">): AgentRoleValidation {
  const roleDefinition = getAgentRoleDefinition(input.roleKey);
  if (!roleDefinition) {
    return { ok: false, code: "unknown_agent_role", message: `Unknown agent role: ${input.roleKey}` };
  }
  if (!roleDefinition.taskTypes.includes(input.taskType)) {
    return {
      ok: false,
      code: "unsupported_agent_task_type",
      message: `Task type ${input.taskType} is not allowed for agent role ${input.roleKey}`
    };
  }
  return { ok: true, roleDefinition };
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
  const current = await repos.aiEmployee.runs.getById(runId);
  const currentMetadata = asRecord(value(current, "metadata"));
  const nextMetadata = patch.metadata === undefined
    ? undefined
    : buildRunMetadata(currentMetadata, asRecord(patch.metadata));
  return repos.aiEmployee.runs.update(runId, {
    ...patch,
    ...(nextMetadata ? { metadata: nextMetadata } : {}),
    updated_at: now(),
    updatedAt: now()
  } as WorkspaceRow);
}

async function persistFinalOutput(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  runId: string;
  actorId?: string | undefined;
  roleDefinition: AgentRoleDefinition;
  taskInput: RunLocalOllamaAgentTaskInput["taskInput"];
  finalText: string;
  parsed: Record<string, unknown> | null;
}) {
  const ref = input.roleDefinition.resolveDefaultOutputRef(input.taskInput, input.workspaceId);
  return input.repos.aiEmployee.outputs.create({
    id: id("aiout_ollama_listing"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    output_type: input.roleDefinition.defaultOutputType,
    ref_type: ref.refType,
    ref_id: ref.refIdFromTask,
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

async function persistBlockedRun(input: {
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
  taskQueueId?: string | undefined;
  existingRun?: boolean | undefined;
}) {
  const completedAt = now();
  const inputRef = agentInputRef(input.taskInput, input.workspaceId);
  const patch: Partial<WorkspaceRow> = {
    workspace_id: input.workspaceId,
    task_id: input.taskQueueId ?? null,
    taskId: input.taskQueueId ?? null,
    employee_type: input.roleKey,
    task_type: input.taskType,
    input_ref_type: inputRef.inputRefType,
    input_ref_id: inputRef.inputRefId,
    status: "blocked",
    provider_used: "ollama",
    model_used: parseEnv().OLLAMA_MODEL,
    output_json: { taskInput: input.taskInput },
    blocked_reasons: [input.code],
    requires_human_review: true,
    updated_by: input.actorId ?? null,
    started_at: completedAt,
    completed_at: completedAt,
    error: input.message,
    metadata: {
      maxTurns: input.maxTurns,
      turnCount: 0,
      blockingReason: input.code,
      errorCode: input.code
    }
  };
  if (input.existingRun) {
    await updateRun(input.repos, input.runId, patch);
  } else {
    await input.repos.aiEmployee.createRun({
      ...patch,
      id: input.runId,
      created_by: input.actorId ?? null
    } as WorkspaceRow);
  }
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

async function countWorkspaceAgentRunsForDay(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  dayKey?: string | undefined;
}) {
  const runs = await input.repos.aiEmployee.runs.listByWorkspace(input.workspaceId);
  const dayKey = input.dayKey ?? new Date().toISOString().slice(0, 10);
  return runs.filter((run) => createdDayKey(run) === dayKey).length;
}

export async function enqueueLocalOllamaAgentRun(input: QueueLocalOllamaAgentRunInput): Promise<QueuedAgentRunResult> {
  const repos = input.repos ?? createRepositories();
  const config = parseEnv();
  const maxTurns = normalizeMaxTurns(input.maxTurns);
  const validation = validateAgentInput({ roleKey: input.roleKey, taskType: input.taskType });

  if (!validation.ok) {
    const runId = id("agent_run");
    await persistBlockedRun({
      repos,
      runId,
      workspaceId: input.workspaceId,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      roleKey: input.roleKey,
      taskType: input.taskType,
      taskInput: input.taskInput,
      code: validation.code,
      message: validation.message,
      maxTurns
    });
    return {
      ok: false,
      status: "blocked",
      agentRunId: runId,
      turnCount: 0,
      toolCallsExecuted: [],
      blockingReason: validation.code,
      errorCode: validation.code,
      message: validation.message
    };
  }

  const dailyLimit = parsePositiveInt(config.AI_EMPLOYEES_AGENT_MAX_RUNS_PER_WORKSPACE_PER_DAY, 25);
  const runsToday = await countWorkspaceAgentRunsForDay({ repos, workspaceId: input.workspaceId });
  if (runsToday >= dailyLimit) {
    return {
      ok: false,
      status: "blocked",
      turnCount: 0,
      toolCallsExecuted: [],
      blockingReason: "agent_daily_limit_exceeded",
      errorCode: "agent_daily_limit_exceeded",
      message: `Daily AI employee run limit reached for workspace ${input.workspaceId}.`
    };
  }

  const runId = id("agent_run");
  const taskQueueId = id("agent_task");
  const queuedAt = now();
  const inputRef = agentInputRef(input.taskInput, input.workspaceId);
  const payload: AgentRunJobPayload = {
    agentRunId: runId,
    workspaceId: input.workspaceId,
    ...(input.actorId ? { actorId: input.actorId } : {}),
    roleKey: input.roleKey,
    taskType: input.taskType,
    taskInput: input.taskInput,
    maxTurns
  };

  await repos.aiEmployee.createRun({
    id: runId,
    workspace_id: input.workspaceId,
    task_id: null,
    employee_type: input.roleKey,
    task_type: input.taskType,
    input_ref_type: inputRef.inputRefType,
    input_ref_id: inputRef.inputRefId,
    status: "queued",
    provider_used: "ollama",
    model_used: config.OLLAMA_MODEL,
    output_json: { taskInput: input.taskInput },
    blocked_reasons: [],
    requires_human_review: true,
    created_by: input.actorId ?? null,
    updated_by: input.actorId ?? null,
    metadata: {
      queuedAt,
      maxTurns,
      turnCount: 0
    }
  } as WorkspaceRow);

  try {
    await repos.aiEmployee.tasks.create({
      id: taskQueueId,
      workspace_id: input.workspaceId,
      employee_type: input.roleKey,
      task_type: "agent_run",
      input_ref_type: inputRef.inputRefType,
      input_ref_id: inputRef.inputRefId,
      priority: 0,
      status: "queued",
      requested_by: input.actorId ?? null,
      instructions: input.taskInput.instructions ?? null,
      input_json: payload as unknown as Record<string, unknown>,
      metadata: {
        workerQueue: true,
        workerQueueType: "agent_run",
        agentRunId: runId,
        queuedAt
      }
    } as WorkspaceRow);
    await updateRun(repos, runId, {
      task_id: taskQueueId,
      taskId: taskQueueId,
      metadata: { queueTaskId: taskQueueId }
    });
  } catch (error) {
    const queueError = sanitizeProviderError(error);
    await appendTranscriptEvent({
      repos,
      workspaceId: input.workspaceId,
      runId,
      turnIndex: 0,
      eventType: "error",
      content: {
        code: "agent_queue_unavailable",
        message: "Durable agent queue is unavailable."
      }
    });
    await updateRun(repos, runId, {
      status: "failed",
      error: "agent_queue_unavailable",
      completed_at: now(),
      metadata: {
        maxTurns,
        turnCount: 0,
        blockingReason: "agent_queue_unavailable",
        errorCode: "agent_queue_unavailable"
      }
    });
    return {
      ok: false,
      status: "failed",
      agentRunId: runId,
      turnCount: 0,
      toolCallsExecuted: [],
      blockingReason: "agent_queue_unavailable",
      errorCode: "agent_queue_unavailable",
      message: queueError || "Durable agent queue is unavailable."
    };
  }

  return {
    ok: true,
    status: "queued",
    agentRunId: runId,
    taskQueueId,
    providerUsed: "ollama",
    modelUsed: config.OLLAMA_MODEL,
    turnCount: 0,
    toolCallsExecuted: [],
    payload
  };
}

export async function runLocalOllamaAgentTask(input: RunLocalOllamaAgentTaskInput): Promise<AgentTaskResult> {
  const repos = input.repos ?? createRepositories();
  const config = parseEnv();
  const maxTurns = normalizeMaxTurns(input.maxTurns);
  const runId = input.agentRunId ?? id("agent_run");
  const validation = validateAgentInput({ roleKey: input.roleKey, taskType: input.taskType });
  const toolCallsExecuted: string[] = [];
  let turnCount = 0;
  let jsonRepairAttempted = false;

  if (!validation.ok) {
    await persistBlockedRun({
      repos,
      runId,
      workspaceId: input.workspaceId,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      roleKey: input.roleKey,
      taskType: input.taskType,
      taskInput: input.taskInput,
      code: validation.code,
      message: validation.message,
      maxTurns,
      ...(input.taskQueueId ? { taskQueueId: input.taskQueueId } : {}),
      ...(input.agentRunId ? { existingRun: true } : {})
    });
    return {
      ok: false,
      status: "blocked",
      agentRunId: runId,
      turnCount: 0,
      toolCallsExecuted,
      blockingReason: validation.code,
      errorCode: validation.code
    };
  }

  const roleDefinition = validation.roleDefinition;
  const inputRef = agentInputRef(input.taskInput, input.workspaceId);
  const startedAt = now();
  const systemPrompt = roleDefinition.buildSystemPrompt({
    roleKey: input.roleKey,
    taskType: input.taskType,
    taskInput: input.taskInput
  });
  const userMessage = buildUserMessage(input);

  try {
    if (input.agentRunId) {
      const existingRun = await repos.aiEmployee.runs.getById(runId, input.workspaceId);
      if (!existingRun) throw new Error(`agent_run_not_found:${runId}`);
      await updateRun(repos, runId, {
        task_id: input.taskQueueId ?? value(existingRun, "task_id") ?? null,
        taskId: input.taskQueueId ?? value(existingRun, "task_id") ?? null,
        employee_type: input.roleKey,
        task_type: input.taskType,
        input_ref_type: inputRef.inputRefType,
        input_ref_id: inputRef.inputRefId,
        status: "running",
        provider_used: "ollama",
        model_used: value(existingRun, "model_used") ?? config.OLLAMA_MODEL,
        output_json: { taskInput: input.taskInput },
        blocked_reasons: [],
        requires_human_review: true,
        updated_by: input.actorId ?? null,
        started_at: value(existingRun, "started_at") ?? startedAt,
        completed_at: null,
        error: null,
        metadata: {
          maxTurns,
          turnCount: 0,
          blockingReason: null,
          errorCode: null
        }
      });
    } else {
      await repos.aiEmployee.createRun({
        id: runId,
        workspace_id: input.workspaceId,
        task_id: input.taskQueueId ?? null,
        employee_type: input.roleKey,
        task_type: input.taskType,
        input_ref_type: inputRef.inputRefType,
        input_ref_id: inputRef.inputRefId,
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
          maxTurns,
          turnCount: 0
        }
      } as WorkspaceRow);
    }

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
      await appendTranscriptEvent({
        repos,
        workspaceId: input.workspaceId,
        runId,
        turnIndex: 0,
        eventType: "blocked",
        content: { code: runtime.code, message: runtime.message }
      });
      await updateRun(repos, runId, {
        status: "blocked",
        blocked_reasons: [runtime.code],
        error: runtime.message,
        completed_at: now(),
        provider_used: "ollama",
        model_used: config.OLLAMA_MODEL,
        metadata: {
          maxTurns,
          turnCount: 0,
          blockingReason: runtime.code,
          errorCode: runtime.code
        }
      });
      return {
        ok: false,
        status: "blocked",
        agentRunId: runId,
        turnCount: 0,
        toolCallsExecuted,
        blockingReason: runtime.code,
        errorCode: runtime.code
      };
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
      taskType: input.taskType,
      taskInput: input.taskInput as Record<string, unknown>,
      repos,
      state: { savedOutputIds: [] },
      ...(input.actorId ? { actorId: input.actorId } : {})
    };

    for (let turn = 1; turn <= maxTurns; turn++) {
      turnCount = turn;
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
      await updateRun(repos, runId, {
        provider_used: "ollama",
        model_used: result.modelUsed ?? runtime.modelKey,
        metadata: {
          maxTurns,
          turnCount: turn
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
          metadata: {
            maxTurns,
            turnCount: turn,
            blockingReason: code,
            errorCode: code
          }
        });
        return {
          ok: false,
          status,
          agentRunId: runId,
          providerUsed: "ollama",
          modelUsed: result.modelUsed ?? runtime.modelKey,
          turnCount: turn,
          toolCallsExecuted,
          blockingReason: code,
          errorCode: code
        };
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
            await appendTranscriptEvent({
              repos,
              workspaceId: input.workspaceId,
              runId,
              turnIndex: turn,
              eventType: "blocked",
              toolName: call.name,
              content: { code, requestedTool: call.name }
            });
            await updateRun(repos, runId, {
              status: "blocked",
              model_used: result.modelUsed ?? runtime.modelKey,
              blocked_reasons: [code],
              error: `Unknown or forbidden tool requested: ${call.name}`,
              completed_at: now(),
              metadata: {
                maxTurns,
                turnCount: turn,
                blockingReason: code,
                errorCode: code
              }
            });
            return {
              ok: false,
              status: "blocked",
              agentRunId: runId,
              providerUsed: "ollama",
              modelUsed: result.modelUsed ?? runtime.modelKey,
              turnCount: turn,
              toolCallsExecuted,
              blockingReason: code,
              errorCode: code
            };
          }
          const validation = validateToolArguments(tool.parameters, call.arguments);
          if (!validation.ok) {
            await appendTranscriptEvent({
              repos,
              workspaceId: input.workspaceId,
              runId,
              turnIndex: turn,
              eventType: "blocked",
              toolName: tool.name,
              content: { code: validation.code, message: validation.message }
            });
            await updateRun(repos, runId, {
              status: "blocked",
              model_used: result.modelUsed ?? runtime.modelKey,
              blocked_reasons: [validation.code],
              error: validation.message,
              completed_at: now(),
              metadata: {
                maxTurns,
                turnCount: turn,
                blockingReason: validation.code,
                errorCode: validation.code
              }
            });
            return {
              ok: false,
              status: "blocked",
              agentRunId: runId,
              providerUsed: "ollama",
              modelUsed: result.modelUsed ?? runtime.modelKey,
              turnCount: turn,
              toolCallsExecuted,
              blockingReason: validation.code,
              errorCode: validation.code
            };
          }
          await appendTranscriptEvent({
            repos,
            workspaceId: input.workspaceId,
            runId,
            turnIndex: turn,
            eventType: "tool_call",
            toolName: tool.name,
            content: { name: tool.name, arguments: validation.value }
          });
          const toolResult = await tool.execute(ctx, validation.value);
          toolCallsExecuted.push(tool.name);
          await appendTranscriptEvent({
            repos,
            workspaceId: input.workspaceId,
            runId,
            turnIndex: turn,
            eventType: "tool_result",
            toolName: tool.name,
            content: { ok: toolResult.ok, data: toolResult.data ?? null, error: toolResult.error ?? null }
          });
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
        if (!parsed && roleDefinition.finalOutputMode === "require_valid_json") {
          if (!jsonRepairAttempted) {
            jsonRepairAttempted = true;
            modelMessages.push({ role: "assistant", content: finalText });
            modelMessages.push({ role: "user", content: buildJsonRepairMessage(roleDefinition) });
            continue;
          }
          const invalidJsonCode = roleDefinition.invalidJsonErrorCode ?? "ollama_invalid_json";
          await appendTranscriptEvent({
            repos,
            workspaceId: input.workspaceId,
            runId,
            turnIndex: turn,
            eventType: "blocked",
            content: { code: invalidJsonCode, message: "Model did not return valid JSON after one repair attempt." }
          });
          await updateRun(repos, runId, {
            status: "failed",
            provider_used: "ollama",
            model_used: result.modelUsed ?? runtime.modelKey,
            blocked_reasons: [],
            error: "Model returned invalid JSON after one repair attempt.",
            completed_at: now(),
            metadata: {
              maxTurns,
              turnCount: turn,
              blockingReason: invalidJsonCode,
              errorCode: invalidJsonCode
            }
          });
          return {
            ok: false,
            status: "failed",
            agentRunId: runId,
            providerUsed: "ollama",
            modelUsed: result.modelUsed ?? runtime.modelKey,
            turnCount: turn,
            toolCallsExecuted,
            blockingReason: invalidJsonCode,
            errorCode: invalidJsonCode
          };
        }
        const savedOutputId = ctx.state?.savedOutputIds?.[0];
        if (!savedOutputId && roleDefinition.requiresSavedOutput) {
          const code = "required_output_not_saved";
          await appendTranscriptEvent({
            repos,
            workspaceId: input.workspaceId,
            runId,
            turnIndex: turn,
            eventType: "blocked",
            content: { code, message: "The role completed without saving a required reviewable output." }
          });
          await updateRun(repos, runId, {
            status: "failed",
            provider_used: "ollama",
            model_used: result.modelUsed ?? runtime.modelKey,
            blocked_reasons: [],
            error: "The role completed without saving a required reviewable output.",
            completed_at: now(),
            metadata: {
              maxTurns,
              turnCount: turn,
              blockingReason: code,
              errorCode: code
            }
          });
          return {
            ok: false,
            status: "failed",
            agentRunId: runId,
            providerUsed: "ollama",
            modelUsed: result.modelUsed ?? runtime.modelKey,
            turnCount: turn,
            toolCallsExecuted,
            blockingReason: code,
            errorCode: code
          };
        }
        const output = savedOutputId
          ? await repos.aiEmployee.outputs.getById(savedOutputId, input.workspaceId)
          : await persistFinalOutput({
            repos,
            workspaceId: input.workspaceId,
            runId,
            ...(input.actorId ? { actorId: input.actorId } : {}),
            roleDefinition,
            taskInput: input.taskInput,
            finalText,
            parsed
          });
        const finalOutputId = output?.id ?? savedOutputId ?? null;
        await appendTranscriptEvent({
          repos,
          workspaceId: input.workspaceId,
          runId,
          turnIndex: turn,
          eventType: "final",
          role: "assistant",
          content: { text: finalText, parsedJson: Boolean(parsed), finalOutputId }
        });
        await updateRun(repos, runId, {
          status: "completed",
          provider_used: "ollama",
          model_used: result.modelUsed ?? runtime.modelKey,
          output_json: { finalOutputId, toolCallsExecuted, finalOutputNotJson: !parsed },
          completed_at: now(),
          metadata: {
            maxTurns,
            turnCount: turn,
            finalOutputId,
            blockingReason: null,
            errorCode: null
          }
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
          ...(finalOutputId ? { finalOutputId } : {}),
          requiresHumanReview: true
        };
      }
    }

    await appendTranscriptEvent({
      repos,
      workspaceId: input.workspaceId,
      runId,
      turnIndex: maxTurns,
      eventType: "blocked",
      content: { code: "max_turns_exceeded", maxTurns }
    });
    await updateRun(repos, runId, {
      status: "incomplete",
      blocked_reasons: ["max_turns_exceeded"],
      error: "The local model did not produce a final answer within the configured turn limit.",
      completed_at: now(),
      metadata: {
        maxTurns,
        turnCount: maxTurns,
        blockingReason: "max_turns_exceeded",
        errorCode: "max_turns_exceeded"
      }
    });
    return {
      ok: false,
      status: "incomplete",
      agentRunId: runId,
      providerUsed: "ollama",
      modelUsed: config.OLLAMA_MODEL,
      turnCount: maxTurns,
      toolCallsExecuted,
      blockingReason: "max_turns_exceeded",
      errorCode: "max_turns_exceeded"
    };
  } catch (error) {
    const message = sanitizeProviderError(error);
    const errorCode = "agent_execution_failed";
    try {
      await appendTranscriptEvent({
        repos,
        workspaceId: input.workspaceId,
        runId,
        turnIndex: turnCount,
        eventType: "error",
        content: { code: errorCode, message }
      });
      await updateRun(repos, runId, {
        status: "failed",
        provider_used: "ollama",
        model_used: config.OLLAMA_MODEL,
        blocked_reasons: [],
        error: message,
        completed_at: now(),
        metadata: {
          maxTurns,
          turnCount,
          blockingReason: errorCode,
          errorCode
        }
      });
    } catch {
      // Preserve the original failure path if persistence is also broken.
    }
    return {
      ok: false,
      status: "failed",
      agentRunId: runId,
      providerUsed: "ollama",
      modelUsed: config.OLLAMA_MODEL,
      turnCount,
      toolCallsExecuted,
      blockingReason: errorCode,
      errorCode
    };
  }
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
