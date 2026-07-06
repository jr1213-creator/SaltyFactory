import { ProductCard, ProductGrid, ProductImageGallery, StatusBadge, VariantSelector } from "@saltyfactory/ui";
import { structuredDataProductProjection } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { getProduct, getProducts } from "../../../../src/data";

export const dynamic = "force-dynamic";

type Product = { title?: unknown; description?: unknown; descriptionExcerpt?: unknown; price?: unknown; handle?: unknown; availableForSale?: unknown };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const cfg = parseEnv();
  const product = await getProduct(handle) as Product | null;
  const related = await getProducts();
  if (!product) {
    return <main className="store-page-hero"><h1>Product unavailable</h1><p>This custom storefront product was not found in Shopify read data or approved public projections.</p></main>;
  }
  const title = String(product.title ?? "Product");
  const description = String(product.description ?? product.descriptionExcerpt ?? "Storefront product details are read-only until Shopify checkout is configured.");
  const checkoutEnabled = cfg.providers.shopifyStorefront.enabled && product.availableForSale !== false;
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataProductProjection({ ...product, title, description })) }} />
      <section className="product-page">
        <div>
          <ProductImageGallery title={title} />
          <div className="store-tabs"><span>Details</span><span>Size Guide</span><span>FAQ</span></div>
          <p>{description}</p>
          <ul>
            <li>Product display uses Shopify Storefront/read data or approved projections</li>
            <li>No Shopify Admin token is exposed to the browser</li>
            <li>Custom designs stay customer-specific unless owner promotes them later</li>
          </ul>
        </div>
        <aside className="store-pdp-panel">
          <div className="button-row">
            <StatusBadge status="Headless storefront" tone="primary" />
            {checkoutEnabled ? <StatusBadge status="Checkout configured" tone="success" /> : <StatusBadge status="Checkout disabled" tone="warning" />}
          </div>
          <h1>{title}</h1>
          <p><strong>{String(product.price ?? "Review required")}</strong></p>
          <p>{description}</p>
          <VariantSelector label="Color" options={["Sand", "Ivory", "Navy"]} />
          <VariantSelector label="Size" options={["S", "M", "L", "XL", "2XL", "3XL"]} />
          <button className="store-button store-button-primary w-full" disabled={!checkoutEnabled}>
            {checkoutEnabled ? "Continue to checkout" : "Checkout unavailable"}
          </button>
          <section className="store-card">
            <h2>Related products</h2>
            <ProductGrid>
              {related.filter((item: any) => item.handle !== handle).slice(0, 3).map((item: any) => (
                <a key={item.id ?? item.title} href={`/store/products/${item.handle}`}>
                  <ProductCard title={item.title ?? "Related product"} price={item.price ?? "Review required"} />
                </a>
              ))}
            </ProductGrid>
          </section>
        </aside>
      </section>
    </main>
  );
}
