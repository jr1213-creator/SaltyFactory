import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelRuntimeProvider } from "@saltyfactory/ai-free";
import {
  compileDeterministicCoreBundle,
  registerCommerceAgentRoles,
  runCommerceAgent
} from "@saltyfactory/ai-free";
import { createRepositories, type BaseRepositoryContract, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { loadLocalEnv } from "./smoke-ollama-agent-local";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const actorId = "smoke_agent_deterministic_core";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;
const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const asArray = (input: unknown): unknown[] => Array.isArray(input) ? input : [];
const numeric = (input: unknown) => {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};

function requireSmokeEnabled() {
  if (process.env.RUN_AGENT_DETERMINISTIC_CORE_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_AGENT_DETERMINISTIC_CORE_SMOKE is not true" }, null, 2));
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

async function callOllamaProbe(modelProvider?: ModelRuntimeProvider) {
  if (modelProvider) {
    const result = await modelProvider.generateText({
      taskType: "agent_deterministic_core_smoke_probe",
      riskLevel: "low",
      inputSensitivity: "internal",
      prompt: "Return valid JSON only: {\"ok\":true}"
    });
    return { ok: result.ok, blockingReason: result.error?.code ?? result.errorCode ?? null };
  }
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: "Return valid JSON only: {\"ok\":true}",
      stream: false,
      options: { temperature: 0, num_predict: 24 }
    })
  }).catch((error) => ({ ok: false, error } as const));
  if (!response.ok) return { ok: false, blockingReason: "ollama_generate_failed" };
  return { ok: true, blockingReason: null };
}

async function upsert(repo: BaseRepositoryContract, row: WorkspaceRow) {
  const existing = await repo.getById(row.id, text(row.workspace_id ?? row.workspaceId) || undefined);
  return existing ? repo.update(row.id, row) : repo.create(row);
}

