import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { badRequest, readJsonOrFormBody, safeStudioRedirect, shopManagerWorkspaceId } from "../../../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../../../_auth";

export const runtime = "nodejs";

const allowedStatuses = new Set(["approved", "rejected", "needs_changes", "watch_longer", "pending_review"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const reviewStatus = typeof body.reviewStatus === "string" ? body.reviewStatus : typeof body.ownerDecision === "string" ? body.ownerDecision : "";
    if (!allowedStatuses.has(reviewStatus)) return badRequest("Invalid reviewStatus");
    const { id } = await params;
    const repos = createRepositories();
    const current = await repos.commerceAgent.recommendations.getById(id, shopManagerWorkspaceId);
    if (!current) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const updated = await repos.commerceAgent.recommendations.update(id, {
      review_status: reviewStatus,
      updated_by: user.id,
      metadata: {
        ...(current.metadata as Record<string, unknown> | undefined),
        ownerNotes: typeof body.notes === "string" ? body.notes : null,
        externalMutationAttempted: false
      }
    });
    const redirectUrl = safeStudioRedirect(req, body.next);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, recommendation: updated, externalMutationAttempted: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
