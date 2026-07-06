import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { badRequest, executeCommerceAgentRoute, readJsonOrFormBody, roleFromBody, shopManagerFailureStatus, shopManagerWorkspaceId } from "../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../_auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const roleKey = roleFromBody(body, "");
    if (!roleKey) return badRequest("Valid roleKey is required");
    const result = await executeCommerceAgentRoute({ body, actorId: user.id, roleKey });
    if (result.ollamaResult && !result.ollamaResult.ok) {
      return NextResponse.json({ ok: false, status: result.ollamaResult.status, errorCode: result.ollamaResult.errorCode, blockingReason: result.ollamaResult.blockingReason }, { status: 503 });
    }
    return NextResponse.json({ ok: true, status: "completed", agentRun: result.ollamaResult, commerceResult: result.commerceResult });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const message = error instanceof Error ? error.message : "commerce_agent_run_failed";
      return NextResponse.json({ ok: false, status: "failed", message }, { status: shopManagerFailureStatus(message) });
    }
  }
}
