import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { withBusinessWrite, workspaceId } from "../../_shared";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const goal = await repos.business.goals.getById(id, workspaceId);
      if (!goal) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.goals.update(id, {
        title: body.title || goal.title,
        description: body.description || goal.description,
        status: body.status || goal.status,
        owner_notes: body.ownerNotes || body.owner_notes || goal.owner_notes,
        updated_by: user.id
      } as any);
      return NextResponse.json({ ok: true, status: "updated", goal: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
