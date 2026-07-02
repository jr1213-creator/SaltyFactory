import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewCustomerCampaignPage() {
  return <>
    <PageHeader eyebrow="Campaign draft" title="Create Customer Campaign" description="Create a persisted draft campaign. No email, SMS, or social messages are sent by this flow.">
      <LinkButton href="/studio/customer-campaigns" variant="secondary">Customer Campaigns</LinkButton>
    </PageHeader>
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action="/api/studio/crm/campaigns" method="post">
        <input type="hidden" name="next" value="/studio/customer-campaigns/{id}" />
        <label>Name<input name="name" required /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="archived">Archived</option></select></label>
        <label>Goal<input name="goal" defaultValue="Nurture customer segment" /></label>
        <label>Target segment ID<input name="target_segment_id" /></label>
        <label>Consent required<select name="consent_required" defaultValue="true"><option value="true">Yes</option><option value="false">No</option></select></label>
        <label>Campaign JSON<textarea name="campaign_json" defaultValue={'{"providerStatus":"not_configured","sending":"disabled","source":"manual_entry"}'} /></label>
        <button className="sf-button" type="submit">Save Campaign</button>
      </form>
    </section>
  </>;
}
