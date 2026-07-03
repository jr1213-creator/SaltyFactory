import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    const usageEvents = await repos.aiModelRuntime.usageEvents.listByWorkspace(workspaceId);
    return NextResponse.json({
      ok: true,
      usageEvents,
      summary: {
        totalEvents: usageEvents.length,
        blocked: usageEvents.filter((event) => event.status === "blocked").length,
        escalated: usageEvents.filter((event) => event.status === "escalated").length,
        successful: usageEvents.filter((event) => event.status === "success").length
      }
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
