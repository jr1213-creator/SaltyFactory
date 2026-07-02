import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getCustomerCommandCenterData } from "../../../customer-command-center/data";

export const runtime = "nodejs";

export default async function EditOpportunityPage({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId } = await params;
  const data = await getCustomerCommandCenterData();
  const opportunity = data.opportunities.find((item: any) => String(item.id) === opportunityId) as any;
  if (!opportunity && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Opportunity pipeline" title={`Edit ${opportunity?.title ?? "Opportunity"}`} description="Update persisted opportunity stage and next-action data.">
      <LinkButton href={`/studio/opportunities/${opportunityId}`} variant="secondary">View Opportunity</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action={`/api/studio/crm/opportunities/${opportunityId}`} method="post">
        <input type="hidden" name="next" value={`/studio/opportunities/${opportunityId}`} />
        <label>Title<input name="title" defaultValue={opportunity?.title ?? ""} required /></label>
        <label>Stage<select name="stage" defaultValue={opportunity?.stage ?? "new"}><option value="new">New</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option></select></label>
        <label>Customer ID<input name="customer_id" defaultValue={opportunity?.customer_id ?? opportunity?.customerId ?? ""} /></label>
        <label>Lead ID<input name="lead_id" defaultValue={opportunity?.lead_id ?? opportunity?.leadId ?? ""} /></label>
        <label>Estimated value<input name="estimated_value" type="number" min="0" step="0.01" defaultValue={opportunity?.estimated_value ?? opportunity?.estimatedValue ?? ""} /></label>
        <label>Expected close date<input name="expected_close_date" type="date" defaultValue={opportunity?.expected_close_date ?? opportunity?.expectedCloseDate ?? ""} /></label>
        <label>Product/service interest<input name="product_interest" defaultValue={opportunity?.product_interest ?? opportunity?.productInterest ?? ""} /></label>
        <label>Next action<input name="next_action" defaultValue={opportunity?.next_action ?? opportunity?.nextAction ?? ""} /></label>
        <button className="sf-button" type="submit">Save Opportunity</button>
      </form>
    </section>
  </>;
}
