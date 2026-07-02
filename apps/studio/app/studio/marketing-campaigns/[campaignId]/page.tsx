import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData, marketingChannelLabels } from "../../marketing-command-center/data";

export const runtime = "nodejs";

function fmt(value: unknown) {
  return String(value ?? "").replace(/_/g, " ");
}

export default async function MarketingCampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const data = await getMarketingCommandCenterData();
  const campaign = data.campaigns.find((item: any) => String(item.id) === campaignId) as any;
  if (!campaign && data.ok) notFound();
  const channels = data.channels.filter((item: any) => String(item.campaign_id ?? item.campaignId ?? "") === campaignId);
  const packages = data.exportPackages.filter((item: any) => String(item.entity_id ?? item.entityId ?? "") === campaignId);
  const scores = data.readinessScores.filter((item: any) => String(item.entity_id ?? item.entityId ?? "") === campaignId);
  const approvals = data.approvals.filter((item: any) => String(item.entity_id ?? item.entityId ?? "") === campaignId);
  const assets = data.assets.filter((item: any) => String(item.entity_id ?? item.entityId ?? "") === campaignId);
  const utms = data.utmLinks.filter((item: any) => String(item.campaign_id ?? item.campaignId ?? "") === campaignId || String(item.entity_id ?? item.entityId ?? "") === campaignId);
  return <>
    <PageHeader eyebrow="Campaign planner" title={campaign?.name ?? "Campaign"} description="Campaign proof, channel drafts, readiness, assets, UTMs, approvals, tasks, events, and provider blockers.">
      <LinkButton href="/studio/marketing-campaigns" variant="secondary">All Campaigns</LinkButton>
      <LinkButton href={`/studio/marketing-campaigns/${campaignId}/edit`} variant="secondary">Edit Campaign</LinkButton>
      <LinkButton href="/studio/marketing-command-center/launch-campaign" variant="secondary">Run Workflow</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Goal", campaign?.goal ?? "-"],
        ["Audience", campaign?.audience ?? "Owner-defined audience required"],
        ["Offer", campaign?.offer ?? campaign?.manual_offer ?? campaign?.manualOffer ?? "Manual offer required"],
        ["Landing URL", campaign?.landing_url ?? campaign?.landingUrl ?? "-"],
        ["Status", <StatusBadge key="status" status={fmt(campaign?.status ?? "draft")} />],
        ["Source", campaign?.source_label ?? campaign?.sourceLabel ?? "System-generated"]
      ]} />
    </section>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card">
        <h2>Channel Drafts</h2>
        <DataTable columns={["Channel", "Status", "Approval", "Manual export", "Open"]} rows={channels.length ? channels.map((channel: any) => [
          marketingChannelLabels[String(channel.channel_type ?? channel.channelType)] ?? fmt(channel.channel_type ?? channel.channelType),
          <StatusBadge key={channel.id} status={fmt(channel.status ?? "draft")} />,
          channel.approval_id ?? channel.approvalId ?? "approval required before publishing",
          "copy/export only",
          <a key={`${channel.id}-open`} href={`/studio/marketing/drafts/${channel.id}`}>Open</a>
        ]) : [["No channel drafts", "Create from workflow or channel studios.", "-", "manual/export-ready", "-"]]} />
        <form className="sf-grid sf-grid-2" action="/api/studio/shared/campaign-channels" method="post">
          <input type="hidden" name="next" value={`/studio/marketing-campaigns/${campaignId}`} />
          <input type="hidden" name="campaign_id" value={campaignId} />
          <label>Channel<select name="channel_type" defaultValue="pinterest"><option value="pinterest">Pinterest</option><option value="instagram">Instagram</option><option value="email">Email</option><option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option><option value="seo_geo">SEO/AEO/GEO</option></select></label>
          <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="export_ready">Export ready</option><option value="blocked">Blocked</option></select></label>
          <label>Draft content JSON<textarea name="draft_content" defaultValue='{"copy":"Draft content only. Owner review required.","manualExport":true}' /></label>
          <button className="sf-button" type="submit">Add Draft</button>
        </form>
      </section>
      <section className="sf-card">
        <h2>Proof Packs & Growth Plans</h2>
        <DataTable columns={["Package", "Type", "Status"]} rows={packages.length ? packages.map((pack: any) => [pack.title, fmt(pack.package_type ?? pack.packageType), fmt(pack.status ?? "draft")]) : [["No packages", "Run workflow to generate proof pack and growth plan.", "needed"]]} />
      </section>
      <section className="sf-card">
        <h2>Readiness Scores</h2>
        <DataTable columns={["Score", "Value", "Status", "Blockers"]} rows={scores.length ? scores.map((score: any) => [
          fmt(score.score_type ?? score.scoreType),
          `${score.score_value ?? score.scoreValue ?? 0}/${score.max_score ?? score.maxScore ?? 100}`,
          fmt(score.status ?? "setup_needed"),
          Array.isArray(score.blockers) ? score.blockers.join(", ") : JSON.stringify(score.blockers ?? [])
        ]) : [["No readiness score", "0/100", "setup needed", "Run workflow or create score."]]} />
      </section>
      <section className="sf-card">
        <h2>Assets / UTMs / Approvals</h2>
        <DataTable columns={["Type", "Count", "Status"]} rows={[
          ["Asset specs", String(assets.length), assets.length ? "ready" : "needed"],
          ["UTM links", String(utms.length), utms.length ? "ready" : "needed"],
          ["Approvals", String(approvals.length), approvals.length ? "pending/reviewed" : "needed"]
        ]} />
      </section>
    </div>
    <ProviderStatusCard title="Live execution" status="disabled" tone="warning" description="This campaign page prepares manual/export-ready work only. It does not publish, send, submit feeds, launch ads, or spend money." />
  </>;
}
