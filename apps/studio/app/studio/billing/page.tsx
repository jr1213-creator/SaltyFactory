import { DataTable, MetricCard, PageHeader, ProgressBar, ProviderStatusCard } from "@saltyfactory/ui";

export default function Page() {
  return <>
    <PageHeader title="Billing" description="Plan, usage, and feature limit overview. Payment provider is disabled until configured." />
    <div className="layout-grid layout-grid-3">
      <MetricCard title="Current plan" value="Pro Studio" delta="Local configuration" />
      <MetricCard title="Credits used" value="Not metered" delta="Billing provider disabled" tone="warning" />
      <MetricCard title="Billing provider" value="Disabled" delta="No Stripe integration active" tone="warning" />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}><h2>Usage</h2><ProgressBar label="AI credits" value={0} /><ProgressBar label="Storage" value={0} /><ProgressBar label="Publish reviews" value={0} /><p className="text-muted">Usage meters remain empty until billing and metering providers are configured.</p></section>
    <div className="layout-grid layout-grid-2" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Stripe / billing provider" status="Disabled" tone="warning" description="No payment provider is configured in this build." />
      <section className="surface-card"><h2>Billing events</h2><DataTable columns={["Event", "Status", "Notes"]} rows={[["No billing events", "Empty", "Provider disabled"]]} /></section>
    </div>
  </>;
}
