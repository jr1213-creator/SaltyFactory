import { DataTable, EmptyState, LinkButton, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return `$${parsed.toFixed(2)}`;
}

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<{ q?: string; status?: string }> } = {}) {
  const data = await getCustomerCommandCenterData();
  const filters = (await (searchParams ?? Promise.resolve({}))) as { q?: string; status?: string };
  const q = String(filters.q ?? "").toLowerCase();
  const status = String(filters.status ?? "");
  const customers = data.customers.filter((customer: any) => {
    const haystack = `${customer.name ?? ""} ${customer.email ?? ""} ${customer.phone ?? ""} ${customer.location ?? ""}`.toLowerCase();
    const statusValue = String(customer.lifecycle_stage ?? customer.lifecycleStage ?? customer.status ?? "");
    return (!q || haystack.includes(q)) && (!status || statusValue === status);
  });
  return <>
    <PageHeader
      eyebrow="Customer 360"
      title="Customers"
      description="Workspace-owned customer profiles with source labels, consent, next actions, and readiness for future Shopify customer/order sync."
    >
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
      <LinkButton href="/studio/customers/new" variant="secondary">Create Customer</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Customers" value={String(data.customers.length)} delta="No fake customer data" />
      <MetricCard title="Leads" value={String(data.leads.length)} delta="Manual/imported only" />
      <MetricCard title="Consent gaps" value={String(data.customers.filter((customer: any) => String(customer.marketing_consent_status ?? customer.marketingConsentStatus ?? "unknown") !== "granted").length)} delta="Campaign enrollment blocker" tone="warning" />
      <MetricCard title="Shopify sync" value={data.providerStatuses.shopify === "connected" ? "Connected" : "Setup needed"} delta={data.providerStatuses.shopify} tone={data.providerStatuses.shopify === "connected" ? "success" : "warning"} />
    </div>
    {!data.customers.length && <EmptyState
      title="No customers yet"
      description="Connect Shopify customer/order sync, import customers, or turn on capture widgets to populate this list."
      action={<LinkButton href="/studio/customer-capture">Set up capture forms</LinkButton>}
    />}
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Customer List</h2>
      <form className="layout-grid layout-grid-3" method="get" style={{ marginBottom: 14 }}>
        <label>Search<input name="q" defaultValue={filters.q ?? ""} placeholder="Name, email, phone, location" /></label>
        <label>Status<select name="status" defaultValue={status}><option value="">Any</option><option value="lead">Lead</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <button className="btn" type="submit">Filter Customers</button>
      </form>
      <DataTable
        columns={["Name", "Email", "Phone", "Location", "Source", "Lifecycle", "LTV", "AOV", "Orders", "Consent", "Next action", "Open"]}
        rows={customers.length ? customers.map((customer: any) => [
          customer.name ?? "Unnamed customer",
          customer.email ?? "-",
          customer.phone ?? "-",
          customer.location ?? "-",
          data.sourceLabelFor(customer.source_label ?? customer.sourceLabel),
          String(customer.lifecycle_stage ?? customer.lifecycleStage ?? customer.status ?? "unknown").replace(/_/g, " "),
          money(customer.lifetime_value ?? customer.lifetimeValue),
          money(customer.average_order_value ?? customer.averageOrderValue),
          String(customer.order_count ?? customer.orderCount ?? 0),
          <StatusBadge key={`${customer.id}-consent`} status={String(customer.marketing_consent_status ?? customer.marketingConsentStatus ?? "unknown").replace(/_/g, " ")} tone={String(customer.marketing_consent_status ?? customer.marketingConsentStatus) === "granted" ? "success" : "warning"} />,
          customer.next_action ?? customer.nextAction ?? "Run next-action rules",
          <a key={`${customer.id}-open`} href={`/studio/customers/${customer.id}`}>Open</a>
        ]) : [["No matching customers", "-", "-", "-", "System-generated", "-", "$0.00", "$0.00", "0", "unknown", "Create or import customers", "-"]]}
      />
    </section>
  </>;
}
