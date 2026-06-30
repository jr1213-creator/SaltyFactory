import { DataTable, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getIntegrationStates } from "@saltyfactory/integrations";

export default function Page() {
  const integrations = getIntegrationStates(parseEnv());
  const steps = [
    "Brand profile",
    "Website URL",
    "Shopify store domain",
    "Printify shop connection",
    "GA4 property",
    "Search Console site",
    "Google Business Profile location",
    "SEO/AEO/GEO preferences",
    "AI crawler policy",
    "Trend sources",
    "AI employee permissions"
  ];
  return <>
    <PageHeader title="Setup Wizard" description="Configure real data sources. Test and sync actions stay disabled until credentials and permissions are present." />
    <div className="sf-grid sf-grid-4">
      {integrations.slice(0, 4).map((item) => <ProviderStatusCard key={item.key} title={item.label} status={item.status.replace(/_/g, " ")} tone={item.status === "configured" ? "success" : "warning"} />)}
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Workspace Setup Steps</h2>
      <DataTable columns={["Step", "State", "Action"]} rows={steps.map((step) => [step, "Requires owner setup", "Configure when credentials are available"])} />
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Connection Details</h2>
      <DataTable columns={["Provider", "Capabilities", "Credentials needed"]} rows={integrations.map((item) => [item.label, item.capabilities.join(", "), item.setupRequired.length ? item.setupRequired.join(", ") : "None"])} />
    </section>
  </>;
}
