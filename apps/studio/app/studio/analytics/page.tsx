import { AiEmployeeCard, ChartCard, DataTable, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";

function provider(row: any) {
  return String(row.provider_type ?? row.providerType ?? row.provider_key ?? row.providerKey ?? "");
}

function numeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function latestMetric(metrics: any[], key: string) {
  return metrics
    .filter((metric) => (metric.metric_key ?? metric.metricKey) === key)
    .sort((a, b) => String(b.measured_at ?? b.measuredAt ?? b.created_at ?? "").localeCompare(String(a.measured_at ?? a.measuredAt ?? a.created_at ?? "")))[0] ?? null;
}

function metricValue(metrics: any[], key: string) {
  const metric = latestMetric(metrics, key);
  return metric ? String(Number(numeric(metric.metric_value ?? metric.metricValue)).toLocaleString()) : "Not imported";
}

function latestSync(syncRuns: any[], providerKey: string) {
  return syncRuns
    .filter((row) => provider(row) === providerKey)
    .sort((a, b) => String(b.completed_at ?? b.completedAt ?? b.created_at ?? "").localeCompare(String(a.completed_at ?? a.completedAt ?? a.created_at ?? "")))[0] ?? null;
}

function sourceStatus(connections: any[], providerKey: string) {
  return connections.find((row) => provider(row) === providerKey)?.status ?? "not_configured";
}

export default async function Page() {
  const { providerConnections, integrationSyncRuns, workspaceMetrics } = await getStudioLists();
  const metrics = workspaceMetrics as any[];
  const syncRuns = integrationSyncRuns as any[];
  const hasGoogleMetrics = metrics.some((metric) => ["ga4", "google_search_console", "google_business_profile"].includes(String(metric.source)));
  const topPages = metrics
    .filter((metric) => (metric.metric_key ?? metric.metricKey) === "ga4.top_pages.views")
    .slice(-10)
    .map((metric) => {
      const dimension = (metric.dimension_json ?? metric.dimensionJson ?? {}) as Record<string, unknown>;
      return [String(dimension.pagePath ?? "Unknown page"), String(Number(numeric(metric.metric_value ?? metric.metricValue)).toLocaleString()), String(metric.measured_at ?? metric.measuredAt ?? "")];
    });
  const topQueries = metrics
    .filter((metric) => (metric.metric_key ?? metric.metricKey) === "gsc.top_queries.clicks")
    .slice(-10)
    .map((metric) => {
      const dimension = (metric.dimension_json ?? metric.dimensionJson ?? {}) as Record<string, unknown>;
      const metadata = (metric.metadata ?? {}) as Record<string, unknown>;
      return [String(dimension.query ?? "Unknown query"), String(Number(numeric(metric.metric_value ?? metric.metricValue)).toLocaleString()), String(metadata.impressions ?? "0"), String(metadata.position ?? "")];
    });
  return <>
    <PageHeader title="Analytics & AI Employees" description="Only imported provider data is shown. Empty states mean no live Google or commerce sync has completed.">
      <button className="sf-button sf-button-secondary" disabled title="Analytics customization is disabled until real provider data is imported.">Customize</button><button className="sf-button sf-button-primary" disabled title="Analytics export is disabled until real provider data is imported.">Export Report</button>
    </PageHeader>
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Revenue" value="Not connected" delta="Commerce provider required" tone="warning" />
      <MetricCard title="GA4 active users" value={metricValue(metrics, "ga4.activeUsers.28d")} delta={latestSync(syncRuns, "ga4") ? "Last 28 days" : "Sync GA4"} tone={latestSync(syncRuns, "ga4") ? "success" : "warning"} />
      <MetricCard title="Search clicks" value={metricValue(metrics, "gsc.clicks.28d")} delta={latestSync(syncRuns, "google_search_console") ? "Last 28 days" : "Sync Search Console"} tone={latestSync(syncRuns, "google_search_console") ? "success" : "warning"} />
      <MetricCard title="GBP reviews" value={metricValue(metrics, "gbp.reviews.count")} delta={latestSync(syncRuns, "google_business_profile") ? "Imported summary" : "Sync Business Profile"} tone={latestSync(syncRuns, "google_business_profile") ? "success" : "warning"} />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <ChartCard title="Imported Google metrics">{hasGoogleMetrics ? <DataTable columns={["Metric", "Value", "Source"]} rows={metrics.filter((metric) => ["ga4", "google_search_console", "google_business_profile"].includes(String(metric.source))).slice(-12).map((metric) => [String(metric.metric_key ?? metric.metricKey), String(Number(numeric(metric.metric_value ?? metric.metricValue)).toLocaleString()), String(metric.source)])} /> : <p className="sf-muted">No real Google metrics have been imported yet. Connect Google, configure IDs, then run a read-only sync.</p>}</ChartCard>
        <ChartCard title="GA4 top pages">{topPages.length ? <DataTable columns={["Page", "Views", "Measured"]} rows={topPages} /> : <p className="sf-muted">No GA4 page metrics imported.</p>}</ChartCard>
        <ChartCard title="Search Console top queries">{topQueries.length ? <DataTable columns={["Query", "Clicks", "Impressions", "Position"]} rows={topQueries} /> : <p className="sf-muted">No Search Console query metrics imported.</p>}</ChartCard>
        <ChartCard title="AI employee performance"><DataTable columns={["Employee", "Role", "Status", "Human review"]} rows={[["Analytics Analyst", "Metrics interpretation", <StatusBadge key="a" status={hasGoogleMetrics ? "Ready for drafts" : "Waiting for imports"} tone={hasGoogleMetrics ? "success" : "warning"} />, "Required"], ["SEO Specialist", "Search recommendations", <StatusBadge key="s" status={latestSync(syncRuns, "google_search_console") ? "Ready for drafts" : "Waiting for Search Console"} tone={latestSync(syncRuns, "google_search_console") ? "success" : "warning"} />, "Required"]]} /></ChartCard>
      </div>
      <div className="sf-grid">
        <ProviderStatusCard title="Google Analytics 4" status={sourceStatus(providerConnections, "ga4").replace(/_/g, " ")} tone={sourceStatus(providerConnections, "ga4") === "connected" ? "success" : "warning"} description={latestSync(syncRuns, "ga4") ? `Last synced ${latestSync(syncRuns, "ga4")?.completed_at ?? latestSync(syncRuns, "ga4")?.completedAt}` : "Connect Google and sync GA4 to import real metrics."} />
        <ProviderStatusCard title="Google Search Console" status={sourceStatus(providerConnections, "google_search_console").replace(/_/g, " ")} tone={sourceStatus(providerConnections, "google_search_console") === "connected" ? "success" : "warning"} description={latestSync(syncRuns, "google_search_console") ? `Last synced ${latestSync(syncRuns, "google_search_console")?.completed_at ?? latestSync(syncRuns, "google_search_console")?.completedAt}` : "Connect Google and sync Search Console to import real metrics."} />
        <ProviderStatusCard title="Google Business Profile" status={sourceStatus(providerConnections, "google_business_profile").replace(/_/g, " ")} tone={sourceStatus(providerConnections, "google_business_profile") === "connected" ? "success" : "warning"} description={latestSync(syncRuns, "google_business_profile") ? `Last synced ${latestSync(syncRuns, "google_business_profile")?.completed_at ?? latestSync(syncRuns, "google_business_profile")?.completedAt}` : "Connect Google and sync GBP to import account, location, and review summary."} />
        <AiEmployeeCard name="Current AI tasks" role="No autonomous provider actions" status="Human approval required" />
      </div>
    </div>
  </>;
}
