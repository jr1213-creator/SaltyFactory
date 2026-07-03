import { studioAuthErrorResponse } from "../../../_auth";
import { json, nowId, withBusinessWrite, workspaceId } from "../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const snapshot = await repos.business.metricsSnapshots.create({
        id: nowId("bizmetric"),
        workspace_id: workspaceId,
        snapshot_date: String(body.snapshotDate || body.snapshot_date || new Date().toISOString().slice(0, 10)),
        revenue_total: String(body.revenueTotal ?? body.revenue_total ?? 0),
        orders_total: Number(body.ordersTotal ?? body.orders_total ?? 0),
        average_order_value: String(body.averageOrderValue ?? body.average_order_value ?? 0),
        gross_margin_estimate: String(body.grossMarginEstimate ?? body.gross_margin_estimate ?? 0),
        contribution_margin_estimate: String(body.contributionMarginEstimate ?? body.contribution_margin_estimate ?? 0),
        marketing_spend_estimate: String(body.marketingSpendEstimate ?? body.marketing_spend_estimate ?? 0),
        notes: body.notes || null,
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "snapshot_created", snapshot });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
