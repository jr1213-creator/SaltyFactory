import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { listMarketingLaunchPlans } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../_auth";
import { marketingWorkspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, marketingWorkspaceId);
    return NextResponse.json({
      ok: true,
      launchPlans: await listMarketingLaunchPlans({ repos: createRepositories(), workspaceId: marketingWorkspaceId })
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
