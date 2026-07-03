import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, EmptyState, ImprovementSuggestionCard, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiImprovementsPage() {
  const repos = createRepositories();
  const suggestions = await repos.aiWorkforce.improvementSuggestions.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="AI Continuous Improvement Desk" eyebrow="Self-improving, not self-modifying" description="AI employees can suggest workflow, capability, training, tool-access, handoff, and test improvements. Owner review is required before action." />
    <section className="sf-card">
      <h2>Create Improvement Suggestion</h2>
      <form className="sf-form-grid" action="/api/studio/ai-employees/improvements" method="post">
        <label>Type<select name="suggestionType"><option value="workflow_improvement_request">Workflow improvement</option><option value="new_ai_employee_request">New AI employee</option><option value="tool_access_request">Tool access</option><option value="test_coverage_request">Test coverage</option><option value="provider_integration_request">Provider integration</option></select></label>
        <label>Title<input name="title" defaultValue="Repeated provider blocker handoff" /></label>
        <label>Observed problem<textarea name="observedProblem" defaultValue="The same setup blocker appears multiple times and the next owner action is unclear." /></label>
        <label>Affected workflow<input name="affectedWorkflow" defaultValue="POD provider workflow" /></label>
        <label>Proposed improvement<textarea name="proposedImprovement" defaultValue="Create an owner-reviewed setup checklist and task conversion for this blocker." /></label>
        <label>Business value<textarea name="businessValue" defaultValue="Reduces repeated manual rework without granting autonomous provider authority." /></label>
        <button className="sf-button sf-button-primary" type="submit">Submit Suggestion</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>
      {suggestions.length ? <div className="sf-grid">{suggestions.map((suggestion: any) => <ImprovementSuggestionCard key={suggestion.id} title={suggestion.title} status={String(suggestion.status)}>
        <p>{suggestion.summary}</p>
        <DataTable columns={["Workflow", "Decision", "Open"]} rows={[[suggestion.affected_workflow ?? suggestion.affectedWorkflow, <ApprovalBadge key="status" status={String(suggestion.owner_decision ?? suggestion.ownerDecision ?? "pending")} />, <a key="open" className="sf-button sf-button-secondary" href={`/studio/ai-employees/improvements/${suggestion.id}`}>Review</a>]]} />
      </ImprovementSuggestionCard>)}</div> : <EmptyState title="No improvement suggestions" description="Submitted suggestions appear here for owner review." />}
    </section>
  </>;
}
