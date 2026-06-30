import { DataTable, MetricCard, PageHeader, ProgressBar, ProviderStatusCard } from "@saltyfactory/ui";

export default function Page() {
  return <>
    <PageHeader title="Billing" description="Plan, usage, and feature limit overview. Payment provider is disabled until configured." />
    <div className="sf-grid sf-grid-3">
      <MetricCard title="Current plan" value="Pro Studio" delta="Local configuration" />
      <MetricCard title="Credits used" value="68%" delta="Demo usage indicator" tone="warning" />
      <MetricCard title="Billing provider" value="Disabled" delta="No Stripe integration active" tone="warning" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}><h2>Usage</h2><ProgressBar label="AI credits" value={68} /><ProgressBar label="Storage" value={42} /><ProgressBar label="Publish reviews" value={24} /></section>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Stripe / billing provider" status="Disabled" tone="warning" description="No payment provider is configured in this build." />
      <section className="sf-card"><h2>Billing events</h2><DataTable columns={["Event", "Status", "Notes"]} rows={[["No billing events", "Empty", "Provider disabled"]]} /></section>
    </div>
  </>;
}
