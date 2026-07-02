import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function PodMigrationPage() {
  const lists = await getStudioLists();
  const ready = lists.podCandidates.filter((row: any) => row.status === "ready_for_review" || row.status === "approved").length;
  return <>
    <PageHeader title="POD Product Builder" description="Create Salty Cowhide product ideas, attach artwork, choose POD product types, prepare mockups, draft listings, and move through owner approval.">
      <StatusBadge status="approval gated" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Product ideas" value={String(lists.podCandidates.length)} delta="Saved workspace data" />
      <MetricCard title="Ready for review" value={String(ready)} delta="No live sync" tone={ready ? "success" : "warning"} />
      <MetricCard title="Approved assets" value={String(lists.assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup).length)} delta="From asset workflow" />
      <MetricCard title="Approved mockups" value={String(lists.mockups.filter((mockup: any) => mockup.approved_for_product || mockup.approvedForProduct).length)} delta="Required for POD" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Create Product Idea</h2>
      <form className="sf-grid sf-grid-3" action="/api/studio/pod-migration" method="post">
        <label>Design name<input name="designName" required /></label>
        <label>Source<select name="source"><option value="manual">manual</option><option value="Etsy">Etsy</option><option value="handmade">handmade</option><option value="Shopify">Shopify</option><option value="legacy product">legacy product</option></select></label>
        <label>Source URL<input name="sourceUrl" type="url" /></label>
        <label>Design file status<select name="designFileStatus"><option value="missing">missing</option><option value="uploaded">uploaded</option><option value="needs_cleanup">needs_cleanup</option><option value="ready">ready</option></select></label>
        <label>Target POD products<input name="targetProductTypes" placeholder="t-shirt, tote, sticker" /></label>
        <label>Target channels<input name="targetChannels" placeholder="Etsy, Shopify" /></label>
        <label>Sale price<input name="salePrice" type="number" step="0.01" /></label>
        <label>Base product cost<input name="baseProductCost" type="number" step="0.01" /></label>
        <label>Shipping cost<input name="shippingCost" type="number" step="0.01" /></label>
        <label><input name="listingReady" type="checkbox" /> Listing ready</label>
        <label><input name="mockupsApproved" type="checkbox" /> Mockups approved</label>
        <label><input name="ownerApproved" type="checkbox" /> Owner approved</label>
        <button className="sf-button" type="submit">Create Product Idea</button>
      </form>
    </section>
    <DataTable columns={["Product idea", "Source", "POD products", "Status", "Blockers"]} rows={lists.podCandidates.length ? lists.podCandidates.map((row: any) => {
      const readiness = row.readiness_json ?? row.readinessJson ?? {};
      return [row.design_name ?? row.designName, row.source, (row.target_product_types ?? row.targetProductTypes ?? []).join(", "), <StatusBadge key={row.id} status={row.status} />, (readiness.blockers ?? []).join(", ") || "-"];
    }) : [["No product ideas", "manual", "-", "idea", "Create a product idea"]]} />
  </>;
}
