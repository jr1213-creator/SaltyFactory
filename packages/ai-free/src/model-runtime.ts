import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { createRepositories, now } from "@saltyfactory/db";

export type ModelProviderKey =
  | "ollama"
  | "lm_studio"
  | "vllm"
  | "huggingface"
  | "openrouter"
  | "qwen"
  | "glm"
  | "ornith"
  | "gemini"
  | "anthropic"
  | "openai"
  | "disabled";

export type ModelProviderType = "local" | "self_hosted" | "hosted_open" | "hosted_closed" | "disabled";
export type ModelRiskLevel = "low" | "medium" | "high";
export type ModelInputSensitivity = "public" | "internal" | "sensitive" | "high_authority";
export type ModelRouteStatus = "selected" | "blocked" | "config_blocked" | "escalation_required";

export type ProviderCheck = {
  ok: boolean;
  status: "ready" | "not_configured" | "disabled" | "error";
  setupRequired: string[];
  blockingReasons: string[];
};

export type ModelTextInput = {
  prompt: string;
  messages?: ModelRuntimeMessage[];
  tools?: ModelRuntimeTool[];
  modelKey?: string;
  taskType: string;
  riskLevel: ModelRiskLevel;
  inputSensitivity: ModelInputSensitivity;
  timeoutMs?: number;
  keepAlive?: string;
  think?: boolean;
};

export type ModelTextResult = {
  ok: boolean;
  providerUsed?: "ollama" | "disabled";
  text?: string;
  modelUsed?: string;
  toolCalls?: ModelRuntimeToolCall[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: {
    code:
      | "ollama_unavailable"
      | "ollama_http_error"
      | "ollama_invalid_response"
      | "ollama_tool_call_parse_failed"
      | "model_runtime_unavailable"
      | "model_not_configured"
      | "disabled";
    message: string;
    retryable?: boolean;
  };
  tokensIn?: number;
  tokensOut?: number;
  errorCode?: string;
  setupRequired?: string[];
};

export type ModelRuntimeMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
};

export type ModelRuntimeTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ModelRuntimeToolCall = {
  id?: string | undefined;
  name: string;
  arguments: unknown;
  raw?: unknown;
};

export type ModelStructuredInput<T> = ModelTextInput & {
  schemaName: string;
  example: T;
};

export type ModelStructuredResult<T> = ModelTextResult & {
  data?: T;
};

export type SanitizedModelProvider = {
  id: string;
  workspace_id: string;
  provider_key: string;
  display_name: string;
  provider_type: string;
  enabled: boolean;
  configured_status: string;
  supports_tools: boolean;
  supports_json: boolean;
  supports_vision: boolean;
  supports_long_context: boolean;
  max_context_tokens: number | null;
  cost_tier: string;
  data_sensitivity_allowed: string;
};

export type SanitizedModel = {
  id: string;
  provider_id: string;
  model_key: string;
  display_name: string;
  model_family: string | null;
  task_strengths: string[];
  weaknesses: string[];
  context_window: number | null;
  recommended_for: string[];
  forbidden_for: string[];
  status: string;
  cost_estimate: Record<string, unknown>;
  rate_limit_estimate: Record<string, unknown>;
  eval_score: Record<string, unknown>;
};

export interface ModelRuntimeProvider {
  providerKey: string;
  verifyConnection(): Promise<ProviderCheck>;
  generateText(input: ModelTextInput): Promise<ModelTextResult>;
  generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>>;
}

export const neverAutonomousTaskTypes = [
  "publish",
  "spend",
  "send",
  "sync",
  "delete",
  "bank_connect",
  "use_ein",
  "provider_credentials",
  "external_order",
  "submit_application"
];

export const lowRiskOpenSourcePreferredTasks = [
  "classify_blocker",
  "summarize_status",
  "draft_task",
  "draft_improvement_suggestion",
  "draft_hire_request",
  "draft_business_doc",
  "draft_product_description",
  "draft_seo_tags",
  "summarize_customer_segment",
  "create_test_suggestion"
];

