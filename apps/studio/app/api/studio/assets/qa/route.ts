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
      route: "assets/qa",
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
    const qaId = String(body.qa_id || body.qaId || body.id || "");
    if (!qaId) return notImplementedApiResponse("QA approval requires a persisted print-file QA id.");
    const repos = createRepositories();
    const qa = await repos.qa.getById(qaId, workspaceId);
    if (!qa) return notFoundApiResponse();
    const passed = await repos.qa.markPassed(qaId, user.id);
    return NextResponse.json({
      ok: true,
      route: "assets/qa",
      auditActor: { actor_type: "human", actor_id: user.id },
      qa: passed,
      auditEvent: "created"
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
