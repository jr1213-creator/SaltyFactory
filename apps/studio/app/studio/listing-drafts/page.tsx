import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function ListingDraftsPage() {
  const lists = await getStudioLists();
  const ready = lists.listingDraftsV1.filter((row: any) => row.validation_status === "ready_for_export" || row.validationStatus === "ready_for_export").length;
  return <>
    <PageHeader title="Listing Draft Builder" description="Etsy, Shopify, and manual export drafts with safety, disclosure, asset, mockup, and approval gates.">
      <StatusBadge status="owner approval required" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Drafts" value={String(lists.listingDraftsV1.length)} delta="Repository backed" />
      <MetricCard title="Ready for export" value={String(ready)} delta="Validation passed" tone={ready ? "success" : "warning"} />
      <MetricCard title="Blocked" value={String(lists.listingDraftsV1.length - ready)} delta="Honest blockers" tone={lists.listingDraftsV1.length - ready ? "warning" : "success"} />
      <MetricCard title="Live sync" value="Guarded" delta="Provider + approval gates" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Create Listing Draft</h2>
      <form className="sf-grid sf-grid-3" action="/api/studio/listing-drafts" method="post">
        <label>Target channel<select name="targetChannel"><option value="Etsy">Etsy</option><option value="Shopify">Shopify</option><option value="manual">manual</option></select></label>
        <label>Source<select name="source"><option value="manual">manual</option><option value="POD migration">POD migration</option><option value="dropshipping">dropshipping</option><option value="design workflow">design workflow</option></select></label>
        <label>Title<input name="title" required /></label>
        <label>Price<input name="price" type="number" step="0.01" /></label>
        <label>Tags<input name="tags" placeholder="western, coastal" /></label>
        <label>Production method<input name="productionMethod" /></label>
        <label>Description<textarea name="description" required /></label>
        <label>Production partner disclosure<textarea name="productionPartnerDisclosure" /></label>
        <label>Shipping/processing notes<textarea name="shippingProcessingNotes" /></label>
        <label><input name="ownerApproved" type="checkbox" /> Owner approved</label>
        <input type="hidden" name="safetyStatus" value="not_checked" />
        <button className="sf-button" type="submit">Create Draft</button>
      </form>
    </section>
    <DataTable columns={["Title", "Channel", "Validation", "Approval", "Blockers"]} rows={lists.listingDraftsV1.length ? lists.listingDraftsV1.map((row: any) => [row.title, row.target_channel ?? row.targetChannel, <StatusBadge key={row.id} status={row.validation_status ?? row.validationStatus} />, row.approval_status ?? row.approvalStatus, (row.validation_blockers ?? row.validationBlockers ?? []).join(", ") || "-"]) : [["No listing drafts", "-", "blocked", "draft", "Create a draft"]]} />
  </>;
}

