import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { defaultGeneratedUtm } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default function NewMarketingCampaignPage() {
  const defaultName = "Salty Cowhide Product Drop Launch";
  return <>
    <PageHeader eyebrow="Campaign planner" title="Create Marketing Campaign" description="Create a shared campaign record. Use the guided workflow when you want a complete proof-backed packet.">
      <LinkButton href="/studio/marketing-campaigns" variant="secondary">All Campaigns</LinkButton>
    </PageHeader>
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/campaigns" method="post">
        <input type="hidden" name="next" value="/studio/marketing-campaigns/{id}" />
        <label>Name<input name="name" defaultValue={defaultName} required /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="planning">Planning</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="exported">Exported</option></select></label>
        <label>Campaign type<input name="campaign_type" defaultValue="product_drop_launch" /></label>
        <label>Goal<input name="goal" defaultValue="Launch one product/drop with proof-backed manual/export-ready marketing." /></label>
        <label>Audience<input name="audience" defaultValue="Salty Cowhide buyers and high-intent leads" /></label>
        <label>Offer<input name="offer" defaultValue="New product drop with owner-reviewed offer." /></label>
        <label>Landing URL<input name="landing_url" defaultValue="https://saltycowhide.com/" /></label>
        <label>Default UTM<input name="metadata" defaultValue={JSON.stringify({ generatedUtm: defaultGeneratedUtm(defaultName, "saltyfactory", "launch") })} /></label>
        <button className="btn" type="submit">Save Campaign</button>
      </form>
    </section>
  </>;
}
