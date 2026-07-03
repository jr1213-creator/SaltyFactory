import { DataTable, EmptyState, PageHeader, ProviderReadinessCard, StatusBadge } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getStudioLists } from "../data";
import { ShopifyProductsClient } from "./ShopifyProductsClient";

export default async function Page() {
  const { products } = await getStudioLists();
  const config = parseEnv();
  return <>
    <PageHeader title="Shopify Draft Products" description="Draft products created through the guarded Shopify Admin route. Storefront URLs appear only after explicit publish confirmation.">
      <a className="sf-button sf-button-primary" href="/studio/publish-review">Create Shopify Draft</a>
    </PageHeader>
    <div className="sf-grid sf-grid-3">
      <ProviderReadinessCard title="Shopify Admin" status={config.providers.shopifyAdmin.enabled ? "configured" : "setup needed"} tone={config.providers.shopifyAdmin.enabled ? "success" : "warning"} description="Draft creation requires server-side Admin API configuration." />
      <ProviderReadinessCard title="Draft Mode" status="required" tone="success" description="Products are created as drafts/unpublished by default." />
      <ProviderReadinessCard title="Live Publish" status={config.LIVE_PUBLISHING_ENABLED ? "enabled" : "blocked by default"} tone={config.LIVE_PUBLISHING_ENABLED ? "warning" : "danger"} description="Public storefront publish requires owner confirmation and passed gates." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      {products.length ? <DataTable columns={["Draft", "Status", "Admin", "Storefront", "Sync"]} rows={products.map((product: any) => [
        product.shopify_handle ?? product.shopify_product_id ?? product.id,
        <StatusBadge key={`${product.id}-status`} status={product.shopify_status ?? product.sync_status ?? "draft"} tone={(product.shopify_status ?? "") === "active" ? "success" : "warning"} />,
        product.admin_url ? <a key={`${product.id}-admin`} href={product.admin_url} target="_blank" rel="noreferrer">Open admin</a> : "Unavailable",
        product.storefront_url ? <a key={`${product.id}-store`} href={product.storefront_url} target="_blank" rel="noreferrer">Open storefront</a> : "Hidden until publish",
        product.sync_status ?? "draft_created"
      ])} /> : <EmptyState title="No Shopify draft refs" description="Create a Shopify draft from Publish Review after generated artwork, mockups, variants, pricing, and gates are ready." />}
    </section>
    {products.length ? <ShopifyProductsClient refs={products as any[]} /> : null}
  </>;
}
