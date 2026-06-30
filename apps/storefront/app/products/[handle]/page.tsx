import { ProductCard, ProductGrid, ProductImageGallery, StatusBadge, VariantSelector } from "@saltyfactory/ui";
import { structuredDataProductProjection } from "@saltyfactory/commerce";
import { getProduct, getProducts } from "../../../src/data";

type Product = { title?: unknown; description?: unknown; price?: unknown; handle?: unknown };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = (await getProduct(handle) as Product | null) ?? (handle === "demo-product" ? { title: "Coastal Cowboy Tee", description: "Development preview product. Live storefront products appear only after approval.", price: "$32.00", handle } : null);
  const related = await getProducts();
  if (!product) return <main className="sf-page-hero"><h1>Product unavailable</h1><p>This product is not approved for the public storefront.</p></main>;
  const title = String(product.title ?? "Product");
  const description = String(product.description ?? "Premium coastal western apparel prepared for review.");
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataProductProjection({ ...product, title, description })) }} />
    <section className="sf-product-page">
      <div><ProductImageGallery title={title} /><div className="sf-tabs"><span>Details</span><span>Size Guide</span><span>Reviews</span><span>FAQ</span></div><p>{description}</p><ul><li>Made to order after approved listing setup</li><li>Soft premium blanks selected for comfort</li><li>Secure checkout through configured commerce provider</li></ul></div>
      <aside className="sf-pdp-panel"><div className="sf-button-row"><StatusBadge status="Bestseller" tone="warning" /><StatusBadge status="AI-Ready" tone="primary" /><StatusBadge status="Free shipping $75+" tone="success" /></div><h1>{title}</h1><p><strong>{String(product.price ?? "$32.00")}</strong> <span className="sf-rating">★★★★★ 4.9</span></p><p>{description}</p><VariantSelector label="Color" options={["Sand","Ivory","Navy"]} /><VariantSelector label="Size" options={["S","M","L","XL","2XL","3XL"]} /><VariantSelector label="Fit" options={["Unisex Classic","Relaxed Fit"]} /><VariantSelector label="Quantity" options={["-","1","+"]} /><button className="sf-button sf-button-primary" style={{ width: "100%" }}>Add to Cart</button><div className="sf-pdp-trust"><span>Free shipping over $75</span><span>Easy returns</span><span>Secure checkout</span></div><section className="sf-card"><h2>Complete the look</h2><ProductGrid>{related.slice(0,3).map((item:any)=> <ProductCard key={item.id ?? item.title} title={item.title ?? "Related product"} price={item.price ?? "Review required"} />)}</ProductGrid></section></aside>
    </section>
  </main>;
}
