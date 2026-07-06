import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getCollectionProducts } from "../../../../src/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const products = await getCollectionProducts(handle);
  const label = handle.replaceAll("-", " ");
  return (
    <main>
      <section className="store-page-hero">
        <h1>{label}</h1>
        <p>Collection-style browsing for the custom headless storefront. Products remain read-only unless Shopify checkout is configured.</p>
      </section>
      <section className="store-section">
        {products.length ? (
          <ProductGrid>
            {products.map((product: any) => (
              <a key={product.id ?? product.handle ?? product.title} href={`/store/products/${product.handle}`}>
                <ProductCard title={product.title} price={product.price ?? "Review required"} badge="Storefront" />
              </a>
            ))}
          </ProductGrid>
        ) : (
          <div className="store-empty">
            <strong>No products in this collection yet</strong>
            <p>Collection data appears only from Shopify read APIs or approved public projections.</p>
          </div>
        )}
      </section>
    </main>
  );
}
