import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, ToolAccessPanel } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function ToolAccessRequestsPage() {
  const requests = await createRepositories().aiWorkforce.toolAccessRequests.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="AI Tool Access Requests" description="Tool access can be requested, but provider actions remain blocked unless a separate owner-gated workflow permits them." />
    <section className="surface-card">
      <h2>Request Tool Access</h2>
      <form className="form-grid" action="/api/studio/ai-employees/tool-access-requests" method="post">
        <label>Employee ID<input name="employeeId" defaultValue="employee_unknown" /></label>
        <label>Tool name<input name="toolName" defaultValue="Internal task creator" /></label>
        <label>Provider name<input name="providerName" placeholder="Leave blank for internal-only access" /></label>
        <label>Access level<select name="requestedAccessLevel"><option value="recommend">Recommend</option><option value="draft">Draft</option><option value="write_internal">Write internal</option><option value="provider_action_blocked">Provider action blocked</option></select></label>
        <label>Reason<textarea name="reasonNeeded" defaultValue="Create better internal handoff tasks." /></label>
        <button className="btn btn-primary" type="submit">Create Tool Access Request</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{requests.length ? <div className="layout-grid">{requests.map((request: any) => <ToolAccessPanel key={request.id} title={request.tool_name ?? request.toolName} status={String(request.status)}>
      <DataTable columns={["Employee", "Provider", "Access", "Actions"]} rows={[[request.employee_id ?? request.employeeId, request.provider_name ?? "internal", request.requested_access_level ?? request.requestedAccessLevel, <span key="actions" className="action-bar"><form action={`/api/studio/ai-employees/tool-access-requests/${request.id}/approve`} method="post"><button className="btn btn-secondary">Approve</button></form><form action={`/api/studio/ai-employees/tool-access-requests/${request.id}/grant`} method="post"><button className="btn btn-primary">Grant Safe Scope</button></form></span>]]} />
    </ToolAccessPanel>)}</div> : <EmptyState title="No tool access requests" description="Requests appear here and remain blocked from provider authority by default." />}</section>
  </>;
}
