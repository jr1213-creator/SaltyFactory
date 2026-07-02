import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function OpportunitiesPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader eyebrow="CRM depth" title="Opportunities" description="Opportunity and pipeline foundation for custom orders, wholesale, boutique, and consultation-driven work.">
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Opportunities" value="0" delta="Foundation ready" />
      <MetricCard title="Pipeline stages" value="0" delta="Configurable records" />
      <MetricCard title="Quotes" value="0" delta="Quotation request foundation" />
      <MetricCard title="Deals" value="0" delta="No fake revenue" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Opportunity Pipeline</h2>
      <DataTable columns={["Opportunity", "Customer/lead", "Stage", "Estimated value", "Next action"]} rows={[["No opportunities", "Create from leads, customer requests, or manual entry.", "empty", "$0.00", "Set up lead intake"]]} />
    </section>
    <ProviderStatusCard title="Revenue claims" status="disabled" tone="warning" description="No opportunity revenue is shown until real opportunity records exist." />
  </>;
}
