import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";
import { workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const latest = await createRepositories().siteAudit.latest(workspaceId);
    return NextResponse.json({
      ok: true,
      status: "success",
      audit: latest,
      empty: !latest,
      message: latest ? "Latest site audit loaded." : "No site audit has been run for this workspace."
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
