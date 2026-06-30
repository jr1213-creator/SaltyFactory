import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getProducts } from "../../src/data";

export default async function Page() {
  const products = await getProducts();
  return <main><section className="sf-page-hero"><h1>Collections</h1><p>Coastal western capsules built from approved public product projections only.</p></section><section className="sf-section"><ProductGrid>{products.length ? products.map((product:any)=><ProductCard key={product.id} title={product.title} price={product.price ?? "Review required"} badge="Approved" />) : ["Coastal Classics","Desert Drifter","Ranch Life"].map((title)=><ProductCard key={title} title={title} description="Development collection preview. Live products appear after approval." badge="Demo" />)}</ProductGrid></section></main>;
}
