import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { privatePreviewResponse } from "../../../_private-preview";

export const runtime = "nodejs";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await params;
    const asset = await createRepositories().asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();
    return privatePreviewResponse({ row: asset, workspaceId, fallbackKind: "assets" });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
