import { AiEmployeeCard, BarList, ChartCard, DataTable, EmptyState, FilterBar, LineChartCard, MetricCard, PageHeader, RecommendationCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { TrendSourcesClient } from "./TrendSourcesClient";

export default async function Page() {
  const { trends, clusters, phrases } = await getStudioLists();
  return <>
    <PageHeader title="Trend Intelligence" description="Discover emerging POD opportunities before they move into production.">
      <a className="sf-button sf-button-secondary" href="/studio/trends">Export Report</a>
      <a className="sf-button sf-button-primary" href="/studio/briefs">Create Brief</a>
    </PageHeader>
    <FilterBar>
      <select aria-label="Timeframe"><option>Last 30 days</option></select>
      <select aria-label="Source"><option>All sources</option></select>
      <select aria-label="Niche"><option>All niches</option></select>
      <select aria-label="Score"><option>All scores</option></select>
      <button className="sf-button sf-button-ghost">More filters</button>
    </FilterBar>
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Signals captured" value={String(trends.length)} delta="Repository backed" icon="⌁" />
      <MetricCard title="New clusters" value={String(clusters.length)} delta="Awaiting review" tone="info" icon="◎" />
      <MetricCard title="High-opportunity phrases" value={String(phrases.length)} delta="Risk review required" tone="warning" icon="◇" />
      <MetricCard title="Review backlog" value={String(trends.filter((t:any)=>t.status==='new').length)} delta="Human review" tone="warning" icon="!" />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <TrendSourcesClient />
        <LineChartCard title="Trend velocity" />
        <ChartCard title="Trend sources"><DataTable columns={["Source", "Signals", "Freshness", "Top topic"]} rows={trends.length ? trends.slice(0, 6).map((trend: any) => [trend.source_id ?? trend.sourceId ?? "Manual", trend.keyword ?? trend.id, <StatusBadge key="fresh" status={trend.status ?? "new"} tone="primary" />, trend.category ?? "fashion_pod"]) : [["No sources", "0", <StatusBadge key="empty" status="Empty" />, "Connect sources or import manually"]]} /></ChartCard>
        <ChartCard title="Top trend clusters">{clusters.length ? <BarList items={clusters.slice(0, 5).map((cluster: any) => ({ label: cluster.name ?? cluster.id, value: cluster.status ?? "review", percent: Number(cluster.confidence ?? cluster.relevance_score ?? 0) * 100 }))} /> : <EmptyState title="No trend clusters" description="Ingest allowed sources first, then create clusters from stored signals." />}</ChartCard>
      </div>
      <div className="sf-grid">
        <AiEmployeeCard name="AI Trend Analyst" role="Recommendations disabled until provider configured" status="Disabled" tasks="0" />
        <RecommendationCard title="Next actions" description="Review backlog, approve top clusters, then create briefs. No provider calls run while AI is disabled." action={<a className="sf-button sf-button-secondary" href="/studio/briefs">View recommendations</a>} />
        <EmptyState title="Recent ingestion log" description="No live ingestion records found for this workspace." />
      </div>
    </div>
  </>;
}
