import { fixtures, evaluatePublishReviewGates } from "@saltyfactory/domain";
export default async function Page({ params }: { params: Promise<Record<string, string>> }) {
  const p = await params;
  const evaln = evaluatePublishReviewGates(fixtures.publishReviewBlocked);
  return <><h1>Product draft detail</h1><section className="card"><pre>{JSON.stringify(p, null, 2)}</pre><pre>{JSON.stringify(evaln, null, 2)}</pre></section></>;
}