import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { clusters } = await getStudioLists(); return <><h1>clusters</h1>{clusters.length ? <section className="card"><p>{clusters.length} cluster records</p></section> : <EmptyState label="cluster" />}</>; }
