import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { briefs } = await getStudioLists(); return <><h1>briefs</h1>{briefs.length ? <section className="card"><p>{briefs.length} brief records</p></section> : <EmptyState label="brief" />}</>; }
