import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { workspaceId } from "../../integrations/_shared";
import { getAccountCenterReadiness } from "../../../../studio/account-center/readiness";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const readiness = await getAccountCenterReadiness();
    return NextResponse.json({
      ok: true,
      status: "retrieved",
      cards: readiness.cards,
      dnsRecords: readiness.dnsRecords,
      emailReadiness: readiness.emailReadiness,
      productFeedReadiness: readiness.productFeedReadiness,
      shopifySetup: readiness.shopifySetup,
      printifySetup: readiness.printifySetup,
      approvalQueue: {
        count: readiness.approvalQueue.length,
        items: readiness.approvalQueue.slice(0, 12)
      },
      workflow: {
        status: readiness.workflowPreview.status,
        sourceLabel: readiness.workflowPreview.sourceLabel,
        forbiddenActions: readiness.workflowPreview.forbiddenActions,
        costGuardrails: readiness.workflowPreview.costGuardrails
      }
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
