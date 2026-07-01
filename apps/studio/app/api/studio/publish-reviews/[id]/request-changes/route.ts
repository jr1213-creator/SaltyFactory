import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireReviewerOrAbove(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const review = await repos.publish.getById(id, workspaceId);
    if (!review) return notFoundApiResponse();
    const updated = await repos.publish.update(id, { status: "changes_requested", reviewed_by: user.id, reviewed_at: new Date().toISOString() } as any);
    return NextResponse.json({ ok: true, status: "changes_requested", review: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
