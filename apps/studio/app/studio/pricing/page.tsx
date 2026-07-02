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
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Product ideas" value={String(lists.podCandidates.length)} delta={`${readyIdeas} ready for review`} />
      <MetricCard title="Listing drafts" value={String(lists.listingDraftsV1.length)} delta={`${readyDrafts} ready for export`} />
      <MetricCard title="Live sync" value="Guarded" delta="Provider + approval gates" />
      <MetricCard title="Margin data" value="Manual input" delta="No fake estimates" tone="warning" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Margin Calculator</h2>
      <form className="sf-grid sf-grid-3" action="/api/studio/pricing/calculate" method="post">
        <label>Base product cost<input name="baseProductCost" type="number" min="0" step="0.01" /></label>
        <label>Shipping cost<input name="shippingCost" type="number" min="0" step="0.01" /></label>
        <label>Packaging / handling<input name="packagingHandlingCost" type="number" min="0" step="0.01" /></label>
        <label>Platform fee %<input name="platformFeePercent" type="number" min="0" max="100" step="0.01" /></label>
        <label>Payment fee %<input name="paymentFeePercent" type="number" min="0" max="100" step="0.01" /></label>
        <label>Fixed transaction fee<input name="fixedTransactionFee" type="number" min="0" step="0.01" /></label>
        <label>Ad cost estimate<input name="adCostEstimate" type="number" min="0" step="0.01" /></label>
        <label>Discount %<input name="discountPercent" type="number" min="0" max="100" step="0.01" /></label>
        <label>Sale price<input name="salePrice" type="number" min="0" step="0.01" /></label>
        <button className="sf-button" type="submit">Calculate Margin</button>
      </form>
    </section>
    <DataTable columns={["Gate", "State"]} rows={[
      ["POD product cost", "Owner-entered or provider-imported only"],
      ["Margin threshold", "Checked before publish review"],
      ["Owner approval", "Required before export or provider sync"]
    ]} />
  </>;
}
