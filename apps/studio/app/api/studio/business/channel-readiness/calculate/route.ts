import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { calculateProductMarketingReadiness, nowId, withBusinessWrite, workspaceId } from "../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const entityType = String(body.entityType || body.entity_type || "product");
      const entityId = String(body.entityId || body.entity_id || "");
      const channel = String(body.channel || "organic_social");
      if (!entityId) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["entity_id_required"] }, { status: 409 });
      const unit = (await repos.business.unitEconomics.listByWorkspace(workspaceId)).find((row) => (row.entity_id === entityId || row.entityId === entityId));
      const readiness = calculateProductMarketingReadiness({ unitEconomicsStatus: String(unit?.status ?? "unknown"), channel });
      const saved = await repos.business.channelReadiness.create({
        id: nowId("channel"),
        workspace_id: workspaceId,
        channel,
        entity_type: entityType,
        entity_id: entityId,
        readiness: readiness.readiness,
        reasons: readiness.reasons,
        required_owner_approval: readiness.requiredOwnerApproval,
        break_even_roas: unit?.break_even_roas ?? unit?.breakEvenRoas ?? null,
        created_by: user.id,
        updated_by: user.id
      } as any);
      return NextResponse.json({ ok: true, status: "calculated", channelReadiness: saved });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
