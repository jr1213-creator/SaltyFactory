import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { withBusinessApproval, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessApproval(req, async (repos, user) => {
      const opportunity = await repos.business.opportunities.getById(id, workspaceId);
      if (!opportunity) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.opportunities.update(id, { owner_decision: "approved", updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "approved", opportunity: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
