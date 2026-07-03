import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessTrendsPage() {
  const repos = createRepositories();
  const trends = await repos.trend.listByWorkspace(workspaceId);
  const opportunities = await repos.business.opportunities.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Trends" description="Trend-to-revenue decision support using persisted trend signals and opportunity records." />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Trend signals" status={String(trends.length)} tone={trends.length ? "success" : "warning"} description="Manual/allowed-use trend inputs only." />
      <ProviderStatusCard title="Trend opportunities" status={String(opportunities.filter((row) => String(row.opportunity_type ?? row.opportunityType).includes("trend")).length)} tone="warning" description="Owner-review opportunities created from trend evidence." />
      <ProviderStatusCard title="External scraping" status="Not implemented" tone="success" description="No private trend source scraping is claimed." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>{trends.length ? <DataTable columns={["Keyword", "Category", "Status"]} rows={trends.map((trend: any) => [trend.keyword, trend.category, trend.status])} /> : <EmptyState title="No trend signals" description="Trend signals appear after allowed-use manual/provider imports." />}</section>
  </>;
}