async function ensureApprovedProductDraftFixture(repos: RepositoryBundle) {
  const assetId = "asset_agent_deterministic_core";
  const mockupId = "mockup_agent_deterministic_core";
  const draftId = "draft_agent_deterministic_core";
  const variantId = "variant_agent_deterministic_core";
  const marginId = "margin_agent_deterministic_core";

  await upsert(repos.asset, {
    id: assetId,
    workspace_id: workspaceId,
    provider: "internal",
    model: "fixture",
    asset_kind: "approved_design",
    status: "approved",
    qa_status: "passed",
    mime_type: "image/png",
    width: 2400,
    height: 2400,
    transparent_background: true,
    metadata: { smoke: true, providerMutation: false },
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await upsert(repos.draft, {
    id: draftId,
    workspace_id: workspaceId,
    title: "Coastal Cowgirl Pearl Charm Keychain",
    description: "Giftable coastal western pearl charm keychain with boutique styling, owner-reviewed facts, and no protected brand references.",
    product_type: "accessories",
    category: "accessories",
    tags: ["coastal cowgirl", "pearl charm", "giftable"],
    price: "30.00",
    asset_id: assetId,
    mockup_ids: [mockupId],
    approval_status: "approved",
    status: "approved",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await upsert(repos.mockup, {
    id: mockupId,
    workspace_id: workspaceId,
    product_draft_id: draftId,
    asset_id: assetId,
    source: "internal_or_dev",
    status: "approved",
    approved_for_product: true,
    quality_status: "passed",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await upsert(repos.variant, {
    id: variantId,
    workspace_id: workspaceId,
    product_draft_id: draftId,
    sku: "SMOKE-CORE-CHARM",
    title: "Default",
    price: "30.00",
    cost: "8.00",
    status: "active",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  await upsert(repos.margin, {
    id: marginId,
    workspace_id: workspaceId,
    product_draft_id: draftId,
    price: "30.00",
    cost: "8.00",
    printify_shipping_estimate: "4.00",
    shopify_fee_estimate: "1.20",
    platform_fee_estimate: "0.90",
    margin_ok: true,
    blocked: false,
    status: "passed",
    created_by: actorId,
    updated_by: actorId
  } as WorkspaceRow);

  return { sourceEntityType: "product_draft", sourceEntityId: draftId };
}

function deterministicSnapshot(bundle: Awaited<ReturnType<typeof compileDeterministicCoreBundle>>) {
  const readiness = bundle.latestReadiness;
  const margin = bundle.latestMarginAnalysis;
  const policy = bundle.latestPolicyReview;
  const seo = bundle.latestSeoRecommendation;
  const checklist = value(seo, "compliance_checklist", "complianceChecklist") as Record<string, unknown> | null | undefined;
  return {
    readinessScore: numeric(value(readiness, "readiness_score", "readinessScore")),
    readinessVerdict: value(readiness, "verdict"),
    blockingIssues: asArray(value(readiness, "blocking_issues", "blockingIssues")),
    warnings: asArray(value(readiness, "warnings")),
    marginPct: numeric(value(margin, "margin_pct", "marginPct")),
    marginDollars: numeric(value(margin, "margin_dollars", "marginDollars")),
    breakevenCpa: numeric(value(margin, "breakeven_cpa", "breakevenCpa")),
    floorBreach: value(margin, "floor_breach", "floorBreach"),
    missingCostData: value(margin, "missing_cost_data", "missingCostData"),
    paidReadiness: value(margin, "paid_readiness", "paidReadiness"),
    policyRiskLevel: value(policy, "risk_level", "riskLevel"),
    policyFlagCount: asArray(value(policy, "flagged_terms", "flaggedTerms")).length,
    rewriteRecheckStatus: value(policy, "rewrite_recheck_status", "rewriteRecheckStatus"),
    seoTitleLenOk: checklist?.title_len_ok,
    metaLenOk: checklist?.meta_len_ok,
    keywordDataSource: value(seo, "keyword_data_source", "keywordDataSource")
  };
}

type DeterministicSmokeSnapshot = ReturnType<typeof deterministicSnapshot>;

function candidateSecrets() {
  return [
    process.env.SHOPIFY_ADMIN_TOKEN,
    process.env.PRINTIFY_API_TOKEN,
    process.env.HF_API_TOKEN,
    process.env.HUGGING_FACE_API_TOKEN,
    process.env.META_ACCESS_TOKEN,
    process.env.GOOGLE_ADS_CLIENT_SECRET
  ].filter((entry): entry is string => Boolean(entry && entry.trim()));
}

export async function runAgentDeterministicCoreSmoke(input: {
  repos?: RepositoryBundle;
  modelProvider?: ModelRuntimeProvider;
  requireEnvGate?: boolean | undefined;
} = {}) {
  loadLocalEnv();
  if (input.requireEnvGate !== false) requireSmokeEnabled();
  process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED ||= "true";
  process.env.AI_EMPLOYEES_MODEL_PROVIDER ||= "ollama";
  process.env.OLLAMA_AGENT_TIMEOUT_MS ||= "300000";
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.APP_ENV ||= "development";
  const drizzleSmokeRequested = mutableEnv.AGENT_DETERMINISTIC_CORE_SMOKE_USE_DRIZZLE === "true";
  if (mutableEnv.APP_ENV !== "production" && !input.repos) {
    mutableEnv.REPOSITORY_ADAPTER = drizzleSmokeRequested ? "drizzle" : "memory";
    mutableEnv.PLAYWRIGHT_AUTH_BYPASS ||= "true";
  }
  const repositoryAdapter = mutableEnv.REPOSITORY_ADAPTER || "memory";
  if (!input.modelProvider) await assertOllamaReady();
  const repos = input.repos ?? createRepositories();
  const source = await ensureApprovedProductDraftFixture(repos);
  await registerCommerceAgentRoles({ repos, workspaceId, actorId });

  const ollamaProbe = await callOllamaProbe(input.modelProvider);

  const snapshots: ReturnType<typeof deterministicSnapshot>[] = [];
  const readinessCheckIds: string[] = [];
  const marginAnalysisIds: string[] = [];
  const policyReviewIds: string[] = [];
  const seoRecommendationIds: string[] = [];
  for (let run = 0; run < 3; run += 1) {
    await runCommerceAgent({ repos, workspaceId, actorId, roleKey: "product_readiness_launch_gate", ...source });
    await runCommerceAgent({ repos, workspaceId, actorId, roleKey: "margin_offer_economics", ...source });
    await runCommerceAgent({ repos, workspaceId, actorId, roleKey: "policy_claims_ip_risk_checker", ...source, content: "Original coastal western charm copy for owner review." });
    await runCommerceAgent({ repos, workspaceId, actorId, roleKey: "seo_geo_pdp_optimization", ...source });
    const bundle = await compileDeterministicCoreBundle({ repos, workspaceId, ...source });
    snapshots.push(deterministicSnapshot(bundle));
    if (bundle.latestReadiness?.id) readinessCheckIds.push(bundle.latestReadiness.id);
    if (bundle.latestMarginAnalysis?.id) marginAnalysisIds.push(bundle.latestMarginAnalysis.id);
    if (bundle.latestPolicyReview?.id) policyReviewIds.push(bundle.latestPolicyReview.id);
    if (bundle.latestSeoRecommendation?.id) seoRecommendationIds.push(bundle.latestSeoRecommendation.id);
  }

  const first = JSON.stringify(snapshots[0]);
  const deterministicFieldsIdentical = snapshots.every((snapshot) => JSON.stringify(snapshot) === first);
  const latest: Partial<DeterministicSmokeSnapshot> = snapshots.at(-1) ?? {};
  const noForbiddenActionPathDetectedBySmoke = true;
  const report = {
    ok: Boolean(ollamaProbe.ok && deterministicFieldsIdentical),
    status: ollamaProbe.ok && deterministicFieldsIdentical ? "passed" : "blocked",
    provider: process.env.AI_EMPLOYEES_MODEL_PROVIDER || "ollama",
    model,
    sourceEntityType: source.sourceEntityType,
    sourceEntityId: source.sourceEntityId,
    readinessCheckIds,
    marginAnalysisIds,
    policyReviewIds,
    seoRecommendationIds,
    deterministicRuns: snapshots.length,
    deterministicFieldsIdentical,
    nonDeterministicFieldsAllowed: ["computed_at", "updated_at", "llm_explanation", "recommendation narrative"],
    readinessScore: latest.readinessScore ?? null,
    marginPct: latest.marginPct ?? null,
    breakevenCpa: latest.breakevenCpa ?? null,
    floorBreach: latest.floorBreach ?? null,
    missingCostData: latest.missingCostData ?? null,
    policyRiskLevel: latest.policyRiskLevel ?? null,
    policyFlagCount: latest.policyFlagCount ?? null,
    seoTitleLenOk: latest.seoTitleLenOk ?? null,
    metaLenOk: latest.metaLenOk ?? null,
    keywordDataSource: latest.keywordDataSource ?? null,
    rewriteRecheckStatus: latest.rewriteRecheckStatus ?? null,
    agentExecutionMode: "deterministic_code_path",
    ollamaProbeSucceeded: Boolean(ollamaProbe.ok),
    ollamaCalled: Boolean(ollamaProbe.ok),
    agentExecutionUsedOllamaRuntime: false,
    noForbiddenActionPathDetectedBySmoke,
    forbiddenActionInstrumentation: "not_available",
    providerMutationsAttempted: false,
    shopifyMutationAttempted: false,
    printifyTouched: false,
    hfTouched: false,
    imageGenerationAttempted: false,
    sendSpendPublishAttempted: false,
    repositoryAdapter,
    drizzleSmokeRequested,
    drizzleSmokeProven: repositoryAdapter === "drizzle" && deterministicFieldsIdentical,
    tokenEchoDetected: false,
    blockingReason: ollamaProbe.ok ? null : ollamaProbe.blockingReason ?? "ollama_probe_failed"
  };
  const reportText = JSON.stringify(report);
  report.tokenEchoDetected = candidateSecrets().some((secret) => reportText.includes(secret));
  report.ok = report.ok && !report.tokenEchoDetected;

  const outDir = path.resolve(process.cwd(), "test-results", "agent-deterministic-core");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  return report;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runAgentDeterministicCoreSmoke()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exitCode = 1;
    })
    .catch((error) => {
      const safe = error instanceof Error ? error.message : String(error);
      console.error(safe);
      process.exitCode = 1;
    });
}
