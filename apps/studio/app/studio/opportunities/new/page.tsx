import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewOpportunityPage() {
  return <>
    <PageHeader eyebrow="Opportunity pipeline" title="Create Opportunity" description="Create a persisted opportunity for custom orders, wholesale interest, boutique work, or consulting follow-up.">
      <LinkButton href="/studio/opportunities" variant="secondary">All Opportunities</LinkButton>
    </PageHeader>
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action="/api/studio/crm/opportunities" method="post">
        <input type="hidden" name="next" value="/studio/opportunities/{id}" />
        <label>Title<input name="title" required /></label>
        <label>Stage<select name="stage" defaultValue="new"><option value="new">New</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option></select></label>
        <label>Customer ID<input name="customer_id" /></label>
        <label>Lead ID<input name="lead_id" /></label>
        <label>Estimated value<input name="estimated_value" type="number" min="0" step="0.01" /></label>
        <label>Expected close date<input name="expected_close_date" type="date" /></label>
        <label>Product/service interest<input name="product_interest" /></label>
        <label>Next action<input name="next_action" defaultValue="Review opportunity follow-up" /></label>
        <button className="sf-button" type="submit">Save Opportunity</button>
      </form>
    </section>
  </>;
}
