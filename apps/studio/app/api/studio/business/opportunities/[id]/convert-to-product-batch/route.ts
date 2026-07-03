import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, withBusinessWrite, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const opportunity = await repos.business.opportunities.getById(id, workspaceId);
      if (!opportunity) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const targetCount = Number(body.targetCount || body.target_count || 15);
      const batch = await repos.productBatch.create({
        id: nowId("batch"),
        workspace_id: workspaceId,
        name: String(body.name || `${opportunity.title} batch`),
        target_count: targetCount,
        trend_source: String(opportunity.title),
        product_mix: Array.isArray(body.productMix) ? body.productMix : [],
        status: "idea",
        progress: { createdFromBusinessOpportunityId: id },
        blocked_reasons: [],
        created_by: user.id,
        updated_by: user.id
      } as any);
      const items = [];
      for (let index = 0; index < targetCount; index += 1) {
        items.push(await repos.productBatchItem.create({
          id: nowId("batchitem"),
          workspace_id: workspaceId,
          batch_id: batch.id,
          sequence: index + 1,
          stage: "idea",
          status: "idea",
          blockers: ["prompt_approval_required"],
          retry_count: 0,
          stage_history: [{ stage: "idea", at: new Date().toISOString() }],
          created_by: user.id,
          updated_by: user.id
        } as any));
      }
      await repos.business.opportunities.update(id, { owner_decision: "converted_to_product_batch", updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "converted_to_product_batch", batch, items });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
