import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getProducts } from "../../../src/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getProducts();
  return (
    <main>
      <section className="store-page-hero">
        <h1>Store Products</h1>
        <p>Custom SaltyFactory storefront rendering from Shopify Storefront/read data or approved public projections.</p>
      </section>
      <section className="store-section">
        {products.length ? (
          <ProductGrid>
            {products.map((product: any) => (
              <a key={product.id ?? product.handle ?? product.title} href={`/store/products/${product.handle}`}>
                <ProductCard title={product.title} price={product.price ?? "Review required"} description={product.description ?? product.descriptionExcerpt} badge={product.availableForSale === false ? "Unavailable" : "Storefront"} />
              </a>
            ))}
          </ProductGrid>
        ) : (
          <div className="store-empty">
            <strong>No storefront products found</strong>
            <p>Missing Shopify config fails closed without exposing Admin credentials.</p>
          </div>
        )}
      </section>
    </main>
  );
}
