import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, OwnerDecisionPanel, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiImprovementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const suggestion = await createRepositories().aiWorkforce.improvementSuggestions.getById(id, workspaceId) as any;
  if (!suggestion) return <PageHeader title="Improvement not found" description="This suggestion is not in the active workspace." />;
  return <>
    <PageHeader title={suggestion.title} eyebrow="Improvement Review" description={suggestion.summary}><ApprovalBadge status={String(suggestion.status)} /></PageHeader>
    <div className="layout-rail">
      <section className="surface-card">
        <h2>Suggestion Detail</h2>
        <DataTable columns={["Field", "Value"]} rows={[
          ["Type", suggestion.suggestion_type ?? suggestion.suggestionType],
          ["Observed problem", suggestion.observed_problem ?? suggestion.observedProblem],
          ["Current behavior", suggestion.current_behavior ?? suggestion.currentBehavior],
          ["Proposed improvement", suggestion.proposed_improvement ?? suggestion.proposedImprovement],
          ["Business value", suggestion.business_value ?? suggestion.businessValue],
          ["Affected route/provider", `${suggestion.affected_route ?? "-"} / ${suggestion.affected_provider ?? "-"}`]
        ]} />
      </section>
      <OwnerDecisionPanel title="Owner Decision" description="Suggestions cannot self-implement. Convert creates owner-visible records.">
        <form action={`/api/studio/ai-employees/improvements/${id}/approve`} method="post"><button className="btn btn-primary" type="submit">Approve</button></form>
        <form action={`/api/studio/ai-employees/improvements/${id}/needs-edits`} method="post"><button className="btn btn-secondary" type="submit">Needs Edits</button></form>
        <form action={`/api/studio/ai-employees/improvements/${id}/reject`} method="post"><button className="btn btn-danger" type="submit">Reject</button></form>
        <form action={`/api/studio/ai-employees/improvements/${id}/convert-to-task`} method="post"><button className="btn btn-secondary" type="submit">Convert to Task</button></form>
        <form action={`/api/studio/ai-employees/improvements/${id}/convert-to-hire-request`} method="post"><button className="btn btn-secondary" type="submit">Convert to Hire Request</button></form>
        <form action={`/api/studio/ai-employees/improvements/${id}/convert-to-capability-request`} method="post"><button className="btn btn-secondary" type="submit">Convert to Capability Request</button></form>
      </OwnerDecisionPanel>
    </div>
  </>;
}
