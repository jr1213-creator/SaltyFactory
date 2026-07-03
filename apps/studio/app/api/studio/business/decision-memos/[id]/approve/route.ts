import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { withBusinessApproval, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessApproval(req, async (repos, user) => {
      const memo = await repos.business.decisionMemos.getById(id, workspaceId);
      if (!memo) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.decisionMemos.update(id, { owner_decision: "approved", updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "approved", memo: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
