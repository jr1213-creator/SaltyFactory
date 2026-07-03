import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getProducts } from "../src/data";

export const dynamic = "force-dynamic";

const demoProducts = [
  { title: "Sunset Vibes Tee", price: "From $26.00" },
  { title: "Coastal Cowboy Sweatshirt", price: "From $46.00" },
  { title: "Seaside Rope Hat", price: "From $28.00" },
  { title: "Ranch Therapy Tote", price: "From $24.00" },
  { title: "Salty Soul Sticker", price: "From $4.00" }
];

export default async function Home() {
  const config = parseEnv();
  const products = await getProducts();
  const allowDemo = config.APP_ENV !== "production";
  const display = products.length ? products : allowDemo
    ? demoProducts.map((product, index) => ({ ...product, id: `demo_${index}`, handle: "demo-product", description: "Development preview. Non-live products appear here only outside production." }))
    : [];
  return <main>
    <section className="store-hero"><div className="store-hero-copy"><p className="eyebrow">Coastal roots. Western soul.</p><h1>Where the sea meets the ranch</h1><p>Premium print-on-demand apparel and accessories inspired by the coast, the desert, and the ride in between.</p><div className="button-row"><a className="store-button store-button-primary" href="/collections">Shop New Arrivals</a><a className="store-button store-button-secondary" href="/drops">Explore Collections</a></div></div><div className="store-hero-art" aria-hidden="true" /></section>
    <section className="trust-row">{["Approved Public Catalog","Made to Order When Configured","Checkout Requires Provider Setup","Private Studio Data Hidden","Human-Reviewed Listings"].map((item) => <div key={item}><strong>{item}</strong><span>Public storefront content stays projection-safe.</span></div>)}</section>
    <section className="store-section"><div className="store-section-header"><h2>New Arrivals</h2><a href="/collections">View all</a></div>{display.length ? <ProductGrid>{display.map((product: any) => <a key={product.id ?? product.title} href={`/products/${product.handle ?? "demo-product"}`}><ProductCard title={product.title} price={product.price ?? "Review required"} description={product.description} badge={products.length ? "Approved" : "Development preview"} /></a>)}</ProductGrid> : <div className="store-empty"><strong>No approved public products yet</strong><p>Products appear here only after approval, publish gates, and public projection setup.</p></div>}</section>
    <section className="commerce-grid store-section"><div><h2>Featured Collections</h2><div className="store-empty"><strong>Collections pending approved products</strong><p>Collection cards publish only after approved public product projections exist.</p></div></div><div><h2>Fresh Drops & Stories</h2><div className="story-grid"><article className="story-card"><h3>Built for the Coast & Beyond</h3><p>Editorial content hub prepared for search-safe product stories.</p></article><article className="story-card"><h3>Ranch Roots Collection</h3><p>Heritage-inspired content appears after approval.</p></article><article className="story-card"><h3>Summer Essentials</h3><p>Public collection copy stays separate from private Studio data.</p></article><article className="story-card"><h3>AI-Ready Content Hub</h3><p>Schema-ready content remains public-only and does not expose factory data.</p></article></div></div><aside><h2>Top POD Products</h2><p className="muted">Live rankings require Shopify analytics. Demo rankings are not shown as revenue.</p></aside></section>
  </main>;
}
