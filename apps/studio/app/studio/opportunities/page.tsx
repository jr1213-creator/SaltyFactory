import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? `$${parsed.toFixed(2)}` : "-";
}

export default async function OpportunitiesPage() {
  const data = await getCustomerCommandCenterData();
  const opportunities = data.opportunities;
  const activeOpportunities = opportunities.filter((opportunity: any) => !["closed", "lost", "won"].includes(String(opportunity.status ?? "").toLowerCase()));
  return <>
    <PageHeader eyebrow="CRM depth" title="Opportunities" description="Opportunity and pipeline foundation for custom orders, wholesale, boutique, and consultation-driven work.">
      <LinkButton href="/studio/opportunities/new">Create Opportunity</LinkButton>
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Opportunities" value={String(opportunities.length)} delta="Saved workspace records" />
      <MetricCard title="Pipeline stages" value="0" delta="Configurable records" />
      <MetricCard title="Quotes" value="0" delta="Quotation request foundation" />
      <MetricCard title="Active opportunities" value={String(activeOpportunities.length)} delta="No fake revenue" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Opportunity Pipeline</h2>
      <DataTable columns={["Opportunity", "Customer/lead", "Stage", "Estimated value", "Next action", "Open"]} rows={opportunities.length ? opportunities.map((opportunity: any) => [
        opportunity.title,
        opportunity.customer_id ?? opportunity.customerId ?? opportunity.lead_id ?? opportunity.leadId ?? "-",
        String(opportunity.stage ?? opportunity.status ?? "new").replace(/_/g, " "),
        money(opportunity.estimated_value ?? opportunity.estimatedValue),
        opportunity.next_action ?? opportunity.nextAction ?? "Review next action",
        <a key={opportunity.id} href={`/studio/opportunities/${opportunity.id}`}>Open</a>
      ]) : [["No opportunities", "Create from leads, customer requests, or manual entry.", "empty", "-", "Set up lead intake", "-"]]} />
    </section>
    <ProviderStatusCard title="Revenue claims" status="disabled" tone="warning" description="No opportunity revenue is shown until real opportunity records exist." />
  </>;
}
