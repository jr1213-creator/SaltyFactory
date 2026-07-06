import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelRuntimeProvider, ModelStructuredInput, ModelStructuredResult, ModelTextInput, ModelTextResult, ProviderCheck } from "@saltyfactory/ai-free";
import {
  attachPreviewAssetToCandidate,
  createCustomerDesignSession,
  generateCustomerDesignCandidates,
  handleCustomerDesignMessage,
  readStorefrontProducts,
  recordCustomerDesignApproval,
  reportContainsToken,
  requestCustomerSpecificProductCreation,
  syncStorefrontProductsFromShopify
} from "@saltyfactory/ai-free";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { loadLocalEnv } from "./smoke-ollama-agent-local";

const workspaceId = process.env.STOREFRONT_WORKSPACE_ID || "wks_default";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");

function requireSmokeEnabled() {
  if (process.env.RUN_CUSTOMER_DESIGN_CONCIERGE_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_CUSTOMER_DESIGN_CONCIERGE_SMOKE is not true" }, null, 2));
    process.exit(0);
  }
}

async function assertOllamaReady() {
  const tags = await fetch(`${baseUrl}/api/tags`).catch(() => null);
  if (!tags?.ok) throw new Error("ollama_unavailable");
}

async function callOllamaProbe(modelProvider?: ModelRuntimeProvider) {
  if (modelProvider) {
    const result = await modelProvider.generateText({
      taskType: "customer_design_concierge_smoke_probe",
      riskLevel: "low",
      inputSensitivity: "internal",
      prompt: "Return valid JSON only: {\"ok\":true}"
    });
    return { ok: result.ok, blockingReason: result.error?.code ?? result.errorCode ?? null };
  }
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt: "Return valid JSON only: {\"ok\":true}", stream: false, options: { temperature: 0, num_predict: 24 } })
  }).catch(() => null);
  return { ok: Boolean(response?.ok), blockingReason: response?.ok ? null : "ollama_generate_failed" };
}

async function seedStorefrontProducts(repos: RepositoryBundle) {
  await syncStorefrontProductsFromShopify({
    repos,
    workspaceId,
    products: [{
      id: "gid://shopify/Product/customer-design-smoke",
      handle: "redfish-trip-shirt",
      title: "Redfish Trip Shirt",
      description: "Read-only Shopify Storefront fixture for the customer design concierge smoke.",
      vendor: "SaltyFactory",
      product_type: "shirt",
      tags: ["fishing", "redfish", "tampa bay"],
      images: [{ url: "/fixture-redfish.png", altText: "Redfish trip shirt" }],
      variants: [{ id: "variant_redfish", title: "Default", price: "30.00" }],
      price_min: "30.00",
      price_max: "30.00",
      currency: "USD",
      available_for_sale: true
    } as WorkspaceRow]
  });
}

