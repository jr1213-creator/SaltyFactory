import { EmptyState, getStudioLists } from "../data";
export default async function Page() { const { trends } = await getStudioLists(); return <><h1>trends</h1>{trends.length ? <section className="card"><p>{trends.length} trend records</p></section> : <EmptyState label="trend" />}</>; }
