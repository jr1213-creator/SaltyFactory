import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewServiceCasePage() {
  return <>
    <PageHeader eyebrow="Service workflow" title="Create Service Case" description="Create a persisted support or service case. No live chat/email integration is required for manual case tracking.">
      <LinkButton href="/studio/service-cases" variant="secondary">All Service Cases</LinkButton>
    </PageHeader>
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/service-cases" method="post">
        <input type="hidden" name="next" value="/studio/service-cases/{id}" />
        <label>Subject<input name="subject" required /></label>
        <label>Customer ID<input name="customer_id" /></label>
        <label>Issue type<select name="issue_type" defaultValue="general"><option value="general">General</option><option value="custom_order">Custom order</option><option value="fulfillment">Fulfillment</option><option value="return">Return</option><option value="question">Question</option><option value="complaint">Complaint</option></select></label>
        <label>Priority<select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label>Status<select name="status" defaultValue="open"><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_customer">Waiting on customer</option><option value="closed">Closed</option></select></label>
        <label>Channel<select name="channel" defaultValue="manual"><option value="manual">Manual</option><option value="email_import">Email import</option><option value="website_form">Website form</option><option value="social_comment">Social comment</option></select></label>
        <label>Resolution notes<textarea name="resolution_notes" /></label>
        <button className="btn" type="submit">Save Service Case</button>
      </form>
    </section>
  </>;
}
