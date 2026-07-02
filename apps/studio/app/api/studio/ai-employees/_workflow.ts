import { exportListingDraft, validateListingDraft } from "@saltyfactory/domain";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";

export type AiOutputReviewDecision = "approve" | "reject" | "request_changes" | "needs_edits" | "convert_to_task";

const reviewableStatuses = new Set(["draft", "pending_review", "needs_review", "ready_for_owner_review"]);
const blockedStatuses = new Set(["provider_not_configured", "setup_needed", "manual_input_required", "blocked_by_guardrail"]);

function now() {
  return new Date().toISOString();
}

function slug(value: unknown, fallback = "record") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 70) || fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function aiOutputPayload(output: WorkspaceRow) {
  return asRecord(output.output_json ?? output.outputJson);
}

export function aiOutputMetadata(output: WorkspaceRow) {
  return asRecord(output.metadata);
}

export function aiOutputType(output: WorkspaceRow) {
  return text(output.output_type ?? output.outputType, "ai_employee_output");
}

export function aiOutputTitle(output: WorkspaceRow) {
  const payload = aiOutputPayload(output);
  return text(payload.title ?? output.title, aiOutputType(output).replace(/_/g, " "));
}

export function sharedApprovalIdForAiOutput(outputId: string) {
  return `approval_${outputId}`;
}

export function aiOutputIsReviewable(output: WorkspaceRow) {
  const status = String(output.status ?? "");
  const metadata = aiOutputMetadata(output);
  if (blockedStatuses.has(status)) return false;
  if (metadata.approvalRequired === false) return false;
  return reviewableStatuses.has(status);
}

async function upsert(repo: { getById(id: string, workspaceId?: string): Promise<WorkspaceRow | null>; create(row: WorkspaceRow): Promise<WorkspaceRow>; update(id: string, patch: WorkspaceRow): Promise<WorkspaceRow> }, row: WorkspaceRow, workspaceId: string) {
  const existing = await repo.getById(row.id, workspaceId);
  return existing ? repo.update(row.id, row) : repo.create(row);
}

export async function ensureSharedApprovalForAiOutput(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
}) {
  const { repos, workspaceId, actorId, output } = input;
  const payload = aiOutputPayload(output);
  const metadata = aiOutputMetadata(output);
  const blockers = asArray(metadata.blockers ?? payload.blockers);
  const status = aiOutputIsReviewable(output) ? "pending" : blockers.length || blockedStatuses.has(String(output.status ?? "")) ? "blocked" : "pending";
  return upsert(repos.shared.approvals, {
    id: sharedApprovalIdForAiOutput(output.id),
    workspace_id: workspaceId,
    entity_type: "ai_employee_output",
    entity_id: output.id,
    approval_type: aiOutputType(output),
    status,
    requested_by: actorId,
    requested_at: now(),
    notes: blockers.length
      ? `Blocked until resolved: ${blockers.join(", ")}`
      : "Owner review required. This approval does not run provider actions.",
    metadata: { noProviderAction: true, source: "ai_employee_output_bridge" }
  }, workspaceId);
}

export async function ensureSharedApprovalsForAiOutputs(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId?: string;
}) {
  const outputs = await input.repos.aiEmployee.outputs.listByWorkspace(input.workspaceId);
  const pending = outputs.filter((output) => {
    const status = String(output.status ?? "");
    return reviewableStatuses.has(status) || blockedStatuses.has(status);
  });
  const approvals = [];
  for (const output of pending) {
    approvals.push(await ensureSharedApprovalForAiOutput({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId ?? "system",
      output
    }));
  }
  return approvals;
}

async function writeReviewEvents(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
  decision: AiOutputReviewDecision;
  beforeStatus: string;
  afterStatus: string;
  notes?: string | undefined;
}) {
  const label = input.decision === "approve"
    ? "AI employee output approved"
    : input.decision === "reject"
      ? "AI employee output rejected"
      : input.decision === "convert_to_task"
        ? "AI employee output converted to task"
        : "AI employee output needs edits";

  await input.repos.shared.events.create({
    id: `event_ai_output_${input.output.id}_${Date.now()}`,
    workspace_id: input.workspaceId,
    entity_type: "ai_employee_output",
    entity_id: input.output.id,
    event_type: `ai_output_${input.decision}`,
    event_label: label,
    payload: {
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      providerActionExecuted: false,
      notes: input.notes ?? ""
    },
    source_label: "System-generated",
    created_by: input.actorId
  });
  await input.repos.shared.auditLog.create({
    id: `auditlog_ai_output_${input.output.id}_${Date.now()}`,
    workspace_id: input.workspaceId,
    actor_id: input.actorId,
    entity_type: "ai_employee_output",
    entity_id: input.output.id,
    action: `review_${input.decision}`,
    before: { status: input.beforeStatus },
    after: { status: input.afterStatus, providerActionExecuted: false },
    diff: { decision: input.decision, notes: input.notes ?? "" }
  });
  await input.repos.audit.write({
    id: `audit_ai_output_${input.output.id}_${Date.now()}`,
    workspace_id: input.workspaceId,
    entity_type: "ai_employee_output",
    entity_id: input.output.id,
    action: input.decision === "approve" ? "approval_granted" : input.decision === "reject" ? "rejected" : "review_requested",
    actor_type: "human",
    actor_id: input.actorId,
    before_state: input.beforeStatus,
    after_state: input.afterStatus,
    notes: input.notes || "AI employee output reviewed. No provider action executed."
  });
}

