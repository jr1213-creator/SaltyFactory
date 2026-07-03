import { DataTable, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";

export default async function Page() {
  const { products, printifyProducts } = await getStudioLists();
  return <>
    <PageHeader title="Provider Product Map" description="Shopify and Printify references mapped to SaltyFactory product drafts. Draft refs are not public storefront products until owner-published.">
      <a className="btn btn-secondary" href="/studio/shopify-products">Shopify Drafts</a>
      <a className="btn btn-secondary" href="/studio/printify-catalog">Printify Catalog</a>
    </PageHeader>
    <section className="surface-card">{products.length ? <DataTable columns={["Shopify Reference", "Status", "Handle", "Synced"]} rows={products.map((product:any)=>[product.id, <StatusBadge key="s" status={product.shopify_status ?? product.status ?? "draft"} />, product.shopify_handle ?? "Pending", product.synced_at ? "Yes" : "No"])} /> : <EmptyState title="No Shopify draft refs" description="Shopify refs appear here after guarded draft creation succeeds." />}</section>
    <section className="surface-card" style={{ marginTop: 18 }}>{printifyProducts.length ? <DataTable columns={["Printify Reference", "Status", "Product ID", "Mapping"]} rows={printifyProducts.map((product:any)=>[product.id, <StatusBadge key="p" status={product.printify_status ?? product.sync_status ?? "draft"} />, product.printify_product_id ?? "Pending", product.product_draft_id ?? product.productDraftId ?? "Unmapped"])} /> : <EmptyState title="No Printify draft refs" description="Printify refs appear here after generated artwork upload, variant selection, and guarded product creation succeed." />}</section>
  </>;
}
