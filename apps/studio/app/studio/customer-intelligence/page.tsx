import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { customerEventTypes } from "@saltyfactory/domain";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerIntelligencePage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Customer intelligence foundation"
      title="Customer Intelligence"
      description="Customer events, behavioral cohorts, product interest, surveys, experiments readiness, and conversion funnel placeholders. No web analytics are faked."
    >
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Customer events" value={String(data.events.length)} delta="Real imported/tracked only" />
      <MetricCard title="Product interests" value={String(data.productInterests.length)} delta="Manual/imported" />
      <MetricCard title="Behavioral cohorts" value={String(data.segments.length)} delta="Definitions only until data" />
      <MetricCard title="Tracking status" value={data.events.length ? "Detected" : "Not configured"} delta="No fake analytics" tone={data.events.length ? "success" : "warning"} />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Event Tracking Readiness</h2>
      <p className="sf-muted">Website/customer behavior tracking is not configured yet unless real events are present below.</p>
      <DataTable
        columns={["Event type", "Readiness"]}
        rows={customerEventTypes.map((eventType) => [
          eventType.replace(/_/g, " "),
          <StatusBadge key={eventType} status={data.events.some((event: any) => String(event.event_type ?? event.eventType) === eventType) ? "detected" : "not configured"} tone={data.events.some((event: any) => String(event.event_type ?? event.eventType) === eventType) ? "success" : "warning"} />
        ])}
      />
    </section>
    <div className="sf-grid sf-grid-3" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Session replay" status="not implemented" tone="warning" description="No session replay is recorded or displayed." />
      <ProviderStatusCard title="Surveys" status="foundation ready" tone="info" description="Survey records exist; public survey delivery is not implemented." />
      <ProviderStatusCard title="Feature flags / experiments" status="foundation ready" tone="info" description="Readiness records can be stored; no live flags are served publicly." />
      <ProviderStatusCard title="Conversion funnel" status="needs event data" tone="warning" description="Funnels require tracked page/product/cart/checkout/purchase events." />
    </div>
  </>;
}
