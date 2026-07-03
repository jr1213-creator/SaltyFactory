import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { withBusinessApproval, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessApproval(req, async (repos, user) => {
      const document = await repos.business.documents.getById(id, workspaceId);
      if (!document) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.documents.update(id, { status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "approved", document: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
