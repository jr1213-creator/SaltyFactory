import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { mockups } = await getStudioLists(); return <><h1>mockups</h1>{mockups.length ? <section className="card"><p>{mockups.length} mockup records</p></section> : <EmptyState label="mockup" />}</>; }
