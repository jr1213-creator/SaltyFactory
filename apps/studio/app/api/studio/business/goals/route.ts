import { studioAuthErrorResponse } from "../../_auth";
import { json, nowId, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, goals: await repos.business.goals.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const goal = await repos.business.goals.create({
        id: nowId("goal"),
        workspace_id: workspaceId,
        goal_type: String(body.goalType || body.goal_type || "revenue"),
        title: String(body.title || "Business goal"),
        description: String(body.description || "Owner-defined goal"),
        target_value: body.targetValue || body.target_value || null,
        target_date: body.targetDate || body.target_date || null,
        status: String(body.status || "active"),
        priority: String(body.priority || "medium"),
        related_business_area: body.relatedBusinessArea || body.related_business_area || null,
        progress_snapshot: typeof body.progressSnapshot === "object" && body.progressSnapshot ? body.progressSnapshot : {},
        owner_notes: body.ownerNotes || body.owner_notes || null,
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "created", goal });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
