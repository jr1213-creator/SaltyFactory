import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { reviewProductConceptCandidate, toSafeTrendAnalysisError } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const params = await context.params;
    const body = await req.json().catch(() => ({}));
    const reviewStatus = typeof body.reviewStatus === "string" ? body.reviewStatus : typeof body.review_status === "string" ? body.review_status : "";
    const ownerNotes = typeof body.ownerNotes === "string" ? body.ownerNotes : typeof body.owner_notes === "string" ? body.owner_notes : undefined;
    if (!["approved", "rejected", "archived"].includes(reviewStatus)) {
      return NextResponse.json({ ok: false, status: "blocked", errorCode: "invalid_review_status", message: "reviewStatus must be approved, rejected, or archived." }, { status: 400 });
    }
    const updated = await reviewProductConceptCandidate({
      repos: createRepositories(),
      workspaceId,
      conceptId: params.id,
      reviewStatus: reviewStatus as "approved" | "rejected" | "archived",
      ownerNotes,
      actorId: user.id
    });
    if (!updated) {
      return NextResponse.json({ ok: false, status: "not_found", message: "Product concept candidate not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conceptCandidate: updated });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: toSafeTrendAnalysisError(error) }, { status: 500 });
    }
  }
}
