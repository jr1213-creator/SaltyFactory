import { NextResponse } from "next/server";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { createRepositories } from "@saltyfactory/db";
import { buildRoleSpec, globalForbiddenAiEmployeeActions, normalizeAiForbiddenActions } from "@saltyfactory/domain";

export const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export const nowId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
export const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 64) || "ai_employee";

export async function parseRequestBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await req.json().catch(() => ({}));
  if (contentType.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === "string" ? value : value.name]));
  }
  return await req.json().catch(() => ({}));
}

export function stripSecretLikeFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecretLikeFields);
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|password|credential|ein|account_number|routing/i.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = stripSecretLikeFields(raw);
    }
  }
  return output;
}

export async function writeAiWorkforceAudit(input: {
  repos: RepositoryBundle;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  await input.repos.audit.write({
    id: nowId("audit_ai_workforce"),
    workspace_id: workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action as any,
    actor_type: "human",
    actor_id: input.actorId,
    notes: input.notes ?? null,
    metadata: input.metadata ?? {}
  } as any);
}

export async function proposalPayloadToHireRequest(body: Record<string, unknown>, actorId: string) {
  const roleTitle = String(body["requestedRoleTitle"] || body["requested_role_title"] || body["roleTitle"] || "Provider Readiness Auditor");
  const department = String(body.department || "AI Operations");
  const detectedGap = String(body.detectedGap || body.detected_gap || "missing_provider_readiness_handoff");
  const reasonNeeded = String(body.reasonNeeded || body.reason_needed || "The current workflow needs a specialist to explain blockers and prepare owner-reviewed handoffs.");
  const specInput: Parameters<typeof buildRoleSpec>[0] = {
    roleTitle,
    department,
    detectedGap,
    reasonNeeded
  };
  if (Array.isArray(body.allowedTools)) specInput.allowedTools = body.allowedTools.map(String);
  if (Array.isArray(body.allowedActions)) specInput.allowedActions = body.allowedActions.map(String);
  if (Array.isArray(body.forbiddenActions)) specInput.forbiddenActions = body.forbiddenActions.map(String);
  const spec = buildRoleSpec(specInput);
  return {
    request: {
      id: nowId("hire"),
      workspace_id: workspaceId,
      requested_by_employee_id: body.requestedByEmployeeId || body.requested_by_employee_id || null,
      requested_by_user_id: actorId,
      requested_role_title: roleTitle,
      department,
      reason_needed: reasonNeeded,
      detected_gap: detectedGap,
      business_case: String(body.businessCase || body.business_case || `This role helps unblock ${detectedGap} without granting live provider authority.`),
      status: String(body.status || "needs_review"),
      risk_level: String(body.riskLevel || body.risk_level || "medium"),
      source_record_id: body.sourceRecordId || body.source_record_id || null,
      owner_notes: body.ownerNotes || body.owner_notes || null,
      metadata: stripSecretLikeFields(body) as Record<string, unknown>
    },
    spec
  };
}

export async function createHireRequest(body: Record<string, unknown>, actorId: string, repos = createRepositories()) {
  const payload = await proposalPayloadToHireRequest(body, actorId);
  const approval = await repos.shared.approvals.create({
    id: nowId("approval_hire"),
    workspace_id: workspaceId,
    entity_type: "ai_employee_hire_request",
    entity_id: payload.request.id,
    approval_type: "ai_employee_hire",
    status: "pending",
    requested_by: actorId,
    notes: "Owner review required before this AI employee can be created."
  } as any);
  const request = await repos.aiWorkforce.hireRequests.create({ ...payload.request, approval_id: approval.id } as any);
  const spec = await repos.aiWorkforce.roleSpecs.create({
    id: nowId("rolespec"),
    workspace_id: workspaceId,
    hire_request_id: request.id,
    ...payload.spec
  } as any);
  await repos.shared.events.create({
    id: nowId("event_hire"),
    workspace_id: workspaceId,
    entity_type: "ai_employee_hire_request",
    entity_id: request.id,
    event_type: "ai_hire_request_created",
    event_label: "AI hire request created",
    payload: { roleTitle: request.requested_role_title, forbiddenActions: payload.spec.forbidden_actions },
    source_label: "ai_hiring_desk",
    created_by: actorId
  } as any);
  await writeAiWorkforceAudit({ repos, actorId, entityType: "ai_employee_hire_request", entityId: request.id, action: "created" });
  return { request, spec, approval };
}

export async function getHireRequestWithSpec(repos: RepositoryBundle, id: string) {
  const request = await repos.aiWorkforce.hireRequests.getById(id, workspaceId);
  if (!request) return null;
  const specs = await repos.aiWorkforce.roleSpecs.list();
  const spec = specs.find((row) => row.hire_request_id === id || row.hireRequestId === id) ?? null;
  return { request, spec };
}

export async function requireHireRequest(repos: RepositoryBundle, id: string) {
  const found = await getHireRequestWithSpec(repos, id);
  if (!found) {
    return NextResponse.json({ ok: false, status: "not_found", blockingReasons: ["hire_request_not_found"] }, { status: 404 });
  }
  return found;
}

export async function createEmployeeFromApprovedRequest(repos: RepositoryBundle, id: string, actorId: string) {
  const found = await getHireRequestWithSpec(repos, id);
  if (!found) return { ok: false as const, status: "not_found", blockingReasons: ["hire_request_not_found"] };
  if (String(found.request.status) !== "approved") {
    return { ok: false as const, status: "blocked_by_guardrail", blockingReasons: ["hire_request_approval_required"] };
  }
  const spec = found.spec;
  if (!spec) return { ok: false as const, status: "blocked_by_guardrail", blockingReasons: ["role_spec_required"] };
  const forbiddenActions = normalizeAiForbiddenActions(spec.forbidden_actions ?? spec.forbiddenActions);
  const employee = await repos.aiWorkforce.employeeDefinitions.create({
    id: nowId("aidef"),
    workspace_id: workspaceId,
    role_title: String(spec.role_title ?? spec.roleTitle ?? found.request.requested_role_title),
    department: String(found.request.department ?? "AI Operations"),
    mission: String(spec.mission),
    status: "setup_needed",
    allowed_tools: spec.allowed_tools ?? spec.allowedTools ?? [],
    allowed_actions: spec.allowed_actions ?? spec.allowedActions ?? [],
    forbidden_actions: forbiddenActions,
    guardrails: spec.required_guardrails ?? spec.requiredGuardrails ?? [],
    prompt_profile: String(spec.prompt_profile ?? spec.promptProfile ?? ""),
    created_from_hire_request_id: found.request.id,
    approved_by: actorId,
    approved_at: new Date().toISOString(),
    created_by: actorId,
    updated_by: actorId
  } as any);
  const employeeType = slug(String(employee.role_title ?? employee.roleTitle));
  await repos.aiEmployee.create({
    id: nowId("emp"),
    workspace_id: workspaceId,
    employee_type: employeeType,
    name: String(employee.role_title ?? employee.roleTitle),
    description: String(employee.mission),
    status: "setup_needed",
    provider_preference: "rules_only",
    allowed_task_types: ["draft", "recommend", "write_internal"],
    requires_human_approval: true,
    configuration: { createdFromHireRequestId: id },
    created_by: actorId,
    updated_by: actorId
  } as any);
  const scopes = await Promise.all([
    repos.aiWorkforce.permissionScopes.create({
      id: nowId("scope"),
      workspace_id: workspaceId,
      employee_id: employee.id,
      scope: "workspace_records",
      permission_level: "read",
      requires_owner_approval: true,
      status: "active"
    } as any),
    repos.aiWorkforce.permissionScopes.create({
      id: nowId("scope"),
      workspace_id: workspaceId,
      employee_id: employee.id,
      scope: "internal_drafts",
      permission_level: "draft",
      requires_owner_approval: true,
      status: "active"
    } as any),
    repos.aiWorkforce.permissionScopes.create({
      id: nowId("scope"),
      workspace_id: workspaceId,
      employee_id: employee.id,
      scope: "provider_actions",
      permission_level: "provider_action_blocked",
      requires_owner_approval: true,
      status: "active"
    } as any)
  ]);
  await repos.aiWorkforce.hireRequests.update(id, { status: "created", updated_by: actorId } as any);
  await repos.shared.events.create({
    id: nowId("event_hire_created"),
    workspace_id: workspaceId,
    entity_type: "ai_employee_definition",
    entity_id: employee.id,
    event_type: "ai_employee_definition_created",
    event_label: "AI employee created from approved hire request",
    payload: { hireRequestId: id, forbiddenActions },
    source_label: "ai_hiring_desk",
    created_by: actorId
  } as any);
  await writeAiWorkforceAudit({
    repos,
    actorId,
    entityType: "ai_employee_definition",
    entityId: employee.id,
    action: "created",
    metadata: { hireRequestId: id, globalForbiddenActions: globalForbiddenAiEmployeeActions }
  });
  return { ok: true as const, employee, scopes };
}

export function json(data: WorkspaceRow | Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
