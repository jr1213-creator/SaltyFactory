import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData, marketingChannelLabels } from "../../marketing-command-center/data";

export const runtime = "nodejs";

const platforms = ["instagram", "facebook", "tiktok", "youtube_shorts", "threads", "linkedin", "google_business_profile", "bluesky"];

export default async function SocialDraftQueuePage() {
  const data = await getMarketingCommandCenterData();
  const drafts = data.channels.filter((channel: any) => platforms.includes(String(channel.channel_type ?? channel.channelType ?? "")));
  return <>
    <PageHeader eyebrow="Social Draft Queue" title="Social Draft Queue" description="Create and export social captions and asset requirements. No live social posting is implemented.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <h2>Create Social Draft</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/campaign-channels" method="post">
        <input type="hidden" name="next" value="/studio/marketing/social" />
        <label>Platform<select name="channel_type" defaultValue="instagram">{platforms.map((platform) => <option key={platform} value={platform}>{platform.replace(/_/g, " ")}</option>)}</select></label>
        <label>Campaign ID<input name="campaign_id" /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="export_ready">Export ready</option><option value="manually_published">Manually published</option></select></label>
        <label>Draft content JSON<textarea name="draft_content" defaultValue={JSON.stringify({ caption: "Draft social caption. Owner review required.", assetRequired: true, noAutoPost: true }, null, 2)} /></label>
        <button className="btn" type="submit">Save Social Draft</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Saved Social Drafts</h2>
      <DataTable columns={["Platform", "Campaign", "Status", "Copy/export", "Open"]} rows={drafts.length ? drafts.map((draft: any) => [
        marketingChannelLabels[String(draft.channel_type ?? draft.channelType)] ?? String(draft.channel_type ?? draft.channelType).replace(/_/g, " "),
        draft.campaign_id ?? draft.campaignId ?? "-",
        <StatusBadge key={draft.id} status={String(draft.status ?? "draft").replace(/_/g, " ")} />,
        "manual copy/export only",
        <a key={`${draft.id}-open`} href={`/studio/marketing/drafts/${draft.id}`}>Open</a>
      ]) : [["No social drafts", "Create one above or run launch workflow.", "empty", "No auto-posting", "-"]]} />
    </section>
    <ProviderStatusCard title="Social publishing" status="disabled" tone="warning" description="No provider posting, scheduling, customer messaging, or spend is triggered." />
  </>;
}