export const mediumRiskTaskTypes = [
  "business_decision_memo",
  "pricing_recommendation_draft",
  "marketing_campaign_draft",
  "provider_mapping_recommendation"
];

export const highRiskReviewTaskTypes = [
  "architecture_review",
  "security_review",
  "production_code_review",
  "legal_sensitive_doc_review",
  "high_authority_business_document"
];

export const defaultModelProviderCatalog: Array<Pick<WorkspaceRow, "id"> & Record<string, unknown>> = [
  {
    id: "model_provider_disabled",
    provider_key: "disabled",
    display_name: "Disabled model runtime",
    provider_type: "disabled",
    enabled: false,
    configured_status: "disabled",
    supports_tools: false,
    supports_json: false,
    supports_vision: false,
    supports_long_context: false,
    cost_tier: "unknown",
    data_sensitivity_allowed: "public_only"
  },
  {
    id: "model_provider_ollama",
    provider_key: "ollama",
    display_name: "Ollama local runtime",
    provider_type: "local",
    enabled: false,
    configured_status: "not_configured",
    supports_tools: true,
    supports_json: true,
    supports_vision: false,
    supports_long_context: false,
    cost_tier: "free_local",
    data_sensitivity_allowed: "business_internal"
  },
  {
    id: "model_provider_lm_studio",
    provider_key: "lm_studio",
    display_name: "LM Studio local runtime",
    provider_type: "local",
    enabled: false,
    configured_status: "not_configured",
    supports_tools: false,
    supports_json: true,
    supports_vision: false,
    supports_long_context: false,
    cost_tier: "free_local",
    data_sensitivity_allowed: "business_internal"
  },
  {
    id: "model_provider_vllm",
    provider_key: "vllm",
    display_name: "vLLM self-hosted runtime",
    provider_type: "self_hosted",
    enabled: false,
    configured_status: "not_configured",
    supports_tools: true,
    supports_json: true,
    supports_vision: false,
    supports_long_context: true,
    cost_tier: "low",
    data_sensitivity_allowed: "business_internal"
  },
  {
    id: "model_provider_huggingface",
    provider_key: "huggingface",
    display_name: "Hugging Face hosted open models",
    provider_type: "hosted_open",
    enabled: false,
    configured_status: "not_configured",
    supports_tools: false,
    supports_json: true,
    supports_vision: false,
    supports_long_context: false,
    cost_tier: "low",
    data_sensitivity_allowed: "sensitive_blocked"
  },
  {
    id: "model_provider_openrouter",
    provider_key: "openrouter",
    display_name: "OpenRouter hosted models",
    provider_type: "hosted_open",
    enabled: false,
    configured_status: "not_configured",
    supports_tools: true,
    supports_json: true,
    supports_vision: true,
    supports_long_context: true,
    cost_tier: "medium",
    data_sensitivity_allowed: "sensitive_blocked"
  },
  {
    id: "model_provider_gemini",
    provider_key: "gemini",
    display_name: "Gemini optional review runtime",
    provider_type: "hosted_closed",
    enabled: false,
    configured_status: "disabled",
    supports_tools: true,
    supports_json: true,
    supports_vision: true,
    supports_long_context: true,
    cost_tier: "high",
    data_sensitivity_allowed: "high_authority_required"
  },
  {
    id: "model_provider_anthropic",
    provider_key: "anthropic",
    display_name: "Anthropic future optional runtime",
    provider_type: "hosted_closed",
    enabled: false,
    configured_status: "disabled",
    supports_tools: true,
    supports_json: true,
    supports_vision: true,
    supports_long_context: true,
    cost_tier: "high",
    data_sensitivity_allowed: "high_authority_required"
  },
  {
    id: "model_provider_openai",
    provider_key: "openai",
    display_name: "OpenAI future optional runtime",
    provider_type: "hosted_closed",
    enabled: false,
    configured_status: "disabled",
    supports_tools: true,
    supports_json: true,
    supports_vision: true,
    supports_long_context: true,
    cost_tier: "high",
    data_sensitivity_allowed: "high_authority_required"
  }
];

