import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function MarketingSetupPage() {
  const data = await getMarketingCommandCenterData();
  return <>
    <PageHeader eyebrow="Marketing setup" title="Marketing Setup" description="Seed vertical pack templates/rules, review provider readiness, and start a campaign packet. This does not connect live publishers or ad APIs.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Vertical packs" status={data.verticalPacks.length ? "ready" : "setup needed"} tone={data.verticalPacks.length ? "success" : "warning"} description="POD Boutique and AI Readiness Consulting are seeded through shared vertical packs." />
      <ProviderStatusCard title="Templates" status={data.templates.length ? "ready" : "setup needed"} tone={data.templates.length ? "success" : "warning"} description="Templates are config-driven and do not require vertical-specific tables." />
      <ProviderStatusCard title="Live execution providers" status="disabled" tone="warning" description="Social, email, ads, and publishing providers remain disabled unless separately connected and approved." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Setup Actions</h2>
      <DataTable columns={["Action", "Status", "Owner action"]} rows={[
        ["Seed vertical packs/templates/rules", data.verticalPacks.length ? <StatusBadge key="vpack" status="ready" tone="success" /> : <StatusBadge key="vpack-missing" status="setup needed" tone="warning" />, "Run seed if missing."],
        ["Create launch campaign packet", data.campaigns.length ? <StatusBadge key="campaign" status="ready" tone="success" /> : <StatusBadge key="campaign-missing" status="needed" tone="warning" />, "Run guided workflow."],
        ["Connect analytics/providers", <StatusBadge key="providers" status="optional" tone="warning" />, "Use Account Center; no fake connected states here."]
      ]} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <form action="/api/studio/shared/vertical-packs/seed" method="post">
          <input type="hidden" name="next" value="/studio/marketing/setup" />
          <button className="sf-button" type="submit">Seed Vertical Packs</button>
        </form>
        <LinkButton href="/studio/marketing-command-center/launch-campaign" variant="secondary">Run Launch Workflow</LinkButton>
      </div>
    </section>
  </>;
}