async function materializeProductIdeas(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
}) {
  const payload = aiOutputPayload(input.output);
  const data = asRecord(payload.data);
  const ideas = Array.isArray(data.productIdeas) ? data.productIdeas.map(asRecord) : [];
  const created: WorkspaceRow[] = [];
  for (const [index, idea] of ideas.entries()) {
    const id = `podmig_ai_${slug(input.output.id)}_${index + 1}`;
    const title = text(idea.title, `AI product idea ${index + 1}`);
    created.push(await upsert(input.repos.podMigration, {
      id,
      workspace_id: input.workspaceId,
      design_name: title,
      source: "AI employee approved output",
      source_listing_id: input.output.id,
      original_product_type: text(asArray(idea.targetProductTypes)[0], "POD product"),
      design_file_status: "prompt_draft",
      target_product_types: asArray(idea.targetProductTypes),
      target_channels: asArray(idea.targetChannels).length ? asArray(idea.targetChannels) : ["Shopify", "manual export"],
      readiness_json: {
        status: "ready_for_review",
        sourceOutputId: input.output.id,
        nextOwnerAction: text(idea.nextRecommendedAction, "Review product idea and create design concept.")
      },
      pricing_json: { source: "manual_or_provider_cost_required" },
      safety_flags: asArray(idea.riskFlags),
      status: "ready_for_review",
      notes: text(idea.conceptSummary, "Created from owner-approved AI employee product idea output."),
      created_by: input.actorId,
      updated_by: input.actorId
    }, input.workspaceId));
  }
  return created;
}

async function materializeListingDraft(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
}) {
  const payload = aiOutputPayload(input.output);
  const data = asRecord(payload.data);
  const draft = asRecord(data.draft);
  if (!Object.keys(draft).length) return null;
  const validation = validateListingDraft(draft);
  const exportPayload = exportListingDraft(draft);
  return upsert(input.repos.listingDraftV1, {
    id: `listv1_ai_${slug(input.output.id)}`,
    workspace_id: input.workspaceId,
    target_channel: text(draft.targetChannel, "Shopify"),
    source_type: "AI employee approved output",
    source_id: input.output.id,
    title: text(draft.title, aiOutputTitle(input.output)),
    short_hook: text(draft.shortHook),
    description: text(draft.description, "Owner review required before export or sync."),
    price: typeof draft.price === "number" ? draft.price : null,
    approval_status: "needs_review",
    validation_status: validation.status,
    validation_blockers: validation.blockers,
    listing_json: draft,
    export_payload: exportPayload,
    status: validation.status === "ready_for_export" ? "ready_for_review" : "draft",
    created_by: input.actorId,
    updated_by: input.actorId
  }, input.workspaceId);
}

async function materializeSocialDraft(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
}) {
  const payload = aiOutputPayload(input.output);
  const data = asRecord(payload.data);
  return upsert(input.repos.socialContent, {
    id: `social_ai_${slug(input.output.id)}`,
    workspace_id: input.workspaceId,
    channel_type: text(data.channelType, "instagram"),
    title: text(data.title, aiOutputTitle(input.output)),
    body: text(data.body ?? payload.body, "Draft for owner review."),
    source_label: text(data.sourceLabel ?? payload.sourceLabel, "rules_based"),
    source_type: "AI employee approved output",
    source_id: input.output.id,
    approval_status: "draft",
    constraints_json: asRecord(data.constraints),
    status: "draft",
    created_by: input.actorId,
    updated_by: input.actorId
  }, input.workspaceId);
}

async function materializeApprovedAiOutput(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
}) {
  const type = aiOutputType(input.output);
  const records: WorkspaceRow[] = [];
  if (type === "product_idea_recommendations") {
    records.push(...await materializeProductIdeas(input));
  }
  if (type === "listing_draft") {
    const draft = await materializeListingDraft(input);
    if (draft) records.push(draft);
  }
  if (type === "social_content_draft") {
    records.push(await materializeSocialDraft(input));
  }
  if (["trend_report", "design_concept", "image_generation_request", "mockup_plan", "pricing_margin_report", "launch_readiness_check"].includes(type)) {
    records.push(await input.repos.shared.recommendations.create({
      id: `rec_ai_${slug(input.output.id)}`,
      workspace_id: input.workspaceId,
      entity_type: "ai_employee_output",
      entity_id: input.output.id,
      recommendation_type: `${type}_next_step`,
      title: `${type.replace(/_/g, " ")} approved next step`,
      body: type === "image_generation_request"
        ? "Image prompt approved for internal planning only. Configure an image provider or upload artwork manually; no image generation was executed."
        : "Approved AI employee output is available for the next owner-controlled workflow step.",
      status: "pending",
      kind: "rules_based",
      confidence: "0.70",
      created_by: input.actorId,
      updated_by: input.actorId
    }));
  }
  return records;
}