const riskRank: Record<ModelRiskLevel, number> = { low: 1, medium: 2, high: 3 };
const sensitivityRank: Record<ModelInputSensitivity, number> = { public: 1, internal: 2, sensitive: 3, high_authority: 4 };
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const value = (row: WorkspaceRow, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) => row[snake] ?? row[camel];
const estimateRuntimeTokens = (text: string) => Math.ceil(text.length / 4);
const numberOrUndefined = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : undefined;
const ollamaBaseUrl = () => process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const ollamaDefaultModel = () => process.env.OLLAMA_MODEL || "qwen3:8b";
const ollamaDefaultTimeoutMs = () => Number(process.env.OLLAMA_AGENT_TIMEOUT_MS || 120000);
const ollamaDefaultKeepAlive = () => process.env.OLLAMA_AGENT_KEEP_ALIVE || "5m";

function sanitizeRuntimeMessage(message: string) {
  return message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]").replace(/(token|secret|key)=([^&\s]+)/gi, "$1=[redacted]");
}

function parseOllamaToolArguments(raw: unknown): { ok: true; value: unknown } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: {} };
  if (typeof raw === "string") {
    try {
      return { ok: true, value: raw.trim() ? JSON.parse(raw) : {} };
    } catch {
      return { ok: false, message: "Ollama returned tool call arguments that were not valid JSON." };
    }
  }
  if (typeof raw === "object") return { ok: true, value: raw };
  return { ok: false, message: "Ollama returned tool call arguments in an unsupported format." };
}

function normalizeOllamaToolCalls(rawToolCalls: unknown): { ok: true; calls: ModelRuntimeToolCall[] } | { ok: false; message: string } {
  if (!Array.isArray(rawToolCalls) || rawToolCalls.length === 0) return { ok: true, calls: [] };
  const calls: ModelRuntimeToolCall[] = [];
  for (const rawCall of rawToolCalls) {
    const call = rawCall && typeof rawCall === "object" ? rawCall as Record<string, unknown> : {};
    const fn = call.function && typeof call.function === "object" ? call.function as Record<string, unknown> : {};
    const name = typeof fn.name === "string" ? fn.name : typeof call.name === "string" ? call.name : "";
    if (!name) return { ok: false, message: "Ollama returned a tool call without a function name." };
    const parsed = parseOllamaToolArguments(fn.arguments ?? call.arguments);
    if (!parsed.ok) return parsed;
    calls.push({
      ...(typeof call.id === "string" ? { id: call.id } : {}),
      name,
      arguments: parsed.value,
      raw: rawCall
    });
  }
  return { ok: true, calls };
}

function mapOllamaMessages(input: ModelTextInput) {
  const messages = input.messages?.length ? input.messages : [{ role: "user" as const, content: input.prompt }];
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    ...(message.role === "tool" && message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
    ...(message.name ? { name: message.name } : {})
  }));
}

export class DisabledModelRuntimeProvider implements ModelRuntimeProvider {
  constructor(
    public readonly providerKey = "disabled",
    private readonly setupRequired = ["Configure an approved model provider before running this task."]
  ) {}

  async verifyConnection(): Promise<ProviderCheck> {
    return {
      ok: false,
      status: this.providerKey === "disabled" ? "disabled" : "not_configured",
      setupRequired: this.setupRequired,
      blockingReasons: [`${this.providerKey}_not_configured`]
    };
  }

  async generateText(_input?: ModelTextInput): Promise<ModelTextResult> {
    return {
      ok: false,
      providerUsed: "disabled",
      error: {
        code: "disabled",
        message: this.setupRequired[0] ?? "Model runtime is disabled."
      },
      errorCode: `${this.providerKey}_not_configured`,
      setupRequired: this.setupRequired
    };
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    const result = await this.generateText(input);
    return { ...result };
  }
}

