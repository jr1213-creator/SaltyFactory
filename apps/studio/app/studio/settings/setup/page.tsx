import { DataTable, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getIntegrationStates, googleOAuthSetupRequired } from "@saltyfactory/integrations";
import { getStudioLists } from "../../data";

function provider(row: any) {
  return String(row.provider_type ?? row.providerType ?? "");
}

export default async function Page() {
  const config = parseEnv();
  const integrations = getIntegrationStates(config);
  const { providerConnections } = await getStudioLists();
  const persisted = Object.fromEntries(providerConnections.map((connection: any) => [provider(connection), connection]));
  const googleSetup = googleOAuthSetupRequired(config);
  const steps = [
    ["Google OAuth app", googleSetup.length ? "Blocked" : "Configured", googleSetup.length ? googleSetup.join(", ") : "Ready for Connect Google"],
    ["Auto-detect Google setup", persisted.google_oauth?.status === "connected" ? "Recommended" : "Blocked until OAuth is connected", "Use Integrations to discover GA4, Search Console, and optional Business Profile resources before manual setup"],
    ["Google Analytics Data API", persisted.ga4?.status ?? "not_configured", "Auto-detect or manually enter the numeric GA4 property ID, then sync"],
    ["Search Console API", persisted.google_search_console?.status ?? "not_configured", "Auto-detect or select the verified saltycowhide.com URL/sc-domain property, then sync"],
    ["Merchant Center", persisted.google_merchant_center?.status ?? "recommended_for_ecommerce", "Create setup for SaltyCowhide.com; product feeds remain disabled until approval gates pass"],
    ["Business Profile APIs", persisted.google_business_profile?.status ?? "optional_for_online_pod", "Optional for online-only Salty Cowhide POD launch; configure only if the business has an eligible public profile"],
    ["Encrypted credential storage", config.CREDENTIAL_ENCRYPTION_KEY ? "Configured" : "Blocked", "CREDENTIAL_ENCRYPTION_KEY must be set server-side"],
    ["Human-approved recommendations", "Required", "Google data may inform drafts only; no automatic publishing or review replies"]
  ];
  return <>
    <PageHeader title="Setup Guide" description="Configure real data sources. Test and sync actions stay disabled until credentials and permissions are present." />
    <div className="sf-grid sf-grid-4">
      {integrations.filter((item) => ["google_oauth", "ga4", "google_search_console", "google_business_profile"].includes(item.key)).map((item) => <ProviderStatusCard key={item.key} title={item.label} status={String(persisted[item.key]?.status ?? item.status).replace(/_/g, " ")} tone={String(persisted[item.key]?.status ?? item.status) === "connected" ? "success" : "warning"} />)}
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Google Setup Steps</h2>
      <DataTable columns={["Step", "State", "Action"]} rows={steps} />
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Connection Details</h2>
      <DataTable columns={["Provider", "Capabilities", "Credentials needed"]} rows={integrations.map((item) => [item.label, item.capabilities.join(", "), item.setupRequired.length ? item.setupRequired.join(", ") : "None"])} />
    </section>
  </>;
}
