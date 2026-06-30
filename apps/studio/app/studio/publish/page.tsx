import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { publishReviews } = await getStudioLists(); return <><h1>publish</h1>{publishReviews.length ? <section className="card"><p>{publishReviews.length} publish review records</p></section> : <EmptyState label="publish review" />}</>; }
