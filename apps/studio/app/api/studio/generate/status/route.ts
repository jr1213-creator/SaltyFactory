import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { evaluatePublishReviewGates, fixtures } from "@saltyfactory/domain";
import { notImplementedApiResponse, studioAuthErrorResponse } from "../../_auth";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req);
    return NextResponse.json({
      ok: true,
      route: "generate/status",
      auditActor: { actor_type: "human", actor_id: user.id },
      gates: evaluatePublishReviewGates(fixtures.publishReviewBlocked)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireProviderMutationPermission(req);
    return notImplementedApiResponse("Generation status mutation requires a persisted generation job id.");
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
