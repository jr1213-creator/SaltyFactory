import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, OwnerDecisionPanel, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function DecisionMemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memo = await createRepositories().business.decisionMemos.getById(id, workspaceId) as any;
  if (!memo) return <PageHeader title="Decision memo not found" description="This memo is not in the active workspace." />;
  return <>
    <PageHeader title={memo.title} eyebrow="Decision memo" description={memo.recommendation}><ApprovalBadge status={String(memo.owner_decision ?? memo.ownerDecision)} /></PageHeader>
    <div className="layout-rail">
      <section className="surface-card">
        <DataTable columns={["Field", "Value"]} rows={[
          ["Decision type", memo.decision_type ?? memo.decisionType],
          ["Risks", Array.isArray(memo.risks) ? memo.risks.join(", ") : ""],
          ["Alternatives", Array.isArray(memo.alternatives) ? memo.alternatives.join(", ") : ""],
          ["Owner approval", memo.required_owner_approval === false ? "No" : "Required"]
        ]} />
      </section>
      <OwnerDecisionPanel title="Owner Decision" description="Approval records the business decision only; it does not spend, publish, or change live provider state.">
        <form action={`/api/studio/business/decision-memos/${id}/approve`} method="post"><button className="btn btn-primary">Approve Memo</button></form>
        <form action={`/api/studio/business/decision-memos/${id}/reject`} method="post"><button className="btn btn-danger">Reject Memo</button></form>
      </OwnerDecisionPanel>
    </div>
  </>;
}
