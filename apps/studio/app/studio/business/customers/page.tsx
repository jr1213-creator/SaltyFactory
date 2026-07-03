import { createRepositories } from "@saltyfactory/db";
import { CustomerSegmentValueMatrix, EmptyState, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessCustomersPage() {
  const repos = createRepositories();
  const customers = await repos.crm.customers.listByWorkspace(workspaceId);
  const segments = await repos.crm.customerCohorts.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Customers" description="Customer value and segment foundation from CRM records. No fake LTV or intent scores." />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Customers" status={String(customers.length)} tone={customers.length ? "success" : "warning"} description="Persisted CRM customer records." />
      <ProviderStatusCard title="Segments" status={String(segments.length)} tone={segments.length ? "success" : "warning"} description="Persisted behavior/customer cohorts." />
      <ProviderStatusCard title="Value model" status="Manual/unknown" tone="warning" description="Requires orders and margins before customer value scoring." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>{segments.length ? <CustomerSegmentValueMatrix columns={["Segment", "Rule", "Status"]} rows={segments.map((segment: any) => [segment.name, JSON.stringify(segment.rule_json ?? segment.ruleJson ?? {}), segment.status ?? "active"])} /> : <EmptyState title="No customer segments" description="Segments appear here after real CRM/customer behavior data exists." />}</section>
  </>;
}
