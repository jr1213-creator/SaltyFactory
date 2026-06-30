import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { jobs } = await getStudioLists(); return <><h1>generate</h1>{jobs.length ? <section className="card"><p>{jobs.length} generation job records</p></section> : <EmptyState label="generation job" />}</>; }
