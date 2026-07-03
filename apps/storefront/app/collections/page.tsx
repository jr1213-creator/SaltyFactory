import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getProducts } from "../../src/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getProducts();
  return <main><section className="store-page-hero"><h1>Collections</h1><p>Coastal western capsules built from approved public product projections only.</p></section><section className="store-section">{products.length ? <ProductGrid>{products.map((product:any)=><ProductCard key={product.id} title={product.title} price={product.price ?? "Review required"} badge="Approved" />)}</ProductGrid> : <div className="store-empty"><strong>No approved public collections yet</strong><p>Collections appear only after products pass approval, publish gates, and public projection setup.</p></div>}</section></main>;
}
