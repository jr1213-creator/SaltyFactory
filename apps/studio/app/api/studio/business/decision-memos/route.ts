import { studioAuthErrorResponse } from "../../_auth";
import { json, nowId, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, decisionMemos: await repos.business.decisionMemos.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const memo = await repos.business.decisionMemos.create({
        id: nowId("memo"),
        workspace_id: workspaceId,
        title: String(body.title || "Business decision memo"),
        decision_type: String(body.decisionType || body.decision_type || "product_launch"),
        recommendation: String(body.recommendation || "Owner review required."),
        evidence: typeof body.evidence === "object" && body.evidence ? body.evidence : {},
        financial_summary: typeof body.financialSummary === "object" && body.financialSummary ? body.financialSummary : {},
        risks: Array.isArray(body.risks) ? body.risks.map(String) : [],
        alternatives: Array.isArray(body.alternatives) ? body.alternatives.map(String) : [],
        required_owner_approval: true,
        owner_decision: "pending",
        created_by_employee_id: body.createdByEmployeeId || null,
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "created", memo });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
