import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData, marketingRowsByChannel } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function AdsHubPage() {
  const data = await getMarketingCommandCenterData();
  const google = marketingRowsByChannel(data.channels, "google_ads");
  const meta = marketingRowsByChannel(data.channels, "meta_ads");
  return <>
    <PageHeader eyebrow="Ad readiness" title="Ads Hub" description="Google/Meta ad drafts, readiness blockers, asset gaps, tracking gaps, approvals, and manual export status. No ad APIs or spend.">
      <LinkButton href="/studio/marketing/ads/google">Google Ads Drafts</LinkButton>
      <LinkButton href="/studio/marketing/ads/meta" variant="secondary">Meta Ads Drafts</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Google ad drafts" value={String(google.length)} delta="Manual export only" />
      <MetricCard title="Meta ad drafts" value={String(meta.length)} delta="Manual export only" />
      <MetricCard title="Ad readiness scores" value={String(data.summary.adReadinessScores)} delta="Honest blockers" />
      <MetricCard title="Pending approvals" value={String(data.summary.approvalItems)} delta="Owner review" tone={data.summary.approvalItems ? "warning" : "info"} />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <DataTable columns={["Draft type", "Count", "Provider status", "Execution"]} rows={[
        ["Google Ads", String(google.length), <StatusBadge key="google" status={data.providerStatuses.google_ads.replace(/_/g, " ")} tone="warning" />, "manual export only"],
        ["Meta Ads", String(meta.length), <StatusBadge key="meta" status={data.providerStatuses.meta.replace(/_/g, " ")} tone="warning" />, "manual export only"],
        ["Pinterest Ads readiness", String(data.summary.pinterestDrafts), <StatusBadge key="pin" status={data.providerStatuses.pinterest.replace(/_/g, " ")} tone="warning" />, "organic/manual only"]
      ]} />
    </section>
    <ProviderStatusCard title="Paid ads" status="blocked by guardrail" tone="warning" description="No Google Ads, Meta Ads, Pinterest Ads, spend, or conversion claims are executed in this pass." />
  </>;
}
