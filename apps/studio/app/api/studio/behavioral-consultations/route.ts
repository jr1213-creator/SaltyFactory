import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { shopManagerWorkspaceId } from "../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../_auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const rows = await createRepositories().commerceAgent.behavioralConsultations.listByWorkspace(shopManagerWorkspaceId);
    return NextResponse.json({ ok: true, behavioralConsultations: rows });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
