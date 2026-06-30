import { DataTable, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";

export default async function Page() {
  const { products } = await getStudioLists();
  return <>
    <PageHeader title="Published Products" description="Shopify and Printify references created only after publish review gates pass." />
    <section className="sf-card">{products.length ? <DataTable columns={["Reference", "Status", "Handle", "Synced"]} rows={products.map((product:any)=>[product.id, <StatusBadge key="s" status={product.shopify_status ?? product.status ?? "draft"} />, product.shopify_handle ?? "Pending", product.synced_at ? "Yes" : "No"])} /> : <EmptyState title="No published product refs" description="Products appear here after guarded Shopify/Printify actions succeed." />}</section>
  </>;
}
