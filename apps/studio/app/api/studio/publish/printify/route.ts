import { NextResponse } from "next/server";
import { requirePublishPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { evaluatePublishReviewGates, fixtures } from "@saltyfactory/domain";
import { studioAuthErrorResponse } from "../../_auth";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req);
    return NextResponse.json({
      ok: true,
      route: "publish/printify",
      auditActor: { actor_type: "human", actor_id: user.id },
      gates: evaluatePublishReviewGates(fixtures.publishReviewBlocked)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePublishPermission(req);
    const actor = { actor_type: "human" as const, actor_id: user.id };
    const gates = evaluatePublishReviewGates(fixtures.publishReviewBlocked);
    const blockingReasons = [
      "Persisted publish review lookup is not implemented for this route.",
      "Provider sync is disabled until Printify connection is configured.",
      "Live publishing remains disabled by default."
    ];
    if (!gates.printifyAllowed) blockingReasons.unshift("Printify sync gates have not passed.");
    return NextResponse.json(
      {
        ok: false,
        status: "not_implemented",
        route: "publish/printify",
        message: "Printify product sync requires persisted publish review lookup and provider connection setup before it can run.",
        blockingReasons,
        gates,
        auditActor: actor
      },
      { status: 501 }
    );
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
