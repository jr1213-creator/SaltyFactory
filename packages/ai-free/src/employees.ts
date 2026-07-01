import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";

export type AiEmployeeRole =
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
