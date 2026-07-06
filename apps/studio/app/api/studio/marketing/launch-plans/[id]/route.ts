import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { getMarketingLaunchPlanDetail } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../_auth";
import { marketingWorkspaceId } from "../../_shared";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, marketingWorkspaceId);
    const { id } = await params;
    const detail = await getMarketingLaunchPlanDetail({ repos: createRepositories(), workspaceId: marketingWorkspaceId, launchPlanId: id });
    if (!detail) {
      return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
