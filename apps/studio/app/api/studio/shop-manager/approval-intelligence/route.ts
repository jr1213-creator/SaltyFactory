import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { listShopManagerBriefData } from "@saltyfactory/ai-free";
import { shopManagerWorkspaceId } from "../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../_auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const data = await listShopManagerBriefData({ repos: createRepositories(), workspaceId: shopManagerWorkspaceId });
    return NextResponse.json({
      ok: true,
      approvalQueueItems: data.approvalQueueItems,
      approvalPredictions: data.approvalPredictions,
      requiresHumanDecision: true
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
