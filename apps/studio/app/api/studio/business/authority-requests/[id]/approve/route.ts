import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, withBusinessApproval, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessApproval(req, async (repos, user, body) => {
      const request = await repos.business.authorityRequests.getById(id, workspaceId);
      if (!request) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const expiresAt = new Date(Date.now() + Number(body.expiresInMinutes || 60) * 60_000).toISOString();
      const approval = await repos.shared.approvals.create({
        id: nowId("approval_authority"),
        workspace_id: workspaceId,
        entity_type: "business_authority_request",
        entity_id: id,
        approval_type: String(request.authority_type ?? request.authorityType),
        status: "approved",
        requested_by: request.requested_by_user_id ?? request.requestedByUserId ?? null,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        notes: "One-time/time-limited sensitive authority approval."
      } as any);
      const updated = await repos.business.authorityRequests.update(id, { status: "approved", approval_id: approval.id, expires_at: expiresAt, updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "approved", authorityRequest: updated, approval });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
