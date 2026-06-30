import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../_auth";
import { getSiteAuditWithFindings, workspaceId } from "../_shared";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await params;
    const audit = await getSiteAuditWithFindings(id);
    if (!audit) return notFoundApiResponse();
    return NextResponse.json({ ok: true, status: "success", ...audit });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