export class HttpModelRuntimeProvider implements ModelRuntimeProvider {
  constructor(
    public readonly providerKey: string,
    private readonly baseUrl: string,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async verifyConnection(): Promise<ProviderCheck> {
    if (!this.baseUrl) {
      return {
        ok: false,
        status: "not_configured",
        setupRequired: ["base_url for the local/self-hosted model provider"],
        blockingReasons: [`${this.providerKey}_base_url_missing`]
      };
    }
    const url = this.providerKey === "ollama" ? `${this.baseUrl.replace(/\/$/, "")}/api/tags` : `${this.baseUrl.replace(/\/$/, "")}/v1/models`;
    try {
      const response = await this.fetcher(url, { method: "GET" });
      return {
        ok: response.ok,
        status: response.ok ? "ready" : "error",
        setupRequired: response.ok ? [] : [`${this.providerKey} returned HTTP ${response.status}`],
        blockingReasons: response.ok ? [] : [`${this.providerKey}_connection_failed`]
      };
    } catch {
      return {
        ok: false,
        status: "error",
        setupRequired: [`Start ${this.providerKey} locally and set the provider base URL server-side.`],
        blockingReasons: [`${this.providerKey}_unreachable`]
      };
    }
  }

  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    if (this.providerKey !== "ollama") {
      return {
        ok: false,
        providerUsed: "disabled",
        errorCode: "model_runtime_unavailable",
        error: {
          code: "model_runtime_unavailable",
          message: "Only local Ollama model execution is enabled for real AI employees."
        },
        setupRequired: ["Configure AI_EMPLOYEES_MODEL_PROVIDER=ollama for local AI employee execution."]
      };
    }
    const check = await this.verifyConnection();
    if (!check.ok) {
      return {
        ok: false,
        providerUsed: "ollama",
        modelUsed: input.modelKey || ollamaDefaultModel(),
        error: {
          code: check.blockingReasons[0]?.includes("unreachable") ? "ollama_unavailable" : "model_runtime_unavailable",
          message: check.setupRequired[0] ?? "Local Ollama is not available.",
          retryable: true
        },
        errorCode: check.blockingReasons[0] ?? "model_provider_not_ready",
        setupRequired: check.setupRequired
      };
    }
    const model = input.modelKey || ollamaDefaultModel();
    if (!model.trim()) {
      return {
        ok: false,
        providerUsed: "ollama",
        errorCode: "model_not_configured",
        error: { code: "model_not_configured", message: "No local Ollama model is configured." },
        setupRequired: ["Set OLLAMA_MODEL server-side or approve an Ollama model in the runtime catalog."]
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? ollamaDefaultTimeoutMs());
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/chat`;
    try {
      const response = await this.fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: mapOllamaMessages(input),
          ...(input.tools?.length ? { tools: input.tools } : {}),
          stream: false,
          keep_alive: input.keepAlive ?? ollamaDefaultKeepAlive(),
          think: input.think === true
        })
      });
      if (!response.ok) {
        return {
          ok: false,
          providerUsed: "ollama",
          modelUsed: model,
          errorCode: "ollama_http_error",
          error: {
            code: "ollama_http_error",
            message: `Ollama returned HTTP ${response.status}.`,
            retryable: response.status === 429 || response.status >= 500
          },
          tokensIn: estimateRuntimeTokens(input.prompt)
        };
      }
      const data = await response.json().catch(() => null) as Record<string, unknown> | null;
      const message = data?.message && typeof data.message === "object" ? data.message as Record<string, unknown> : null;
      if (!message) {
        return {
          ok: false,
          providerUsed: "ollama",
          modelUsed: model,
          errorCode: "ollama_invalid_response",
          error: { code: "ollama_invalid_response", message: "Ollama returned a response without a message." }
        };
      }
      const toolCallParse = normalizeOllamaToolCalls(message.tool_calls);
      if (!toolCallParse.ok) {
        return {
          ok: false,
          providerUsed: "ollama",
          modelUsed: model,
          errorCode: "ollama_tool_call_parse_failed",
          error: { code: "ollama_tool_call_parse_failed", message: toolCallParse.message }
        };
      }
      const text = typeof message.content === "string" ? message.content : "";
      const promptTokens = numberOrUndefined(data?.prompt_eval_count);
      const completionTokens = numberOrUndefined(data?.eval_count);
      const usage: ModelTextResult["usage"] = {};
      if (promptTokens != null) usage.promptTokens = promptTokens;
      if (completionTokens != null) usage.completionTokens = completionTokens;
      if (promptTokens != null || completionTokens != null) usage.totalTokens = Number(promptTokens ?? 0) + Number(completionTokens ?? 0);
      return {
        ok: true,
        providerUsed: "ollama",
        modelUsed: typeof data?.model === "string" ? data.model : model,
        text,
        toolCalls: toolCallParse.calls,
        usage,
        tokensIn: promptTokens ?? estimateRuntimeTokens(input.prompt),
        tokensOut: completionTokens ?? estimateRuntimeTokens(text)
      };
    } catch (error) {
      return {
        ok: false,
        providerUsed: "ollama",
        modelUsed: model,
        errorCode: "ollama_unavailable",
        error: {
          code: "ollama_unavailable",
          message: sanitizeRuntimeMessage(error instanceof Error && error.name === "AbortError" ? "Ollama request timed out." : "Local Ollama is not available."),
          retryable: true
        },
        setupRequired: ["Start Ollama locally and make sure the configured model is pulled."]
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    const result = await this.generateText(input);
    return { ...result };
  }
}

export function createModelRuntimeProvider(provider: WorkspaceRow, fetcher?: typeof fetch): ModelRuntimeProvider {
  const providerKey = String(value(provider, "provider_key") ?? "disabled");
  const configuredStatus = String(value(provider, "configured_status") ?? "not_configured");
  const enabled = value(provider, "enabled") === true;
  const baseUrl = String(value(provider, "base_url") ?? (providerKey === "ollama" ? ollamaBaseUrl() : ""));
  const providerType = String(value(provider, "provider_type") ?? "disabled");

  if (!enabled || configuredStatus !== "configured") {
    return new DisabledModelRuntimeProvider(providerKey, [`${providerKey} provider is ${configuredStatus}. Enable and verify it before routing tasks.`]);
  }
  if (providerType === "local" || providerType === "self_hosted") {
    return new HttpModelRuntimeProvider(providerKey, baseUrl, fetcher);
  }
  return new DisabledModelRuntimeProvider(providerKey, [`${providerKey} hosted runtime is registered but no approved server-side adapter is enabled.`]);
}

export async function ensureDefaultModelRuntimeRecords(workspaceId: string, repos = createRepositories()) {
  const existing = await repos.aiModelRuntime.providers.listByWorkspace(workspaceId);
  const existingKeys = new Set(existing.map((row) => String(value(row, "provider_key"))));
  for (const provider of defaultModelProviderCatalog) {
    if (existingKeys.has(String(provider.provider_key))) continue;
    await repos.aiModelRuntime.providers.create({
      ...provider,
      id: `${provider.id}_${workspaceId}`,
      workspace_id: workspaceId
    } as WorkspaceRow);
  }
}

export function sanitizeModelProvider(row: WorkspaceRow): SanitizedModelProvider {
  return {
    id: row.id,
    workspace_id: String(value(row, "workspace_id") ?? ""),
    provider_key: String(value(row, "provider_key") ?? "disabled"),
    display_name: String(value(row, "display_name") ?? "Disabled model runtime"),
    provider_type: String(value(row, "provider_type") ?? "disabled"),
    enabled: Boolean(value(row, "enabled")),
    configured_status: String(value(row, "configured_status") ?? "not_configured"),
    supports_tools: Boolean(value(row, "supports_tools")),
    supports_json: Boolean(value(row, "supports_json")),
    supports_vision: Boolean(value(row, "supports_vision")),
    supports_long_context: Boolean(value(row, "supports_long_context")),
    max_context_tokens: value(row, "max_context_tokens") == null ? null : Number(value(row, "max_context_tokens")),
    cost_tier: String(value(row, "cost_tier") ?? "unknown"),
    data_sensitivity_allowed: String(value(row, "data_sensitivity_allowed") ?? "public_only")
  };
}

const stringArray = (input: unknown): string[] => Array.isArray(input) ? input.map((item) => String(item)) : [];
const objectValue = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};

export function sanitizeModel(row: WorkspaceRow): SanitizedModel {
  return {
    id: row.id,
    provider_id: String(value(row, "provider_id") ?? ""),
    model_key: String(value(row, "model_key") ?? ""),
    display_name: String(value(row, "display_name") ?? value(row, "model_key") ?? "Model candidate"),
    model_family: value(row, "model_family") == null ? null : String(value(row, "model_family")),
    task_strengths: stringArray(value(row, "task_strengths")),
    weaknesses: stringArray(value(row, "weaknesses")),
    context_window: value(row, "context_window") == null ? null : Number(value(row, "context_window")),
    recommended_for: stringArray(value(row, "recommended_for")),
    forbidden_for: stringArray(value(row, "forbidden_for")),
    status: String(value(row, "status") ?? "candidate"),
    cost_estimate: objectValue(value(row, "cost_estimate")),
    rate_limit_estimate: objectValue(value(row, "rate_limit_estimate")),
    eval_score: objectValue(value(row, "eval_score"))
  };
}

function providerAllowsSensitivity(provider: WorkspaceRow, sensitivity: ModelInputSensitivity, authorityApproved: boolean) {
  const allowed = String(value(provider, "data_sensitivity_allowed") ?? "public_only");
  if (allowed === "business_internal") return sensitivityRank[sensitivity] <= sensitivityRank.internal;
  if (allowed === "sensitive_blocked") return sensitivityRank[sensitivity] <= sensitivityRank.internal;
  if (allowed === "high_authority_required") return authorityApproved && sensitivityRank[sensitivity] <= sensitivityRank.high_authority;
  return sensitivity === "public";
}

function providerPreference(taskType: string, provider: WorkspaceRow) {
  const providerType = String(value(provider, "provider_type") ?? "disabled");
  const costTier = String(value(provider, "cost_tier") ?? "unknown");
  const lowRisk = lowRiskOpenSourcePreferredTasks.includes(taskType);
  if (lowRisk && (providerType === "local" || providerType === "self_hosted")) return 0;
  if (lowRisk && providerType === "hosted_open") return 1;
  if (mediumRiskTaskTypes.includes(taskType) && providerType === "hosted_open") return 0;
  if (mediumRiskTaskTypes.includes(taskType) && (providerType === "local" || providerType === "self_hosted")) return 1;
  if (highRiskReviewTaskTypes.includes(taskType) && providerType === "hosted_closed") return 0;
  if (costTier === "free_local") return 2;
  if (costTier === "low") return 3;
  if (costTier === "medium") return 4;
  return 5;
}

export type ChooseModelInput = {
  workspaceId: string;
  employeeId?: string;
  taskType: string;
  riskLevel: ModelRiskLevel;
  dataSensitivity: ModelInputSensitivity;
  requiredCapabilities?: string[];
  authorityApproved?: boolean;
  ownerApprovedEscalation?: boolean;
  repos?: RepositoryBundle;
};

export async function chooseModelForTask(input: ChooseModelInput) {
  const repos = input.repos ?? createRepositories();
  const authorityApproved = input.authorityApproved === true;
  if (neverAutonomousTaskTypes.includes(input.taskType)) {
    return {
      ok: false as const,
      status: "blocked" as const,
      blockingReasons: ["dangerous_action_never_model_routed"],
      setupRequired: ["Use deterministic owner approval gates; do not route this action to a model."]
    };
  }
  if ((input.dataSensitivity === "sensitive" || input.dataSensitivity === "high_authority") && !authorityApproved) {
    return {
      ok: false as const,
      status: "blocked" as const,
      blockingReasons: ["sensitive_input_requires_authority_approval"],
      setupRequired: ["Create and approve a scoped authority request before routing sensitive data."]
    };
  }

  await ensureDefaultModelRuntimeRecords(input.workspaceId, repos);
  const providers = (await repos.aiModelRuntime.providers.listByWorkspace(input.workspaceId))
    .filter((provider) => provider.enabled === true || provider.enabled === "true")
    .filter((provider) => String(value(provider, "configured_status")) === "configured");
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const models = (await repos.aiModelRuntime.models.list())
    .filter((model) => providerById.has(String(value(model, "provider_id"))))
    .filter((model) => String(value(model, "status")) === "approved")
    .filter((model) => {
      const forbidden = (value(model, "forbidden_for") as string[] | undefined) ?? [];
      return !forbidden.includes(input.taskType);
    })
    .filter((model) => {
      const recommended = (value(model, "recommended_for") as string[] | undefined) ?? [];
      return !recommended.length || recommended.includes(input.taskType) || input.requiredCapabilities?.some((capability) => recommended.includes(capability));
    })
    .filter((model) => {
      const provider = providerById.get(String(value(model, "provider_id")))!;
      return providerAllowsSensitivity(provider, input.dataSensitivity, authorityApproved);
    });

  if (!models.length) {
    return {
      ok: false as const,
      status: "config_blocked" as const,
      blockingReasons: ["no_approved_configured_model_for_task"],
      setupRequired: ["Configure and approve a local/open model for this task, or create an owner-reviewed escalation request."]
    };
  }

  const assigned = input.employeeId
    ? (await repos.aiModelRuntime.assignments.list()).find((assignment) => String(value(assignment, "employee_id")) === input.employeeId)
    : null;
  const assignedDefaultId = assigned ? String(value(assigned, "default_model_id") ?? "") : "";
  const assignedModel = assignedDefaultId ? models.find((model) => model.id === assignedDefaultId) : null;

  if (assigned && riskRank[input.riskLevel] > riskRank[String(value(assigned, "max_risk_level") ?? "low") as ModelRiskLevel]) {
    return requestModelEscalation({
      workspaceId: input.workspaceId,
      employeeId: input.employeeId ?? "employee_unknown",
      taskType: input.taskType,
      reason: "Requested risk level exceeds employee model assignment policy.",
      repos
    });
  }

  const sorted = [...models].sort((a, b) => {
    if (assignedModel?.id === a.id) return -1;
    if (assignedModel?.id === b.id) return 1;
    const providerA = providerById.get(String(value(a, "provider_id")))!;
    const providerB = providerById.get(String(value(b, "provider_id")))!;
    return providerPreference(input.taskType, providerA) - providerPreference(input.taskType, providerB);
  });
  const model = sorted[0];
  if (!model) {
    return {
      ok: false as const,
      status: "config_blocked" as const,
      blockingReasons: ["no_approved_configured_model_for_task"],
      setupRequired: ["Configure and approve a local/open model for this task, or create an owner-reviewed escalation request."]
    };
  }
  const provider = providerById.get(String(value(model, "provider_id")));
  if (!provider) {
    return {
      ok: false as const,
      status: "config_blocked" as const,
      blockingReasons: ["selected_model_provider_missing"],
      setupRequired: ["Re-register the model with a configured provider before routing tasks."]
    };
  }

  return {
    ok: true as const,
    status: "selected" as const,
    model,
    provider,
    sanitizedModel: sanitizeModel(model),
    sanitizedProvider: sanitizeModelProvider(provider),
    fallbackUsed: false,
    escalationUsed: false
  };
}

export async function requestModelEscalation(input: {
  workspaceId: string;
  employeeId: string;
  taskType: string;
  reason: string;
  repos?: RepositoryBundle;
}) {
  const repos = input.repos ?? createRepositories();
  const request = await repos.aiWorkforce.capabilityRequests.create({
    id: id("model_escalation"),
    workspace_id: input.workspaceId,
    requested_by_employee_id: input.employeeId,
    employee_id: input.employeeId,
    capability_name: `Model escalation for ${input.taskType}`,
    reason_needed: input.reason,
    current_limitation: "Current approved model policy is insufficient for this task.",
    requested_permission_level: "recommend",
    requested_tools: ["ai_model_runtime_registry"],
    requested_actions: ["request_model_escalation"],
    forbidden_actions: neverAutonomousTaskTypes,
    proposed_guardrails: ["Owner approval required before stronger model assignment", "No provider credentials exposed to the model"],
    approval_requirements: ["Owner reviews model assignment and cost policy"],
    risk_level: "medium",
    status: "pending"
  } as WorkspaceRow);
  return {
    ok: false as const,
    status: "escalation_required" as const,
    blockingReasons: ["model_escalation_requires_owner_review"],
    setupRequired: ["Review the generated capability request before assigning a stronger or premium model."],
    request
  };
}

export async function recordModelUsage(input: {
  workspaceId: string;
  employeeId?: string;
  model: WorkspaceRow;
  provider: WorkspaceRow;
  taskType: string;
  riskLevel: ModelRiskLevel;
  inputSensitivity: ModelInputSensitivity;
  status: "success" | "failed" | "blocked" | "escalated";
  tokensIn?: number;
  tokensOut?: number;
  estimatedCost?: string;
  durationMs?: number;
  errorCode?: string;
  repos?: RepositoryBundle;
}) {
  const repos = input.repos ?? createRepositories();
  return repos.aiModelRuntime.usageEvents.create({
    id: id("model_usage"),
    workspace_id: input.workspaceId,
    employee_id: input.employeeId ?? null,
    model_id: input.model.id,
    provider_id: input.provider.id,
    task_type: input.taskType,
    risk_level: input.riskLevel,
    input_sensitivity: input.inputSensitivity,
    status: input.status,
    tokens_in: input.tokensIn ?? null,
    tokens_out: input.tokensOut ?? null,
    estimated_cost: input.estimatedCost ?? null,
    duration_ms: input.durationMs ?? null,
    error_code: input.errorCode ?? null
  } as WorkspaceRow);
}

export async function runAiEmployeeTaskWithModelRouting(input: ChooseModelInput & { prompt: string }) {
  const repos = input.repos ?? createRepositories();
  const route = await chooseModelForTask({ ...input, repos });
  const runId = id("ai_model_run");
  if (!route.ok) {
    await repos.aiEmployee.runs.create({
      id: runId,
      workspace_id: input.workspaceId,
      employee_id: input.employeeId ?? null,
      run_type: "model_routed_task",
      status: route.status === "escalation_required" ? "blocked" : route.status,
      input: { taskType: input.taskType, riskLevel: input.riskLevel, dataSensitivity: input.dataSensitivity },
      output: { blockingReasons: route.blockingReasons, setupRequired: route.setupRequired },
      started_at: now(),
      completed_at: now()
    } as WorkspaceRow);
    return { ...route, runId };
  }
  const selectedModel = route.model as WorkspaceRow;
  const selectedProvider = route.provider as WorkspaceRow;
  const usageInput = {
    workspaceId: input.workspaceId,
    model: selectedModel,
    provider: selectedProvider,
    taskType: input.taskType,
    riskLevel: input.riskLevel,
    inputSensitivity: input.dataSensitivity,
    status: "success" as const,
    tokensIn: estimateRuntimeTokens(input.prompt),
    tokensOut: 0,
    repos
  };
  const usage = await recordModelUsage(input.employeeId ? { ...usageInput, employeeId: input.employeeId } : usageInput);
  await repos.aiEmployee.runs.create({
    id: runId,
    workspace_id: input.workspaceId,
    employee_id: input.employeeId ?? null,
    run_type: "model_routed_task",
    status: "completed",
    selected_model_id: selectedModel.id,
    selected_provider_id: selectedProvider.id,
    task_type: input.taskType,
    risk_level: input.riskLevel,
    input_sensitivity: input.dataSensitivity,
    fallback_used: false,
    escalation_used: false,
    estimated_cost: null,
    output: { usageEventId: usage.id },
    started_at: now(),
    completed_at: now()
  } as WorkspaceRow);
  return { ...route, usage, runId };
}

export function assertEmployeeCannotSelfAssignModel(input: { actorEmployeeId?: string; targetEmployeeId: string }) {
  if (input.actorEmployeeId && input.actorEmployeeId === input.targetEmployeeId) {
    return {
      ok: false as const,
      status: "blocked" as const,
      blockingReasons: ["employee_cannot_assign_own_model"],
      setupRequired: ["Owner approval is required before changing an employee model assignment."]
    };
  }
  return { ok: true as const };
}
