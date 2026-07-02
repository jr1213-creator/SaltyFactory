import { parseEnv } from "@saltyfactory/config";
import { deriveNextBestActions, scoreChannelCompleteness } from "@saltyfactory/domain";
import { AiEmployeeCard, BarList, ChartCard, DataTable, LineChartCard, MetricCard, PageHeader, ProviderStatusCard, RecommendationCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "./data";

export default async function Page() {
  const cfg = parseEnv();
  const lists = await getStudioLists();
  const designs = lists.assets.length + lists.drafts.length + lists.jobs.length;
  const approved = lists.publishReviews.filter((review: any) => review.all_gates_passed || review.allGatesPassed).length;
  const businessProfileScore = Number((lists.businessProfiles[0] as any)?.readiness_score ?? 0);
  const channelScore = scoreChannelCompleteness(lists.channels as any);
  const googleStatus = String(lists.providerConnections.find((row: any) => row.provider_type === "google_oauth" || row.providerType === "google_oauth")?.status ?? "not_configured");
  const shopifyStatus = String(lists.providerConnections.find((row: any) => row.provider_type === "shopify" || row.providerType === "shopify")?.status ?? "not_configured");
  const printifyStatus = String(lists.providerConnections.find((row: any) => row.provider_type === "printify" || row.providerType === "printify")?.status ?? "not_configured");
  const storageStatus = String(lists.providerConnections.find((row: any) => row.provider_type === "supabase_storage" || row.providerType === "supabase_storage")?.status ?? "not_configured");
  const nextBestActions = deriveNextBestActions({
    businessProfileScore,
    channelScore: channelScore.score,
    googleStatus,
    baselineStatus: String((lists.baselines[0] as any)?.status ?? "missing"),
    podCandidates: lists.podCandidates.length,
    listingDrafts: lists.listingDraftsV1.length,
    storageStatus,
    shopifyStatus,
    printifyStatus,
    pendingMockups: lists.mockups.filter((mockup: any) => !(mockup.approved_for_product || mockup.approvedForProduct)).length
  });

  return <>
    <PageHeader title="Studio Dashboard" description="AI-assisted ecommerce, POD, dropshipping, and business migration cockpit.">
      <StatusBadge status="Human approval required" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Business readiness" value={`${businessProfileScore}%`} delta="Profile completeness" tone={businessProfileScore >= 90 ? "success" : "warning"} />
      <MetricCard title="Data readiness" value={googleStatus === "connected" ? "Google connected" : "Setup needed"} delta={googleStatus} tone={googleStatus === "connected" ? "success" : "warning"} />
      <MetricCard title="Channel completeness" value={`${channelScore.score}%`} delta={`${channelScore.configuredCount} configured`} tone={channelScore.score >= 80 ? "success" : "warning"} />
      <MetricCard title="Baseline status" value={lists.baselines.length ? "Captured" : "Missing"} delta={`${lists.baselines.length} snapshots`} tone={lists.baselines.length ? "success" : "warning"} />
      <MetricCard title="Designs in pipeline" value={String(designs)} delta="Repository backed" icon="◆" />
      <MetricCard title="Approved for publish" value={String(approved)} delta="Gate evaluated" tone="success" icon="OK" />
      <MetricCard title="POD candidates" value={String(lists.podCandidates.length)} delta="Migration lane" />
      <MetricCard title="Active AI employees" value={String(lists.aiEmployees.filter((row: any) => ["ready", "active"].includes(row.status)).length)} delta={cfg.providers.aiText.enabled ? "Model configured" : "Rules fallback"} tone="info" icon="AI" />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <DataTable columns={["Next best action", "Why", "Open"]} rows={nextBestActions.slice(0, 8).map((action) => [action.title, action.reason, <a key={action.href} href={action.href}>Open</a>])} />
        <LineChartCard title="Trend and revenue readiness"><p className="sf-muted">Revenue chart waits for live commerce/analytics credentials. Trend and product records render from repositories when configured.</p></LineChartCard>
        <DataTable columns={["Product", "Type", "Risk", "Margin", "Status"]} rows={lists.drafts.length ? lists.drafts.slice(0, 5).map((draft: any) => [draft.title ?? draft.id, draft.product_type ?? "Product", <StatusBadge key="risk" status="Review" tone="warning" />, <StatusBadge key="margin" status="Pending" tone="warning" />, draft.status ?? "draft"]) : [["No drafts", "Empty workspace", "-", "-", <StatusBadge key="empty" status="Safe empty state" />]]} />
        <ChartCard title="Product and migration readiness"><BarList items={[{ label: "Approved public projections", value: String(lists.products.length), percent: lists.products.length ? 100 : 0 }, { label: "Drafts awaiting review", value: String(lists.drafts.length), percent: Math.min(100, lists.drafts.length * 20) }, { label: "POD migration candidates", value: String(lists.podCandidates.length), percent: Math.min(100, lists.podCandidates.length * 20) }, { label: "Listing drafts", value: String(lists.listingDraftsV1.length), percent: Math.min(100, lists.listingDraftsV1.length * 20) }]} /><p className="sf-muted">No revenue, visitor, or conversion performance is shown without configured analytics providers.</p></ChartCard>
      </div>
      <div className="sf-grid">
        <ProviderStatusCard title="Google sync status" status={googleStatus} tone={googleStatus === "connected" ? "success" : "warning"} description="GA4, Search Console, and GBP require live OAuth verification." />
        <ProviderStatusCard title="Commerce providers" status={`Shopify ${shopifyStatus} / Printify ${printifyStatus}`} tone={shopifyStatus === "connected" || printifyStatus === "connected" ? "success" : "warning"} description="Live sync remains approval-gated." />
        <AiEmployeeCard name="AI Migration Guide" role="Business migration" status={lists.aiEmployees.length ? "Configured" : "Setup needed"} tasks={String(lists.migrationGuides.length)} description="Draft recommendations only." />
        <RecommendationCard title="Recent activity" description={lists.activity.length ? `${lists.activity.length} audit events available.` : "No activity events yet. New v1 changes write audit events."} />
      </div>
    </div>
  </>;
}