export async function convertAiOutputToTask(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  output: WorkspaceRow;
  notes?: string | undefined;
}) {
  return input.repos.shared.tasks.create({
    id: `task_ai_${slug(input.output.id)}_${Date.now()}`,
    workspace_id: input.workspaceId,
    entity_type: "ai_employee_output",
    entity_id: input.output.id,
    title: `Review ${aiOutputTitle(input.output)}`,
    description: input.notes || text(aiOutputPayload(input.output).body, "Owner follow-up task created from AI employee output."),
    status: "pending",
    priority: "normal",
    created_by: input.actorId,
    updated_by: input.actorId
  });
}

export async function reviewAiEmployeeOutput(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  outputId: string;
  decision: AiOutputReviewDecision;
  notes?: string;
}) {
  const output = await input.repos.aiEmployee.outputs.getById(input.outputId, input.workspaceId);
  if (!output) return null;
  const beforeStatus = String(output.status ?? "");
  const approval = await ensureSharedApprovalForAiOutput({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    output
  });

  if (input.decision === "approve" && !aiOutputIsReviewable(output)) {
    await input.repos.shared.events.create({
      id: `event_ai_output_blocked_${output.id}_${Date.now()}`,
      workspace_id: input.workspaceId,
      entity_type: "ai_employee_output",
      entity_id: output.id,
      event_type: "ai_output_approval_blocked",
      event_label: "AI employee output approval blocked",
      payload: { status: beforeStatus, providerActionExecuted: false, notes: input.notes ?? "" },
      source_label: "System-generated",
      created_by: input.actorId
    });
    return {
      blocked: true,
      status: "blocked",
      message: "This AI employee output is not approval-ready. Resolve blockers or convert it to a task.",
      blockingReasons: asArray(aiOutputMetadata(output).blockers).length ? asArray(aiOutputMetadata(output).blockers) : [beforeStatus || "not_reviewable"],
      output,
      approval
    };
  }

  if (input.decision === "convert_to_task") {
    const task = await convertAiOutputToTask({ ...input, output });
    await writeReviewEvents({
      repos: input.repos,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      output,
      decision: input.decision,
      beforeStatus,
      afterStatus: beforeStatus,
      notes: input.notes
    });
    return { blocked: false, status: "task_created", output, approval, task, downstreamRecords: [] };
  }

  const normalizedDecision = input.decision === "needs_edits" ? "request_changes" : input.decision;
  const afterStatus = normalizedDecision === "approve"
    ? "approved"
    : normalizedDecision === "reject"
      ? "rejected"
      : "changes_requested";
  const updatedOutput = await input.repos.aiEmployee.outputs.update(output.id, {
    status: afterStatus,
    approved_by: normalizedDecision === "approve" ? input.actorId : null,
    approved_at: normalizedDecision === "approve" ? now() : null,
    updated_by: input.actorId,
    metadata: {
      ...aiOutputMetadata(output),
      reviewDecision: normalizedDecision,
      reviewNotes: input.notes ?? "",
      reviewedBy: input.actorId,
      reviewedAt: now(),
      providerActionExecuted: false
    }
  } as Partial<WorkspaceRow>);
  const approvalStatus = normalizedDecision === "approve" ? "approved" : normalizedDecision === "reject" ? "rejected" : "needs_edits";
  const updatedApproval = await input.repos.shared.approvals.update(approval.id, {
    status: approvalStatus,
    decided_by: input.actorId,
    decided_at: now(),
    notes: input.notes || approval.notes || "",
    metadata: { noProviderAction: true, reviewDecision: normalizedDecision }
  } as Partial<WorkspaceRow>);
  const downstreamRecords = normalizedDecision === "approve"
    ? await materializeApprovedAiOutput({ repos: input.repos, workspaceId: input.workspaceId, actorId: input.actorId, output: updatedOutput })
    : [];

  await writeReviewEvents({
    repos: input.repos,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    output,
    decision: input.decision,
    beforeStatus,
    afterStatus,
    notes: input.notes
  });

  return {
    blocked: false,
    status: afterStatus,
    output: updatedOutput,
    approval: updatedApproval,
    downstreamRecords,
    providerAction: "not_executed"
  };
}
