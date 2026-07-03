import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

export default async function ServiceCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const data = await getCustomerCommandCenterData();
  const serviceCase = data.serviceCases.find((item: any) => String(item.id) === caseId) as any;
  if (!serviceCase && data.ok) notFound();
  const tasks = data.tasks.filter((task: any) => String(task.service_case_id ?? task.serviceCaseId ?? task.case_id ?? task.caseId ?? "") === caseId || (task.entity_type === "service_case" && task.entity_id === caseId));
  const notes = data.notes.filter((note: any) => String(note.service_case_id ?? note.serviceCaseId ?? note.case_id ?? note.caseId ?? "") === caseId || (note.entity_type === "service_case" && note.entity_id === caseId));
  return <>
    <PageHeader eyebrow="Service case" title={serviceCase?.subject ?? "Service case"} description="Manual support case tracking with source labels, notes, tasks, and status history.">
      <LinkButton href="/studio/service-cases" variant="secondary">All Service Cases</LinkButton>
      <LinkButton href={`/studio/service-cases/${caseId}/edit`} variant="secondary">Edit Case</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Subject", serviceCase?.subject ?? "-"],
        ["Status", <StatusBadge key="status" status={String(serviceCase?.status ?? "open").replace(/_/g, " ")} />],
        ["Priority", <StatusBadge key="priority" status={String(serviceCase?.priority ?? "normal").replace(/_/g, " ")} />],
        ["Customer", serviceCase?.customer_id ?? serviceCase?.customerId ?? "-"],
        ["Issue type", serviceCase?.issue_type ?? serviceCase?.issueType ?? "general"],
        ["Channel", serviceCase?.channel ?? "manual"],
        ["Resolution notes", serviceCase?.resolution_notes ?? serviceCase?.resolutionNotes ?? "-"],
        ["Source", data.sourceLabelFor(serviceCase?.source_label ?? serviceCase?.sourceLabel)]
      ]} />
    </section>
    <div className="layout-grid layout-grid-2" style={{ marginTop: 18 }}>
      <section className="surface-card">
        <h2>Case Tasks</h2>
        <DataTable columns={["Task", "Status", "Priority"]} rows={tasks.length ? tasks.map((task: any) => [task.title, task.status ?? "open", task.priority ?? "normal"]) : [["No tasks", "Create a follow-up task for this case.", "-"]]} />
        <form className="layout-grid" action="/api/studio/shared/tasks" method="post">
          <input type="hidden" name="next" value={`/studio/service-cases/${caseId}`} />
          <input type="hidden" name="entity_type" value="service_case" />
          <input type="hidden" name="entity_id" value={caseId} />
          <label>Task title<input name="title" defaultValue="Follow up on service case" required /></label>
          <button className="btn" type="submit">Create Task</button>
        </form>
      </section>
      <section className="surface-card">
        <h2>Case Notes</h2>
        <DataTable columns={["Note", "Source"]} rows={notes.length ? notes.map((note: any) => [note.title ?? note.body, data.sourceLabelFor(note.source_label ?? note.sourceLabel)]) : [["No notes", "Add resolution context."]]} />
        <form className="layout-grid" action="/api/studio/shared/notes" method="post">
          <input type="hidden" name="next" value={`/studio/service-cases/${caseId}`} />
          <input type="hidden" name="entity_type" value="service_case" />
          <input type="hidden" name="entity_id" value={caseId} />
          <label>Note<textarea name="body" required /></label>
          <button className="btn" type="submit">Save Note</button>
        </form>
      </section>
    </div>
  </>;
}
