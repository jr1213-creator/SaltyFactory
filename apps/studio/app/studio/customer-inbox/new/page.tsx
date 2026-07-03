import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewConversationPage() {
  return <>
    <PageHeader eyebrow="Support inbox foundation" title="Create Conversation" description="Create a manual conversation record. This does not connect live chat, email, or social inboxes.">
      <LinkButton href="/studio/customer-inbox" variant="secondary">Customer Inbox</LinkButton>
    </PageHeader>
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/inbox" method="post">
        <input type="hidden" name="next" value="/studio/customer-inbox/{id}" />
        <label>Subject<input name="subject" required /></label>
        <label>Customer ID<input name="customer_id" /></label>
        <label>Channel<select name="channel" defaultValue="manual"><option value="manual">Manual</option><option value="website_form">Website form</option><option value="email_import">Email import</option><option value="social_comment">Social comment</option></select></label>
        <label>Status<select name="status" defaultValue="open"><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
        <label>Source label<select name="source_label" defaultValue="manual_entry"><option value="manual_entry">Manual entry</option><option value="chat_support">Chat/support</option><option value="email_import">Email import</option><option value="social_comment">Social comment</option></select></label>
        <button className="btn" type="submit">Save Conversation</button>
      </form>
    </section>
  </>;
}
