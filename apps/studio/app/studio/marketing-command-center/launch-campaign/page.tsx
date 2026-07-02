import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../data";

export const runtime = "nodejs";

export default async function LaunchCampaignWorkflowPage() {
  const data = await getMarketingCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Guided campaign packet"
      title="Launch Campaign Workflow"
      description="One product/drop/offer in, proof-backed campaign packet out. This creates persisted manual/export-ready records only and does not call live provider APIs."
    >
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Live publishing" status="disabled" tone="warning" description="No social posting, email sending, ad launch, product feed submit, or spend occurs." />
      <ProviderStatusCard title="Output type" status="manual/export-ready" tone="info" description="Creates proof pack, growth plan, drafts, asset specs, UTM, approvals, and tasks." />
      <ProviderStatusCard title="Owner approval" status="required" tone="warning" description="Generated records are ready for owner review, not public execution." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Create Campaign Packet</h2>
      <form className="sf-grid sf-grid-2" action="/api/studio/marketing/launch-campaign" method="post">
        <input type="hidden" name="next" value="/studio/marketing-campaigns/{id}" />
        <label>Vertical pack<select name="vertical_pack_id" defaultValue="vp_pod_boutique"><option value="vp_pod_boutique">POD Boutique</option><option value="vp_ai_readiness_consulting">AI Readiness Consulting</option></select></label>
        <label>Campaign name<input name="name" defaultValue="Salty Cowhide Product Drop Launch" required /></label>
        <label>Campaign goal<input name="goal" defaultValue="Launch a Salty Cowhide product/drop with proof-backed marketing." /></label>
        <label>Product/drop/offer reference<input name="product_ref" placeholder="manual-offer, listing ID, product idea ID" /></label>
        <label>Target segment ID<input name="target_segment_id" placeholder="optional segment ID" /></label>
        <label>Audience<input name="audience" defaultValue="Salty Cowhide buyers and high-intent leads" /></label>
        <label>Offer<input name="offer" defaultValue="Owner-reviewed product/drop offer" /></label>
        <label>Landing URL<input name="landing_url" defaultValue="https://saltycowhide.com/" /></label>
        <button className="sf-button" type="submit">Generate Campaign Packet</button>
      </form>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Workflow Outputs</h2>
      <DataTable columns={["Step", "Record created", "Status"]} rows={[
        ["Campaign", "campaigns", <StatusBadge key="campaign" status="ready for review" tone="info" />],
        ["Campaign Proof Pack", "export_packages package_type=proof_pack", <StatusBadge key="proof" status="manual/export-ready" tone="info" />],
        ["No-Ad Growth Plan", "export_packages package_type=growth_plan", <StatusBadge key="growth" status="manual/export-ready" tone="info" />],
        ["Ad Readiness Score", "readiness_scores score_type=ad", <StatusBadge key="ad" status="honest blockers" tone="warning" />],
        ["Pinterest/social/email/ad drafts", "campaign_channels", <StatusBadge key="drafts" status="draft only" tone="info" />],
        ["Asset specs", "assets", <StatusBadge key="assets" status="spec only" tone="info" />],
        ["UTM link", "utm_links", <StatusBadge key="utm" status="ready" tone="success" />],
        ["Approvals/tasks/recommendations", "approvals/tasks/recommendations", <StatusBadge key="approval" status="owner review required" tone="warning" />]
      ]} />
    </section>
  </>;
}
