import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await params;
    const draft = await createRepositories().draft.getById(id, workspaceId);
    if (!draft) return notFoundApiResponse();
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
