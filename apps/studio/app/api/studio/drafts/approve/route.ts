import { NextResponse } from "next/server";
import { requireApprovalPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { evaluatePublishReviewGates, fixtures } from "@saltyfactory/domain";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, notImplementedApiResponse, studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req);
    return NextResponse.json({
      ok: true,
      route: "drafts/approve",
      auditActor: { actor_type: "human", actor_id: user.id },
      gates: evaluatePublishReviewGates(fixtures.publishReviewBlocked)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const draftId = String(body.product_draft_id || body.productDraftId || body.id || "");
    if (!draftId) return notImplementedApiResponse("Approval requires a product draft id and persisted draft lookup.");
    const repos = createRepositories();
    const draft = await repos.draft.getById(draftId, workspaceId);
    if (!draft) return notFoundApiResponse();
    const approved = await repos.draft.approve(draftId, user.id);
    return NextResponse.json({
      ok: true,
      route: "drafts/approve",
      auditActor: { actor_type: "human", actor_id: user.id },
      draft: approved,
      auditEvent: "created"
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
