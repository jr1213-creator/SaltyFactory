import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { decideMarketingApprovalRequest, toSafeMarketingLaunchError } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../../_auth";
import { marketingWorkspaceId, readJsonOrFormBody, safeStudioRedirect } from "../../../_shared";

function failureStatus(errorCode: string) {
  if (errorCode === "marketing_invalid_approval_decision") return 400;
  if (errorCode === "policy_review_required") return 409;
  return 500;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, marketingWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const { id } = await params;
    const updated = await decideMarketingApprovalRequest({
      repos: createRepositories(),
      workspaceId: marketingWorkspaceId,
      approvalRequestId: id,
      ownerDecision: String(body.ownerDecision || body.reviewStatus || "needs_changes") as "approved" | "rejected" | "needs_changes",
      reviewer: user.email,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      actorId: user.id
    });
    if (!updated) {
      return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    }
    const redirectUrl = safeStudioRedirect(req, body.next, id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, approvalRequest: updated });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const message = toSafeMarketingLaunchError(error);
      return NextResponse.json({ ok: false, status: "failed", message }, { status: failureStatus(message) });
    }
  }
}
