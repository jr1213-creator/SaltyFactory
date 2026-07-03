import { studioAuthErrorResponse } from "../../_auth";
import { json, nowId, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, experiments: await repos.business.experiments.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const experiment = await repos.business.experiments.create({
        id: nowId("experiment"),
        workspace_id: workspaceId,
        title: String(body.title || "Business experiment"),
        hypothesis: String(body.hypothesis || "Owner-reviewed test hypothesis required."),
        entity_type: String(body.entityType || body.entity_type || "product"),
        entity_id: body.entityId || body.entity_id || null,
        success_metric: String(body.successMetric || body.success_metric || "conversion_rate"),
        baseline_value: body.baselineValue || body.baseline_value || null,
        target_value: body.targetValue || body.target_value || null,
        start_date: body.startDate || body.start_date || null,
        end_date: body.endDate || body.end_date || null,
        status: "proposed",
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "created", experiment });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
