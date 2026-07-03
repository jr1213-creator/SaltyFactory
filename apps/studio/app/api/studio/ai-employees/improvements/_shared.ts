import { NextResponse } from "next/server";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { hasForbiddenAiEmployeeAction, normalizeAiForbiddenActions } from "@saltyfactory/domain";
import { createHireRequest, parseRequestBody } from "../hiring/_shared";

export const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const nowId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function createImprovementSuggestion(body: Record<string, unknown>, actorId: string, repos = createRepositories()) {
  const suggestion = await repos.aiWorkforce.improvementSuggestions.create({
    id: nowId("improve"),
    workspace_id: workspaceId,
    suggested_by_employee_id: body.suggestedByEmployeeId || body.suggested_by_employee_id || null,
    suggested_by_user_id: actorId,
    suggestion_type: String(body.suggestionType || body.suggestion_type || "workflow_improvement_request"),
    title: String(body.title || "Workflow improvement request"),
    summary: String(body.summary || "Owner review is required before this improvement can be implemented."),
    observed_problem: String(body.observedProblem || body.observed_problem || "A workflow blocker was observed."),
    affected_workflow: String(body.affectedWorkflow || body.affected_workflow || "POD workflow"),
    affected_employee_id: body.affectedEmployeeId || body.affected_employee_id || null,
    affected_route: body.affectedRoute || body.affected_route || null,
    affected_provider: body.affectedProvider || body.affected_provider || null,
    current_behavior: String(body.currentBehavior || body.current_behavior || "Manual owner intervention is required."),
    proposed_improvement: String(body.proposedImprovement || body.proposed_improvement || "Create an owner-reviewed task or request."),
    business_value: String(body.businessValue || body.business_value || "Reduce repeated blockers without weakening gates."),
    risk_level: String(body.riskLevel || body.risk_level || "medium"),
    implementation_complexity: String(body.implementationComplexity || body.implementation_complexity || "medium"),
    expected_impact: String(body.expectedImpact || body.expected_impact || "medium"),
    owner_decision: "pending",
    status: String(body.status || "submitted"),
    source_record_id: body.sourceRecordId || body.source_record_id || null
  } as any);
  const approval = await repos.shared.approvals.create({
    id: nowId("approval_improve"),
    workspace_id: workspaceId,
    entity_type: "ai_improvement_suggestion",
    entity_id: suggestion.id,
    approval_type: "ai_improvement",
    status: "pending",
    requested_by: actorId,
    notes: "AI improvement suggestions require owner review and cannot self-implement."
  } as any);
  await repos.aiWorkforce.improvementSuggestions.update(suggestion.id, { approval_id: approval.id } as any);
  await repos.audit.write({
    id: nowId("audit_improve"),
    workspace_id: workspaceId,
    entity_type: "ai_improvement_suggestion",
    entity_id: suggestion.id,
    action: "created" as any,
    actor_type: "human",
    actor_id: actorId,
    notes: "Improvement suggestion created for owner review.",
    metadata: {}
  } as any);
  return { suggestion: { ...suggestion, approval_id: approval.id }, approval };
}

export async function repeatedBlockerSuggestion(input: { blocker: string; count: number; affectedWorkflow: string; actorId: string; repos?: RepositoryBundle }) {
  if (input.count < 3) return null;
  return createImprovementSuggestion({
    suggestionType: "workflow_improvement_request",
    title: `Repeated blocker: ${input.blocker}`,
    observedProblem: `${input.blocker} occurred ${input.count} times.`,
    affectedWorkflow: input.affectedWorkflow,
    currentBehavior: "The owner must resolve the same blocker repeatedly.",
    proposedImprovement: "Create a checklist, setup route, or specialist handoff for this blocker.",
    businessValue: "Reduce repeated manual rework without granting autonomous execution.",
    riskLevel: "medium"
  }, input.actorId, input.repos);
}

export async function createCapabilityRequest(body: Record<string, unknown>, actorId: string, repos = createRepositories()) {
  const requestedActions = Array.isArray(body.requestedActions) ? body.requestedActions.map(String) : [];
  const request = await repos.aiWorkforce.capabilityRequests.create({
    id: nowId("capreq"),
    workspace_id: workspaceId,
    requested_by_employee_id: body.requestedByEmployeeId || body.requested_by_employee_id || "employee_unknown",
    employee_id: String(body.employeeId || body.employee_id || "employee_unknown"),
    capability_name: String(body.capabilityName || body.capability_name || "New capability request"),
    reason_needed: String(body.reasonNeeded || body.reason_needed || "Capability is needed for a safer handoff."),
    current_limitation: String(body.currentLimitation || body.current_limitation || "Current employee can only recommend."),
    requested_permission_level: String(body.requestedPermissionLevel || body.requested_permission_level || "recommend"),
    requested_tools: Array.isArray(body.requestedTools) ? body.requestedTools.map(String) : [],
    requested_actions: requestedActions,
    forbidden_actions: normalizeAiForbiddenActions(body.forbiddenActions),
    proposed_guardrails: Array.isArray(body.proposedGuardrails) ? body.proposedGuardrails.map(String) : ["Owner approval required"],
    approval_requirements: ["Owner approval before grant"],
    risk_level: hasForbiddenAiEmployeeAction(requestedActions) ? "high" : String(body.riskLevel || body.risk_level || "medium"),
    status: "pending",
    created_by: actorId,
    updated_by: actorId
  } as any);
  return { request };
}

