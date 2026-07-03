import { createRepositories } from "@saltyfactory/db";
import { AiEmployeeResumePanel, ApprovalBadge, DataTable, GuardrailEditor, OwnerDecisionPanel, PageHeader, PermissionScopeMatrix } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiHiringRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repos = createRepositories();
  const request = await repos.aiWorkforce.hireRequests.getById(id, workspaceId);
  const spec = (await repos.aiWorkforce.roleSpecs.list()).find((row) => row.hire_request_id === id || row.hireRequestId === id) as any;
  if (!request) {
    return <PageHeader title="Hire request not found" description="This request does not exist in the active workspace." />;
  }
  const forbidden = spec?.forbidden_actions ?? spec?.forbiddenActions ?? [];
  return <>
    <PageHeader title={String(request.requested_role_title ?? request.requestedRoleTitle)} eyebrow="AI Hiring Desk" description={String(request.reason_needed ?? request.reasonNeeded)}><ApprovalBadge status={String(request.status)} /></PageHeader>
    <div className="layout-rail">
      <div className="layout-grid">
        <AiEmployeeResumePanel>
          <DataTable columns={["Field", "Value"]} rows={[
            ["Department", String(request.department)],
            ["Detected gap", String(request.detected_gap ?? request.detectedGap)],
            ["Business case", String(request.business_case ?? request.businessCase)],
            ["Mission", String(spec?.mission ?? "")],
            ["Prompt profile", String(spec?.prompt_profile ?? spec?.promptProfile ?? "")]
          ]} />
        </AiEmployeeResumePanel>
        <section className="surface-card">
          <h2>Role Specification</h2>
          <DataTable columns={["Section", "Items"]} rows={[
            ["Responsibilities", (spec?.responsibilities ?? []).join(", ")],
            ["Qualifications", (spec?.qualifications ?? []).join(", ")],
            ["Allowed tools", (spec?.allowed_tools ?? spec?.allowedTools ?? []).join(", ")],
            ["Allowed actions", (spec?.allowed_actions ?? spec?.allowedActions ?? []).join(", ")],
            ["Approval requirements", (spec?.approval_requirements ?? spec?.approvalRequirements ?? []).join(", ")],
            ["Test cases", (spec?.test_cases ?? spec?.testCases ?? []).join(", ")]
          ]} />
        </section>
      </div>
      <aside className="layout-grid">
        <GuardrailEditor>
          <ul>{forbidden.map((action: string) => <li key={action}>{action}</li>)}</ul>
        </GuardrailEditor>
        <PermissionScopeMatrix rows={[
          { scope: "workspace_records", level: "read", approval: "required" },
          { scope: "internal_drafts", level: "draft", approval: "required" },
          { scope: "provider_actions", level: "provider_action_blocked", approval: "required" }
        ]} />
        <OwnerDecisionPanel title="Owner Decision" description="Approval does not create provider authority. Create Employee is blocked until approved.">
          <form action={`/api/studio/ai-employees/hiring/${id}/approve`} method="post"><button className="btn btn-primary" type="submit">Approve</button></form>
          <form action={`/api/studio/ai-employees/hiring/${id}/needs-edits`} method="post"><button className="btn btn-secondary" type="submit">Needs Edits</button></form>
          <form action={`/api/studio/ai-employees/hiring/${id}/reject`} method="post"><button className="btn btn-danger" type="submit">Reject</button></form>
          <form action={`/api/studio/ai-employees/hiring/${id}/create-employee`} method="post"><button className="btn btn-primary" type="submit">Create Employee</button></form>
        </OwnerDecisionPanel>
      </aside>
    </div>
  </>;
}
