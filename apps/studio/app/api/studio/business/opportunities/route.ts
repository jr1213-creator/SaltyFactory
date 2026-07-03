import { studioAuthErrorResponse } from "../../_auth";
import { json, nowId, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, opportunities: await repos.business.opportunities.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const opportunity = await repos.business.opportunities.create({
        id: nowId("bizopp"),
        workspace_id: workspaceId,
        opportunity_type: String(body.opportunityType || body.opportunity_type || "product_opportunity"),
        title: String(body.title || "Business opportunity"),
        summary: String(body.summary || "Owner review required."),
        evidence: typeof body.evidence === "object" && body.evidence ? body.evidence : {},
        affected_products: Array.isArray(body.affectedProducts) ? body.affectedProducts.map(String) : [],
        affected_customers: Array.isArray(body.affectedCustomers) ? body.affectedCustomers.map(String) : [],
        affected_campaigns: Array.isArray(body.affectedCampaigns) ? body.affectedCampaigns.map(String) : [],
        estimated_value: body.estimatedValue ? String(body.estimatedValue) : null,
        confidence: String(body.confidence ?? 0),
        risk_level: String(body.riskLevel || body.risk_level || "medium"),
        recommended_next_action: String(body.recommendedNextAction || body.recommended_next_action || "Review and convert to a task."),
        owner_decision: "pending",
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "created", opportunity });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
