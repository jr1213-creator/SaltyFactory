import { parseEnv } from "@saltyfactory/config";
import { AiEmployeeCard, BarList, ChartCard, DataTable, EmptyState, LineChartCard, MetricCard, PageHeader, ProviderStatusCard, RecommendationCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "./data";

export default async function Page() {
  const cfg = parseEnv();
  const lists = await getStudioLists();
  const designs = lists.assets.length + lists.drafts.length + lists.jobs.length;
  const approved = lists.publishReviews.filter((review: any) => review.all_gates_passed || review.allGatesPassed).length;

  return <>
    <PageHeader title="Studio Dashboard" description="Private POD operating system for trend intelligence, product creation, review, and guarded publishing.">
      <StatusBadge status="Human approval required" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Designs in pipeline" value={String(designs)} delta="Repository backed" icon="◆" />
      <MetricCard title="Approved for publish" value={String(approved)} delta="Gate evaluated" tone="success" icon="✓" />
      <MetricCard title="7-day revenue" value="Not connected" delta="Provider disabled" tone="warning" icon="$" />
      <MetricCard title="Active AI employees" value={cfg.providers.aiText.enabled ? "Configured" : "0"} delta="AI tools disabled by default" tone="info" icon="AI" />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <LineChartCard title="Trend and revenue readiness"><p className="sf-muted">Revenue chart waits for live commerce/analytics credentials. Trend and product records render from repositories when configured.</p></LineChartCard>
        <DataTable columns={["Product", "Type", "Risk", "Margin", "Status"]} rows={lists.drafts.length ? lists.drafts.slice(0, 5).map((draft: any) => [draft.title ?? draft.id, draft.product_type ?? "Product", <StatusBadge key="risk" status="Review" tone="warning" />, <StatusBadge key="margin" status="Pending" tone="warning" />, draft.status ?? "draft"]) : [["No drafts", "Empty workspace", "-", "-", <StatusBadge key="empty" status="Safe empty state" />]]} />
        <ChartCard title="Collection readiness"><BarList items={[{ label: "Approved public projections", value: String(lists.products.length), percent: lists.products.length ? 100 : 0 }, { label: "Drafts awaiting review", value: String(lists.drafts.length), percent: Math.min(100, lists.drafts.length * 20) }, { label: "Provider analytics", value: "Disabled", percent: 0 }]} /><p className="sf-muted">No revenue, visitor, or conversion performance is shown without configured analytics providers.</p></ChartCard>
      </div>
      <div className="sf-grid">
        <ProviderStatusCard title="Workspace health" status={cfg.DATABASE_URL ? "Configured" : "Needs DB URL"} tone={cfg.DATABASE_URL ? "success" : "warning"} description="Production uses Drizzle/Postgres when DATABASE_URL is configured." />
        <AiEmployeeCard name="Trend Analyst" role="Market intelligence" status={cfg.providers.aiText.enabled ? "Active" : "Disabled"} tasks="0" description="Requires configured AI provider and human review." />
        <AiEmployeeCard name="Design QA" role="Print file checks" status="Review gated" tasks="0" />
        <RecommendationCard title="Recent alerts" description="No live alerts. Provider-disabled states remain fail-closed and visible here." />
      </div>
    </div>
  </>;
}
