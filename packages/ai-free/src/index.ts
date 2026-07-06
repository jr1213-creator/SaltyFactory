import {
  HUGGING_FACE_IMAGE_PROVIDER,
  primaryHuggingFaceImageModel,
  publicHuggingFaceImageModelRecommendations,
  unsupportedHuggingFaceImageModelReason,
  validateHuggingFaceImageGenerationRequest,
  type HuggingFaceImageProviderId,
  type HuggingFaceImageValidationStatus,
  type RuntimeConfig
} from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { detectRiskyPhrases, type SourceLabel } from "@saltyfactory/domain";
import { decryptCredential, sanitizeProviderError } from "@saltyfactory/security";

export type ProviderResult<T> =
  | { ok: true; data: T; modelUsed?: string; latencyMs?: number; sourceLabel: SourceLabel; tokenEstimate?: number }
  | { ok: false; error: string; retryable: boolean; rateLimited?: boolean; sourceLabel: SourceLabel; providerStatus?: HuggingFaceImageValidationStatus; setupRequired?: string[] };

const blocked = (error = "provider_disabled"): ProviderResult<never> => ({ ok: false, error, retryable: false, sourceLabel: "rules_based" });

export const promptSafetyPatterns = [/access[_-]?token/i, /refresh[_-]?token/i, /client[_-]?secret/i, /service[_-]?role/i, /ignore previous/i, /system prompt/i];

