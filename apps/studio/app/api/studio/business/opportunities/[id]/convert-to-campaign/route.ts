import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, withBusinessWrite, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const opportunity = await repos.business.opportunities.getById(id, workspaceId);
      if (!opportunity) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const campaign = await repos.shared.campaigns.create({
        id: nowId("campaign"),
        workspace_id: workspaceId,
        name: String(body.name || opportunity.title),
        campaign_type: "business_opportunity",
        goal: "manual_export_ready_campaign",
        product_ref: Array.isArray(opportunity.affected_products) ? opportunity.affected_products[0] : null,
        audience: body.audience || "Owner-defined audience required",
        offer: body.offer || String(opportunity.summary),
        landing_url: body.landingUrl || body.landing_url || null,
        status: "draft",
        source_record_id: id
      } as any);
      await repos.business.opportunities.update(id, { owner_decision: "converted_to_campaign", updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "converted_to_campaign", campaign });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
