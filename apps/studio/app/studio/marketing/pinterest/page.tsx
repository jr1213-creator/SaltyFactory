import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData, marketingRowsByChannel } from "../../marketing-command-center/data";

export const runtime = "nodejs";

const boardIdeas = ["Coastal Cowgirl Style", "Western Boutique Finds", "Turquoise Jewelry", "Cowhide Accessories", "Beach to Bonfire Outfits", "Salty Cowhide Gift Ideas", "Holiday Ornaments", "Digital Downloads", "Boutique Owner Finds", "Custom Western Gifts"];

export default async function PinterestPinFactoryPage() {
  const data = await getMarketingCommandCenterData();
  const pins = marketingRowsByChannel(data.channels, "pinterest");
  return <>
    <PageHeader eyebrow="Pinterest Pin Factory" title="Pinterest Pin Factory" description="Create Pinterest pin drafts, board plans, keyword notes, UTM-ready URLs, and asset requirements. No Pinterest API publishing or fake analytics.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <h2>Create Pin Draft</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/campaign-channels" method="post">
        <input type="hidden" name="next" value="/studio/marketing/pinterest" />
        <input type="hidden" name="channel_type" value="pinterest" />
        <label>Campaign ID<input name="campaign_id" /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="export_ready">Export ready</option><option value="manually_published">Manually published</option></select></label>
        <label>Draft content JSON<textarea name="draft_content" defaultValue={JSON.stringify({ title: "Salty Cowhide product drop", description: "Draft pin copy. Owner review required.", board: "Salty Cowhide Gift Ideas", keywords: ["western boutique", "coastal cowgirl"], noLivePublish: true }, null, 2)} /></label>
        <button className="btn" type="submit">Save Pin Draft</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Pin Drafts</h2>
      <DataTable columns={["Campaign", "Status", "Draft", "Export", "Open"]} rows={pins.length ? pins.map((pin: any) => [
        pin.campaign_id ?? pin.campaignId ?? "-",
        <StatusBadge key={pin.id} status={String(pin.status ?? "draft").replace(/_/g, " ")} />,
        JSON.stringify(pin.draft_content ?? pin.draftContent ?? {}).slice(0, 140),
        "copy/manual export only",
        <a key={`${pin.id}-open`} href={`/studio/marketing/drafts/${pin.id}`}>Open</a>
      ]) : [["No pin drafts", "Create one above or run launch workflow.", "-", "No live publish", "-"]]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Board Planner</h2>
      <DataTable columns={["Board idea", "Status"]} rows={boardIdeas.map((board) => [board, "planning preset"])} />
    </section>
    <ProviderStatusCard title="Pinterest provider" status={data.providerStatuses.pinterest.replace(/_/g, " ")} tone={data.providerStatuses.pinterest === "connected" ? "success" : "warning"} description="Pins remain drafts/manual exports. No Pinterest API call is made." />
  </>;
}