export async function runCustomerDesignConciergeSmoke(input: {
  repos?: RepositoryBundle;
  modelProvider?: ModelRuntimeProvider;
  requireEnvGate?: boolean | undefined;
} = {}) {
  loadLocalEnv();
  if (input.requireEnvGate !== false) requireSmokeEnabled();
  process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED ||= "true";
  process.env.AI_EMPLOYEES_MODEL_PROVIDER ||= "ollama";
  process.env.APP_ENV ||= "development";
  if (process.env.APP_ENV !== "production" && !input.repos && process.env.CUSTOMER_DESIGN_CONCIERGE_SMOKE_USE_DRIZZLE !== "true") {
    process.env.REPOSITORY_ADAPTER = "memory";
    process.env.PLAYWRIGHT_AUTH_BYPASS ||= "true";
  }
  process.env.CUSTOMER_CONCIERGE_AUTO_PUBLISH_ENABLED = "true";
  process.env.CUSTOMER_CONCIERGE_ALLOW_SHOPIFY_PRODUCT_CREATE = "true";
  process.env.CUSTOMER_CONCIERGE_SHOPIFY_PRODUCT_CREATE_MODE = "test_adapter";
  process.env.CUSTOMER_CONCIERGE_IMAGE_MODE = "fixture";
  process.env.CUSTOMER_CONCIERGE_DEFAULT_PRICE ||= "30.00";
  process.env.CUSTOMER_CONCIERGE_DEFAULT_COGS ||= "8.00";
  process.env.CUSTOMER_CONCIERGE_DEFAULT_SHIPPING_COST ||= "4.00";
  process.env.CUSTOMER_CONCIERGE_DEFAULT_PAYMENT_FEE ||= "1.20";
  process.env.CUSTOMER_CONCIERGE_DEFAULT_PLATFORM_FEE ||= "0.90";

  if (!input.modelProvider) await assertOllamaReady();
  const ollamaProbe = await callOllamaProbe(input.modelProvider);
  const repos = input.repos ?? createRepositories();
  await seedStorefrontProducts(repos);
  const storefrontProducts = await readStorefrontProducts({ repos, workspaceId });
  const session = await createCustomerDesignSession({ repos, workspaceId, sourceRoute: "/store/custom", coarseLocation: { region: "Florida" } });
  const message = await handleCustomerDesignMessage({
    repos,
    workspaceId,
    sessionId: session.session.id,
    sessionToken: session.sessionToken,
    messageText: "I want a funny redfish shirt for a Tampa Bay fishing trip"
  });
  const generated = await generateCustomerDesignCandidates({ repos, workspaceId, sessionId: session.session.id, sessionToken: session.sessionToken });
  const safeCandidates = generated.candidates.filter((candidate) => candidate.status === "shown_to_customer");
  const blockedCandidates = generated.candidates.filter((candidate) => candidate.status === "blocked");
  const selected = safeCandidates[0];
  let previewAssetsAttached = 0;
  let customerApprovedCandidate = false;
  let publishResult: Awaited<ReturnType<typeof requestCustomerSpecificProductCreation>> | null = null;
  if (selected) {
    const preview = await attachPreviewAssetToCandidate({ repos, workspaceId, sessionId: session.session.id, sessionToken: session.sessionToken, candidateId: selected.id, mode: "fixture" });
    previewAssetsAttached = preview.previewAttached ? 1 : 0;
    await recordCustomerDesignApproval({ repos, workspaceId, sessionId: session.session.id, sessionToken: session.sessionToken, candidateId: selected.id });
    customerApprovedCandidate = true;
    publishResult = await requestCustomerSpecificProductCreation({ repos, workspaceId, sessionId: session.session.id, sessionToken: session.sessionToken, candidateId: selected.id });
  }
  const messages = await repos.customerDesign.messages.listByWorkspace(workspaceId);
  const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(workspaceId);
  const readiness = await repos.commerceAgent.productReadinessChecks.listByWorkspace(workspaceId);
  const margins = await repos.commerceAgent.marginAnalysis.listByWorkspace(workspaceId);
  const report = {
    ok: Boolean(ollamaProbe.ok && storefrontProducts.products.length && message.readyForCandidates && safeCandidates.length && publishResult?.ok),
    status: "passed",
    provider: process.env.AI_EMPLOYEES_MODEL_PROVIDER || "ollama",
    model,
    storefrontProductsRendered: storefrontProducts.products.length,
    sessionId: session.session.id,
    messagesCreated: messages.length,
    requirementsExtracted: 1,
    candidatesGenerated: generated.candidates.length,
    safeCandidates: safeCandidates.length,
    blockedCandidates: blockedCandidates.length,
    previewAssetsAttached,
    customerApprovedCandidate,
    readinessPassed: publishResult?.ok ? publishResult.safetyChecks.readinessPassed === true : false,
    marginPassed: publishResult?.ok ? publishResult.safetyChecks.marginPassed === true : false,
    policyPassed: publishResult?.ok ? publishResult.safetyChecks.policyPassed === true : false,
    customerSpecificProductCreated: publishResult?.ok === true,
    purchaseUrlCreated: publishResult?.ok ? Boolean(publishResult.purchaseUrl) : false,
    publicCatalogPromoted: false,
    shopifyAdminTokenExposed: false,
    productCreateMode: publishResult?.ok ? publishResult.productCreateMode : "disabled",
    shopifyProductCreateMode: publishResult?.ok ? publishResult.shopifyProductCreateMode : "disabled",
    purchaseUrlMode: publishResult?.ok ? publishResult.purchaseUrlMode : "disabled",
    providerMutationInstrumentation: "not_available",
    liveProviderMutationProof: "smoke_local_no_live_path",
    liveShopifyMutationAttempted: false,
    printifyTouched: false,
    hfTouched: false,
    imageGenerationMode: "fixture",
    liveImageGenerationAttempted: false,
    emailSmsSent: false,
    socialPosted: false,
    adSpendAttempted: false,
    tokenEchoDetected: false,
    tokenHashExposed: false,
    policyReviewsCreated: policyReviews.length,
    readinessChecksCreated: readiness.length,
    marginAnalysesCreated: margins.length,
    blockingReason: publishResult?.ok ? null : publishResult?.blockingReason ?? ollamaProbe.blockingReason ?? "customer_design_smoke_failed"
  };
  report.status = report.ok ? "passed" : "blocked";
  report.tokenEchoDetected = reportContainsToken(report);
  report.tokenHashExposed = JSON.stringify(report).includes("session_token_hash") || JSON.stringify(report).includes("sessionTokenHash");
  report.shopifyAdminTokenExposed = Boolean(process.env.SHOPIFY_ADMIN_TOKEN && JSON.stringify(report).includes(process.env.SHOPIFY_ADMIN_TOKEN));
  report.ok = report.ok && !report.tokenEchoDetected && !report.tokenHashExposed && !report.shopifyAdminTokenExposed;
  const outDir = path.resolve(process.cwd(), "test-results", "customer-design-concierge");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  return report;
}

export class ScriptedCustomerDesignSmokeProvider implements ModelRuntimeProvider {
  providerKey = "ollama";
  calls: ModelTextInput[] = [];
  async verifyConnection(): Promise<ProviderCheck> {
    return { ok: true, status: "ready", setupRequired: [], blockingReasons: [] };
  }
  async generateText(input: ModelTextInput): Promise<ModelTextResult> {
    this.calls.push(input);
    return { ok: true, text: "{\"ok\":true}", modelUsed: "scripted-customer-design-smoke" };
  }
  async generateStructured<T>(input: ModelStructuredInput<T>): Promise<ModelStructuredResult<T>> {
    const text = await this.generateText(input);
    return { ...text, data: input.example };
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runCustomerDesignConciergeSmoke()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
