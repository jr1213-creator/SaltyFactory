import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { getTrendSignalRunDetail } from "@saltyfactory/integrations";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await params;
    const result = await getTrendSignalRunDetail({
      repos: createRepositories(),
      workspaceId,
      runId: id
    });
    if (!result) return notFoundApiResponse();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
