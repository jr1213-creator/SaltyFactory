import { parseEnv } from "@saltyfactory/config";
import { DataTable, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";

export default function Page() {
  const cfg = parseEnv();
  return <>
    <PageHeader title="Settings" description="Workspace, provider, security, crawler policy, and site tool configuration." />
    <div className="sf-grid sf-grid-2">
      <section className="sf-card"><h2>Workspace Settings</h2><DataTable columns={["Setting", "Value"]} rows={[["Workspace", "Salty Cowhide"], ["Brand profile", "Coastal western / western luxe"], ["Live publishing", cfg.LIVE_PUBLISHING_ENABLED ? "Enabled" : "Disabled by default"]]} /></section>
      <section className="sf-card"><h2>Security</h2><DataTable columns={["Control", "Status"]} rows={[["Studio auth", <StatusBadge key="auth" status={cfg.STUDIO_AUTH_ENABLED ? "Enabled" : "Disabled"} tone={cfg.STUDIO_AUTH_ENABLED ? "success" : "danger"} />], ["Provider secrets", "Server-side only"], ["Public AI generation", "Not exposed"]]} /></section>
    </div>
    <div className="sf-grid sf-grid-3" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Shopify Admin" status={cfg.providers.shopifyAdmin.enabled ? "Configured" : "Needs credentials"} tone={cfg.providers.shopifyAdmin.enabled ? "success" : "warning"} />
      <ProviderStatusCard title="Printify" status={cfg.providers.printify.enabled ? "Configured" : "Needs credentials"} tone={cfg.providers.printify.enabled ? "success" : "warning"} />
      <ProviderStatusCard title="AI Crawler Policy" status="Ready" tone="success" description="Public routes only expose approved storefront content." />
    </div>
  </>;
}
