import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getCustomerCommandCenterData } from "../../../customer-command-center/data";

export const runtime = "nodejs";

export default async function EditServiceCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const data = await getCustomerCommandCenterData();
  const serviceCase = data.serviceCases.find((item: any) => String(item.id) === caseId) as any;
  if (!serviceCase && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Service case" title={`Edit ${serviceCase?.subject ?? "Service case"}`} description="Update persisted support case status, priority, and resolution notes.">
      <LinkButton href={`/studio/service-cases/${caseId}`} variant="secondary">View Case</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action={`/api/studio/crm/service-cases/${caseId}`} method="post">
        <input type="hidden" name="next" value={`/studio/service-cases/${caseId}`} />
        <label>Subject<input name="subject" defaultValue={serviceCase?.subject ?? ""} required /></label>
        <label>Customer ID<input name="customer_id" defaultValue={serviceCase?.customer_id ?? serviceCase?.customerId ?? ""} /></label>
        <label>Issue type<select name="issue_type" defaultValue={serviceCase?.issue_type ?? serviceCase?.issueType ?? "general"}><option value="general">General</option><option value="custom_order">Custom order</option><option value="fulfillment">Fulfillment</option><option value="return">Return</option><option value="question">Question</option><option value="complaint">Complaint</option></select></label>
        <label>Priority<select name="priority" defaultValue={serviceCase?.priority ?? "normal"}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label>Status<select name="status" defaultValue={serviceCase?.status ?? "open"}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_customer">Waiting on customer</option><option value="closed">Closed</option></select></label>
        <label>Channel<select name="channel" defaultValue={serviceCase?.channel ?? "manual"}><option value="manual">Manual</option><option value="email_import">Email import</option><option value="website_form">Website form</option><option value="social_comment">Social comment</option></select></label>
        <label>Resolution notes<textarea name="resolution_notes" defaultValue={serviceCase?.resolution_notes ?? serviceCase?.resolutionNotes ?? ""} /></label>
        <button className="sf-button" type="submit">Save Service Case</button>
      </form>
    </section>
  </>;
}
