import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

const defaultFields = JSON.stringify([
  { key: "name", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "interest", label: "Product interest", type: "text", required: false },
  { key: "consent", label: "Marketing consent", type: "checkbox", required: true }
], null, 2);

export default function NewCaptureFormPage() {
  return <>
    <PageHeader eyebrow="Capture form" title="Create Capture Form" description="Create a persisted customer capture form definition. Public embeds remain future integration unless explicitly implemented later.">
      <LinkButton href="/studio/customer-capture/forms" variant="secondary">All Forms</LinkButton>
    </PageHeader>
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action="/api/studio/crm/forms" method="post">
        <input type="hidden" name="next" value="/studio/customer-capture/forms/{id}" />
        <label>Title<input name="title" required /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
        <label>Description<textarea name="description" /></label>
        <label>Fields JSON<textarea name="fields_json" defaultValue={defaultFields} required /></label>
        <label>Target segment key<input name="target_segment_key" defaultValue="high_intent_leads" /></label>
        <label>Suggested follow-up task<input name="suggested_follow_up_task" defaultValue="Review new form submission" /></label>
        <label>Consent language<textarea name="consent_language" defaultValue="I agree to be contacted about this request. Marketing messages require confirmed consent." /></label>
        <label>Embed readiness<select name="embed_readiness_status" defaultValue="future_integration"><option value="future_integration">Future integration</option><option value="internal_preview_ready">Internal preview ready</option><option value="manual_action_required">Manual action required</option></select></label>
        <button className="sf-button" type="submit">Save Form</button>
      </form>
    </section>
  </>;
}
