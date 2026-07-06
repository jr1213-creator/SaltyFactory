import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { recordOwnerApprovalFeedback } from "@saltyfactory/ai-free";
import { badRequest, readJsonOrFormBody, safeStudioRedirect, shopManagerFailureStatus, shopManagerWorkspaceId } from "../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../_auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const approvalItemId = typeof body.approvalItemId === "string" ? body.approvalItemId.trim() : "";
    const ownerDecision = typeof body.ownerDecision === "string" ? body.ownerDecision.trim() : "";
    if (!approvalItemId) return badRequest("approvalItemId is required");
    if (!ownerDecision) return badRequest("ownerDecision is required");
    const result = await recordOwnerApprovalFeedback({
      repos: createRepositories(),
      workspaceId: shopManagerWorkspaceId,
      actorId: user.id,
      roleKey: "shop_manager_approval_intelligence",
      approvalItemId,
      ownerDecision,
      ownerNotes: typeof body.ownerNotes === "string" ? body.ownerNotes : typeof body.notes === "string" ? body.notes : undefined,
      rejectionReason: typeof body.rejectionReason === "string" ? body.rejectionReason : undefined,
      editedFields: body.editedFields && typeof body.editedFields === "object" && !Array.isArray(body.editedFields) ? body.editedFields as Record<string, unknown> : undefined,
      preferenceSignal: body.preferenceSignal && typeof body.preferenceSignal === "object" && !Array.isArray(body.preferenceSignal) ? body.preferenceSignal as Record<string, unknown> : undefined
    });
    const redirectUrl = safeStudioRedirect(req, body.next);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "recorded", ...result, externalMutationAttempted: false });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const message = error instanceof Error ? error.message : "owner_feedback_failed";
      return NextResponse.json({ ok: false, status: "failed", message }, { status: shopManagerFailureStatus(message) });
    }
  }
}
