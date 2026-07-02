import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { crmWorkspaceId } from "../../crm/_shared";
import { getCustomerCommandCenterData } from "../../../../studio/customer-command-center/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, crmWorkspaceId);
    const data = await getCustomerCommandCenterData();
    return NextResponse.json({
      ok: data.ok,
      status: "retrieved",
      summary: data.summary,
      nextActions: data.nextActions.slice(0, 25),
      providerStatuses: data.providerStatuses,
      setupMessage: data.setupMessage
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
