import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const drafts = await repos.draft.listByWorkspace(workspaceId);
    const draft = drafts.find((row) => row.id === id || ((row.public_projection ?? row.publicProjection) as any)?.id === id);
    if (!draft) return notFoundApiResponse();
    const projection = { ...((draft.public_projection ?? draft.publicProjection) as Record<string, unknown> | undefined), status: "unpublished", unpublished_at: new Date().toISOString(), unpublished_by: user.id };
    const updated = await repos.draft.update(draft.id, { public_projection: projection, status: "approved_internal_ready", updated_by: user.id } as any);
    return NextResponse.json({ ok: true, status: "public_projection_unpublished", draft: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
