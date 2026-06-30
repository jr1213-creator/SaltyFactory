import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { evaluatePublishReviewGates, fixtures } from "@saltyfactory/domain";
import { notImplementedApiResponse, studioAuthErrorResponse } from "../../_auth";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req);
    return NextResponse.json({
      ok: true,
      route: "briefs/create",
      auditActor: { actor_type: "human", actor_id: user.id },
      gates: evaluatePublishReviewGates(fixtures.publishReviewBlocked)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireDraftMutationPermission(req);
    return notImplementedApiResponse("Brief creation requires the repository-backed brief builder endpoint.");
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
