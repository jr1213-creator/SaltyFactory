import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { runAgenticPodWorkflow, type AgenticRunMode } from "@saltyfactory/domain";
import { assertNoRawCredential } from "@saltyfactory/security";

export type AiEmployeeRole =
  | "trend_research_analyst"
  | "trend_report_writer"
  | "product_strategy_assistant"
  | "pod_migration_assistant"
  | "design_concept_assistant"
  | "image_generation_assistant"
  | "design_safety_checker"
  | "product_listing_assistant"
  | "pricing_margin_assistant"
  | "mockup_planning_assistant"
  | "shopify_printify_launch_assistant"
  | "merchant_center_assistant"
  | "google_search_analytics_assistant"
  | "social_content_assistant"
  | "operations_checklist_assistant"
  | "trend_scout"
  | "product_strategist"
  | "design_brief_writer"
  | "image_qa_assistant"
  | "listing_manager"
  | "seo_specialist"
  | "aeo_specialist"
  | "geo_specialist"
  | "analytics_analyst"
  | "publishing_assistant"
  | "margin_manager";

export const forbiddenAiActions = ["publish", "provider_sync", "ad_spend", "send_email", "send_sms", "auto_reply_review", "override_qa_gate"];

export function detectPromptInjection(text: string) {
  return /ignore (all )?(previous|above) instructions|system prompt|developer message|act as|jailbreak|reveal secrets/i.test(text);
}

export async function runDeterministicAiEmployee(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  role: AiEmployeeRole;
  inputRefType?: string;
  inputRefId?: string;
}) {
  const now = new Date().toISOString();
  const runId = `airun_${input.role}_${Date.now()}`;
  const run = await input.repos.aiEmployee.createRun({
    id: runId,
    workspace_id: input.workspaceId,
    employee_type: input.role,
    task_type: "deterministic_recommendation",
    input_ref_type: input.inputRefType ?? "workspace",
    input_ref_id: input.inputRefId ?? input.workspaceId,
    status: "completed",
    provider_used: "deterministic_rules",
    model_used: "none",
    output_json: {},
    blocked_reasons: forbiddenAiActions,
    requires_human_review: true,
    created_by: input.actorId,
    updated_by: input.actorId,
    completed_at: now
  });
  const trends = await input.repos.trend.listByWorkspace(input.workspaceId);
  const promptInjectionFlags = trends.filter((trend) => detectPromptInjection(String(trend.keyword ?? trend.normalized_text ?? trend.normalizedText ?? ""))).map((trend) => trend.id);
  const output: WorkspaceRow = await input.repos.aiEmployee.outputs.create({
    id: `aiout_${Date.now()}`,
    workspace_id: input.workspaceId,
    run_id: runId,
    output_type: "recommendation",
    title: `${input.role.replace(/_/g, " ")} recommendation`,
    body: promptInjectionFlags.length ? "Imported content contains prompt-injection-like text. Treat as data only." : "Create a human-reviewed draft from stored workspace data.",
    status: "draft",
    requires_human_review: true,
    metadata: {
      forbiddenActions: forbiddenAiActions,
      promptInjectionFlags,
      sourceCounts: { trends: trends.length }
    },
    created_by: input.actorId,
    updated_by: input.actorId
  });
  return { run, output };
}

