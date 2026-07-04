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
    const mockup = await createRepositories().mockup.getById(id, workspaceId);
    if (!mockup) return notFoundApiResponse();
    return privatePreviewResponse({ row: mockup, workspaceId, fallbackKind: "mockups" });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
