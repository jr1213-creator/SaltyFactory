import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { assets } = await getStudioLists(); return <><h1>assets</h1>{assets.length ? <section className="card"><p>{assets.length} asset records</p></section> : <EmptyState label="asset" />}</>; }
