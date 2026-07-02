import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getMarketingCommandCenterData, marketingRowsByChannel } from "../../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function MetaAdsDraftStudioPage() {
  const data = await getMarketingCommandCenterData();
  const drafts = marketingRowsByChannel(data.channels, "meta_ads");
  return <>
    <PageHeader eyebrow="Meta Ads Draft Studio" title="Meta Ads Draft Studio" description="Create Meta Ads draft/export packets. No Meta API calls, creative uploads, pixel claims, or spend.">
      <LinkButton href="/studio/marketing/ads" variant="secondary">Ads Hub</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <h2>Create Meta Ads Draft</h2>
      <form className="sf-grid sf-grid-2" action="/api/studio/shared/campaign-channels" method="post">
        <input type="hidden" name="next" value="/studio/marketing/ads/meta" />
        <input type="hidden" name="channel_type" value="meta_ads" />
        <label>Campaign ID<input name="campaign_id" /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="export_ready">Export ready</option><option value="blocked">Blocked</option></select></label>
        <label>Draft content JSON<textarea name="draft_content" defaultValue={JSON.stringify({
          objective: "sales_readiness",
          adSetName: "Salty Cowhide interest audience",
          audienceNotes: "Owner-defined audience; no live targeting setup.",
          placementNotes: "Feed/story/reel export specs only.",
          landingUrl: "https://saltycowhide.com/",
          primaryTextVariants: ["Draft primary text. Owner review required."],
          headlineVariants: ["Salty Cowhide Product Drop"],
          cta: "Shop Now",
          pixelReadiness: "not_configured",
          specialAdCategoryChecklist: "Review if applicable.",
          noLiveApiCall: true
        }, null, 2)} /></label>
        <button className="sf-button" type="submit">Save Meta Ads Draft</button>
      </form>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Saved Meta Ads Drafts</h2>
      <DataTable columns={["Campaign", "Status", "Pixel", "Execution", "Open"]} rows={drafts.length ? drafts.map((draft: any) => [
        draft.campaign_id ?? draft.campaignId ?? "-",
        <StatusBadge key={draft.id} status={String(draft.status ?? "draft").replace(/_/g, " ")} />,
        "pixel readiness not verified here",
        "manual export only",
        <a key={`${draft.id}-open`} href={`/studio/marketing/drafts/${draft.id}`}>Open</a>
      ]) : [["No Meta Ads drafts", "Create one above or run launch workflow.", "not configured", "No API calls", "-"]]} />
    </section>
    <ProviderStatusCard title="Meta Ads API" status="not implemented" tone="warning" description="Draft Studio does not upload creative, create campaigns, or spend money." />
  </>;
}
