import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

function campaignName(campaign: any) {
  return String(campaign.name ?? campaign.title ?? "Untitled campaign");
}

export default async function CustomerCampaignsPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Marketing automation foundation"
      title="Customer Campaigns"
      description="Campaign drafts, target segments, message templates, consent readiness, and provider setup states. No live emails are sent by this module in this pass."
    >
      <LinkButton href="/studio/customer-campaigns/new">Create Campaign Draft</LinkButton>
      <LinkButton href="/studio/customer-segments">Segments</LinkButton>
      <LinkButton href="/studio/customer-command-center" variant="secondary">Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Saved campaigns" value={String(data.campaigns.length)} delta="Workspace drafts" />
      <MetricCard title="Default campaign ideas" value={String(data.defaultCampaignIdeas.length)} delta="Draft ideas only" />
      <MetricCard title="Message templates" value={String(data.defaultMessageTemplates.length)} delta="No sending provider" />
      <MetricCard title="Email sends" value="Disabled" delta="Owner/provider required" tone="warning" />
    </div>
    {data.campaigns.length > 0 && <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Saved Campaign Drafts</h2>
      <DataTable
        columns={["Campaign", "Goal", "Target segment", "Status", "Consent readiness", "Open"]}
        rows={data.campaigns.map((campaign: any) => [
          campaignName(campaign),
          campaign.goal ?? "Review campaign goal.",
          campaign.target_segment_id ?? campaign.targetSegmentId ?? "manual selection required",
          <StatusBadge key={campaign.id} status={String(campaign.status ?? "draft").replace(/_/g, " ")} tone="info" />,
          campaign.consent_required === false || campaign.consentRequired === false ? "Consent not required by record" : "Consent must be confirmed before enrollment.",
          <a key={campaign.id} href={`/studio/customer-campaigns/${campaign.id}`}>Open</a>
        ])}
      />
    </section>}
    <section className="surface-card" style={{ marginTop: 18 }}>
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
    <section className="surface-card" style={{ marginTop: 18 }}>
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
