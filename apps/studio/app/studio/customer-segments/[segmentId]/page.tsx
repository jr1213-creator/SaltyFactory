import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerSegmentDetailPage({ params }: { params: Promise<{ segmentId: string }> }) {
  const { segmentId } = await params;
  const data = await getCustomerCommandCenterData();
  const segment = data.segments.find((row: any) => String(row.key ?? row.id) === segmentId || String(row.id) === segmentId) as any;
  if (!segment && data.ok) notFound();
  return <>
    <PageHeader
      eyebrow="Segment detail"
      title={segment?.name ?? "Customer Segment"}
      description="Segment rules and readiness are shown honestly. Member counts remain zero until matching customer data exists."
    >
      <LinkButton href="/studio/customer-segments" variant="secondary">All Segments</LinkButton>
      <LinkButton href="/studio/customer-campaigns">Campaign Drafts</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="layout-rail" style={{ marginTop: 18 }}>
      <section className="surface-card">
        <h2>Rule & Readiness</h2>
        <DataTable columns={["Field", "Value"]} rows={[
          ["Description", segment?.description ?? "-"],
          ["Rule metadata", segment?.rule ?? JSON.stringify(segment?.rule_json ?? segment?.ruleJson ?? {})],
          ["Source data required", segment?.readiness ?? "No matching customers yet."],
          ["Member count", String(segment?.memberCount ?? segment?.member_count ?? 0)],
          ["Source label", segment?.sourceLabel ?? segment?.source_label ?? "System-generated"],
          ["Suggested action", segment?.suggestedAction ?? "Create a reviewed campaign draft after consent is confirmed."]
        ]} />
      </section>
      <section className="surface-card">
        <h2>Customers in Segment</h2>
        <DataTable columns={["Customer", "Email", "Lifecycle", "Source"]} rows={[["No matching customers yet", "Needs Shopify/customer event data or manual tags.", "-", "System-generated"]]} />
      </section>
      <ProviderStatusCard title="Campaign readiness" status="draft only" tone="info" description="Segment campaigns do not send email until a provider is connected and owner approves the send outside this pass." />
    </div>
  </>;
}
