import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function PricingPage() {
  const lists = await getStudioLists();
  const readyIdeas = lists.podCandidates.filter((row: any) => row.status === "ready_for_review" || row.status === "approved").length;
  const readyDrafts = lists.listingDraftsV1.filter((row: any) => (row.validation_status ?? row.validationStatus) === "ready_for_export").length;
  return <>
    <PageHeader title="Pricing & Margins" description="Review POD costs, shipping, platform fees, payment fees, discounts, and target sale price before owner approval.">
      <StatusBadge status="owner review required" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Product ideas" value={String(lists.podCandidates.length)} delta={`${readyIdeas} ready for review`} />
      <MetricCard title="Listing drafts" value={String(lists.listingDraftsV1.length)} delta={`${readyDrafts} ready for export`} />
      <MetricCard title="Live sync" value="Guarded" delta="Provider + approval gates" />
      <MetricCard title="Margin data" value="Manual input" delta="No fake estimates" tone="warning" />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Margin Calculator</h2>
      <form className="layout-grid layout-grid-3" action="/api/studio/pricing/calculate" method="post">
        <label>Product draft<select name="productDraftId" defaultValue=""><option value="">Calculate only - do not save</option>{lists.drafts.map((draft: any) => <option key={draft.id} value={draft.id}>{draft.title ?? draft.id}</option>)}</select></label>
        <label>Base product cost<input name="baseProductCost" type="number" min="0" step="0.01" /></label>
        <label>Shipping cost<input name="shippingCost" type="number" min="0" step="0.01" /></label>
        <label>Packaging / handling<input name="packagingHandlingCost" type="number" min="0" step="0.01" /></label>
        <label>Platform fee %<input name="platformFeePercent" type="number" min="0" max="100" step="0.01" /></label>
        <label>Payment fee %<input name="paymentFeePercent" type="number" min="0" max="100" step="0.01" /></label>
        <label>Fixed transaction fee<input name="fixedTransactionFee" type="number" min="0" step="0.01" /></label>
        <label>Ad cost estimate<input name="adCostEstimate" type="number" min="0" step="0.01" /></label>
        <label>Discount %<input name="discountPercent" type="number" min="0" max="100" step="0.01" /></label>
        <label>Discount / promo notes<input name="discountNotes" placeholder="Manual note; no fake provider cost" /></label>
        <label>Sale price<input name="salePrice" type="number" min="0" step="0.01" /></label>
        <button className="btn" type="submit">Calculate Margin</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Saved Margin Checks</h2>
      <DataTable columns={["Draft", "Cost", "Shipping", "Price", "Margin", "Status"]} rows={lists.marginChecks.length ? lists.marginChecks.map((row: any) => [
        row.product_draft_id ?? row.productDraftId,
        `$${Number(row.cost ?? 0).toFixed(2)}`,
        `$${Number(row.printify_shipping_estimate ?? row.printifyShippingEstimate ?? 0).toFixed(2)}`,
        `$${Number(row.price ?? 0).toFixed(2)}`,
        `${Number(row.margin_percent ?? row.marginPercent ?? 0).toFixed(1)}%`,
        <StatusBadge key={row.id} status={row.status ?? (row.blocked ? "blocked" : "passed")} tone={row.blocked ? "danger" : "success"} />
      ]) : [["No saved margin checks", "-", "-", "-", "-", "Attach a calculation to a product draft to persist it"]]} />
    </section>
    <DataTable columns={["Gate", "State"]} rows={[
      ["POD product cost", "Owner-entered or provider-imported only"],
      ["Margin threshold", "Checked before publish review"],
      ["Owner approval", "Required before export or provider sync"]
    ]} />
  </>;
}
