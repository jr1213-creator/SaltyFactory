import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getMarketingCommandCenterData, marketingChannelLabels } from "./data";

export const runtime = "nodejs";

function fmt(value: unknown) {
  return String(value ?? "").replace(/_/g, " ");
}

export default async function MarketingCommandCenterPage() {
  const data = await getMarketingCommandCenterData();
  const summary = data.summary;
  return <>
    <PageHeader
      eyebrow="Manual/export-ready marketing OS"
      title="Marketing Command Center"
      description="Proof-backed campaigns, no-ad growth plans, ad readiness, Pinterest/social/email/ad drafts, asset specs, UTM links, research, approvals, and provider readiness. No live publishing or ad spend occurs here."
    >
      <LinkButton href="/studio/marketing-command-center/launch-campaign">Launch Campaign Workflow</LinkButton>
      <LinkButton href="/studio/marketing-campaigns" variant="secondary">Campaigns</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Campaigns" value={String(summary.campaigns)} delta="Persisted shared records" />
      <MetricCard title="Draft campaigns" value={String(summary.draftCampaigns)} delta="Manual/export-ready" />
      <MetricCard title="Approval items" value={String(summary.approvalItems)} delta="Owner approval queue" tone={summary.approvalItems ? "warning" : "info"} />
      <MetricCard title="Unified readiness" value={`${summary.unifiedReadiness.score_value}%`} delta={String(summary.unifiedReadiness.status).replace(/_/g, " ")} tone={summary.unifiedReadiness.status === "ready" ? "success" : "warning"} />
      <MetricCard title="Proof packs" value={String(summary.proofPacks)} delta="export_packages proof_pack" />
      <MetricCard title="Growth plans" value={String(summary.growthPlans)} delta="No-ad plan packets" />
      <MetricCard title="Ad scores" value={String(summary.adReadinessScores)} delta="No fake provider success" />
      <MetricCard title="UTM links" value={String(summary.utmLinks)} delta="Tracking-ready exports" />
      <MetricCard title="Pinterest drafts" value={String(summary.pinterestDrafts)} delta="No API publish" />
      <MetricCard title="Social drafts" value={String(summary.socialDrafts)} delta="Manual export only" />
      <MetricCard title="Email drafts" value={String(summary.emailDrafts)} delta="No sending engine" />
      <MetricCard title="Asset specs" value={String(summary.assetSpecs)} delta="Specs, not generated media" />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <section className="sf-card">
          <h2>Today's Marketing Actions</h2>
          <DataTable columns={["Action", "Status", "Link"]} rows={[
            ["Run launch campaign workflow", "manual/export-ready", <a key="workflow" href="/studio/marketing-command-center/launch-campaign">Open</a>],
            ["Create proof pack", summary.proofPacks ? "created" : "needed", <a key="campaigns" href="/studio/marketing-campaigns">Campaigns</a>],
            ["Create UTM links", summary.utmLinks ? "created" : "needed", <a key="utm" href="/studio/marketing/tracking">Tracking</a>],
            ["Review approvals", summary.approvalItems ? "pending" : "none", <a key="approvals" href="/studio/marketing/approvals">Approval queue</a>],
            ["Classify social care opportunities", summary.researchItems ? "manual/imported records exist" : "manual input ready", <a key="social-care" href="/studio/marketing/social-care">Social Care</a>]
          ]} />
        </section>
        <section className="sf-card">
          <h2>Campaign Planner</h2>
          <DataTable columns={["Campaign", "Goal", "Status", "Open"]} rows={data.campaigns.length ? data.campaigns.slice(0, 8).map((campaign: any) => [
            campaign.name,
            campaign.goal ?? "Define campaign goal",
            <StatusBadge key={campaign.id} status={fmt(campaign.status ?? "draft")} />,
            <a key={`${campaign.id}-open`} href={`/studio/marketing-campaigns/${campaign.id}`}>Open</a>
          ]) : [["No campaigns", "Create a campaign or run the guided workflow.", "empty", <a key="new" href="/studio/marketing-campaigns/new">Create</a>]]} />
        </section>
        <section className="sf-card">
          <h2>Draft Channels</h2>
          <DataTable columns={["Channel", "Status", "Campaign", "Export"]} rows={data.channels.length ? data.channels.slice(0, 10).map((channel: any) => [
            marketingChannelLabels[String(channel.channel_type ?? channel.channelType)] ?? fmt(channel.channel_type ?? channel.channelType),
            <StatusBadge key={channel.id} status={fmt(channel.status ?? "draft")} />,
            channel.campaign_id ?? channel.campaignId ?? "-",
            "manual/export-ready"
          ]) : [["No channel drafts", "Run workflow or create drafts in the channel studios.", "-", "manual/export-ready"]]} />
        </section>
        <section className="sf-card">
          <h2>Provider Readiness</h2>
          <DataTable columns={["Provider", "Status", "Honesty note"]} rows={Object.entries(data.providerStatuses).map(([provider, status]) => [
            fmt(provider),
            <StatusBadge key={provider} status={fmt(status)} tone={status === "connected" ? "success" : "warning"} />,
            status === "connected" ? "Connected only if verified elsewhere." : "Not used for live execution in this module."
          ])} />
        </section>
      </div>
      <div className="sf-grid">
        <ProviderStatusCard title="No-Ad Growth Planner" status={summary.growthPlans ? "ready" : "setup needed"} tone={summary.growthPlans ? "success" : "warning"} description="Rule-based growth plans can be generated without paid ad spend." />
        <ProviderStatusCard title="Ad Readiness Score" status={summary.adReadinessScores ? "ready" : "setup needed"} tone={summary.adReadinessScores ? "success" : "warning"} description="Ad drafts are manual/export-ready only; no Google/Meta APIs are called." />
        <ProviderStatusCard title="Campaign Proof Pack" status={summary.proofPacks ? "ready" : "setup needed"} tone={summary.proofPacks ? "success" : "warning"} description="Proof packs are stored as export packages with source labels and blockers." />
        <ProviderStatusCard title="Publishing/Sending" status="disabled" tone="warning" description="No social publishing, email sending, ad launch, or spend is implemented." />
      </div>
    </div>
  </>;
}
