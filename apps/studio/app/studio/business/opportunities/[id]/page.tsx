import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, OwnerDecisionPanel, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessOpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await createRepositories().business.opportunities.getById(id, workspaceId) as any;
  if (!opportunity) return <PageHeader title="Opportunity not found" description="This opportunity is not in the active workspace." />;
  return <>
    <PageHeader title={opportunity.title} eyebrow="Business opportunity" description={opportunity.summary}><ApprovalBadge status={String(opportunity.owner_decision ?? opportunity.ownerDecision)} /></PageHeader>
    <div className="sf-layout-rail">
      <section className="sf-card">
        <h2>Evidence and Recommendation</h2>
        <DataTable columns={["Field", "Value"]} rows={[
          ["Type", opportunity.opportunity_type ?? opportunity.opportunityType],
          ["Estimated value", opportunity.estimated_value ?? opportunity.estimatedValue ?? "unknown"],
          ["Confidence", opportunity.confidence ?? "0"],
          ["Risk", opportunity.risk_level ?? opportunity.riskLevel],
          ["Next action", opportunity.recommended_next_action ?? opportunity.recommendedNextAction]
        ]} />
      </section>
      <OwnerDecisionPanel title="Owner Decision" description="Conversions create internal records only. No spend, send, sync, or publish happens.">
        <form action={`/api/studio/business/opportunities/${id}/approve`} method="post"><button className="sf-button sf-button-primary">Approve</button></form>
        <form action={`/api/studio/business/opportunities/${id}/reject`} method="post"><button className="sf-button sf-button-danger">Reject</button></form>
        <form action={`/api/studio/business/opportunities/${id}/convert-to-task`} method="post"><button className="sf-button sf-button-secondary">Convert to Task</button></form>
        <form action={`/api/studio/business/opportunities/${id}/convert-to-campaign`} method="post"><button className="sf-button sf-button-secondary">Convert to Campaign</button></form>
        <form action={`/api/studio/business/opportunities/${id}/convert-to-product-batch`} method="post"><button className="sf-button sf-button-secondary">Convert to Product Batch</button></form>
      </OwnerDecisionPanel>
    </div>
  </>;
}
