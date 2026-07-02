import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function DropshippingPage() {
  const lists = await getStudioLists();
  const needsReview = lists.dropshipCandidates.filter((row: any) => row.status === "needs_review").length;
  return <>
    <PageHeader title="Dropshipping" description="Jewelry and accessory product candidate lane with supplier, risk, brand fit, and margin checks.">
      <StatusBadge status="manual supplier records" tone="info" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Candidates" value={String(lists.dropshipCandidates.length)} delta="No scraping" />
      <MetricCard title="Needs review" value={String(needsReview)} delta="Safety and margin flags" tone={needsReview ? "warning" : "success"} />
      <MetricCard title="Ready" value={String(lists.dropshipCandidates.length - needsReview)} delta="Draft lane only" />
      <MetricCard title="Availability" value="Not claimed" delta="No supplier API" tone="warning" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Add Dropship Candidate</h2>
      <form className="sf-grid sf-grid-3" action="/api/studio/dropshipping" method="post">
        <label>Supplier name<input name="supplierName" required /></label>
        <label>Supplier URL<input name="supplierUrl" type="url" /></label>
        <label>Product title<input name="productTitle" required /></label>
        <label>Category<select name="productCategory"><option value="jewelry">jewelry</option><option value="earrings">earrings</option><option value="necklaces">necklaces</option><option value="bracelets">bracelets</option><option value="western accessories">western accessories</option><option value="coastal accessories">coastal accessories</option><option value="other">other</option></select></label>
        <label>Supplier cost<input name="supplierCost" type="number" step="0.01" /></label>
        <label>Shipping cost<input name="shippingCost" type="number" step="0.01" /></label>
        <label>Sale price<input name="salePrice" type="number" step="0.01" /></label>
        <label>Delivery estimate days<input name="deliveryEstimateDays" type="number" /></label>
        <label>Brand fit score<input name="brandFitScore" type="number" min="0" max="100" /></label>
        <button className="sf-button" type="submit">Add Dropship Candidate</button>
      </form>
    </section>
    <DataTable columns={["Product", "Supplier", "Category", "Status", "Flags"]} rows={lists.dropshipCandidates.length ? lists.dropshipCandidates.map((row: any) => [row.product_title ?? row.productTitle, row.supplier_name ?? row.supplierName, row.product_category ?? row.productCategory, <StatusBadge key={row.id} status={row.status} />, (row.flags ?? []).join(", ") || "-"]) : [["No candidates", "-", "-", "idea", "Add a candidate"]]} />
  </>;
}

