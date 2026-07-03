import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, EmptyState, HiringRequestCard, PageHeader, SourceLabel } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiHiringDeskPage() {
  const repos = createRepositories();
  const requests = await repos.aiWorkforce.hireRequests.listByWorkspace(workspaceId);
  const specs = await repos.aiWorkforce.roleSpecs.list();
  const specFor = (id: string) => specs.find((spec) => spec.hire_request_id === id || spec.hireRequestId === id);
  return <>
    <PageHeader title="AI Hiring Desk" eyebrow="Owner-gated workforce expansion" description="AI employees can propose missing roles, but Jennie must approve guardrails before a new setup-needed employee definition is created." />
    <section className="sf-card">
      <h2>Propose New AI Employee</h2>
      <form className="sf-form-grid" action="/api/studio/ai-employees/hiring/propose" method="post">
        <label>Role title<input name="requestedRoleTitle" defaultValue="Provider Readiness Auditor" /></label>
        <label>Department<input name="department" defaultValue="AI Operations" /></label>
        <label>Detected gap<input name="detectedGap" defaultValue="missing_provider_readiness_handoff" /></label>
        <label>Reason needed<textarea name="reasonNeeded" defaultValue="The workflow needs a specialist that explains blockers and prepares owner-reviewed handoffs without provider authority." /></label>
        <label>Business case<textarea name="businessCase" defaultValue="Reduce repeated owner setup confusion while keeping publish, spend, send, and sync gates intact." /></label>
        <button className="sf-button sf-button-primary" type="submit">Create Hire Request</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>
      {requests.length ? <div className="sf-grid">{requests.map((request: any) => {
        const spec = specFor(request.id) as any;
        return <HiringRequestCard key={request.id} title={request.requested_role_title ?? request.requestedRoleTitle} status={String(request.status)}>
          <p>{request.reason_needed ?? request.reasonNeeded}</p>
          <p><SourceLabel label={request.department ?? "AI Operations"} /> <ApprovalBadge status={String(request.status)} /></p>
          <DataTable columns={["Mission", "Forbidden actions", "Open"]} rows={[[spec?.mission ?? "Role spec pending", (spec?.forbidden_actions ?? spec?.forbiddenActions ?? []).slice(0, 8).join(", "), <a className="sf-button sf-button-secondary" href={`/studio/ai-employees/hiring/${request.id}`} key="open">Review</a>]]} />
        </HiringRequestCard>;
      })}</div> : <EmptyState title="No hire requests" description="Create a hire request when a real workflow gap needs a new owner-approved AI role." />}
    </section>
  </>;
}
