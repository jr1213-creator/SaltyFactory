import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, ProfitabilityBadge, UnitEconomicsCard } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessFinancialsPage() {
  const unitEconomics = await createRepositories().business.unitEconomics.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Financials" description="Manual assumptions and unit economics for products, campaigns, and batches. No accounting, tax, legal, or investment advice." />
    <section className="sf-card">
      <h2>Calculate Unit Economics</h2>
      <form className="sf-form-grid" action="/api/studio/business/unit-economics/calculate" method="post">
        <label>Entity type<input name="entityType" defaultValue="product_draft" /></label>
        <label>Entity ID<input name="entityId" placeholder="draft_..." /></label>
        <label>Sale price<input name="salePrice" inputMode="decimal" defaultValue="32" /></label>
        <label>Product cost<input name="productCost" inputMode="decimal" /></label>
        <label>Shipping estimate<input name="shippingCostEstimate" inputMode="decimal" defaultValue="0" /></label>
        <label>Minimum margin %<input name="minimumMarginThreshold" inputMode="decimal" defaultValue="35" /></label>
        <button className="sf-button sf-button-primary" type="submit">Calculate and Save</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>
      {unitEconomics.length ? <div className="sf-grid">
        {unitEconomics.map((row: any) => <UnitEconomicsCard key={row.id} title={`${row.entity_type ?? row.entityType}: ${row.entity_id ?? row.entityId}`} status={String(row.status)} margin={`${row.contribution_margin_percent ?? row.contributionMarginPercent}%`} />)}
        <DataTable columns={["Entity", "Sale", "Cost", "Margin", "Status"]} rows={unitEconomics.map((row: any) => [`${row.entity_type ?? row.entityType}/${row.entity_id ?? row.entityId}`, row.sale_price ?? row.salePrice, row.product_cost ?? row.productCost, row.contribution_margin_percent ?? row.contributionMarginPercent, <ProfitabilityBadge key={row.id} status={String(row.status)} />])} />
      </div> : <EmptyState title="No unit economics yet" description="Calculate margin with real owner-entered cost and price assumptions." />}
    </section>
  </>;
}
