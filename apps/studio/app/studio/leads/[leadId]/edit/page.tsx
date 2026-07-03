import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getCustomerCommandCenterData } from "../../../customer-command-center/data";

export const runtime = "nodejs";

export default async function EditLeadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const data = await getCustomerCommandCenterData();
  const lead = data.leads.find((item: any) => String(item.id) === leadId) as any;
  if (!lead && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Lead profile" title={`Edit ${lead?.name ?? "Lead"}`} description="Update source-labeled lead details and follow-up state.">
      <LinkButton href={`/studio/leads/${leadId}`} variant="secondary">View Lead</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action={`/api/studio/crm/leads/${leadId}`} method="post">
        <input type="hidden" name="next" value={`/studio/leads/${leadId}`} />
        <label>Name<input name="name" defaultValue={lead?.name ?? ""} required /></label>
        <label>Email<input name="email" type="email" defaultValue={lead?.email ?? ""} /></label>
        <label>Phone<input name="phone" defaultValue={lead?.phone ?? ""} /></label>
        <label>Company<input name="company" defaultValue={lead?.company ?? ""} /></label>
        <label>Status<select name="status" defaultValue={lead?.status ?? "new"}><option value="new">New</option><option value="high_intent">High intent</option><option value="qualified">Qualified</option><option value="needs_follow_up">Needs follow-up</option><option value="archived">Archived</option></select></label>
        <label>Interest<input name="interest" defaultValue={lead?.interest ?? ""} /></label>
        <label>Estimated value<input name="estimated_value" type="number" min="0" step="0.01" defaultValue={lead?.estimated_value ?? lead?.estimatedValue ?? ""} /></label>
        <label>Next follow-up<input name="next_follow_up_at" type="datetime-local" defaultValue={lead?.next_follow_up_at ?? lead?.nextFollowUpAt ?? ""} /></label>
        <label>Consent<select name="consent_status" defaultValue={lead?.consent_status ?? lead?.consentStatus ?? "unknown"}><option value="unknown">Unknown</option><option value="granted">Granted</option><option value="denied">Denied</option></select></label>
        <label>Notes<textarea name="notes" defaultValue={lead?.notes ?? ""} /></label>
        <button className="btn" type="submit">Save Lead</button>
      </form>
    </section>
  </>;
}
