import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getProducts } from "../../src/data";
import { CustomerDesignConcierge } from "./custom/CustomerDesignConcierge";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getProducts();
  return (
    <main>
      <section className="store-hero">
        <div className="store-hero-copy">
          <p className="eyebrow">Custom headless storefront</p>
          <h1>Shop SaltyFactory products and request a private custom design</h1>
          <p>Product cards render through SaltyFactory’s storefront UI from Shopify Storefront/read data or approved public projections.</p>
          <div className="button-row">
            <a className="store-button store-button-primary" href="/store/products">Browse products</a>
            <a className="store-button store-button-secondary" href="/store/custom">Start a custom design</a>
          </div>
        </div>
        <div className="store-hero-art" aria-hidden="true" />
      </section>
      <section className="store-section">
        <div className="store-section-header">
          <h2>Store products</h2>
          <a href="/store/products">View all</a>
        </div>
        {products.length ? (
          <ProductGrid>
            {products.slice(0, 8).map((product: any) => (
              <a key={product.id ?? product.handle ?? product.title} href={`/store/products/${product.handle}`}>
                <ProductCard title={product.title} price={product.price ?? "Review required"} description={product.description ?? product.descriptionExcerpt} badge={product.availableForSale === false ? "Unavailable" : "Storefront"} />
              </a>
            ))}
          </ProductGrid>
        ) : (
          <div className="store-empty">
            <strong>Storefront products unavailable</strong>
            <p>Connect Shopify Storefront/read API or approve public projections to populate this custom storefront.</p>
          </div>
        )}
      </section>
      <section className="store-section">
        <CustomerDesignConcierge />
      </section>
    </main>
  );
}
