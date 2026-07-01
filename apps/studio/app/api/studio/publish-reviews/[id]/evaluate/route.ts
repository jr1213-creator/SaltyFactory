import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { evaluatePublishReadiness } from "../../_readiness";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const review = await repos.publish.getById(id, workspaceId);
    if (!review) return notFoundApiResponse();
    const readiness = await evaluatePublishReadiness({ repos, workspaceId, draftId: String(review.product_draft_id ?? review.productDraftId ?? ""), reviewId: id, humanApproved: Boolean((review.gates as Record<string, boolean> | undefined)?.human_approved) });
    const updated = await repos.publish.update(id, {
      gates: readiness.gates,
      all_gates_passed: readiness.evaluation.allowed,
      shopify_publish_allowed: false,
      printify_sync_allowed: false,
      status: readiness.evaluation.allowed ? "ready_for_human_approval" : "blocked",
      notes: readiness.blockingReasons
    } as any);
    return NextResponse.json({ ok: true, status: readiness.evaluation.allowed ? "ready_for_human_approval" : "blocked", review: updated, evaluation: readiness.evaluation, blockingReasons: readiness.blockingReasons });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
