import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";
import { evaluatePublishReadiness } from "./_readiness";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    return NextResponse.json({ ok: true, reviews: await createRepositories().publish.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.product_draft_id || body.productDraftId || "");
    const id = String(body.id || `pubrev_${Date.now()}`);
    const repos = createRepositories();
    const readiness = await evaluatePublishReadiness({ repos, workspaceId, draftId: productDraftId, reviewId: id, humanApproved: false });
    const clientGateHintsIgnored = typeof body.gates === "object" && body.gates ? ["Client-provided gate booleans were ignored; gates are computed server-side from persisted evidence."] : [];
    const review = await repos.publish.create({
      id,
      workspace_id: workspaceId,
      product_draft_id: productDraftId,
      gates: readiness.gates,
      all_gates_passed: readiness.evaluation.allowed,
      shopify_publish_allowed: false,
      printify_sync_allowed: false,
      status: readiness.evaluation.allowed ? "pending_human_approval" : "blocked",
      notes: [...clientGateHintsIgnored, ...readiness.blockingReasons],
      metadata: { clientGateHintsIgnored: Boolean(clientGateHintsIgnored.length) },
      created_by: user.id,
      updated_by: user.id
    } as any);
    return NextResponse.json({ ok: true, status: "review_created", review, evaluation: readiness.evaluation, blockingReasons: readiness.blockingReasons });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
