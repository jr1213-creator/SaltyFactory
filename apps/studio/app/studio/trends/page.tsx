import { createTrendReportDraft } from "@saltyfactory/domain";
import { AiEmployeeCard, BarList, ChartCard, DataTable, EmptyState, FilterBar, LineChartCard, MetricCard, PageHeader, RecommendationCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { TrendSourcesClient } from "./TrendSourcesClient";

export default async function Page() {
  const { trends, clusters, phrases, businessProfiles } = await getStudioLists();
  const businessProfile = (businessProfiles[0] as any)?.profile_json ?? (businessProfiles[0] as any)?.profileJson ?? businessProfiles[0] ?? null;
  const report = createTrendReportDraft({ trends, clusters, businessProfile: businessProfile as any });
  return <>
    <PageHeader title="Trend Intelligence" description="Discover emerging POD opportunities before they move into production.">
      <button className="btn btn-secondary" disabled title="Trend export is disabled until persisted reporting support is implemented.">Export Disabled</button>
      <a className="btn btn-primary" href="/studio/briefs">Create Brief</a>
    </PageHeader>
    <FilterBar>
      <select aria-label="Timeframe" disabled title="Trend filters are disabled until persisted filtering is wired."><option>Last 30 days</option></select>
      <select aria-label="Source" disabled title="Trend filters are disabled until persisted filtering is wired."><option>All sources</option></select>
      <select aria-label="Niche" disabled title="Trend filters are disabled until persisted filtering is wired."><option>All niches</option></select>
      <select aria-label="Score" disabled title="Trend filters are disabled until persisted filtering is wired."><option>All scores</option></select>
      <button className="btn btn-ghost" disabled title="Additional trend filters are not implemented.">More filters</button>
    </FilterBar>
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Signals captured" value={String(trends.length)} delta="Saved workspace data" icon="⌁" />
      <MetricCard title="New clusters" value={String(clusters.length)} delta="Awaiting review" tone="info" icon="◎" />
      <MetricCard title="High-opportunity phrases" value={String(phrases.length)} delta="Risk review required" tone="warning" icon="◇" />
      <MetricCard title="Review backlog" value={String(trends.filter((t:any)=>t.status==='new').length)} delta="Human review" tone="warning" icon="!" />
    </div>
    <div className="layout-rail" style={{ marginTop: 18 }}>
      <div className="layout-grid">
        <TrendSourcesClient />
        <ChartCard title="Trend Report Workflow">
          <DataTable columns={["Report", "Source", "Status", "Next action"]} rows={[[
            report.reportTitle,
            report.sourceSummary,
            <StatusBadge key="report-status" status={report.approvalStatus.replace(/_/g, " ")} tone={report.blockers.length ? "warning" : "primary"} />,
            report.recommendedNextActions[0] ?? "Review report draft."
          ]]} />
          <p className="text-muted">Trend reports are drafts for owner review. If no sources exist, SaltyFactory will not invent trend data.</p>
          <a className="btn btn-secondary" href="/studio/ai-employees">Run AI Employees</a>
        </ChartCard>
        <LineChartCard title="Trend velocity" />
        <ChartCard title="Trend sources"><DataTable columns={["Source", "Signals", "Freshness", "Top topic"]} rows={trends.length ? trends.slice(0, 6).map((trend: any) => [trend.source_id ?? trend.sourceId ?? "Manual", trend.keyword ?? trend.id, <StatusBadge key="fresh" status={trend.status ?? "new"} tone="primary" />, trend.category ?? "fashion_pod"]) : [["No sources", "0", <StatusBadge key="empty" status="Empty" />, "Connect sources or import manually"]]} /></ChartCard>
        <ChartCard title="Top trend clusters">{clusters.length ? <BarList items={clusters.slice(0, 5).map((cluster: any) => ({ label: cluster.name ?? cluster.id, value: cluster.status ?? "review", percent: Number(cluster.confidence ?? cluster.relevance_score ?? 0) * 100 }))} /> : <EmptyState title="No trend clusters" description="Ingest allowed sources first, then create clusters from stored signals." />}</ChartCard>
      </div>
      <div className="layout-grid">
        <AiEmployeeCard name="Trend Research Analyst" role="Stored trend signals and approved sources" status={trends.length ? "Ready for report draft" : "Needs source data"} tasks={String(trends.length)} />
        <RecommendationCard title="Next actions" description={report.blockers.length ? "Add manual trend signals or configure an approved source. No fake trend report will be generated." : "Generate a trend report draft, approve product ideas, then create design concepts."} action={<a className="btn btn-secondary" href="/studio/ai-employees">Open AI Work Queue</a>} />
        <EmptyState title="Recent ingestion log" description="No live ingestion records found for this workspace." />
      </div>
    </div>
  </>;
}
