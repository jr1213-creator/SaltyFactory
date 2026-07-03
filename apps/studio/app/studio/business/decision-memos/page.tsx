import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, DecisionMemoPanel, EmptyState, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function DecisionMemosPage() {
  const memos = await createRepositories().business.decisionMemos.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Decision Memos" description="Owner-reviewable recommendations with evidence, assumptions, alternatives, and risks." />
    <section className="sf-card">
      <h2>Create Decision Memo</h2>
      <form className="sf-form-grid" action="/api/studio/business/decision-memos" method="post">
        <label>Title<input name="title" defaultValue="Product launch readiness decision" /></label>
        <label>Decision type<select name="decisionType"><option value="product_launch">Product launch</option><option value="marketing_budget">Marketing budget</option><option value="new_product_batch">New product batch</option></select></label>
        <label>Recommendation<textarea name="recommendation" defaultValue="Approve only after margins, provider setup, and owner gates are satisfied." /></label>
        <button className="sf-button sf-button-primary" type="submit">Save Decision Memo</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{memos.length ? <div className="sf-grid">{memos.map((memo: any) => <DecisionMemoPanel key={memo.id} title={memo.title}>
      <DataTable columns={["Type", "Decision", "Open"]} rows={[[memo.decision_type ?? memo.decisionType, <ApprovalBadge key="decision" status={String(memo.owner_decision ?? memo.ownerDecision)} />, <a key="open" className="sf-button sf-button-secondary" href={`/studio/business/decision-memos/${memo.id}`}>Review</a>]]} />
    </DecisionMemoPanel>)}</div> : <EmptyState title="No decision memos" description="Create a memo when business decisions need evidence and owner approval." />}</section>
  </>;
}
