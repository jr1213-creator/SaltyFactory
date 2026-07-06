import { getCustomerPurchaseLinkDetail } from "@saltyfactory/ai-free";
import { createRepositories } from "@saltyfactory/db";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false }
};

function storefrontWorkspaceId() {
  const configured = process.env.STOREFRONT_WORKSPACE_ID?.trim();
  if (configured) return configured;
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") return "";
  return "wks_default";
}

export default async function Page({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams?: Promise<{ accessToken?: string }> }) {
  const { handle } = await params;
  const accessToken = (await searchParams)?.accessToken ?? "";
  const workspaceId = storefrontWorkspaceId();
  const detail = workspaceId && accessToken
    ? await getCustomerPurchaseLinkDetail({ repos: createRepositories(), workspaceId, handle, accessToken }).catch(() => null)
    : null;

  if (!detail) {
    return (
      <main>
        <section className="store-page-hero">
          <h1>Private Custom Purchase Link</h1>
          <p>This customer-specific path requires the private access link from the original design chat.</p>
        </section>
        <section className="store-section">
          <div className="store-empty">
            <strong>Access required</strong>
            <p>No customer-specific product details are shown without a valid private access token.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="store-page-hero">
        <h1>Private Custom Purchase Link</h1>
        <p>This customer-specific path is unlisted and not promoted to the public catalog.</p>
      </section>
      <section className="store-section">
        <div className="store-empty">
          <strong>{String(detail.candidate?.title ?? handle)}</strong>
          <p>{String(detail.candidate?.concept_summary ?? "Customer-specific custom design.")}</p>
          <p>Purchase URL mode: {detail.job.purchaseUrlMode}. Live Shopify checkout is shown only when a real checkout URL exists.</p>
          {detail.job.purchaseUrlMode === "shopify_product_link" && detail.product.purchase_url ? (
            <a className="store-button store-button-primary" href={String(detail.product.purchase_url)}>Open Shopify product link</a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
