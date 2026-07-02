import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { studioAuthErrorResponse } from "../../_auth";
import { crmWorkspaceId } from "../_shared";
import { getCustomerCommandCenterData } from "../../../../studio/customer-command-center/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, crmWorkspaceId);
    const data = await getCustomerCommandCenterData();
    return NextResponse.json({ ok: true, status: "retrieved", resource: "next-actions", records: data.nextActions });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
