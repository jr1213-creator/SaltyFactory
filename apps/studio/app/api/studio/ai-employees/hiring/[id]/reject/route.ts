import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";
import { getHireRequestWithSpec, parseRequestBody, workspaceId, writeAiWorkforceAudit } from "../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await context.params;
    const body = await parseRequestBody(req);
    const repos = createRepositories();
    const found = await getHireRequestWithSpec(repos, id);
    if (!found) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const request = await repos.aiWorkforce.hireRequests.update(id, { status: "rejected", owner_notes: body.note || body.notes || null, updated_by: user.id } as any);
    const approvalId = String(found.request.approval_id ?? found.request.approvalId ?? "");
    if (approvalId) await repos.shared.approvals.update(approvalId, { status: "rejected", decided_by: user.id, decided_at: new Date().toISOString(), notes: body.note || body.notes || null } as any);
    await writeAiWorkforceAudit({ repos, actorId: user.id, entityType: "ai_employee_hire_request", entityId: id, action: "rejected" });
    return NextResponse.json({ ok: true, status: "rejected", request });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
