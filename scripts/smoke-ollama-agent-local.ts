import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { listAgentTranscript, runLocalOllamaAgentTask, summarizeTranscriptEvents } from "@saltyfactory/ai-free";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export class OllamaSmokeFixtureError extends Error {
  constructor(readonly code: string, readonly safeDetails: Record<string, unknown> = {}) {
    super(JSON.stringify({ ok: false, code, ...safeDetails }));
    this.name = "OllamaSmokeFixtureError";
  }
}

function requireSmokeEnabled() {
  if (process.env.RUN_LOCAL_OLLAMA_AGENT_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_LOCAL_OLLAMA_AGENT_SMOKE is not true" }, null, 2));
    process.exit(0);
  }
}

function loadEnvFile(filePath: string) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [rawKey, ...rawValue] = trimmed.split("=");
      const key = rawKey?.trim();
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = rawValue.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Local env files are optional. Explicit process env always wins.
  }
}

export function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "apps/studio/.env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

async function assertOllamaReady() {
  const tags = await fetch(`${baseUrl}/api/tags`).catch(() => null);
  if (!tags?.ok) throw new Error(JSON.stringify({ ok: false, code: "ollama_unavailable", message: "Ollama tags endpoint is not available." }));
  const body = await tags.json().catch(() => ({}));
  const models = Array.isArray(body.models) ? body.models : [];
  const hasModel = models.some((entry: Record<string, unknown>) => entry.name === model || entry.model === model);
  if (!hasModel) {
    const show = await fetch(`${baseUrl}/api/show`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model })
    }).catch(() => null);
    if (!show?.ok) throw new Error(JSON.stringify({ ok: false, code: "ollama_model_missing", model, message: "Configured Ollama model is not available locally." }));
  }
}

async function findPreparedSmokeDraft(repos: ReturnType<typeof createRepositories>, workspaceId: string) {
  const explicitDraftId = text(process.env.OLLAMA_SMOKE_PRODUCT_DRAFT_ID || process.env.SMOKE_PRODUCT_DRAFT_ID);
  const drafts = explicitDraftId
    ? [await repos.draft.getById(explicitDraftId, workspaceId)].filter(Boolean) as WorkspaceRow[]
    : (await repos.draft.listByWorkspace(workspaceId)).sort((a, b) =>
      text(b.updated_at ?? b.updatedAt ?? b.created_at ?? b.createdAt).localeCompare(text(a.updated_at ?? a.updatedAt ?? a.created_at ?? a.createdAt))
    );

  for (const draft of drafts) {
    if (!text(draft.title) || !text(draft.description) || !text(draft.brand)) continue;
    const assetId = text(draft.asset_id ?? draft.assetId);
    if (!assetId) continue;
    const asset = await repos.asset.getById(assetId, workspaceId);
    if (!asset) continue;
    return draft;
  }

  return null;
}

