import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { evaluatePublishReadiness } from "../../_readiness";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const review = await repos.publish.getById(id, workspaceId);
    if (!review) return notFoundApiResponse();
    const readiness = await evaluatePublishReadiness({ repos, workspaceId, draftId: String(review.product_draft_id ?? review.productDraftId ?? ""), reviewId: id, humanApproved: true });
    if (!readiness.evaluation.allowed) {
      await repos.publish.update(id, {
        gates: readiness.gates,
        all_gates_passed: false,
        shopify_publish_allowed: false,
        printify_sync_allowed: false,
        status: "blocked",
        notes: readiness.blockingReasons
      } as any);
      return NextResponse.json({ ok: false, status: "blocked", message: "Publish review cannot be approved until persisted server-side evidence passes every gate.", blockingReasons: readiness.blockingReasons, evaluation: readiness.evaluation }, { status: 409 });
    }
    const approved = await repos.publish.update(id, {
      gates: readiness.gates,
      all_gates_passed: true,
      shopify_publish_allowed: false,
      printify_sync_allowed: false,
      status: "approved_internal_ready",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      notes: ["Human approval recorded from computed server-side gates. Shopify/Printify sync remains blocked until a real connected provider path is explicitly executed."],
      updated_by: user.id
    } as any);
    return NextResponse.json({ ok: true, status: "approved_internal_ready", review: approved, evaluation: readiness.evaluation, providerSync: "blocked_until_real_provider_flow" });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
