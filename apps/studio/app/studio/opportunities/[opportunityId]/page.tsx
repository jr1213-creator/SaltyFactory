import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? `$${parsed.toFixed(2)}` : "-";
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId } = await params;
  const data = await getCustomerCommandCenterData();
  const opportunity = data.opportunities.find((item: any) => String(item.id) === opportunityId) as any;
  if (!opportunity && data.ok) notFound();
  const tasks = data.tasks.filter((task: any) => String(task.opportunity_id ?? task.opportunityId ?? "") === opportunityId || (task.entity_type === "opportunity" && task.entity_id === opportunityId));
  const notes = data.notes.filter((note: any) => String(note.opportunity_id ?? note.opportunityId ?? "") === opportunityId || (note.entity_type === "opportunity" && note.entity_id === opportunityId));
  return <>
    <PageHeader eyebrow="Opportunity pipeline" title={opportunity?.title ?? "Opportunity"} description="Opportunity detail, next action, tasks, notes, and honest pipeline state.">
      <LinkButton href="/studio/opportunities" variant="secondary">All Opportunities</LinkButton>
      <LinkButton href={`/studio/opportunities/${opportunityId}/edit`} variant="secondary">Edit Opportunity</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Title", opportunity?.title ?? "-"],
        ["Stage", <StatusBadge key="stage" status={String(opportunity?.stage ?? opportunity?.status ?? "new").replace(/_/g, " ")} />],
        ["Customer/lead", opportunity?.customer_id ?? opportunity?.customerId ?? opportunity?.lead_id ?? opportunity?.leadId ?? "-"],
        ["Estimated value", money(opportunity?.estimated_value ?? opportunity?.estimatedValue)],
        ["Expected close", opportunity?.expected_close_date ?? opportunity?.expectedCloseDate ?? "-"],
        ["Product/service interest", opportunity?.product_interest ?? opportunity?.productInterest ?? "-"],
        ["Next action", opportunity?.next_action ?? opportunity?.nextAction ?? "Review next action"],
        ["Source", data.sourceLabelFor(opportunity?.source_label ?? opportunity?.sourceLabel)]
      ]} />
    </section>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card">
        <h2>Tasks</h2>
        <DataTable columns={["Task", "Status", "Priority"]} rows={tasks.length ? tasks.map((task: any) => [task.title, task.status ?? "open", task.priority ?? "normal"]) : [["No tasks", "Create a next-step task.", "-"]]} />
        <form className="sf-grid" action="/api/studio/shared/tasks" method="post">
          <input type="hidden" name="next" value={`/studio/opportunities/${opportunityId}`} />
          <input type="hidden" name="entity_type" value="opportunity" />
          <input type="hidden" name="entity_id" value={opportunityId} />
          <label>Task title<input name="title" defaultValue="Follow up on opportunity" required /></label>
          <button className="sf-button" type="submit">Create Task</button>
        </form>
      </section>
      <section className="sf-card">
        <h2>Notes</h2>
        <DataTable columns={["Note", "Source"]} rows={notes.length ? notes.map((note: any) => [note.title ?? note.body, data.sourceLabelFor(note.source_label ?? note.sourceLabel)]) : [["No notes", "Add context before the next follow-up."]]} />
        <form className="sf-grid" action="/api/studio/shared/notes" method="post">
          <input type="hidden" name="next" value={`/studio/opportunities/${opportunityId}`} />
          <input type="hidden" name="entity_type" value="opportunity" />
          <input type="hidden" name="entity_id" value={opportunityId} />
          <label>Note<textarea name="body" required /></label>
          <button className="sf-button" type="submit">Save Note</button>
        </form>
      </section>
    </div>
  </>;
}