export async function prepareOllamaSmokeDraft(input?: {
  repos?: ReturnType<typeof createRepositories>;
  workspaceId?: string;
}) {
  const repos = input?.repos ?? createRepositories();
  const resolvedWorkspaceId = input?.workspaceId ?? workspaceId;
  const existing = await findPreparedSmokeDraft(repos, resolvedWorkspaceId);
  if (existing) {
    return { repos, draft: existing, reusedExistingDraft: true as const };
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const clusterId = `cluster_ollama_smoke_${suffix}`;
  const phraseId = `phrase_ollama_smoke_${suffix}`;
  const briefId = `brief_ollama_smoke_${suffix}`;
  const assetId = `asset_ollama_smoke_${suffix}`;
  const variantId = `variant_ollama_smoke_${suffix}`;
  const draftId = `draft_ollama_smoke_${suffix}`;

  try {
    await repos.cluster.create({
      id: clusterId,
      workspace_id: resolvedWorkspaceId,
      name: `Ollama smoke cluster ${suffix}`,
      signal_ids: [],
      keywords: ["coastal", "cowgirl", "smoke"],
      aesthetic_tags: ["coastal", "western"],
      seasonality: ["summer"],
      target_customer: "private beta smoke test",
      confidence: "0.82",
      status: "approved",
      approved_for_generation: true,
      metadata: { smoke: true, createdBy: "smoke:ollama-agent-local" }
    } as WorkspaceRow);
    await repos.phrase.create({
      id: phraseId,
      workspace_id: resolvedWorkspaceId,
      cluster_id: clusterId,
      text: "Coastal Cowgirl Shell Tee",
      generated_by: "smoke_fixture",
      generation_prompt_ref: "smoke:ollama-agent-local",
      status: "approved",
      trademark_review: {},
      approved_for_design: true,
      metadata: { smoke: true }
    } as WorkspaceRow);
    await repos.brief.create({
      id: briefId,
      workspace_id: resolvedWorkspaceId,
      phrase_id: phraseId,
      cluster_id: clusterId,
      collection: "Private Beta Smoke Tests",
      product_targets: ["tee"],
      style_direction: { mood: "coastal western", smoke: true },
      generation_prompt: "Smoke fixture brief for local Ollama listing draft generation.",
      negative_prompt: "no public publishing",
      status: "approved",
      approved_for_generation: true,
      metadata: { smoke: true }
    } as WorkspaceRow);
    await repos.asset.create({
      id: assetId,
      workspace_id: resolvedWorkspaceId,
      brief_id: briefId,
      asset_type: "generated_source_art",
      storage_bucket: "local-dev-private-assets",
      file_path: `workspaces/${resolvedWorkspaceId}/private/assets/${assetId}.png`,
      file_size_bytes: 1024,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      checksum: `sha256_${suffix}`,
      width: 3000,
      height: 3000,
      dpi: 300,
      transparent_background: true,
      generator: "huggingface",
      model: "smoke_fixture_existing_asset",
      qa_status: "passed",
      risk_status: "pending",
      approved_for_mockup: true,
      metadata: {
        smoke: true,
        note: "Fixture-only asset row for local Ollama smoke. No provider image generation runs here.",
        has_alpha: true,
        transparent_pixel_ratio: 0.42
      }
    } as WorkspaceRow);
    await repos.qa.create({
      id: `qa_ollama_smoke_${suffix}`,
      workspace_id: resolvedWorkspaceId,
      asset_id: assetId,
      checks: {},
      status: "passed",
      blocked_reasons: [],
      approved_for_product_draft: true,
      metadata: { smoke: true, hasAlpha: true, transparentPixelRatio: 0.42 }
    } as WorkspaceRow);
    await repos.draft.create({
      id: draftId,
      workspace_id: resolvedWorkspaceId,
      brand: "SaltyFactory",
      title: "Ollama Smoke Test Tee",
      description: "Safe local smoke test product draft for AI employee listing copy.",
      product_type: "tee",
      collection: "Private Beta Smoke Tests",
      tags: ["smoke-test", "local-ollama"],
      asset_id: assetId,
      mockup_ids: [],
      variant_ids: [variantId],
      status: "draft",
      approval_status: "pending",
      printify_status: "not_synced",
      shopify_status: "not_published",
      public_projection: {},
      metadata: { smoke: true, createdBy: "smoke:ollama-agent-local" }
    } as WorkspaceRow);
    await repos.variant.create({
      id: variantId,
      workspace_id: resolvedWorkspaceId,
      product_draft_id: draftId,
      sku: `OLLAMA-SMOKE-${Date.now()}`,
      size: "M",
      color: "Natural",
      cost: "12.00",
      price: "30.00",
      margin_dollars: "18.00",
      margin_percent: "0.600",
      active: true,
      status: "selected",
      metadata: { smoke: true }
    } as WorkspaceRow);
    await repos.publish.create({
      id: `publish_ollama_smoke_${suffix}`,
      workspace_id: resolvedWorkspaceId,
      product_draft_id: draftId,
      gates: {
        human_approved: false,
        risk_checks_passed: true,
        print_file_qa_passed: true,
        margin_checks_passed: true,
        mockups_complete: false,
        title_reviewed: false,
        description_reviewed: false,
        tags_reviewed: false,
        printify_variants_valid: false,
        shopify_collection_assigned: false
      },
      all_gates_passed: false,
      shopify_publish_allowed: false,
      printify_sync_allowed: false,
      notes: ["Smoke fixture remains blocked for human review and Shopify draft creation."],
      status: "blocked",
      metadata: { smoke: true }
    } as unknown as Parameters<typeof repos.publish.create>[0]);
  } catch (error) {
    throw new OllamaSmokeFixtureError("fixture_setup_failed", {
      workspaceId: resolvedWorkspaceId,
      productDraftId: draftId,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  const draft = await repos.draft.getById(draftId, resolvedWorkspaceId);
  if (!draft) {
    throw new OllamaSmokeFixtureError("fixture_setup_failed", {
      workspaceId: resolvedWorkspaceId,
      productDraftId: draftId,
      message: "Smoke product draft was not readable after fixture creation."
    });
  }

  return { repos, draft, reusedExistingDraft: false as const };
}

export async function main() {
  requireSmokeEnabled();
  loadLocalEnv();
  process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED ||= "true";
  process.env.AI_EMPLOYEES_MODEL_PROVIDER ||= "ollama";
  await assertOllamaReady();
  const { repos, draft } = await prepareOllamaSmokeDraft();
  const result = await runLocalOllamaAgentTask({
    repos,
    workspaceId,
    actorId: "ollama_smoke_owner",
    roleKey: "product_listing_assistant",
    taskType: "draft_product_listing",
    taskInput: {
      productDraftId: draft.id,
      instructions: "Use the tools to draft product listing copy and readiness blockers for human review."
    }
  });
  const transcript = await listAgentTranscript({ repos, workspaceId, agentRunId: result.agentRunId });
  const summary = summarizeTranscriptEvents(transcript?.events ?? []);
  if (!result.agentRunId || !transcript?.events.length) throw new Error(JSON.stringify({ ok: false, code: "agent_transcript_missing", agentRunId: result.agentRunId }));
  if (result.providerUsed !== "ollama") throw new Error(JSON.stringify({ ok: false, code: "provider_not_ollama", providerUsed: result.providerUsed }));
  if (!result.modelUsed) throw new Error(JSON.stringify({ ok: false, code: "model_missing" }));
  if (!result.finalOutputId && !result.blockingReason) throw new Error(JSON.stringify({ ok: false, code: "no_final_output_or_blocker", agentRunId: result.agentRunId }));
  if (summary.toolCalls.length === 0 && process.env.OLLAMA_AGENT_ALLOW_TEXT_ONLY_SMOKE !== "true") {
    throw new Error(JSON.stringify({ ok: false, code: "model_tool_calling_unsupported", model, agentRunId: result.agentRunId }));
  }
  const report = {
    ok: result.ok,
    status: result.status,
    provider: "ollama",
    model: result.modelUsed,
    endpoint: `${baseUrl}/api/chat`,
    workspaceId,
    productDraftId: draft.id,
    agentRunId: result.agentRunId,
    transcriptEventCount: transcript.events.length,
    toolCallsExecuted: result.toolCallsExecuted,
    finalOutputId: result.finalOutputId ?? null,
    blockingReason: result.blockingReason ?? null
  };
  const outDir = path.join(process.cwd(), "test-results", "ollama-agent-local-smoke");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
