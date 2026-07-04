import { DataTable, EmptyState, PageHeader, ProviderReadinessCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { ShopifyProductsClient } from "./ShopifyProductsClient";
import { getWorkspaceProviderReadiness, isProviderReady, providerCredentialSourceLabel } from "../_provider-readiness";

export default async function Page() {
  const { products } = await getStudioLists();
  const readiness = await getWorkspaceProviderReadiness();
  const shopify = readiness.providers.shopify;
  const livePublish = readiness.providers.live_publish;
  const shopifyReady = isProviderReady(shopify);
  const selectedCollection = String(shopify.providerMetadata?.selectedCollectionId ?? "");
  return <>
    <PageHeader title="Shopify Draft Products" description="Draft products created through the guarded Shopify Admin route. Storefront URLs appear only after explicit publish confirmation.">
      <a className="btn btn-primary" href="/studio/publish-review">Create Shopify Draft</a>
    </PageHeader>
    <div className="layout-grid layout-grid-3">
      <ProviderReadinessCard
        title="Shopify Admin"
        status={shopifyReady ? "connected" : "setup needed"}
        tone={shopifyReady ? "success" : "warning"}
        description={shopifyReady ? `Credential source: ${providerCredentialSourceLabel(shopify.credentialSource)}. ${selectedCollection ? "Default collection selected." : "Select a default collection before draft products are marked ready."}` : shopify.businessFacingSetupRequired.join(", ") || shopify.safeMessage}
        actionHref={shopify.setupRoute}
        actionLabel={shopifyReady ? "Review Shopify setup" : "Connect Shopify"}
      />
      <ProviderReadinessCard title="Draft Mode" status="required" tone="success" description="Products are created as drafts/unpublished by default." />
      <ProviderReadinessCard title="Live Publish" status={livePublish.status === "owner_gated" ? "owner gated" : "blocked by default"} tone={livePublish.status === "owner_gated" ? "warning" : "danger"} description={livePublish.safeMessage} />
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
