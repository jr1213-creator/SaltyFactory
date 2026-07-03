import { ProductCard, ProductGrid, ProductImageGallery, StatusBadge, VariantSelector } from "@saltyfactory/ui";
import { structuredDataProductProjection } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { getProduct, getProducts } from "../../../src/data";

export const dynamic = "force-dynamic";

type Product = { title?: unknown; description?: unknown; price?: unknown; handle?: unknown; demo?: unknown };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const cfg = parseEnv();
  const allowDemo = cfg.APP_ENV !== "production" && handle === "demo-product";
  const product = (await getProduct(handle) as Product | null) ?? (allowDemo
    ? {
      title: "Coastal Cowboy Tee",
      description: "Development preview product. Live storefront products appear only after approval.",
      price: "$32.00",
      handle,
      demo: true
    }
    : null);
  const related = await getProducts();
  if (!product) return <main className="store-page-hero"><h1>Product unavailable</h1><p>This product is not approved for the public storefront.</p></main>;
  const title = String(product.title ?? "Product");
  const description = String(product.description ?? "Premium coastal western apparel prepared for review.");
  const checkoutEnabled = cfg.providers.shopifyStorefront.enabled;
  const isDemo = Boolean(product.demo);
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataProductProjection({ ...product, title, description })) }} />
    <section className="product-page">
      <div>
        <ProductImageGallery title={title} />
        <div className="store-tabs"><span>Details</span><span>Size Guide</span><span>Reviews</span><span>FAQ</span></div>
        <p>{description}</p>
        <ul>
          <li>Made to order after approved listing setup</li>
          <li>Soft premium blanks selected for comfort</li>
          <li>Secure checkout appears only when a commerce provider is configured</li>
        </ul>
      </div>
      <aside className="store-pdp-panel">
        <div className="button-row">
          {isDemo ? <StatusBadge status="Development preview" tone="warning" /> : <StatusBadge status="Approved public product" tone="success" />}
          <StatusBadge status="AI-readable content prepared" tone="primary" />
          {checkoutEnabled ? <StatusBadge status="Checkout configured" tone="success" /> : <StatusBadge status="Checkout disabled" tone="warning" />}
        </div>
        <h1>{title}</h1>
        <p><strong>{String(product.price ?? "$32.00")}</strong></p>
        <p>{description}</p>
        <VariantSelector label="Color" options={["Sand", "Ivory", "Navy"]} />
        <VariantSelector label="Size" options={["S", "M", "L", "XL", "2XL", "3XL"]} />
        <VariantSelector label="Fit" options={["Unisex Classic", "Relaxed Fit"]} />
        <VariantSelector label="Quantity" options={["-", "1", "+"]} />
        <button className="store-button store-button-primary w-full" disabled={!checkoutEnabled || isDemo}>
          {checkoutEnabled && !isDemo ? "Add to Cart" : "Checkout unavailable"}
        </button>
        <div className="pdp-trust"><span>Shipping and returns appear after checkout setup</span><span>Secure checkout requires configured commerce provider</span></div>
        <section className="store-card"><h2>Complete the look</h2><ProductGrid>{related.slice(0, 3).map((item: any) => <ProductCard key={item.id ?? item.title} title={item.title ?? "Related product"} price={item.price ?? "Review required"} />)}</ProductGrid></section>
      </aside>
    </section>
  </main>;
}
