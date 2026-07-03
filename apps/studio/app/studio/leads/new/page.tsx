import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewLeadPage() {
  return <>
    <PageHeader eyebrow="CRM depth" title="Create Lead" description="Create a source-labeled lead for wholesale, custom work, consultation, or product interest follow-up.">
      <LinkButton href="/studio/leads" variant="secondary">All Leads</LinkButton>
    </PageHeader>
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/leads" method="post">
        <input type="hidden" name="next" value="/studio/leads/{id}" />
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" /></label>
        <label>Phone<input name="phone" /></label>
        <label>Company<input name="company" /></label>
        <label>Source<input name="source" defaultValue="manual" /></label>
        <label>Status<select name="status" defaultValue="new"><option value="new">New</option><option value="high_intent">High intent</option><option value="qualified">Qualified</option><option value="needs_follow_up">Needs follow-up</option><option value="archived">Archived</option></select></label>
        <label>Interest<input name="interest" /></label>
        <label>Estimated value<input name="estimated_value" type="number" min="0" step="0.01" /></label>
        <label>Next follow-up<input name="next_follow_up_at" type="datetime-local" /></label>
        <label>Consent<select name="consent_status" defaultValue="unknown"><option value="unknown">Unknown</option><option value="granted">Granted</option><option value="denied">Denied</option></select></label>
        <label>Notes<textarea name="notes" /></label>
        <button className="btn" type="submit">Save Lead</button>
      </form>
    </section>
  </>;
}
