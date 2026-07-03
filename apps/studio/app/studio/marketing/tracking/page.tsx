import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function MarketingTrackingPage() {
  const data = await getMarketingCommandCenterData();
  return <>
    <PageHeader eyebrow="UTM and tracking readiness" title="Marketing Tracking" description="Generate UTM links and track honest analytics readiness. No fake campaign performance, pixels, or conversion data.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <h2>Create UTM Link</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/marketing/utm-links" method="post">
        <input type="hidden" name="next" value="/studio/marketing/tracking" />
        <label>Campaign ID<input name="campaign_id" /></label>
        <label>Base URL<input name="base_url" defaultValue="https://saltycowhide.com/" required /></label>
        <label>Source<input name="source" defaultValue="saltyfactory" required /></label>
        <label>Medium<input name="medium" defaultValue="manual_export" required /></label>
        <label>Campaign name<input name="campaign_name" defaultValue="salty_cowhide_launch" required /></label>
        <label>Term<input name="term" /></label>
        <label>Content<input name="content" /></label>
        <button className="btn" type="submit">Generate UTM</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Saved UTM Links</h2>
      <DataTable columns={["Campaign", "Source", "Medium", "Generated URL", "Status"]} rows={data.utmLinks.length ? data.utmLinks.map((utm: any) => [
        utm.campaign_name ?? utm.campaignName ?? "-",
        utm.source,
        utm.medium,
        utm.generated_url ?? utm.generatedUrl,
        <StatusBadge key={utm.id} status={String(utm.status ?? "ready").replace(/_/g, " ")} tone="success" />
      ]) : [["No UTM links", "Create one above or run workflow.", "-", "-", "needed"]]} />
    </section>
    <div className="layout-grid layout-grid-3" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="GA4" status={data.providerStatuses.analytics.replace(/_/g, " ")} tone={data.providerStatuses.analytics === "connected" ? "success" : "warning"} description="Analytics must be configured and synced elsewhere before performance claims appear." />
      <ProviderStatusCard title="Meta Pixel" status="future integration" tone="warning" description="No fake Pixel readiness or conversion data." />
      <ProviderStatusCard title="Google Ads conversions" status="future integration" tone="warning" description="No fake conversion tracking." />
    </div>
  </>;
}
