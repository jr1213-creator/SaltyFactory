import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { hasForbiddenAiEmployeeAction } from "@saltyfactory/domain";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, workspaceId } from "../../../improvements/_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await context.params;
    const repos = createRepositories();
    const request = await repos.aiWorkforce.capabilityRequests.getById(id, workspaceId);
    if (!request) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const level = String(request.requested_permission_level ?? request.requestedPermissionLevel ?? "");
    const requestedActions = request.requested_actions ?? request.requestedActions ?? [];
    if (String(request.status) !== "approved") {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["capability_request_approval_required"] }, { status: 409 });
    }
    if (level.includes("provider_action") || hasForbiddenAiEmployeeAction(requestedActions)) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["provider_or_forbidden_action_cannot_auto_grant"] }, { status: 409 });
    }
    const scope = await repos.aiWorkforce.permissionScopes.create({
      id: nowId("scope"),
      workspace_id: workspaceId,
      employee_id: String(request.employee_id ?? request.employeeId),
      scope: String(request.capability_name ?? request.capabilityName),
      permission_level: level || "recommend",
      requires_owner_approval: true,
      status: "active"
    } as any);
    const updated = await repos.aiWorkforce.capabilityRequests.update(id, { status: "granted", updated_by: user.id } as any);
    return NextResponse.json({ ok: true, status: "granted", request: updated, scope });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