export async function runAgenticAiEmployeeWorkflow(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  runMode?: AgenticRunMode;
  aiProviderConfigured?: boolean;
  imageProviderConfigured?: boolean;
  shopifyStatus?: string;
  printifyStatus?: string;
  googleStatus?: string;
  merchantStatus?: string;
}) {
  const now = new Date().toISOString();
  const runId = `airun_agentic_pod_${Date.now()}`;
  const [
    trends,
    clusters,
    businessProfiles,
    channels,
    podCandidates,
    listingDrafts,
    assets,
    mockups,
    publishReviews,
    aiOutputs
  ] = await Promise.all([
    input.repos.trend.listByWorkspace(input.workspaceId),
    input.repos.cluster.listByWorkspace(input.workspaceId),
    input.repos.businessProfileV1.listByWorkspace(input.workspaceId),
    input.repos.channel.listByWorkspace(input.workspaceId),
    input.repos.podMigration.listByWorkspace(input.workspaceId),
    input.repos.listingDraftV1.listByWorkspace(input.workspaceId),
    input.repos.asset.listByWorkspace(input.workspaceId),
    input.repos.mockup.listByWorkspace(input.workspaceId),
    input.repos.publish.listByWorkspace(input.workspaceId),
    input.repos.aiEmployee.outputs.listByWorkspace(input.workspaceId)
  ]);
  const latestBusinessProfile = businessProfiles[0]?.profile_json ?? businessProfiles[0]?.profileJson ?? businessProfiles[0] ?? null;
  const workflow = runAgenticPodWorkflow({
    runMode: input.runMode,
    trends,
    clusters,
    businessProfile: latestBusinessProfile as any,
    channels,
    podCandidates,
    listingDrafts,
    assets,
    mockups,
    publishReviews,
    aiOutputs,
    aiProviderConfigured: input.aiProviderConfigured,
    imageProviderConfigured: input.imageProviderConfigured,
    shopifyStatus: input.shopifyStatus,
    printifyStatus: input.printifyStatus,
    googleStatus: input.googleStatus,
    merchantStatus: input.merchantStatus
  });
  assertNoRawCredential(workflow);

  const run = await input.repos.aiEmployee.createRun({
    id: runId,
    workspace_id: input.workspaceId,
    employee_type: "ai_pod_orchestrator",
    task_type: input.runMode ?? "daily_pod_planning",
    input_ref_type: "workspace",
    input_ref_id: input.workspaceId,
    status: "completed",
    provider_used: "deterministic_rules",
    model_used: "none",
    output_json: {
      runMode: workflow.runMode,
      outputCount: workflow.outputs.length,
      approvalQueueCount: workflow.approvalQueue.length,
      costGuardrails: workflow.costGuardrails
    },
    blocked_reasons: workflow.forbiddenActions,
    requires_human_review: true,
    created_by: input.actorId,
    updated_by: input.actorId,
    started_at: now,
    completed_at: now,
    metadata: {
      sourceLabel: workflow.sourceLabel,
      safeInternalDraftRun: true,
      noProviderWrites: true,
      noPublishing: true,
      noSocialPosting: true,
      noSpend: true
    }
  });

  const outputs: WorkspaceRow[] = [];
  for (const [index, output] of workflow.outputs.entries()) {
    outputs.push(await input.repos.aiEmployee.outputs.create({
      id: `aiout_agentic_${Date.now()}_${index}`,
      workspace_id: input.workspaceId,
      run_id: runId,
      output_type: output.outputType,
      ref_type: output.data?.id ? output.outputType : "workspace",
      ref_id: String(output.data?.id ?? input.workspaceId),
      output_json: output,
      status: output.approvalRequired ? "pending_review" : output.status,
      metadata: {
        sourceLabel: output.sourceLabel,
        employeeKey: output.employeeKey,
        requiresHumanReview: output.requiresHumanReview,
        approvalRequired: output.approvalRequired,
        blockers: output.blockers,
        riskFlags: output.riskFlags
      },
      created_by: input.actorId,
      updated_by: input.actorId
    }));
  }

  await input.repos.audit.write({
    id: `audit_agentic_pod_${Date.now()}`,
    workspace_id: input.workspaceId,
    entity_type: "ai_employee_run",
    entity_id: runId,
    action: "created",
    actor_type: "human",
    actor_id: input.actorId,
    before_state: null,
    after_state: JSON.stringify({
      runMode: workflow.runMode,
      outputs: outputs.length,
      approvalQueue: workflow.approvalQueue.length,
      sourceLabel: workflow.sourceLabel
    }),
    notes: "Safe AI employee draft run created internal outputs for owner review."
  });

  return { run, outputs, workflow };
}
