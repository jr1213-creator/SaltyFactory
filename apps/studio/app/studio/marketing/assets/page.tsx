import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

const presets = ["Pinterest 1000x1500", "Instagram 1080x1080", "Instagram Story/Reel 1080x1920", "Facebook feed 1080x1080 / 1200x630", "Google Display common sizes", "Meta feed/story/reel", "Email hero", "Shopify collection banner", "Google Business post", "Pinterest video pin", "Instagram reel brief", "TikTok video brief", "YouTube short brief"];

export default async function CampaignAssetStudioPage() {
  const data = await getMarketingCommandCenterData();
  return <>
    <PageHeader eyebrow="Campaign Asset Studio" title="Campaign Asset Studio" description="Create asset specs and creative briefs for campaigns. This does not generate images/videos or claim assets were created.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <h2>Create Asset Spec</h2>
      <form className="sf-grid sf-grid-2" action="/api/studio/shared/assets" method="post">
        <input type="hidden" name="next" value="/studio/marketing/assets" />
        <input type="hidden" name="entity_type" value="campaign" />
        <label>Campaign ID<input name="entity_id" required /></label>
        <label>Asset type<select name="asset_type" defaultValue="ad_asset"><option value="pin_asset">Pin asset</option><option value="ad_asset">Ad asset</option><option value="email_asset">Email asset</option><option value="creative_brief">Creative brief</option><option value="screenshot_ref">Swipe file screenshot ref</option></select></label>
        <label>Title<input name="title" defaultValue="Campaign asset spec" required /></label>
        <label>Status<select name="status" defaultValue="needed"><option value="needed">Needed</option><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="exported">Exported</option></select></label>
        <label>Description<textarea name="description" defaultValue="Asset spec only. No generated creative claimed." /></label>
        <label>Spec JSON<textarea name="spec" defaultValue={JSON.stringify({ dimensions: "1080x1080", platform: "manual", generatedMedia: false, ownerApprovalRequired: true }, null, 2)} /></label>
        <button className="sf-button" type="submit">Save Asset Spec</button>
      </form>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Saved Asset Specs</h2>
      <DataTable columns={["Title", "Type", "Campaign", "Status", "Generated?"]} rows={data.assets.length ? data.assets.map((asset: any) => [
        asset.title,
        String(asset.asset_type ?? asset.assetType ?? "").replace(/_/g, " "),
        asset.entity_id ?? asset.entityId ?? "-",
        <StatusBadge key={asset.id} status={String(asset.status ?? "needed").replace(/_/g, " ")} />,
        "No generated media claimed"
      ]) : [["No asset specs", "Create one above or run launch workflow.", "-", "needed", "No"]]} />
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Presets</h2>
      <DataTable columns={["Preset", "Status"]} rows={presets.map((preset) => [preset, "available as spec"])} />
    </section>
    <ProviderStatusCard title="Creative generation" status="not implemented" tone="warning" description="This studio stores briefs/specs/file references only; no Canva, video, or image generation provider is called." />
  </>;
}
