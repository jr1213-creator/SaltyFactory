import { studioAuthErrorResponse } from "../../_auth";
import { json, nowId, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, mantras: await repos.business.mantras.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const mantra = await repos.business.mantras.create({
        id: nowId("mantra"),
        workspace_id: workspaceId,
        mantra: String(body.mantra || "Build the real thing."),
        category: String(body.category || "brand"),
        active: body.active !== false,
        display_order: Number(body.displayOrder || body.display_order || 0),
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "created", mantra });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
