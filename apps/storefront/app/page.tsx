import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getProducts } from "../src/data";

const demoProducts = [
  { title: "Sunset Vibes Tee", price: "From $26.00" },
  { title: "Coastal Cowboy Sweatshirt", price: "From $46.00" },
  { title: "Seaside Rope Hat", price: "From $28.00" },
  { title: "Ranch Therapy Tote", price: "From $24.00" },
  { title: "Salty Soul Sticker", price: "From $4.00" }
];

export default async function Home() {
  const products = await getProducts();
  const display = products.length ? products : demoProducts.map((product, index) => ({ ...product, id: `demo_${index}`, handle: "demo-product", description: "Development preview. Live products appear after approval." }));
  return <main>
    <section className="sf-hero"><div className="sf-hero-copy"><p className="eyebrow">Coastal roots. Western soul.</p><h1>Where the sea meets the ranch</h1><p>Premium print-on-demand apparel and accessories inspired by the coast, the desert, and the ride in between.</p><div className="sf-button-row"><a className="sf-button sf-button-primary" href="/collections">Shop New Arrivals</a><a className="sf-button sf-button-secondary" href="/drops">Explore Collections</a></div></div><div className="sf-hero-art" aria-hidden="true" /></section>
    <section className="sf-trust-row">{["Premium Quality","Made to Order","Secure Checkout","Free Shipping $75+","Happiness Guarantee"].map((item) => <div key={item}><strong>{item}</strong><span>Thoughtful, safe, and production-aware.</span></div>)}</section>
    <section className="sf-section"><div className="sf-section-header"><h2>New Arrivals</h2><a href="/collections">View all</a></div><ProductGrid>{display.map((product: any) => <a key={product.id ?? product.title} href={`/products/${product.handle ?? "demo-product"}`}><ProductCard title={product.title} price={product.price ?? "Review required"} description={product.description} badge={products.length ? "Approved" : "Demo"} /></a>)}</ProductGrid></section>
    <section className="sf-commerce-grid sf-section"><div><h2>Featured Collections</h2><div className="sf-list-card">{["Coastal Classics","Desert Drifter","Ranch Life","Sunset State"].map((name) => <div className="sf-list-item" key={name}><ProductCard title={name} /><div><strong>{name}</strong><p className="muted">Approved products appear here when available.</p></div></div>)}</div></div><div><h2>Fresh Drops & Stories</h2><div className="sf-story-grid"><article className="sf-story"><h3>Built for the Coast & Beyond</h3><p>Editorial content hub prepared for search-safe product stories.</p></article><article className="sf-story"><h3>Ranch Roots Collection</h3><p>Heritage-inspired pieces that honor the land.</p></article><article className="sf-story"><h3>Summer Essentials</h3><p>Lightweight layers for vacation-ready western days.</p></article><article className="sf-story"><h3>AI-Ready Content Hub</h3><p>Schema-ready content remains public-only and does not expose factory data.</p></article></div></div><aside><h2>Top POD Products</h2><p className="muted">Live rankings require Shopify analytics. Demo rankings are not shown as revenue.</p></aside></section>
  </main>;
}
