import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { withBusinessWrite, workspaceId } from "../../_shared";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const mantra = await repos.business.mantras.getById(id, workspaceId);
      if (!mantra) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.mantras.update(id, {
        mantra: body.mantra || mantra.mantra,
        category: body.category || mantra.category,
        active: typeof body.active === "boolean" ? body.active : mantra.active,
        display_order: body.displayOrder || body.display_order || mantra.display_order,
        updated_by: user.id
      } as any);
      return NextResponse.json({ ok: true, status: "updated", mantra: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
