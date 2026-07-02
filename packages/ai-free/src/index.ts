import type { RuntimeConfig } from "@saltyfactory/config";
import { detectRiskyPhrases, type SourceLabel } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";

export type ProviderResult<T> = { ok: true; data: T; modelUsed?: string; latencyMs?: number; sourceLabel: SourceLabel; tokenEstimate?: number } | { ok: false; error: string; retryable: boolean; rateLimited?: boolean; sourceLabel: SourceLabel };

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
    const response = await this.fetcher(`https://api-inference.huggingface.co/models/${encodeURIComponent(this.model)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify({ inputs: prompt, parameters })
    });
    if (!response.ok) return { ok: false as const, error: `hf_image_http_${response.status}`, retryable: response.status >= 500, rateLimited: response.status === 429, sourceLabel: "model_generated" as const };
    const bytes = await response.arrayBuffer();
    return { ok: true as const, data: { bytes, contentType: response.headers.get("content-type") ?? "application/octet-stream" }, modelUsed: this.model, sourceLabel: "model_generated" as const, tokenEstimate: estimateTokens(prompt) };
  }
  async getJobStatus(jobId: string) { return { ok: true as const, data: { jobId, status: "completed" }, sourceLabel: "model_generated" as const }; }
  async isHealthy() { return true; }
}

export const createFreeImageProvider = (config: RuntimeConfig, fetcher?: typeof fetch) => config.providers.aiImage.enabled ? new HuggingFaceImageProvider(config.HF_API_TOKEN, config.HF_IMAGE_MODEL, fetcher) : new FreeImageProviderDisabled();

export class BackgroundRemovalProviderDisabled { readonly enabled = false; async removeBackground() { return blocked("background_removal_disabled"); } async isHealthy() { return false; } }
export class UpscaleProviderDisabled { readonly enabled = false; async upscale() { return blocked("upscale_disabled"); } async isHealthy() { return false; } }
export class ManualTrendSourceProvider { readonly sourceId = "manual"; readonly allowedUse = "inspiration_only" as const; async ingestSignals(input: { keyword: string; related_terms?: string[] }) { return [{ keyword: input.keyword, related_terms: input.related_terms ?? [], allowed_use: this.allowedUse, source_id: this.sourceId }]; } }
export class TrendSourceProviderDisabled { readonly sourceId = "disabled"; readonly allowedUse = "inspiration_only" as const; async ingestSignals() { return []; } }

export { detectPromptInjection, forbiddenAiActions, runDeterministicAiEmployee } from "./employees";
export { createDeterministicDesignSuggestions, type DesignSuggestionDraft, type DesignSuggestionInput } from "./design-suggestions";
