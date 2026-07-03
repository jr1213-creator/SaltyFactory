import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, ForecastScenarioCard, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessForecastsPage() {
  const forecasts = await createRepositories().business.forecasts.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Forecasts" description="Scenario planning from explicit assumptions. These are estimates, not financial promises." />
    <section className="surface-card">
      <h2>Create Forecast</h2>
      <form className="form-grid" action="/api/studio/business/forecasts" method="post">
        <label>Name<input name="forecastName" defaultValue="Launch revenue scenario" /></label>
        <label>Revenue goal<input name="revenueGoal" inputMode="decimal" defaultValue="5000" /></label>
        <label>Average order value<input name="averageOrderValue" inputMode="decimal" defaultValue="32" /></label>
        <label>Traffic assumption<input name="trafficAssumption" inputMode="numeric" defaultValue="1000" /></label>
        <label>Conversion rate %<input name="conversionRateAssumption" inputMode="decimal" defaultValue="2" /></label>
        <label>Margin assumption %<input name="marginAssumption" inputMode="decimal" defaultValue="40" /></label>
        <button className="btn btn-primary" type="submit">Save Forecast</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{forecasts.length ? <div className="layout-grid">{forecasts.map((forecast: any) => <ForecastScenarioCard key={forecast.id} title={forecast.forecast_name ?? forecast.forecastName}>
      <DataTable columns={["Goal", "AOV", "Traffic", "Output"]} rows={[[forecast.revenue_goal ?? forecast.revenueGoal, forecast.average_order_value ?? forecast.averageOrderValue, forecast.traffic_assumption ?? forecast.trafficAssumption, JSON.stringify(forecast.output ?? {})]]} />
    </ForecastScenarioCard>)}</div> : <EmptyState title="No forecasts" description="Create a scenario from explicit assumptions." />}</section>
  </>;
}
