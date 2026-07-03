import { DataTable, LinkButton, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getMarketingCommandCenterData } from "../marketing-command-center/data";

export const runtime = "nodejs";

export default async function MarketingCampaignsPage() {
  const data = await getMarketingCommandCenterData();
  return <>
    <PageHeader eyebrow="Campaign planner" title="Marketing Campaigns" description="Persisted campaign plans for manual/export-ready marketing packets. No live publishing or ad buying occurs here.">
      <LinkButton href="/studio/marketing-campaigns/new">Create Campaign</LinkButton>
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Campaigns" value={String(data.summary.campaigns)} delta="Shared campaign records" />
      <MetricCard title="Proof packs" value={String(data.summary.proofPacks)} delta="Export packages" />
      <MetricCard title="Draft channels" value={String(data.channels.length)} delta="Manual export only" />
      <MetricCard title="Approvals" value={String(data.summary.approvalItems)} delta="Owner review items" tone={data.summary.approvalItems ? "warning" : "info"} />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <DataTable columns={["Campaign", "Type", "Goal", "Status", "Audience", "Open"]} rows={data.campaigns.length ? data.campaigns.map((campaign: any) => [
        campaign.name,
        String(campaign.campaign_type ?? campaign.campaignType ?? "manual").replace(/_/g, " "),
        campaign.goal ?? "-",
        <StatusBadge key={campaign.id} status={String(campaign.status ?? "draft").replace(/_/g, " ")} />,
        campaign.audience ?? "Owner-defined audience required",
        <a key={`${campaign.id}-open`} href={`/studio/marketing-campaigns/${campaign.id}`}>Open</a>
      ]) : [["No campaigns", "manual", "Create a campaign or run guided workflow.", "empty", "-", <a key="new" href="/studio/marketing-campaigns/new">Create</a>]]} />
    </section>
  </>;
}
