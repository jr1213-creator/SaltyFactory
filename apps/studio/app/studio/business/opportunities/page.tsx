import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, EmptyState, OpportunityCard, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessOpportunitiesPage() {
  const opportunities = await createRepositories().business.opportunities.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Opportunities" description="Owner-reviewable product, trend, campaign, pricing, retention, margin, and SEO opportunities with evidence and decisions." />
    <section className="sf-card">
      <h2>Create Opportunity</h2>
      <form className="sf-form-grid" action="/api/studio/business/opportunities" method="post">
        <label>Type<select name="opportunityType"><option value="product_opportunity">Product</option><option value="campaign_opportunity">Campaign</option><option value="pricing_opportunity">Pricing</option><option value="margin_improvement_opportunity">Margin improvement</option></select></label>
        <label>Title<input name="title" defaultValue="Margin-ready coastal western launch" /></label>
        <label>Summary<textarea name="summary" defaultValue="Review products with healthy margins before considering paid channels." /></label>
        <label>Recommended next action<textarea name="recommendedNextAction" defaultValue="Calculate unit economics and convert approved opportunity to a product batch or campaign." /></label>
        <button className="sf-button sf-button-primary" type="submit">Save Opportunity</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{opportunities.length ? <div className="sf-grid">{opportunities.map((opportunity: any) => <OpportunityCard key={opportunity.id} title={opportunity.title} description={opportunity.summary} action={<a className="sf-button sf-button-secondary" href={`/studio/business/opportunities/${opportunity.id}`}>Review</a>}>
      <DataTable columns={["Risk", "Decision", "Next action"]} rows={[[opportunity.risk_level ?? opportunity.riskLevel, <ApprovalBadge key="decision" status={String(opportunity.owner_decision ?? opportunity.ownerDecision)} />, opportunity.recommended_next_action ?? opportunity.recommendedNextAction]]} />
    </OpportunityCard>)}</div> : <EmptyState title="No business opportunities" description="Create a real opportunity or convert one from product/customer/marketing intelligence." />}</section>
  </>;
}
