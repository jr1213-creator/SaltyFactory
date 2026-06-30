import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { drafts } = await getStudioLists(); return <><h1>drafts</h1>{drafts.length ? <section className="card"><p>{drafts.length} draft records</p></section> : <EmptyState label="draft" />}</>; }
