import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getMarketingCommandCenterData, marketingRowsByChannel } from "../../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function GoogleAdsDraftStudioPage() {
  const data = await getMarketingCommandCenterData();
  const drafts = marketingRowsByChannel(data.channels, "google_ads");
  return <>
    <PageHeader eyebrow="Google Ads Draft Studio" title="Google Ads Draft Studio" description="Create Google Ads draft/export packets. No Google Ads API calls, campaign creation, conversion tracking claims, or spend.">
      <LinkButton href="/studio/marketing/ads" variant="secondary">Ads Hub</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <h2>Create Google Ads Draft</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/campaign-channels" method="post">
        <input type="hidden" name="next" value="/studio/marketing/ads/google" />
        <input type="hidden" name="channel_type" value="google_ads" />
        <label>Campaign ID<input name="campaign_id" /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="export_ready">Export ready</option><option value="blocked">Blocked</option></select></label>
        <label>Draft content JSON<textarea name="draft_content" defaultValue={JSON.stringify({
          objective: "sales_readiness",
          campaignType: "search",
          finalUrl: "https://saltycowhide.com/",
          headlines: ["Salty Cowhide Product Drop", "Western Boutique Finds"],
          descriptions: ["Draft ad copy. Owner review required."],
          keywords: ["western boutique gifts", "coastal cowgirl style"],
          negativeKeywordNotes: "Review irrelevant traffic before export.",
          conversionTrackingReadiness: "not_configured",
          merchantFeedReadiness: "not_configured",
          noLiveApiCall: true
        }, null, 2)} /></label>
        <button className="btn" type="submit">Save Google Ads Draft</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Saved Google Ads Drafts</h2>
      <DataTable columns={["Campaign", "Status", "Tracking", "Execution", "Open"]} rows={drafts.length ? drafts.map((draft: any) => [
        draft.campaign_id ?? draft.campaignId ?? "-",
        <StatusBadge key={draft.id} status={String(draft.status ?? "draft").replace(/_/g, " ")} />,
        "conversion tracking must be verified manually",
        "manual export only",
        <a key={`${draft.id}-open`} href={`/studio/marketing/drafts/${draft.id}`}>Open</a>
      ]) : [["No Google Ads drafts", "Create one above or run launch workflow.", "not configured", "No API calls", "-"]]} />
    </section>
    <ProviderStatusCard title="Google Ads API" status="not implemented" tone="warning" description="Draft Studio does not create live campaigns or spend money." />
  </>;
}
