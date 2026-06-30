import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { phrases } = await getStudioLists(); return <><h1>phrases</h1>{phrases.length ? <section className="card"><p>{phrases.length} phrase records</p></section> : <EmptyState label="phrase" />}</>; }
