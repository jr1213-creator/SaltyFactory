import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const data = await getCustomerCommandCenterData();
  const lead = data.leads.find((item: any) => String(item.id) === leadId) as any;
  if (!lead && data.ok) notFound();
  const tasks = data.tasks.filter((task: any) => String(task.lead_id ?? task.leadId ?? "") === leadId);
  return <>
    <PageHeader eyebrow="Lead profile" title={lead?.name ?? "Lead"} description="Lead profile, status, source, tasks, and next follow-up.">
      <LinkButton href="/studio/leads" variant="secondary">All Leads</LinkButton>
      <LinkButton href={`/studio/leads/${leadId}/edit`} variant="secondary">Edit Lead</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Name", lead?.name ?? "-"],
        ["Email", lead?.email ?? "-"],
        ["Phone", lead?.phone ?? "-"],
        ["Company", lead?.company ?? "-"],
        ["Interest", lead?.interest ?? "-"],
        ["Status", <StatusBadge key="status" status={String(lead?.status ?? "new").replace(/_/g, " ")} />],
        ["Source", data.sourceLabelFor(lead?.source_label ?? lead?.sourceLabel)],
        ["Consent", lead?.consent_status ?? lead?.consentStatus ?? "unknown"]
      ]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Lead Tasks</h2>
      <DataTable columns={["Task", "Status", "Priority"]} rows={tasks.length ? tasks.map((task: any) => [task.title, task.status ?? "open", task.priority ?? "normal"]) : [["No tasks", "Create follow-up task from this lead.", "-"]]} />
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/tasks" method="post">
        <input type="hidden" name="next" value={`/studio/leads/${leadId}`} />
        <input type="hidden" name="lead_id" value={leadId} />
        <label>Task title<input name="title" defaultValue="Follow up with lead" required /></label>
        <label>Priority<select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="high">High</option></select></label>
        <button className="btn" type="submit">Create Task</button>
      </form>
    </section>
  </>;
}
