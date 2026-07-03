import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, TrainingRequestPanel } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function TrainingRequestsPage() {
  const requests = await createRepositories().aiWorkforce.trainingRequests.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="AI Training Requests" description="Training requests persist validation tests and require owner approval before completion." />
    <section className="surface-card">
      <h2>Request Training</h2>
      <form className="form-grid" action="/api/studio/ai-employees/training-requests" method="post">
        <label>Employee ID<input name="employeeId" defaultValue="employee_unknown" /></label>
        <label>Training topic<input name="trainingTopic" defaultValue="Provider readiness model" /></label>
        <label>Reason<textarea name="reasonNeeded" defaultValue="Improve blocker diagnosis and owner handoff quality." /></label>
        <label>Desired outcome<textarea name="desiredOutcome" defaultValue="Employee can draft clearer setup requirements without provider authority." /></label>
        <button className="btn btn-primary" type="submit">Create Training Request</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{requests.length ? <div className="layout-grid">{requests.map((request: any) => <TrainingRequestPanel key={request.id} title={request.training_topic ?? request.trainingTopic} status={String(request.status)}>
      <DataTable columns={["Employee", "Gap", "Actions"]} rows={[[request.employee_id ?? request.employeeId, request.current_gap ?? request.currentGap, <span key="actions" className="action-bar"><form action={`/api/studio/ai-employees/training-requests/${request.id}/approve`} method="post"><button className="btn btn-secondary">Approve</button></form><form action={`/api/studio/ai-employees/training-requests/${request.id}/complete`} method="post"><button className="btn btn-primary">Complete</button></form></span>]]} />
    </TrainingRequestPanel>)}</div> : <EmptyState title="No training requests" description="Employee education requests appear here for owner approval." />}</section>
  </>;
}
