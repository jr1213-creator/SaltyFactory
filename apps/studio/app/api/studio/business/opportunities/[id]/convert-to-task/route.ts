import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, withBusinessWrite, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user) => {
      const opportunity = await repos.business.opportunities.getById(id, workspaceId);
      if (!opportunity) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const task = await repos.shared.tasks.create({
        id: nowId("task"),
        workspace_id: workspaceId,
        entity_type: "business_opportunity",
        entity_id: id,
        title: String(opportunity.title),
        description: String(opportunity.recommended_next_action ?? opportunity.recommendedNextAction ?? opportunity.summary),
        status: "pending",
        priority: String(opportunity.risk_level ?? opportunity.riskLevel ?? "normal"),
        created_by: user.id
      } as any);
      await repos.business.opportunities.update(id, { owner_decision: "converted_to_task", updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "converted_to_task", task });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
