import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

const sourceTypes = ["customer", "reddit_observation", "community_observation", "competitor", "review", "support_message", "social_comment", "owner_note", "imported_note"];

export default async function VoiceOfMarketResearchPage() {
  const data = await getMarketingCommandCenterData();
  const research = data.sourceRecords.filter((record: any) => sourceTypes.includes(String(record.source_name ?? record.sourceName ?? "")));
  const swipe = data.assets.filter((asset: any) => String(asset.asset_type ?? asset.assetType ?? "") === "screenshot_ref");
  return <>
    <PageHeader eyebrow="Voice-of-Market Research Board" title="Voice-of-Market Research" description="Manual/source-labeled research board for pain points, objections, buyer intent, competitor insights, reviews, community themes, and swipe-file references. No scraping.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <h2>Add Research Item</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/source-records" method="post">
        <input type="hidden" name="next" value="/studio/marketing/research" />
        <input type="hidden" name="origin" value="manual" />
        <label>Source type<select name="source_name" defaultValue="owner_note">{sourceTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}</select></label>
        <label>Source label<input name="source_label" defaultValue="Manual research" required /></label>
        <label>Source URL<input name="source_url" placeholder="optional" /></label>
        <label>Raw payload JSON<textarea name="raw_payload" defaultValue={JSON.stringify({ theme: "buyer intent", note: "Paste owner-reviewed observation here.", classification: "owner_note" }, null, 2)} /></label>
        <button className="btn" type="submit">Save Research</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Add Creative Swipe Reference</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/assets" method="post">
        <input type="hidden" name="next" value="/studio/marketing/research" />
        <input type="hidden" name="entity_type" value="research" />
        <input type="hidden" name="entity_id" value="creative_swipe_file" />
        <input type="hidden" name="asset_type" value="screenshot_ref" />
        <label>Title<input name="title" defaultValue="Swipe file inspiration reference" required /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="archived">Archived</option></select></label>
        <label>Description<textarea name="description" defaultValue="Reference only. Do not copy. Use to generate an original angle." /></label>
        <label>Spec JSON<textarea name="spec" defaultValue={JSON.stringify({ platform: "manual", hook: "", visualAngle: "", offer: "", cta: "", doNotCopyAcknowledgement: true }, null, 2)} /></label>
        <button className="btn" type="submit">Save Swipe Reference</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Research Items</h2>
      <DataTable columns={["Source", "Label", "Confidence", "Owner verified"]} rows={research.length ? research.map((item: any) => [
        String(item.source_name ?? item.sourceName).replace(/_/g, " "),
        item.source_label ?? item.sourceLabel,
        item.confidence ?? "-",
        item.owner_verified_at ?? item.ownerVerifiedAt ? "owner verified" : "not verified"
      ]) : [["No research yet", "Add manual/source-labeled observations.", "-", "not verified"]]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Creative Swipe File</h2>
      <DataTable columns={["Reference", "Status", "Copying guardrail"]} rows={swipe.length ? swipe.map((item: any) => [
        item.title,
        <StatusBadge key={item.id} status={String(item.status ?? "draft").replace(/_/g, " ")} />,
        "Do-not-copy acknowledgement required"
      ]) : [["No swipe references", "Add a reference above.", "Do not copy copyrighted work"]]} />
    </section>
    <ProviderStatusCard title="Scraping/import" status="manual only" tone="warning" description="No scraping or external research APIs are called. Research items are manual/pasted/imported with provenance." />
  </>;
}
