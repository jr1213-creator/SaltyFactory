import { studioAuthErrorResponse } from "../../_auth";
import { json, nowId, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, forecasts: await repos.business.forecasts.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const revenueGoal = Number(body.revenueGoal || body.revenue_goal || 0);
      const averageOrderValue = Number(body.averageOrderValue || body.average_order_value || 0);
      const traffic = Number(body.trafficAssumption || body.traffic_assumption || 0);
      const conversionRate = Number(body.conversionRateAssumption || body.conversion_rate_assumption || 0);
      const projectedRevenue = traffic * (conversionRate / 100) * averageOrderValue;
      const forecast = await repos.business.forecasts.create({
        id: nowId("forecast"),
        workspace_id: workspaceId,
        forecast_name: String(body.forecastName || body.forecast_name || "Revenue forecast"),
        revenue_goal: String(revenueGoal),
        average_order_value: String(averageOrderValue),
        conversion_rate_assumption: String(conversionRate),
        traffic_assumption: traffic,
        repeat_purchase_assumption: String(body.repeatPurchaseAssumption || body.repeat_purchase_assumption || 0),
        margin_assumption: String(body.marginAssumption || body.margin_assumption || 0),
        marketing_spend_assumption: String(body.marketingSpendAssumption || body.marketing_spend_assumption || 0),
        fixed_cost_assumption: String(body.fixedCostAssumption || body.fixed_cost_assumption || 0),
        output: { projectedRevenue, gapToGoal: revenueGoal - projectedRevenue },
        status: "draft",
        created_by: user.id,
        updated_by: user.id
      } as any);
      return json({ ok: true, status: "created", forecast });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
