import { ProductCard, ProductGrid } from "@saltyfactory/ui";
import { getProducts } from "../../../src/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getProducts();
  return <main><section className="store-page-hero"><h1>{slug.replaceAll("-", " ")}</h1><p>Approved public products only. Private factory signals are not exposed.</p></section><section className="store-section">{products.length ? <ProductGrid>{products.map((product: any) => <a key={product.id} href={`/products/${product.handle}`}><ProductCard title={product.title} price={product.price ?? "Review required"} badge="Approved" /></a>)}</ProductGrid> : <div className="store-empty"><strong>No approved products yet</strong><p>This collection will populate after human approval and publish gates pass.</p></div>}</section></main>;
}
