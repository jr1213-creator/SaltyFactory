import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../_auth";
import { getHireRequestWithSpec, parseRequestBody, stripSecretLikeFields, workspaceId, writeAiWorkforceAudit } from "../_shared";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await context.params;
    const repos = createRepositories();
    const found = await getHireRequestWithSpec(repos, id);
    if (!found) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, ...found });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await context.params;
    const body = await parseRequestBody(req);
    const repos = createRepositories();
    const found = await getHireRequestWithSpec(repos, id);
    if (!found) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const request = await repos.aiWorkforce.hireRequests.update(id, {
      requested_role_title: body.requestedRoleTitle || body.requested_role_title || found.request.requested_role_title,
      department: body.department || found.request.department,
      reason_needed: body.reasonNeeded || body.reason_needed || found.request.reason_needed,
      detected_gap: body.detectedGap || body.detected_gap || found.request.detected_gap,
      business_case: body.businessCase || body.business_case || found.request.business_case,
      risk_level: body.riskLevel || body.risk_level || found.request.risk_level,
      owner_notes: body.ownerNotes || body.owner_notes || found.request.owner_notes,
      metadata: stripSecretLikeFields(body),
      updated_by: user.id
    } as any);
    const submittedRoleSpec = body["roleSpec"];
    if (found.spec && submittedRoleSpec && typeof submittedRoleSpec === "object") {
      await repos.aiWorkforce.roleSpecs.update(found.spec.id, stripSecretLikeFields(submittedRoleSpec) as any);
    }
    await writeAiWorkforceAudit({ repos, actorId: user.id, entityType: "ai_employee_hire_request", entityId: id, action: "updated" });
    return NextResponse.json({ ok: true, status: "updated", request });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
