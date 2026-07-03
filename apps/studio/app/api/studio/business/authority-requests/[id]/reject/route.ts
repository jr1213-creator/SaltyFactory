import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { withBusinessApproval, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessApproval(req, async (repos, user) => {
      const request = await repos.business.authorityRequests.getById(id, workspaceId);
      if (!request) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.authorityRequests.update(id, { status: "rejected", updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "rejected", authorityRequest: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
