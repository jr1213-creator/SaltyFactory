import { createRepositories } from "@saltyfactory/db";
import { AuthorityRequestPanel, DataTable, EmptyState, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessAuthorityRequestsPage() {
  const requests = await createRepositories().business.authorityRequests.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Authority Requests" description="One-time/time-limited owner approvals for sensitive business identity, EIN document use, bank summaries, and print packets." />
    <section className="surface-card">
      <h2>Create Authority Request</h2>
      <form className="form-grid" action="/api/studio/business/authority-requests" method="post">
        <label>Authority type<select name="authorityType"><option value="use_ein_in_document">Use EIN in document</option><option value="access_bank_summary">Access bank summary</option><option value="prepare_order_packet">Prepare order packet</option></select></label>
        <label>Reason<textarea name="reasonNeeded" defaultValue="Document-only sensitive use requires owner approval." /></label>
        <label>Proposed use<textarea name="proposedUse" defaultValue="One-time owner-reviewed document generation." /></label>
        <button className="btn btn-primary" type="submit">Create Authority Request</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{requests.length ? <div className="layout-grid">{requests.map((request: any) => <AuthorityRequestPanel key={request.id} title={request.authority_type ?? request.authorityType} status={String(request.status)}>
      <DataTable columns={["Fields", "Risk", "Expires", "Actions"]} rows={[[Array.isArray(request.fields_requested) ? request.fields_requested.join(", ") : "", request.risk_level ?? request.riskLevel, request.expires_at ?? request.expiresAt ?? "not approved", <span key="actions" className="action-bar"><form action={`/api/studio/business/authority-requests/${request.id}/approve`} method="post"><button className="btn btn-primary">Approve</button></form><form action={`/api/studio/business/authority-requests/${request.id}/reject`} method="post"><button className="btn btn-danger">Reject</button></form><form action={`/api/studio/business/authority-requests/${request.id}/expire`} method="post"><button className="btn btn-secondary">Expire</button></form></span>]]} />
    </AuthorityRequestPanel>)}</div> : <EmptyState title="No authority requests" description="Sensitive document and banking actions create requests here." />}</section>
  </>;
}
