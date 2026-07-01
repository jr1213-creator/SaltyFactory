import { AiEmployeeCard, BarList, ChartCard, DataTable, LineChartCard, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";

export default function Page() {
  return <>
    <PageHeader title="Analytics & AI Employees" description="Revenue, search, campaign, and AI employee panels stay disabled until live providers are connected.">
      <button className="sf-button sf-button-secondary" disabled title="Analytics customization is disabled until real provider data is imported.">Customize</button><button className="sf-button sf-button-primary" disabled title="Analytics export is disabled until real provider data is imported.">Export Report</button>
    </PageHeader>
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Revenue" value="Not connected" delta="Shopify disabled" tone="warning" />
      <MetricCard title="Conversion rate" value="Not connected" delta="GA4 disabled" tone="warning" />
      <MetricCard title="Average order value" value="Not connected" delta="Commerce provider required" tone="warning" />
      <MetricCard title="ROAS" value="Not connected" delta="Ads provider required" tone="warning" />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <LineChartCard title="Revenue over time"><p className="sf-muted">No live revenue data is shown without configured providers.</p></LineChartCard>
        <ChartCard title="Channel performance"><BarList items={[{ label: "Organic Search", value: "Disabled", percent: 0 }, { label: "Email", value: "Disabled", percent: 0 }, { label: "Social", value: "Disabled", percent: 0 }]} /></ChartCard>
        <ChartCard title="SEO / AEO / GEO performance"><DataTable columns={["Area", "Status", "Notes"]} rows={[["SEO", <StatusBadge key="seo" status="Needs credentials" tone="warning" />, "Connect Search Console"], ["AEO", <StatusBadge key="aeo" status="Disabled" tone="warning" />, "No public AI tools enabled"], ["GEO", <StatusBadge key="geo" status="Disabled" tone="warning" />, "No crawler analytics connected"]]} /></ChartCard>
        <ChartCard title="AI employee performance"><DataTable columns={["Employee", "Role", "Status", "Human review"]} rows={[["Trend Analyst", "Market intelligence", <StatusBadge key="t" status="Disabled" tone="warning" />, "Required"], ["Copywriter", "Product copy", <StatusBadge key="c" status="Disabled" tone="warning" />, "Required"], ["Support Agent", "Draft replies", <StatusBadge key="s" status="Disabled" tone="warning" />, "Required"]]} /></ChartCard>
      </div>
      <div className="sf-grid">
        <ProviderStatusCard title="Google Analytics 4" status="Needs credentials" tone="warning" />
        <ProviderStatusCard title="Google Search Console" status="Needs credentials" tone="warning" />
        <AiEmployeeCard name="Current AI tasks" role="No active provider-backed tasks" status="Disabled" />
      </div>
    </div>
  </>;
}
