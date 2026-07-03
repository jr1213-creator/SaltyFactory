import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, CapabilityRequestPanel, DataTable, EmptyState, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function CapabilityRequestsPage() {
  const requests = await createRepositories().aiWorkforce.capabilityRequests.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="AI Capability Requests" description="Capability upgrades are owner-reviewed and cannot grant provider authority automatically." />
    <section className="surface-card">
      <h2>Request Capability</h2>
      <form className="form-grid" action="/api/studio/ai-employees/capability-requests" method="post">
        <label>Employee ID<input name="employeeId" defaultValue="employee_unknown" /></label>
        <label>Capability<input name="capabilityName" defaultValue="Provider blocker summarization" /></label>
        <label>Reason<textarea name="reasonNeeded" defaultValue="Improve handoff quality for provider setup blockers." /></label>
        <label>Requested permission<select name="requestedPermissionLevel"><option value="recommend">Recommend</option><option value="draft">Draft</option><option value="write_internal">Write internal</option><option value="provider_action_requested">Provider action requested</option></select></label>
        <button className="btn btn-primary" type="submit">Create Capability Request</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{requests.length ? <div className="layout-grid">{requests.map((request: any) => <CapabilityRequestPanel key={request.id} title={request.capability_name ?? request.capabilityName} status={String(request.status)}>
      <DataTable columns={["Employee", "Permission", "Risk", "Actions"]} rows={[[request.employee_id ?? request.employeeId, request.requested_permission_level ?? request.requestedPermissionLevel, request.risk_level ?? request.riskLevel, <span key="actions" className="action-bar"><form action={`/api/studio/ai-employees/capability-requests/${request.id}/approve`} method="post"><button className="btn btn-secondary">Approve</button></form><form action={`/api/studio/ai-employees/capability-requests/${request.id}/grant`} method="post"><button className="btn btn-primary">Grant Safe Scope</button></form></span>]]} />
      <ApprovalBadge status={String(request.status)} />
    </CapabilityRequestPanel>)}</div> : <EmptyState title="No capability requests" description="Capability requests created by employees or converted suggestions appear here." />}</section>
  </>;
}
