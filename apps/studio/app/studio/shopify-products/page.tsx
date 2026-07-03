import { DataTable, EmptyState, PageHeader, ProviderReadinessCard, StatusBadge } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getStudioLists } from "../data";
import { ShopifyProductsClient } from "./ShopifyProductsClient";

export default async function Page() {
  const { products } = await getStudioLists();
  const config = parseEnv();
  return <>
    <PageHeader title="Shopify Draft Products" description="Draft products created through the guarded Shopify Admin route. Storefront URLs appear only after explicit publish confirmation.">
      <a className="btn btn-primary" href="/studio/publish-review">Create Shopify Draft</a>
    </PageHeader>
    <div className="layout-grid layout-grid-3">
      <ProviderReadinessCard title="Shopify Admin" status={config.providers.shopifyAdmin.enabled ? "configured" : "setup needed"} tone={config.providers.shopifyAdmin.enabled ? "success" : "warning"} description="Draft creation uses saved onboarding credentials or protected server-side Shopify Admin config." />
      <ProviderReadinessCard title="Draft Mode" status="required" tone="success" description="Products are created as drafts/unpublished by default." />
      <ProviderReadinessCard title="Live Publish" status={config.LIVE_PUBLISHING_ENABLED ? "enabled" : "blocked by default"} tone={config.LIVE_PUBLISHING_ENABLED ? "warning" : "danger"} description="Public storefront publish requires owner confirmation and passed gates." />
    </div>
    <section className="surface-card shopify-products-panel">
      {products.length ? <DataTable columns={["Draft", "Status", "Admin", "Storefront", "Sync"]} rows={products.map((product: any) => [
        product.shopify_handle ?? product.shopify_product_id ?? product.id,
        <StatusBadge key={`${product.id}-status`} status={product.shopify_status ?? product.sync_status ?? "draft"} tone={(product.shopify_status ?? "") === "active" ? "success" : "warning"} />,
        product.admin_url ? <a key={`${product.id}-admin`} href={product.admin_url} target="_blank" rel="noreferrer">Open admin</a> : "Unavailable",
        product.storefront_url ? <a key={`${product.id}-store`} href={product.storefront_url} target="_blank" rel="noreferrer">Open storefront</a> : "Hidden until publish",
        product.sync_status ?? "draft_created"
      ])} /> : <EmptyState
        title="No Shopify draft products yet"
        description="Shopify drafts are created after a product draft has approved media, variants, pricing, collection routing, and publish-review gates. Draft creation does not publish to the storefront."
        action={<div className="button-row"><a className="btn btn-primary" href="/studio/publish-review">Open Publish Review</a><a className="btn btn-secondary" href="/studio/setup">Open Setup</a></div>}
      />}
    </section>
    {products.length ? <ShopifyProductsClient refs={products as any[]} /> : null}
  </>;
}
