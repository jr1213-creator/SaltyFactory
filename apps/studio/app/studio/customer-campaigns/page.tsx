import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerCampaignsPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Marketing automation foundation"
      title="Customer Campaigns"
      description="Campaign drafts, target segments, message templates, consent readiness, and provider setup states. No live emails are sent by this module in this pass."
    >
      <LinkButton href="/studio/customer-segments">Segments</LinkButton>
      <LinkButton href="/studio/customer-command-center" variant="secondary">Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Saved campaigns" value={String(data.campaigns.length)} delta="Workspace drafts" />
      <MetricCard title="Default campaign ideas" value={String(data.defaultCampaignIdeas.length)} delta="Draft ideas only" />
      <MetricCard title="Message templates" value={String(data.defaultMessageTemplates.length)} delta="No sending provider" />
      <MetricCard title="Email sends" value="Disabled" delta="Owner/provider required" tone="warning" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Default Campaign Ideas</h2>
      <DataTable
        columns={["Campaign", "Status", "Provider", "Email send", "Consent readiness"]}
        rows={data.defaultCampaignIdeas.map((campaign: any) => [
          campaign.name,
          <StatusBadge key={campaign.key} status={campaign.status} tone="info" />,
          campaign.providerStatus.replace(/_/g, " "),
          campaign.sendsEmail ? "enabled" : "disabled",
          "Consent must be confirmed before enrollment."
        ])}
      />
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Message Template Foundation</h2>
      <DataTable columns={["Template", "Subject", "Status", "Source"]} rows={data.defaultMessageTemplates.map((template: any) => [
        template.name,
        template.subject,
        template.status,
        "System-generated"
      ])} />
    </section>
    <ProviderStatusCard title="Marketing provider" status="not configured" tone="warning" description="Email/SMS delivery is not implemented here. Campaigns remain draft/readiness records only." />
  </>;
}