export function detectPromptSafetyIssues(prompt: string) {
  return [
    ...promptSafetyPatterns.filter((pattern) => pattern.test(prompt)).map((pattern) => `blocked_pattern:${pattern.source}`),
    ...detectRiskyPhrases(prompt).map((hit) => `risky_phrase:${hit}`)
  ];
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

const HUGGING_FACE_ROUTER_BASE_URL = "https://router.huggingface.co";
const defaultValidationPrompt = "Simple coastal western badge art, centered, clean product graphic";

type HuggingFaceImageFailureStatus = Exclude<HuggingFaceImageValidationStatus, "valid">;

export type HuggingFaceImageProviderFailure = {
  ok: false;
  status: HuggingFaceImageFailureStatus;
  safeMessage: string;
  setupRequired: string[];
  nextStep: string;
  retryable: boolean;
  httpStatus?: number;
  recommendedModels: ReturnType<typeof publicHuggingFaceImageModelRecommendations>;
};

export type HuggingFaceImageProviderSuccess = {
  ok: true;
  status: "valid";
  safeMessage: string;
  model: string;
  provider: HuggingFaceImageProviderId;
  contentType: string;
  latencyMs: number;
  bytes?: ArrayBuffer;
  recommendedModels: ReturnType<typeof publicHuggingFaceImageModelRecommendations>;
};

export type HuggingFaceImageProviderCheck = HuggingFaceImageProviderSuccess | HuggingFaceImageProviderFailure;

function encodeModelPath(model: string) {
  return model.trim().split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export function huggingFaceImageRouterEndpoint(model: string, provider: HuggingFaceImageProviderId = HUGGING_FACE_IMAGE_PROVIDER) {
  if (provider !== HUGGING_FACE_IMAGE_PROVIDER) throw Object.assign(new Error("endpoint_misconfigured"), { providerStatus: "endpoint_misconfigured" });
  const encoded = encodeModelPath(model);
  if (!encoded) throw Object.assign(new Error("model_not_found"), { providerStatus: "model_not_found" });
  return `${HUGGING_FACE_ROUTER_BASE_URL}/${provider}/models/${encoded}`;
}

function setupRequiredForStatus(status: HuggingFaceImageFailureStatus) {
  const recommended = publicHuggingFaceImageModelRecommendations()[0]?.model ?? "a recommended Hugging Face text-to-image model";
  const map: Record<HuggingFaceImageFailureStatus, string[]> = {
    token_missing: ["Paste a Hugging Face token in the secure field."],
    token_invalid: ["Generate a fresh Hugging Face token.", "Paste it into the secure field."],
    permission_missing: ["Check token permission: Inference Providers.", "Create a fine-grained token with Make calls to Inference Providers."],
    model_not_found: ["Enter a Hugging Face text-to-image model ID."],
    model_not_supported: [`Try a recommended model such as ${recommended}.`],
    model_gated: ["Open the model on Hugging Face.", "Accept the model terms or choose a non-gated recommended model."],
    quota_or_billing: ["Check Hugging Face Inference Providers billing, credits, rate limits, or quota."],
    provider_unreachable: ["Try again after network connectivity or provider availability recovers."],
    endpoint_misconfigured: ["Use the Hugging Face hf-inference router path configured by SaltyFactory."],
    unknown_provider_error: ["Try again later.", "If it repeats, request setup help with the status code only."]
  };
  return map[status];
}

function nextStepForStatus(status: HuggingFaceImageFailureStatus) {
  const map: Record<HuggingFaceImageFailureStatus, string> = {
    token_missing: "Paste token",
    token_invalid: "Generate token again",
    permission_missing: "Check token permission: Inference Providers",
    model_not_found: "Enter model",
    model_not_supported: "Try a recommended model",
    model_gated: "Accept model terms or choose another model",
    quota_or_billing: "Review billing or quota",
    provider_unreachable: "Try again",
    endpoint_misconfigured: "Use supported provider path",
    unknown_provider_error: "Try again or request setup help"
  };
  return map[status];
}

function safeMessageForStatus(status: HuggingFaceImageFailureStatus, override?: string) {
  if (override) return sanitizeProviderError(override);
  const map: Record<HuggingFaceImageFailureStatus, string> = {
    token_missing: "Paste a Hugging Face token to validate it securely.",
    token_invalid: "Hugging Face did not accept this token. Generate a fresh token and validate again.",
    permission_missing: "This token does not appear to have the Hugging Face Inference Providers permission.",
    model_not_found: "Hugging Face could not find this model ID for text-to-image validation.",
    model_not_supported: "This model is not supported by the selected Hugging Face provider path.",
    model_gated: "This model is gated or requires accepting terms before SaltyFactory can use it.",
    quota_or_billing: "Hugging Face blocked the request because of quota, rate limit, billing, or credits.",
    provider_unreachable: "SaltyFactory could not reach Hugging Face. This is a network or provider availability failure.",
    endpoint_misconfigured: "The Hugging Face provider endpoint is misconfigured for this validation path.",
    unknown_provider_error: "Hugging Face returned an unavailable or unrecognized provider error."
  };
  return map[status];
}

function failure(status: HuggingFaceImageFailureStatus, input: { safeMessage?: string; retryable?: boolean; httpStatus?: number } = {}): HuggingFaceImageProviderFailure {
  return {
    ok: false,
    status,
    safeMessage: safeMessageForStatus(status, input.safeMessage),
    setupRequired: setupRequiredForStatus(status),
    nextStep: nextStepForStatus(status),
    retryable: input.retryable ?? ["provider_unreachable", "unknown_provider_error", "quota_or_billing"].includes(status),
    ...(input.httpStatus ? { httpStatus: input.httpStatus } : {}),
    recommendedModels: publicHuggingFaceImageModelRecommendations()
  };
}

function providerBodyText(body: unknown) {
  if (!body) return "";
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

async function readProviderErrorBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return { body: {}, text: "" };
  try {
    return { body: JSON.parse(text), text };
  } catch {
    return { body: { message: text.slice(0, 500) }, text };
  }
}

export function classifyHuggingFaceImageProviderError(input: {
  httpStatus?: number;
  body?: unknown;
  error?: unknown;
}): Pick<HuggingFaceImageProviderFailure, "status" | "safeMessage" | "setupRequired" | "nextStep" | "retryable" | "httpStatus"> {
  if (input.error) {
    const raw = input.error instanceof Error ? input.error.message : String(input.error);
    if (/endpoint_misconfigured/.test(raw) || (input.error as any)?.providerStatus === "endpoint_misconfigured") return failure("endpoint_misconfigured");
    if (/model_not_found/.test(raw) || (input.error as any)?.providerStatus === "model_not_found") return failure("model_not_found");
    if (/abort|timed\s*out|fetch failed|network|ENOTFOUND|ECONN|EAI_AGAIN|UND_ERR/i.test(raw)) return failure("provider_unreachable");
    return failure("unknown_provider_error");
  }

  const httpStatus = input.httpStatus ?? 0;
  const raw = providerBodyText(input.body);
  const lower = raw.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(lower);

  if (httpStatus === 402 || httpStatus === 429 || has(/quota|billing|credit|payment|required balance|rate.?limit|too many requests|exceeded/)) {
    return failure("quota_or_billing", { httpStatus });
  }
  if ([401, 403].includes(httpStatus) && has(/gated|terms|license|restricted|access request|not authorized to access this model|model access/)) {
    return failure("model_gated", { httpStatus });
  }
  if ([401, 403].includes(httpStatus) && has(/inference providers|make calls|permission|scope|fine.?grained|not allowed|insufficient permission/)) {
    return failure("permission_missing", { httpStatus });
  }
  if (httpStatus === 401) return failure("token_invalid", { httpStatus });
  if (httpStatus === 403) return failure("permission_missing", { httpStatus });
  if (httpStatus === 404 && has(/endpoint|route|cannot\s+(get|post)|router|provider path/)) return failure("endpoint_misconfigured", { httpStatus });
  if (httpStatus === 404) return failure("model_not_found", { httpStatus });
  if (httpStatus === 400 || httpStatus === 422 || has(/not supported|unsupported|no provider|not available|task|text-to-image|text to image|pipeline/)) {
    return failure("model_not_supported", { httpStatus });
  }
  if (httpStatus === 405 || httpStatus === 501) return failure("endpoint_misconfigured", { httpStatus });
  if (httpStatus >= 500) return failure("unknown_provider_error", { httpStatus, retryable: true });
  return httpStatus ? failure("unknown_provider_error", { httpStatus }) : failure("unknown_provider_error");
}

async function requestHuggingFaceImage(input: {
  token: string;
  model: string;
  provider?: HuggingFaceImageProviderId;
  prompt: string;
  negativePrompt?: string;
  parameters?: Record<string, unknown>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  includeBytes?: boolean;
}): Promise<HuggingFaceImageProviderCheck> {
  const token = input.token.trim();
  const model = input.model.trim();
  const provider = input.provider ?? HUGGING_FACE_IMAGE_PROVIDER;
  const started = Date.now();

  if (!token) return failure("token_missing", { retryable: false });
  if (!model) return failure("model_not_found", { retryable: false });
  if (provider !== HUGGING_FACE_IMAGE_PROVIDER) return failure("endpoint_misconfigured", { retryable: false });

  const unsupportedReason = unsupportedHuggingFaceImageModelReason(model);
  if (unsupportedReason) return failure("model_not_supported", { safeMessage: unsupportedReason, retryable: false });
  const capabilityInput: Parameters<typeof validateHuggingFaceImageGenerationRequest>[0] = {
    model,
    transparentBackground: input.parameters?.transparent_background ?? input.parameters?.transparentBackground
  };
  if (input.parameters) capabilityInput.parameters = input.parameters;
  const capabilityCheck = validateHuggingFaceImageGenerationRequest(capabilityInput);
  if (!capabilityCheck.ok) return failure(capabilityCheck.status, { safeMessage: capabilityCheck.safeMessage, retryable: false });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Math.min(input.timeoutMs ?? 60000, 120000)));
  try {
    const response = await (input.fetcher ?? fetch)(huggingFaceImageRouterEndpoint(model, provider), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "image/png"
      },
      body: JSON.stringify({
        inputs: input.prompt,
        parameters: {
          ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
          ...(input.parameters ?? {})
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const { body } = await readProviderErrorBody(response);
      return classifyHuggingFaceImageProviderError({ httpStatus: response.status, body }) as HuggingFaceImageProviderFailure;
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!/^image\//i.test(contentType)) {
      const { body } = await readProviderErrorBody(response);
      const classified = classifyHuggingFaceImageProviderError({ httpStatus: response.status, body });
      return classified.status === "unknown_provider_error"
        ? failure("unknown_provider_error", { safeMessage: "Hugging Face validated the request but did not return image bytes.", httpStatus: response.status })
        : classified as HuggingFaceImageProviderFailure;
    }

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) return failure("unknown_provider_error", { safeMessage: "Hugging Face returned an empty image response.", httpStatus: response.status });

    return {
      ok: true,
      status: "valid",
      safeMessage: "Hugging Face image provider validated through the Inference Providers router.",
      model,
      provider,
      contentType,
      latencyMs: Date.now() - started,
      ...(input.includeBytes ? { bytes } : {}),
      recommendedModels: publicHuggingFaceImageModelRecommendations()
    };
  } catch (error) {
    return classifyHuggingFaceImageProviderError({ error }) as HuggingFaceImageProviderFailure;
  } finally {
    clearTimeout(timeout);
  }
}

export function validateHuggingFaceImageProvider(input: {
  token: string;
  model: string;
  provider?: HuggingFaceImageProviderId;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  return requestHuggingFaceImage({
    token: input.token,
    model: input.model,
    prompt: defaultValidationPrompt,
    parameters: { width: 256, height: 256, num_inference_steps: 1 },
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.fetcher ? { fetcher: input.fetcher } : {}),
    ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
    includeBytes: false
  });
}

export function generateHuggingFaceImage(input: {
  token: string;
  model: string;
  provider?: HuggingFaceImageProviderId;
  prompt: string;
  negativePrompt?: string;
  parameters?: Record<string, unknown>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  return requestHuggingFaceImage({
    token: input.token,
    model: input.model,
    prompt: input.prompt,
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.negativePrompt ? { negativePrompt: input.negativePrompt } : {}),
    ...(input.parameters ? { parameters: input.parameters } : {}),
    ...(input.fetcher ? { fetcher: input.fetcher } : {}),
    ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
    includeBytes: true
  });
}

function rulesBasedDraft(prompt: string, count = 5) {
  const safe = prompt.replace(/\s+/g, " ").trim().slice(0, 120);
  return Array.from({ length: count }, (_, index) => `${safe || "Owner-reviewed draft"} option ${index + 1}`);
}

export class FreeTextProviderDisabled {
  readonly providerId: string = "rules_based";
  readonly enabled: boolean = false;
  async generatePhrases(brief = "", count = 5): Promise<ProviderResult<string[]>> {
    return { ok: true, data: rulesBasedDraft(brief, count), sourceLabel: "rules_based", tokenEstimate: estimateTokens(brief) };
  }
  async generateTitle(brief = "") { return this.generatePhrases(brief, 1); }
  async generateDescription(brief = "") { return this.generatePhrases(brief, 1); }
  async generateTags(brief = "") { return this.generatePhrases(brief, 8); }
  async isHealthy() { return false; }
}

export class HuggingFaceTextProvider extends FreeTextProviderDisabled {
  readonly providerId = "hugging_face";
  readonly enabled = true;
  constructor(private token: string, private model: string, private fetcher: typeof fetch = fetch) {
    super();
    if (!token || !model) throw new Error("HF text provider requires flag, token, and model");
  }

  private async generate(prompt: string, count = 1): Promise<ProviderResult<string[]>> {
    const issues = detectPromptSafetyIssues(prompt);
    if (issues.length) return { ok: false, error: `prompt_blocked:${issues.join(",")}`, retryable: false, sourceLabel: "rules_based" };
    const started = Date.now();
    const response = await this.fetcher(`https://api-inference.huggingface.co/models/${encodeURIComponent(this.model)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 220, return_full_text: false } })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: sanitizeProviderError(json?.error ?? `hf_http_${response.status}`), retryable: response.status >= 500, rateLimited: response.status === 429, sourceLabel: "model_generated" };
    }
    const raw = Array.isArray(json) ? json.map((item) => String(item.generated_text ?? item.summary_text ?? item.text ?? "")).filter(Boolean) : [String(json.generated_text ?? json.text ?? "")].filter(Boolean);
    const data = raw.length ? raw.slice(0, count) : rulesBasedDraft(prompt, count);
    return { ok: true, data, modelUsed: this.model, latencyMs: Date.now() - started, sourceLabel: raw.length ? "model_generated" : "rules_based", tokenEstimate: estimateTokens(prompt + data.join(" ")) };
  }

  async generatePhrases(brief: string, count = 5) { return this.generate(`Generate ${count} safe product phrase drafts for owner review. Avoid trademark, celebrity, sports team, and copyrighted references. Brief: ${brief}`, count); }
  async generateTitle(brief: string) { return this.generate(`Generate one concise ecommerce listing title for owner review. Brief: ${brief}`, 1); }
  async generateDescription(brief: string) { return this.generate(`Generate one ecommerce listing description for owner review. Brief: ${brief}`, 1); }
  async generateTags(brief: string) { return this.generate(`Generate safe ecommerce search tags separated by commas. Brief: ${brief}`, 1); }
  async isHealthy() { return true; }
}

export const createFreeTextProvider = (config: RuntimeConfig, fetcher?: typeof fetch) => config.providers.aiText.enabled ? new HuggingFaceTextProvider(config.HF_API_TOKEN, config.HF_TEXT_MODEL, fetcher) : new FreeTextProviderDisabled();

export class FreeImageProviderDisabled {
  readonly providerId: string = "disabled";
  readonly enabled: boolean = false;
  async generateImage(_prompt?: string, _negative?: string, _parameters?: Record<string, unknown>): Promise<ProviderResult<any>> { return blocked("image_provider_disabled"); }
  async getJobStatus(_jobId?: string): Promise<ProviderResult<any>> { return blocked("image_provider_disabled"); }
  async isHealthy() { return false; }
}

export class HuggingFaceImageProvider extends FreeImageProviderDisabled {
  readonly providerId = "hugging_face_image";
  readonly enabled = true;
  constructor(private token: string, private model: string, private fetcher: typeof fetch = fetch) {
    super();
    if (!token || !model) throw new Error("HF image provider requires flag, token, and model");
  }
  async generateImage(prompt = "", _negative = "", parameters: Record<string, unknown> = {}) {
    const issues = detectPromptSafetyIssues(prompt);
    if (issues.length) return { ok: false as const, error: `prompt_blocked:${issues.join(",")}`, retryable: false, sourceLabel: "rules_based" as const };
    const result = await generateHuggingFaceImage({
      token: this.token,
      model: this.model,
      prompt,
      negativePrompt: _negative,
      parameters,
      fetcher: this.fetcher
    });
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.status,
        retryable: result.retryable,
        rateLimited: result.status === "quota_or_billing",
        sourceLabel: "model_generated" as const,
        providerStatus: result.status,
        setupRequired: result.setupRequired
      };
    }
    if (!result.bytes) {
      return {
        ok: false as const,
        error: "unknown_provider_error",
        retryable: true,
        sourceLabel: "model_generated" as const,
        providerStatus: "unknown_provider_error" as const,
        setupRequired: setupRequiredForStatus("unknown_provider_error")
      };
    }
    return { ok: true as const, data: { bytes: result.bytes, contentType: result.contentType }, modelUsed: this.model, latencyMs: result.latencyMs, sourceLabel: "model_generated" as const, tokenEstimate: estimateTokens(prompt) };
  }
  async getJobStatus(jobId: string) { return { ok: true as const, data: { jobId, status: "completed" }, sourceLabel: "model_generated" as const }; }
  async isHealthy() { return true; }
}

export const createFreeImageProvider = (config: RuntimeConfig, fetcher?: typeof fetch) => config.providers.aiImage.enabled ? new HuggingFaceImageProvider(config.HF_API_TOKEN, config.HF_IMAGE_MODEL, fetcher) : new FreeImageProviderDisabled();

export type ImageGenerationRuntimeStatus = "ready" | "local_demo" | "local_folder" | "config_required" | "invalid" | "owner_gated";
export type ImageGenerationRuntimeProvider = "huggingface" | "local_dev_mock" | "local_folder" | "disabled";
export type ImageGenerationCredentialSource = "credential_store" | "env" | "local_demo" | "local_folder" | "none";

export type PublicImageGenerationProviderResolution = {
  status: ImageGenerationRuntimeStatus;
  provider: ImageGenerationRuntimeProvider;
  model?: string;
  credentialSource: ImageGenerationCredentialSource;
  setupAction: string;
  safeMessage: string;
  setupRequired: string[];
  blockingReasons: string[];
  recommendedModels: ReturnType<typeof publicHuggingFaceImageModelRecommendations>;
  connectionId?: string;
};

export type ImageGenerationProviderResolution = PublicImageGenerationProviderResolution & {
  serverCredential?: {
    token: string;
    source: Extract<ImageGenerationCredentialSource, "credential_store" | "env">;
  };
};

const IMAGE_GENERATION_SETUP_ACTION = "/studio/onboarding/providers/image-generation";
const imageProviderConnectionKeys = ["image_generation", "huggingface", "hugging_face"] as const;

function isProductionRuntime(config: RuntimeConfig) {
  return config.APP_ENV === "production" || config.NODE_ENV === "production";
}

function credentialStorageReady(config: RuntimeConfig) {
  return Boolean(config.CREDENTIAL_STORAGE_ENABLED && config.CREDENTIAL_ENCRYPTION_KEY && config.CREDENTIAL_ENCRYPTION_KEY.trim().length >= 32);
}

function field(row: WorkspaceRow | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "boolean") return String(value);
  }
  return "";
}

function record(row: WorkspaceRow | null | undefined, ...keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = row?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  }
  return {};
}

async function findImageGenerationConnection(repos: RepositoryBundle, workspaceId: string) {
  for (const key of imageProviderConnectionKeys) {
    const row = await repos.integration.getProviderConnectionForWorkspace(workspaceId, key);
    if (row) return row;
  }
  return (await repos.integration.listProviderConnectionsForWorkspace(workspaceId)).find((row) => {
    const providerKey = field(row, "provider_key", "providerKey", "provider_type", "providerType", "provider");
    return imageProviderConnectionKeys.includes(providerKey as typeof imageProviderConnectionKeys[number]);
  }) ?? null;
}

function withServerCredential(
  resolution: PublicImageGenerationProviderResolution,
  credential?: ImageGenerationProviderResolution["serverCredential"]
): ImageGenerationProviderResolution {
  const result = { ...resolution } as ImageGenerationProviderResolution;
  if (credential) {
    Object.defineProperty(result, "serverCredential", {
      value: credential,
      enumerable: false,
      configurable: false,
      writable: false
    });
  }
  return result;
}

function publicResolution(input: PublicImageGenerationProviderResolution): ImageGenerationProviderResolution {
  return withServerCredential(input);
}

function recommendedModelSetupRequired() {
  return [`Try a recommended model such as ${primaryHuggingFaceImageModel()}.`];
}

function invalidResolution(input: {
  safeMessage: string;
  setupRequired: string[];
  blockingReasons?: string[];
  credentialSource?: ImageGenerationCredentialSource;
  model?: string;
  connectionId?: string;
}) {
  return publicResolution({
    status: "invalid",
    provider: "huggingface",
    ...(input.model ? { model: input.model } : {}),
    credentialSource: input.credentialSource ?? "credential_store",
    setupAction: IMAGE_GENERATION_SETUP_ACTION,
    safeMessage: input.safeMessage,
    setupRequired: input.setupRequired,
    blockingReasons: input.blockingReasons ?? input.setupRequired,
    recommendedModels: publicHuggingFaceImageModelRecommendations(),
    ...(input.connectionId ? { connectionId: input.connectionId } : {})
  });
}

async function resolveCredentialStoreImageProvider(input: {
  repos?: RepositoryBundle | undefined;
  config: RuntimeConfig;
  workspaceId: string;
}) {
  if (!input.repos) return null;
  const connection = await findImageGenerationConnection(input.repos, input.workspaceId);
  if (!connection) return null;
  const status = field(connection, "status");
  const enabled = connection.enabled ?? connection["enabled"];
  const connectionId = connection.id;
  const configuration = record(connection, "configuration", "metadata");
  const imageProvider = String(configuration.imageProvider ?? configuration.provider ?? "hugging_face").replace(/-/g, "_");
  const model = String(configuration.imageModel ?? configuration.model ?? field(connection, "image_model", "imageModel", "model")).trim();
  const credentialRef = field(connection, "secret_ref", "secretRef", "credential_ref", "credentialRef");

  if (status !== "connected") return null;
  if (enabled === false) {
    return invalidResolution({
      safeMessage: "The saved image provider record is connected but disabled. Reconnect it from Launch Setup Concierge.",
      setupRequired: ["Reconnect image generation provider"],
      blockingReasons: ["provider_connection_disabled"],
      model,
      connectionId
    });
  }
  if (!["hugging_face", "huggingface"].includes(imageProvider)) {
    return invalidResolution({
      safeMessage: "The saved image provider is not supported by the current image generation runtime.",
      setupRequired: ["Use the Hugging Face provider path"],
      blockingReasons: ["provider_metadata_invalid"],
      model,
      connectionId
    });
  }
  if (!model) {
    return invalidResolution({
      safeMessage: "The connected image provider is missing a selected model. Revalidate it from Launch Setup Concierge.",
      setupRequired: ["Select and validate an image model"],
      blockingReasons: ["image_model_missing"],
      connectionId
    });
  }
  const unsupportedReason = unsupportedHuggingFaceImageModelReason(model);
  if (unsupportedReason) {
    return invalidResolution({
      safeMessage: unsupportedReason,
      setupRequired: recommendedModelSetupRequired(),
      blockingReasons: ["model_not_supported"],
      model,
      connectionId
    });
  }
  if (!credentialRef) {
    return invalidResolution({
      safeMessage: "The connected image provider is missing its secure credential reference. Reconnect it from Launch Setup Concierge.",
      setupRequired: ["Reconnect Hugging Face token"],
      blockingReasons: ["credential_reference_missing"],
      model,
      connectionId
    });
  }
  if (!credentialStorageReady(input.config)) {
    return invalidResolution({
      safeMessage: "Secure credential storage is not available, so the saved image provider cannot be used at runtime.",
      setupRequired: ["Enable encrypted credential storage", "Configure the server encryption key"],
      blockingReasons: ["credential_storage_unavailable"],
      model,
      connectionId
    });
  }
  try {
    const credential = await input.repos.integration.getCredentialForServerUseOnly(input.workspaceId, credentialRef);
    if (!credential || credential.status === "revoked") {
      return invalidResolution({
        safeMessage: "The saved image provider credential is not active. Reconnect it from Launch Setup Concierge.",
        setupRequired: ["Reconnect Hugging Face token"],
        blockingReasons: ["credential_inactive"],
        model,
        connectionId
      });
    }
    const token = decryptCredential(credential.encrypted_payload as any, input.config.CREDENTIAL_ENCRYPTION_KEY);
    if (!token.trim()) {
      return invalidResolution({
        safeMessage: "The saved image provider credential is empty. Reconnect it from Launch Setup Concierge.",
        setupRequired: ["Reconnect Hugging Face token"],
        blockingReasons: ["credential_empty"],
        model,
        connectionId
      });
    }
    return withServerCredential({
      status: "ready",
      provider: "huggingface",
      model,
      credentialSource: "credential_store",
      setupAction: IMAGE_GENERATION_SETUP_ACTION,
      safeMessage: "Image generation connected through Launch Setup Concierge.",
      setupRequired: [],
      blockingReasons: [],
      recommendedModels: publicHuggingFaceImageModelRecommendations(),
      connectionId
    }, { token, source: "credential_store" });
  } catch {
    return invalidResolution({
      safeMessage: "The saved image provider credential could not be read. Reconnect it from Launch Setup Concierge.",
      setupRequired: ["Reconnect Hugging Face token"],
      blockingReasons: ["credential_read_failed"],
      model,
      connectionId
    });
  }
}

function resolveLocalDemoImageProvider(config: RuntimeConfig) {
  const localRequested = config.IMAGE_GENERATION_ENABLED && config.IMAGE_GENERATION_PROVIDER === "local_dev_mock";
  if (!localRequested) return null;
  if (isProductionRuntime(config)) {
    return publicResolution({
      status: "invalid",
      provider: "local_dev_mock",
      model: "local-dev-fixture",
      credentialSource: "local_demo",
      setupAction: IMAGE_GENERATION_SETUP_ACTION,
      safeMessage: "Local demo image mode is development/test-only and cannot be used in production.",
      setupRequired: ["Configure a real Hugging Face image provider"],
      blockingReasons: ["local_demo_blocked_in_production"],
      recommendedModels: publicHuggingFaceImageModelRecommendations()
    });
  }
  if (!config.LOCAL_DEV_IMAGE_GENERATION) {
    return publicResolution({
      status: "config_required",
      provider: "disabled",
      credentialSource: "none",
      setupAction: IMAGE_GENERATION_SETUP_ACTION,
      safeMessage: "Local demo image mode requires the explicit local development flag.",
      setupRequired: ["Enable local demo mode from the development/test setup path"],
      blockingReasons: ["local_demo_flag_missing"],
      recommendedModels: publicHuggingFaceImageModelRecommendations()
    });
  }
  return publicResolution({
    status: "local_demo",
    provider: "local_dev_mock",
    model: "local-dev-fixture",
    credentialSource: "local_demo",
    setupAction: IMAGE_GENERATION_SETUP_ACTION,
    safeMessage: "Local demo image mode is available for development/test previews only. It does not count as provider success.",
    setupRequired: ["Use a real Hugging Face provider before production"],
    blockingReasons: [],
    recommendedModels: publicHuggingFaceImageModelRecommendations()
  });
}

function resolveLocalFolderImageProvider(config: RuntimeConfig) {
  const localRequested = config.IMAGE_GENERATION_PROVIDER === "local_folder";
  if (!localRequested) return null;
  if (isProductionRuntime(config)) {
    return publicResolution({
      status: "invalid",
      provider: "local_folder",
      model: "none",
      credentialSource: "local_folder",
      setupAction: IMAGE_GENERATION_SETUP_ACTION,
      safeMessage: "Local folder image import is dev-only and cannot be used in production.",
      setupRequired: ["Use Hugging Face or another real server provider in production."],
      blockingReasons: ["local_folder_source_not_allowed_in_production"],
      recommendedModels: publicHuggingFaceImageModelRecommendations()
    });
  }
  if (!config.LOCAL_IMAGE_SOURCE_DIR.trim()) {
    return publicResolution({
      status: "config_required",
      provider: "disabled",
      credentialSource: "none",
      setupAction: IMAGE_GENERATION_SETUP_ACTION,
      safeMessage: "Local folder image import is enabled but no source directory is configured.",
      setupRequired: ["Set LOCAL_IMAGE_SOURCE_DIR to the approved local import folder."],
      blockingReasons: ["local_folder_source_missing"],
      recommendedModels: publicHuggingFaceImageModelRecommendations()
    });
  }
  return publicResolution({
    status: "local_folder",
    provider: "local_folder",
    model: "none",
    credentialSource: "local_folder",
    setupAction: IMAGE_GENERATION_SETUP_ACTION,
    safeMessage: "Dev-only local folder image import is ready. Imported files still run through private storage, derivative creation, and QA.",
    setupRequired: [],
    blockingReasons: [],
    recommendedModels: publicHuggingFaceImageModelRecommendations()
  });
}

function resolveEnvImageProvider(config: RuntimeConfig) {
  const token = config.HUGGING_FACE_API_TOKEN || config.HF_API_TOKEN;
  const model = config.HUGGING_FACE_IMAGE_MODEL || config.HF_IMAGE_MODEL;
  const enabled = (config.AI_IMAGE_ENABLED && Boolean(config.HF_API_TOKEN && config.HF_IMAGE_MODEL))
    || (config.IMAGE_GENERATION_ENABLED && config.IMAGE_GENERATION_PROVIDER === "hugging_face" && Boolean(token && model));
  if (!enabled) return null;
  if (!token || !model) {
    return publicResolution({
      status: "config_required",
      provider: "disabled",
      credentialSource: "none",
      setupAction: IMAGE_GENERATION_SETUP_ACTION,
      safeMessage: "Advanced server image provider configuration is incomplete.",
      setupRequired: ["Configure server-side Hugging Face token and image model, or connect the provider in Launch Setup Concierge"],
      blockingReasons: ["env_token_or_model_missing"],
      recommendedModels: publicHuggingFaceImageModelRecommendations()
    });
  }
  const unsupportedReason = unsupportedHuggingFaceImageModelReason(model);
  if (unsupportedReason) {
    return invalidResolution({
      safeMessage: unsupportedReason,
      setupRequired: recommendedModelSetupRequired(),
      blockingReasons: ["model_not_supported"],
      credentialSource: "env",
      model
    });
  }
  return withServerCredential({
    status: "ready",
    provider: "huggingface",
    model,
    credentialSource: "env",
    setupAction: IMAGE_GENERATION_SETUP_ACTION,
    safeMessage: "Image generation is configured through advanced server environment fallback.",
    setupRequired: [],
    blockingReasons: [],
    recommendedModels: publicHuggingFaceImageModelRecommendations()
  }, { token, source: "env" });
}

export async function resolveImageGenerationProvider(input: {
  workspaceId: string;
  repos?: RepositoryBundle | undefined;
  config: RuntimeConfig;
}): Promise<ImageGenerationProviderResolution> {
  const credentialStore = await resolveCredentialStoreImageProvider(input);
  if (credentialStore) return credentialStore;
  const localFolder = resolveLocalFolderImageProvider(input.config);
  if (localFolder) return localFolder;
  const localDemo = resolveLocalDemoImageProvider(input.config);
  if (localDemo) return localDemo;
  const envProvider = resolveEnvImageProvider(input.config);
  if (envProvider) return envProvider;
  return publicResolution({
    status: "config_required",
    provider: "disabled",
    credentialSource: "none",
    setupAction: IMAGE_GENERATION_SETUP_ACTION,
    safeMessage: "Image generation is not connected. Connect Hugging Face in Launch Setup Concierge, or use local demo or local folder mode in development/test.",
    setupRequired: ["Connect Hugging Face image generation", "Check token permission: Inference Providers", "Try a recommended model"],
    blockingReasons: ["image_generation_provider_not_connected"],
    recommendedModels: publicHuggingFaceImageModelRecommendations()
  });
}

export function publicImageGenerationProviderResolution(resolution: ImageGenerationProviderResolution): PublicImageGenerationProviderResolution {
  return {
    status: resolution.status,
    provider: resolution.provider,
    ...(resolution.model ? { model: resolution.model } : {}),
    credentialSource: resolution.credentialSource,
    setupAction: resolution.setupAction,
    safeMessage: resolution.safeMessage,
    setupRequired: [...resolution.setupRequired],
    blockingReasons: [...resolution.blockingReasons],
    recommendedModels: resolution.recommendedModels,
    ...(resolution.connectionId ? { connectionId: resolution.connectionId } : {})
  };
}

const localDemoPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKklEQVR4nO3OQQ0AMAwDsY7+/8xwBVOB2QmQzLznWQIAAAAAAAAAfAEsXgIR4lqjhwAAAABJRU5ErkJggg==",
  "base64"
);

export class LocalDemoImageProvider extends FreeImageProviderDisabled {
  readonly providerId = "local_dev_mock";
  readonly enabled = true;
  async generateImage(prompt = "", _negative = "", _parameters: Record<string, unknown> = {}) {
    const issues = detectPromptSafetyIssues(prompt);
    if (issues.length) return { ok: false as const, error: `prompt_blocked:${issues.join(",")}`, retryable: false, sourceLabel: "rules_based" as const };
    return {
      ok: true as const,
      data: { bytes: localDemoPng, contentType: "image/png" },
      modelUsed: "local-dev-fixture",
      sourceLabel: "rules_based" as const,
      tokenEstimate: estimateTokens(prompt)
    };
  }
  async getJobStatus(jobId: string) { return { ok: true as const, data: { jobId, status: "completed" }, sourceLabel: "rules_based" as const }; }
  async isHealthy() { return true; }
}

export function createImageProviderFromResolvedImageGenerationProvider(resolution: ImageGenerationProviderResolution, fetcher?: typeof fetch) {
  if (resolution.status === "local_demo") return new LocalDemoImageProvider();
  const token = resolution.serverCredential?.token ?? "";
  if (resolution.status === "ready" && resolution.provider === "huggingface" && token && resolution.model) {
    return new HuggingFaceImageProvider(token, resolution.model, fetcher);
  }
  return new FreeImageProviderDisabled();
}

export type ImageProcessingEvidence = {
  sourceAssetId?: string;
  processedAssetId?: string;
  processor: "local_worker";
  modelArtifact?: string;
  modelLicense?: string;
  evidenceRowsRequired: true;
};

export type ImageProcessingProviderResult = ProviderResult<{
  bytes: Buffer;
  contentType: string;
  evidence: ImageProcessingEvidence;
}>;

export interface BackgroundRemovalProvider {
  readonly enabled: boolean;
  removeBackground(input?: { bytes?: Buffer; contentType?: string; sourceAssetId?: string }): Promise<ImageProcessingProviderResult>;
  isHealthy(): Promise<boolean>;
}

export interface UpscaleProvider {
  readonly enabled: boolean;
  upscale(input?: { bytes?: Buffer; contentType?: string; sourceAssetId?: string; scale?: number }): Promise<ImageProcessingProviderResult>;
  isHealthy(): Promise<boolean>;
}

export class BackgroundRemovalProviderDisabled implements BackgroundRemovalProvider {
  readonly enabled = false;
  async removeBackground(): Promise<ImageProcessingProviderResult> {
    return {
      ok: false,
      error: "background_removal_disabled",
      retryable: false,
      sourceLabel: "rules_based",
      setupRequired: [
        "Configure a local worker background-removal provider.",
        "Store provenance from original asset to processed print asset.",
        "Do not use BRIA RMBG for commercial POD output unless a commercial license is explicitly configured."
      ]
    };
  }
  async isHealthy() { return false; }
}

export class UpscaleProviderDisabled implements UpscaleProvider {
  readonly enabled = false;
  async upscale(): Promise<ImageProcessingProviderResult> {
    return {
      ok: false,
      error: "upscale_disabled",
      retryable: false,
      sourceLabel: "rules_based",
      setupRequired: [
        "Configure a local worker upscale provider.",
        "Verify the exact license for the deployed model artifact, including ONNX exports.",
        "Persist metadata extraction and provenance after processing."
      ]
    };
  }
  async isHealthy() { return false; }
}
export class ManualTrendSourceProvider { readonly sourceId = "manual"; readonly allowedUse = "inspiration_only" as const; async ingestSignals(input: { keyword: string; related_terms?: string[] }) { return [{ keyword: input.keyword, related_terms: input.related_terms ?? [], allowed_use: this.allowedUse, source_id: this.sourceId }]; } }
export class TrendSourceProviderDisabled { readonly sourceId = "disabled"; readonly allowedUse = "inspiration_only" as const; async ingestSignals() { return []; } }

export { detectPromptInjection, forbiddenAiActions, runAgenticAiEmployeeWorkflow, runDeterministicAiEmployee } from "./employees";
export { createDeterministicDesignSuggestions, type DesignSuggestionDraft, type DesignSuggestionInput } from "./design-suggestions";
export {
  assertEmployeeCannotSelfAssignModel,
  chooseModelForTask,
  createModelRuntimeProvider,
  defaultModelProviderCatalog,
  DisabledModelRuntimeProvider,
  ensureDefaultModelRuntimeRecords,
  HttpModelRuntimeProvider,
  lowRiskOpenSourcePreferredTasks,
  mediumRiskTaskTypes,
  neverAutonomousTaskTypes,
  highRiskReviewTaskTypes,
  recordModelUsage,
  requestModelEscalation,
  runAiEmployeeTaskWithModelRouting,
  sanitizeModel,
  sanitizeModelProvider,
  type ChooseModelInput,
  type ModelInputSensitivity,
  type ModelProviderKey,
  type ModelProviderType,
  type ModelRiskLevel,
  type ModelRouteStatus,
  type ModelRuntimeProvider,
  type ModelStructuredInput,
  type ModelStructuredResult,
  type ModelTextInput,
  type ModelTextResult,
  type ProviderCheck
} from "./model-runtime";
export {
  getAgentRoleDefinition,
  listAgentRoleDefinitions,
  marketingLaunchPlannerRoleDefinition,
  productListingAssistantRoleDefinition,
  shopManagerAgentRoleDefinitions,
  trendIntelligenceAgentRoleDefinition,
  setAgentRoleDefinitionsForTests,
  type AgentRoleDefinition
} from "./agent-roles";
export {
  allAgentTools,
  forbiddenAgentToolNamePatterns,
  getAgentToolsForRole,
  marketingLaunchPlannerTools,
  productListingAssistantTools,
  shopManagerAgentTools,
  trendIntelligenceAgentTools,
  registryHasForbiddenToolNames,
  toModelRuntimeTools,
  validateToolArguments,
  type AgentToolContext,
  type AgentToolDefinition,
  type AgentToolResult
} from "./agent-tools";
export {
  assertToolIsAllowedForRole,
  enqueueLocalOllamaAgentRun,
  listAgentTranscript,
  runLocalOllamaAgentTask,
  summarizeTranscriptEvents,
  type AgentTaskResult,
  type AgentRunJobPayload,
  type QueueLocalOllamaAgentRunInput,
  type QueuedAgentRunResult,
  type RunLocalOllamaAgentTaskInput
} from "./agent-runtime";
export {
  NO_TREND_SIGNALS_AVAILABLE,
  OLLAMA_INVALID_JSON,
  clusterPersistedTrendSignals,
  draftProductConceptCandidates,
  ensureTrendAnalysisReportDraft,
  findTrendAnalysisReportByAgentRunId,
  getTrendAnalysisReportDetail,
  listProductConceptCandidates,
  readPersistedTrendSignals,
  readTrendWatchProfile,
  reviewProductConceptCandidate,
  saveProductConceptCandidates,
  saveTrendAnalysisReport,
  scoreTrendCluster,
  toSafeTrendAnalysisError,
  trendAnalysisTaskOptions,
  type ProductConceptCandidateResult,
  type TrendAnalysisClusterResult,
  type TrendAnalysisReportDetail,
  type TrendScoreResult
} from "./trend-analysis";
export {
  MARKETING_INVALID_JSON,
  MARKETING_INVALID_APPROVAL_DECISION,
  MARKETING_LAUNCH_PLAN_INVALID,
  MARKETING_NO_APPROVED_SOURCE_ENTITY,
  MARKETING_POLICY_BLOCKED,
  MARKETING_SOURCE_ENTITY_NOT_APPROVED,
  MARKETING_SOURCE_ENTITY_NOT_FOUND,
  calculateBudgetRecommendation,
  calculateProductMargin,
  compileCampaignBuildSheet,
  createApprovalRequest,
  createMarketingLaunchPlan,
  decideMarketingApprovalRequest,
  draftAdAngles,
  draftAdCopyVariants,
  draftAudienceHypotheses,
  draftCreativeBriefs,
  draftEmailSmsDrafts,
  draftMarketplaceSeoSuggestions,
  draftOfferHypotheses,
  draftOrganicLaunchPlan,
  draftOutreachDrafts,
  draftPinterestOrganicPlan,
  draftPositioningStatement,
  draftSeoPdpRecommendations,
  draftSocialContent,
  ensureMarketingSourceRegistry,
  ensureSaltyCowhideBrandVoiceProfile,
  getCampaignBuildSheet,
  getMarketingLaunchPlanDetail,
  listBrandVoiceProfiles,
  listMarketingApprovalQueue,
  listMarketingLaunchPlans,
  listMarketingSources,
  marketingLaunchTaskOptions,
  parseMarketingApprovalDecision,
  readApprovedProductOrConcept,
  readBrandVoiceProfile,
  readProductReadinessData,
  readTrendEvidenceForProduct,
  runPolicyReview,
  saveMarketingOutputForReview,
  toSafeMarketingLaunchError
} from "./marketing-launch";
export {
  COMMERCE_AGENT_INVALID_DECISION,
  COMMERCE_AGENT_INVALID_BODY,
  COMMERCE_AGENT_INVALID_JSON,
  COMMERCE_AGENT_ROLE_DISABLED,
  COMMERCE_AGENT_ROLE_UNKNOWN,
  calculateBudgetRecommendation as calculateCommerceBudgetRecommendation,
  commerceAgentRoleCatalog,
  commerceAgentRoleKeys,
  commerceAgentToolNames,
  commerceAgentToolsForRole,
  consultBehavioralPsychology,
  createApprovalPrediction,
  createProcessImprovementFinding,
  createQualityCheck as createCommerceQualityCheck,
  createShopManagerBrief,
  draftAdAngles as draftCommerceAdAngles,
  draftAdCopyVariants as draftCommerceAdCopyVariants,
  draftAudienceHypotheses as draftCommerceAudienceHypotheses,
  draftCampaignBuildSheet as draftCommerceCampaignBuildSheet,
  draftCatalogMerchandisingRecommendation,
  draftEmailSmsDrafts as draftCommerceEmailSmsDrafts,
  draftMarketplaceSeoSuggestions as draftCommerceMarketplaceSeoSuggestions,
  draftOrganicLaunchPlan as draftCommerceOrganicLaunchPlan,
  draftOutreachDrafts as draftCommerceOutreachDrafts,
  draftPinterestOrganicPlan as draftCommercePinterestOrganicPlan,
  draftSeoGeoPdpRecommendation,
  draftSocialContent as draftCommerceSocialContent,
  listCommerceAgentRoles,
  listShopManagerBriefData,
  prioritizeApprovalQueue,
  readAssetQaData,
  readMarketingLaunchPlan,
  readMockupData,
  recordOwnerApprovalFeedback,
  registerCommerceAgentRoles,
  runCommerceAgent,
  runBehavioralConsultationPolicyReview,
  runBehavioralConsultationWithPolicyReview,
  runCreativeQaCheck,
  runIpTrademarkCheck,
  runPolicyReview as runCommercePolicyReview,
  runProductReadinessCheck,
  runRuleBasedPolicyClaimsIpCheck,
  saveCommerceOutputForReview,
  saveCommerceRecommendation,
  updateOwnerDecisionPatterns,
  type BehavioralConsultationOutput,
  type CommerceAgentRoleCatalogEntry,
  type CommerceAgentRunInput
} from "./shop-manager-agent-os";
