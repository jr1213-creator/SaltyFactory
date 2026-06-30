import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { products } = await getStudioLists(); return <><h1>products</h1>{products.length ? <section className="card"><p>{products.length} product ref records</p></section> : <EmptyState label="product ref" />}</>; }
