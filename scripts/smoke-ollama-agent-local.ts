import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { listAgentTranscript, runLocalOllamaAgentTask, summarizeTranscriptEvents } from "@saltyfactory/ai-free";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

function requireSmokeEnabled() {
  if (process.env.RUN_LOCAL_OLLAMA_AGENT_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_LOCAL_OLLAMA_AGENT_SMOKE is not true" }, null, 2));
    process.exit(0);
  }
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

async function seedSmokeDraft() {
  const repos = createRepositories();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const draft = await repos.draft.create({
    id: `draft_ollama_smoke_${suffix}`,
    workspace_id: workspaceId,
    title: "Ollama Smoke Test Tee",
    description: "Safe local smoke test product draft for AI employee listing copy.",
    product_type: "apparel",
    collection: "Private Beta Smoke Tests",
    tags: ["smoke-test", "local-ollama"],
    asset_id: `asset_ollama_smoke_${suffix}`,
    status: "draft",
    printify_status: "mockups_ready",
    shopify_status: "draft_not_created",
    metadata: { smoke: true, createdBy: "smoke:ollama-agent-local" }
  } as WorkspaceRow);
  await repos.asset.create({
    id: `asset_ollama_smoke_${suffix}`,
    workspace_id: workspaceId,
    provider: "huggingface",
    model: "smoke_fixture_existing_asset",
    qa_status: "passed",
    asset_kind: "generated_master",
    metadata: { smoke: true, note: "Existing fixture row only; no image generation is run by this smoke." }
  } as unknown as Parameters<typeof repos.publish.create>[0]);
  await repos.qa.create({
    id: `qa_ollama_smoke_${suffix}`,
    workspace_id: workspaceId,
    asset_id: `asset_ollama_smoke_${suffix}`,
    status: "passed",
    evidence: { hasAlpha: true, transparentPixelRatio: 0.42 },
    metadata: { smoke: true }
  } as WorkspaceRow);
  await repos.mockup.create({
    id: `mockup_printify_ollama_smoke_${suffix}`,
    workspace_id: workspaceId,
    product_draft_id: draft.id,
    source: "printify",
    provider_source: "printify",
    is_hero: true,
    is_default: true,
    status: "approved",
    metadata: { smoke: true, providerProof: "fixture row; no Printify call is run by this smoke." }
  } as WorkspaceRow);
  const timestamp = new Date().toISOString();
  await repos.publish.create({
    id: `publish_ollama_smoke_${suffix}`,
    created_at: timestamp,
    updated_at: timestamp,
    workspace_id: workspaceId,
    product_draft_id: draft.id,
    gates: {
      human_approved: false,
      risk_checks_passed: true,
      print_file_qa_passed: true,
      margin_checks_passed: true,
      mockups_complete: true,
      title_reviewed: false,
      description_reviewed: false,
      tags_reviewed: false,
      printify_variants_valid: true,
      shopify_collection_assigned: false
    },
    all_gates_passed: false,
    shopify_publish_allowed: false,
    printify_sync_allowed: false,
    reviewed_by: null,
    reviewed_at: null,
    notes: ["Smoke fixture remains blocked for human review and Shopify draft creation."],
    status: "blocked",
    metadata: { smoke: true }
  } as unknown as Parameters<typeof repos.publish.create>[0]);
  return { repos, draft };
}

async function main() {
  requireSmokeEnabled();
  process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED ||= "true";
  process.env.AI_EMPLOYEES_MODEL_PROVIDER ||= "ollama";
  await assertOllamaReady();
  const { repos, draft } = await seedSmokeDraft();
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