export async function createTrainingRequest(body: Record<string, unknown>, actorId: string, repos = createRepositories()) {
  const request = await repos.aiWorkforce.trainingRequests.create({
    id: nowId("trainreq"),
    workspace_id: workspaceId,
    requested_by_employee_id: body.requestedByEmployeeId || body.requested_by_employee_id || "employee_unknown",
    employee_id: String(body.employeeId || body.employee_id || "employee_unknown"),
    training_topic: String(body.trainingTopic || body.training_topic || "Workflow training"),
    reason_needed: String(body.reasonNeeded || body.reason_needed || "Training is needed to improve handoff quality."),
    current_gap: String(body.currentGap || body.current_gap || "Missing current process knowledge."),
    desired_outcome: String(body.desiredOutcome || body.desired_outcome || "Higher quality owner-reviewable drafts."),
    proposed_training_materials: Array.isArray(body.proposedTrainingMaterials) ? body.proposedTrainingMaterials : [],
    expected_outputs_after_training: Array.isArray(body.expectedOutputsAfterTraining) ? body.expectedOutputsAfterTraining.map(String) : [],
    validation_tests: Array.isArray(body.validationTests) ? body.validationTests.map(String) : [],
    status: "pending",
    created_by: actorId,
    updated_by: actorId
  } as any);
  return { request };
}

export async function createToolAccessRequest(body: Record<string, unknown>, actorId: string, repos = createRepositories()) {
  const request = await repos.aiWorkforce.toolAccessRequests.create({
    id: nowId("toolreq"),
    workspace_id: workspaceId,
    requested_by_employee_id: body.requestedByEmployeeId || body.requested_by_employee_id || "employee_unknown",
    employee_id: String(body.employeeId || body.employee_id || "employee_unknown"),
    tool_name: String(body.toolName || body.tool_name || "Internal workspace tool"),
    provider_name: body.providerName || body.provider_name || null,
    requested_access_level: String(body.requestedAccessLevel || body.requested_access_level || "recommend"),
    reason_needed: String(body.reasonNeeded || body.reason_needed || "Tool is needed to improve handoff quality."),
    actions_requested: Array.isArray(body.actionsRequested) ? body.actionsRequested.map(String) : [],
    actions_forbidden: normalizeAiForbiddenActions(body.actionsForbidden),
    risk_review: { providerActionBlocked: true },
    proposed_guardrails: ["Owner approval required", "Provider action remains blocked by default"],
    status: "pending",
    created_by: actorId,
    updated_by: actorId
  } as any);
  return { request };
}

export async function convertSuggestionToTask(repos: RepositoryBundle, suggestionId: string, actorId: string) {
  const suggestion = await repos.aiWorkforce.improvementSuggestions.getById(suggestionId, workspaceId);
  if (!suggestion) return { ok: false as const, status: "not_found", blockingReasons: ["suggestion_not_found"] };
  const task = await repos.shared.tasks.create({
    id: nowId("task"),
    workspace_id: workspaceId,
    entity_type: "ai_improvement_suggestion",
    entity_id: suggestionId,
    title: String(suggestion.title),
    description: String(suggestion.proposed_improvement ?? suggestion.proposedImprovement ?? ""),
    status: "pending",
    priority: String(suggestion.risk_level ?? suggestion.riskLevel ?? "medium"),
    created_by: actorId
  } as any);
  await repos.aiWorkforce.improvementSuggestions.update(suggestionId, { status: "converted", owner_decision: "converted_to_task" } as any);
  return { ok: true as const, task };
}

export async function convertSuggestionToHireRequest(repos: RepositoryBundle, suggestionId: string, actorId: string) {
  const suggestion = await repos.aiWorkforce.improvementSuggestions.getById(suggestionId, workspaceId);
  if (!suggestion) return { ok: false as const, status: "not_found", blockingReasons: ["suggestion_not_found"] };
  const created = await createHireRequest({
    requestedRoleTitle: `${suggestion.title} Specialist`,
    department: "AI Operations",
    detectedGap: suggestion.observed_problem,
    reasonNeeded: suggestion.summary,
    businessCase: suggestion.business_value,
    sourceRecordId: suggestionId
  }, actorId, repos);
  await repos.aiWorkforce.improvementSuggestions.update(suggestionId, { status: "converted", owner_decision: "converted_to_hire_request" } as any);
  return { ok: true as const, ...created };
}

export function actionResponse(result: { ok: boolean; status?: string; blockingReasons?: string[] } & Record<string, unknown>) {
  return NextResponse.json(result, { status: result.ok ? 200 : result.status === "not_found" ? 404 : 409 });
}

export { parseRequestBody };
