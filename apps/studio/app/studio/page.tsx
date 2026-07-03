import { parseEnv } from "@saltyfactory/config";
import { createAgenticApprovalQueue, deriveNextBestActions, runAgenticPodWorkflow, scoreChannelCompleteness } from "@saltyfactory/domain";
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
  const latestBusinessProfile = (lists.businessProfiles[0] as any)?.profile_json ?? (lists.businessProfiles[0] as any)?.profileJson ?? lists.businessProfiles[0] ?? null;
  const workflowPreview = runAgenticPodWorkflow({
    trends: lists.trends,
    clusters: lists.clusters,
    businessProfile: latestBusinessProfile as any,
    channels: lists.channels,
    podCandidates: lists.podCandidates,
    listingDrafts: lists.listingDraftsV1,
    assets: lists.assets,
    mockups: lists.mockups,
    publishReviews: lists.publishReviews,
    aiOutputs: lists.aiEmployeeOutputs,
    aiProviderConfigured: cfg.providers.aiText.enabled,
    imageProviderConfigured: cfg.providers.aiImage.enabled,
    shopifyStatus,
    printifyStatus,
    googleStatus
  });
  const approvalQueue = createAgenticApprovalQueue({
    agentOutputs: workflowPreview.outputs,
    aiOutputs: lists.aiEmployeeOutputs,
    podCandidates: lists.podCandidates,
    listingDrafts: lists.listingDraftsV1,
    assets: lists.assets,
    mockups: lists.mockups,
    publishReviews: lists.publishReviews
  });
  const trendReportCount = lists.aiEmployeeOutputs.filter((output: any) => (output.output_type ?? output.outputType) === "trend_report").length;
  const designConceptCount = lists.briefs.length + lists.aiEmployeeOutputs.filter((output: any) => (output.output_type ?? output.outputType) === "design_concept").length;
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
    pendingMockups: lists.mockups.filter((mockup: any) => !(mockup.approved_for_product || mockup.approvedForProduct)).length,
    assets: lists.assets.length,
    mockups: lists.mockups.length,
    approvedProducts: approved,
    readyDrafts: lists.listingDraftsV1.filter((draft: any) => (draft.validation_status ?? draft.validationStatus) === "ready_for_export").length,
    trendReports: trendReportCount,
    designConcepts: designConceptCount,
    approvalQueueItems: approvalQueue.length
  });
  const commandCenters = [
    {
      title: "POD Launch Studio",
      href: "/studio/pod-launch-studio",
      description: "Move from idea to generated art, QA, mockups, Printify, Shopify draft, and publish review.",
      status: blockersFromStatuses([cfg.providers.aiImage.enabled, cfg.providers.printify.enabled, cfg.providers.shopifyAdmin.enabled])
    },
    {
      title: "AI Employees",
      href: "/studio/ai-employees",
      description: "Run owner-gated AI employees, review outputs, hiring requests, improvements, and model usage.",
      status: cfg.providers.aiText.enabled ? "model configured" : "rules fallback"
    },
    {
      title: "Business Command Center",
      href: "/studio/business",
      description: "Review unit economics, opportunities, decision memos, documents, identity, and authority requests.",
      status: "internal ready"
    },
    {
      title: "Customer Command Center",
      href: "/studio/customer-command-center",
      description: "Manage customer records, leads, capture, inbox, campaigns, service cases, and scheduling.",
      status: "internal ready"
    },
    {
      title: "Marketing Command Center",
      href: "/studio/marketing-command-center",
      description: "Create campaign packets, channel drafts, approvals, social care, search visibility, and UTMs.",
      status: "manual/export ready"
    },
    {
      title: "Setup / Feature Readiness",
      href: "/studio/setup",
      description: "See exact provider blockers, disabled safety flags, and what can be tested locally.",
      status: "owner setup"
    }
  ];

  return <>
    <PageHeader title="Salty Cowhide AI POD Business Command Center" description="AI employees prepare trends, product ideas, design concepts, prompts, listings, margins, launch checks, and marketing drafts. Jennie approves what goes public.">
      <StatusBadge status="Human approval required" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <section className="surface-card command-center-launchpad">
      <div className="section-header">
        <div>
          <h2>Command Center Launchpad</h2>
          <p className="text-muted">Primary operating areas are separated from the full module explorer. Open the area that matches the job, then use the sidebar for the active workflow stage.</p>
        </div>
      </div>
      <div className="studio-command-center-grid">
        {commandCenters.map((center) => <a className="studio-command-center-card" href={center.href} key={center.href}>
          <span className="status-badge tone-primary">{center.status}</span>
          <strong>{center.title}</strong>
          <p>{center.description}</p>
        </a>)}
      </div>
    </section>
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Business readiness" value={`${businessProfileScore}%`} delta="Profile completeness" tone={businessProfileScore >= 90 ? "success" : "warning"} />
      <MetricCard title="Data readiness" value={googleStatus === "connected" ? "Google connected" : "Setup needed"} delta={googleStatus} tone={googleStatus === "connected" ? "success" : "warning"} />
      <MetricCard title="Channel completeness" value={`${channelScore.score}%`} delta={`${channelScore.configuredCount} configured`} tone={channelScore.score >= 80 ? "success" : "warning"} />
      <MetricCard title="Baseline & Impact" value={lists.baselines.length ? "Captured" : "Missing"} delta={`${lists.baselines.length} snapshots`} tone={lists.baselines.length ? "success" : "warning"} />
      <MetricCard title="Trend reports" value={String(trendReportCount)} delta={workflowPreview.outputs[0]?.status ?? "needs source data"} icon="TR" />
      <MetricCard title="Approval queue" value={String(approvalQueue.length)} delta="Owner review items" tone={approvalQueue.length ? "warning" : "success"} icon="OK" />
      <MetricCard title="Product ideas" value={String(lists.podCandidates.length)} delta="POD builder" />
      <MetricCard title="Active AI employees" value={String(lists.aiEmployees.filter((row: any) => ["ready", "active"].includes(row.status)).length)} delta={cfg.providers.aiText.enabled ? "Model configured" : "Rules fallback"} tone="info" icon="AI" />
      <MetricCard title="Designs in pipeline" value={String(designs)} delta="Saved workspace data" icon="ART" />
      <MetricCard title="Approved for publish" value={String(approved)} delta="Gate evaluated" tone="success" icon="OK" />
    </div>
    <div className="layout-rail" style={{ marginTop: 18 }}>
      <div className="layout-grid">
        <DataTable columns={["Next best action", "Why", "Open"]} rows={nextBestActions.slice(0, 8).map((action) => [action.title, action.reason, <a key={action.href} href={action.href}>Open</a>])} />
        <DataTable columns={["Approval item", "Type", "Status", "Next action"]} rows={approvalQueue.length ? approvalQueue.slice(0, 6).map((item) => [item.title, item.type.replace(/_/g, " "), <StatusBadge key={item.id} status={item.status.replace(/_/g, " ")} tone={item.status.includes("blocked") || item.status.includes("needed") ? "warning" : "primary"} />, item.nextAction]) : [["No approval items", "AI work queue", <StatusBadge key="empty" status="clear" tone="success" />, "Run AI employees or create a draft workflow item"]]} />
        <LineChartCard title="Trend and revenue readiness"><p className="text-muted">Revenue chart waits for live commerce/analytics credentials. Trend and product records render from repositories when configured.</p></LineChartCard>
        <DataTable columns={["Product", "Type", "Risk", "Margin", "Status"]} rows={lists.drafts.length ? lists.drafts.slice(0, 5).map((draft: any) => [draft.title ?? draft.id, draft.product_type ?? "Product", <StatusBadge key="risk" status="Review" tone="warning" />, <StatusBadge key="margin" status="Pending" tone="warning" />, draft.status ?? "draft"]) : [["No drafts", "Empty workspace", "-", "-", <StatusBadge key="empty" status="Safe empty state" />]]} />
        <ChartCard title="POD launch readiness"><BarList items={[{ label: "Approved public projections", value: String(lists.products.length), percent: lists.products.length ? 100 : 0 }, { label: "Drafts awaiting review", value: String(lists.drafts.length), percent: Math.min(100, lists.drafts.length * 20) }, { label: "POD product ideas", value: String(lists.podCandidates.length), percent: Math.min(100, lists.podCandidates.length * 20) }, { label: "Listing drafts", value: String(lists.listingDraftsV1.length), percent: Math.min(100, lists.listingDraftsV1.length * 20) }]} /><p className="text-muted">No revenue, visitor, or conversion performance is shown without configured analytics providers.</p></ChartCard>
      </div>
      <div className="layout-grid">
        <ProviderStatusCard title="Google sync status" status={googleStatus} tone={googleStatus === "connected" ? "success" : "warning"} description="GA4, Search Console, and GBP require live OAuth verification." />
        <ProviderStatusCard title="Commerce providers" status={`Shopify ${shopifyStatus} / Printify ${printifyStatus}`} tone={shopifyStatus === "connected" || printifyStatus === "connected" ? "success" : "warning"} description="Live sync remains approval-gated." />
        <AiEmployeeCard name="Trend Report Writer" role="Trend report drafts and product recommendations" status={trendReportCount ? "Drafts waiting" : "Ready for source data"} tasks={String(approvalQueue.length)} description="Rules-based unless a configured model provider is used." />
        <AiEmployeeCard name="POD Product Builder Assistant" role="Product ideas, listing drafts, and owner review" status={lists.aiEmployees.length ? "Configured" : "Setup needed"} tasks={String(lists.podCandidates.length)} description="Draft recommendations only." />
        <RecommendationCard title="Recent activity" description={lists.activity.length ? `${lists.activity.length} audit events available.` : "No activity events yet. New v1 changes write audit events."} />
      </div>
    </div>
  </>;
}

function blockersFromStatuses(statuses: boolean[]) {
  return statuses.every(Boolean) ? "providers ready" : "setup blockers";
}
