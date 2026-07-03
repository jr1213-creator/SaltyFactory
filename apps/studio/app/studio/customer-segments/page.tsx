import { DataTable, LinkButton, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerSegmentsPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Segments & audiences"
      title="Customer Segments"
      description="Default smart segment definitions are ready day one. Membership stays zero or data-limited until real customer, order, form, support, or event data exists."
    >
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Segment definitions" value={String(data.segments.length)} delta="System definitions plus saved segments" />
      <MetricCard title="Active segments" value={String(data.summary.segmentsActive)} delta="Not fake members" />
      <MetricCard title="Customer records" value={String(data.customers.length)} delta="Membership source" />
      <MetricCard title="Order-dependent segments" value="Needs Shopify" delta="Repeat/VIP/jewelry/digital" tone="warning" />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Smart Segment Definitions</h2>
      <DataTable
        columns={["Segment", "Description", "Member count", "Readiness", "Suggested campaign/action", "Open"]}
        rows={data.segments.map((segment: any) => [
          segment.name,
          segment.description ?? "-",
          String(segment.memberCount ?? segment.member_count ?? 0),
          segment.readiness ?? "No matching customers yet.",
          segment.suggestedAction ?? "Review segment.",
          <a key={segment.id ?? segment.key} href={`/studio/customer-segments/${segment.key ?? segment.id}`}>Open</a>
        ])}
      />
    </section>
  </>;
}
