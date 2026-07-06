import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createShopManagerBrief, prioritizeApprovalQueue, runCommerceAgent } from "@saltyfactory/ai-free";
import { executeCommerceAgentRoute, readJsonOrFormBody, roleFromBody, safeStudioRedirect, shopManagerFailureStatus, shopManagerWorkspaceId, validateShopManagerRunBody } from "../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../_auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const validationError = validateShopManagerRunBody(body);
    if (validationError) return NextResponse.json({ ok: false, status: "blocked", message: validationError }, { status: 400 });
    const roleKey = roleFromBody(body, "shop_manager_approval_intelligence");
    const result = await executeCommerceAgentRoute({ body, actorId: user.id, roleKey });
    if (result.ollamaResult && !result.ollamaResult.ok) {
      return NextResponse.json({ ok: false, status: result.ollamaResult.status, errorCode: result.ollamaResult.errorCode, blockingReason: result.ollamaResult.blockingReason }, { status: 503 });
    }
    await prioritizeApprovalQueue({ repos: result.repos, workspaceId: shopManagerWorkspaceId, actorId: user.id, roleKey: "approval_queue" });
    await runCommerceAgent({ repos: result.repos, workspaceId: shopManagerWorkspaceId, actorId: user.id, roleKey: "quality_control_process_improvement" });
    const brief = await createShopManagerBrief({ repos: result.repos, workspaceId: shopManagerWorkspaceId, actorId: user.id, roleKey: "owner_daily_brief" });
    const redirectUrl = safeStudioRedirect(req, body.next);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "completed", agentRun: result.ollamaResult, commerceResult: result.commerceResult, shopManagerBriefId: brief.id });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const message = error instanceof Error ? error.message : "shop_manager_run_failed";
      return NextResponse.json({ ok: false, status: "failed", message }, { status: shopManagerFailureStatus(message) });
    }
  }
}
