import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../../data";

export default async function ListingDraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lists = await getStudioLists();
  const draft = lists.listingDraftsV1.find((row: any) => row.id === id) as any;
  if (!draft && !lists.setupMessage) notFound();
  const listing = (draft?.listing_json ?? draft?.listingJson ?? {}) as Record<string, any>;
  const blockers = draft?.validation_blockers ?? draft?.validationBlockers ?? [];
  return <>
    <PageHeader title={draft?.title ?? "Listing Draft"} description="Edit owner-reviewed listing copy and validation inputs. Saving does not sync to Shopify, Printify, Etsy, or any public channel.">
      <LinkButton href="/studio/listing-drafts" variant="secondary">Listing Drafts</LinkButton>
      <StatusBadge status={draft?.validation_status ?? draft?.validationStatus ?? "draft"} tone={(draft?.validation_status ?? draft?.validationStatus) === "ready_for_export" ? "success" : "warning"} />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    {draft ? <section className="surface-card">
      <h2>Edit Draft</h2>
      <form className="layout-grid layout-grid-2" action={`/api/studio/listing-drafts/${encodeURIComponent(id)}`} method="post">
        <label>Target channel<input name="targetChannel" defaultValue={draft.target_channel ?? draft.targetChannel ?? listing.targetChannel ?? "Shopify"} /></label>
        <label>Title<input name="title" defaultValue={draft.title ?? listing.title ?? ""} required /></label>
        <label>Product type<input name="productType" defaultValue={listing.productType ?? ""} /></label>
        <label>Price<input name="price" type="number" step="0.01" defaultValue={draft.price ?? listing.price ?? ""} /></label>
        <label>Tags<input name="tags" defaultValue={(listing.tags ?? []).join(", ")} /></label>
        <label>Production method<input name="productionMethod" defaultValue={listing.productionMethod ?? "POD"} /></label>
        <label>Description<textarea name="description" defaultValue={draft.description ?? listing.description ?? ""} required /></label>
        <label>Production partner disclosure<textarea name="productionPartnerDisclosure" defaultValue={listing.productionPartnerDisclosure ?? ""} /></label>
        <label>Shipping/processing notes<textarea name="shippingProcessingNotes" defaultValue={listing.shippingProcessingNotes ?? ""} /></label>
        <label>Safety status<select name="safetyStatus" defaultValue={listing.safetyStatus ?? "not_checked"}><option value="not_checked">Not checked</option><option value="passed">Passed</option><option value="blocked">Blocked</option></select></label>
        <label>Margin status<select name="marginStatus" defaultValue={listing.marginStatus ?? "not_checked"}><option value="not_checked">Not checked</option><option value="passed">Passed</option><option value="critically_low">Critically low</option><option value="owner_override">Owner override</option></select></label>
        <label><input name="ownerApproved" type="checkbox" defaultChecked={Boolean(listing.ownerApproved || draft.approval_status === "approved" || draft.approvalStatus === "approved")} /> Owner approved for manual/export review</label>
        <button className="btn btn-primary" type="submit">Save Listing Draft</button>
      </form>
    </section> : null}
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Validation Blockers</h2>
      <DataTable columns={["Blocker", "State"]} rows={blockers.length ? blockers.map((blocker: string) => [blocker, "Must be resolved before export-ready status"]) : [["No blockers", "Ready for owner publish-review workflow"]]} />
    </section>
  </>;
}
