import { AiReadinessScoreCard, DataTable, IntegrationCard, PageHeader, RecommendationCard, SiteToolToggleCard, StatusBadge } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getIntegrationStates } from "@saltyfactory/integrations";
import { getStudioLists } from "../data";
import { IntegrationActionsClient } from "./IntegrationActionsClient";

function rowProvider(row: any) {
  return String(row.provider_type ?? row.providerType ?? row.provider_key ?? row.providerKey ?? "");
}

function latestSync(rows: any[], provider: string) {
  return rows
    .filter((row) => rowProvider(row) === provider)
    .sort((a, b) => String(b.completed_at ?? b.completedAt ?? b.created_at ?? "").localeCompare(String(a.completed_at ?? a.completedAt ?? a.created_at ?? "")))[0] ?? null;
}

export default async function Page() {
  const { providerConnections, integrationSyncRuns } = await getStudioLists();
  const persistedByProvider = Object.fromEntries(providerConnections.map((connection: any) => [rowProvider(connection), connection]));
  const integrations = getIntegrationStates(parseEnv()).map((item) => {
    const persisted = persistedByProvider[item.key] as any;
    const configuration = (persisted?.configuration ?? {}) as Record<string, any>;
    const lastSync = latestSync(integrationSyncRuns as any[], item.key);
    return {
      ...item,
      status: persisted?.status ?? item.status,
      googleEmail: typeof configuration.googleEmail === "string" ? configuration.googleEmail : null,
      credentialStored: persisted ? Boolean(persisted.secret_ref ?? persisted.secretRef) : undefined,
      scopes: Array.isArray(configuration.scopes) ? configuration.scopes : item.scopes ?? [],
      selectedPropertyId: configuration.ga4PropertyId ?? configuration.selectedPropertyId ?? item.selectedPropertyId ?? null,
      selectedSiteUrl: configuration.searchConsoleSiteUrl ?? configuration.selectedSiteUrl ?? item.selectedSiteUrl ?? null,
      selectedAccountId: configuration.businessProfileAccountId ?? configuration.selectedAccountId ?? item.selectedAccountId ?? null,
      selectedLocationId: configuration.businessProfileLocationId ?? configuration.selectedLocationId ?? item.selectedLocationId ?? null,
      lastSuccessfulSync: lastSync?.status === "completed" ? String(lastSync.completed_at ?? lastSync.completedAt ?? lastSync.created_at ?? "") : null,
      lastErrorMessage: lastSync?.sanitized_error_message ?? lastSync?.sanitizedErrorMessage ?? item.lastErrorMessage ?? null
    };
  });
  const configuredCount = integrations.filter((item) => item.status === "connected").length;
  const readiness = Math.round((configuredCount / integrations.length) * 100);
  const googleOAuth = integrations.find((item) => item.key === "google_oauth");
  const ga4 = integrations.find((item) => item.key === "ga4");
  const gsc = integrations.find((item) => item.key === "google_search_console");
  const gbp = integrations.find((item) => item.key === "google_business_profile");
  return <>
    <PageHeader title="Integrations & AI Readiness" description="Connect Google OAuth, auto-detect available data sources, then sync only verified GA4/Search Console/optional Business Profile data. Disabled providers do not show fake live data.">
      <a className="sf-button sf-button-secondary" href="/studio/settings/setup">Setup Guide</a><a className="sf-button sf-button-primary" href="/studio/ai-readiness/audit">Run Site Audit</a>
    </PageHeader>
    <div className="sf-grid sf-grid-4">
      <AiReadinessScoreCard title="Overall AI Readiness Score" score={readiness} />
      <AiReadinessScoreCard title="SEO Score" score={0} />
      <AiReadinessScoreCard title="AEO Score" score={0} />
      <AiReadinessScoreCard title="GEO Score" score={0} />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Connected Integrations</h2>
      <div className="sf-grid sf-grid-4">{integrations.map((item) => <IntegrationCard key={item.key} title={item.label} status={item.status.replace(/_/g, " ")} tone={item.status === "connected" ? "success" : item.status === "disabled" ? "warning" : "danger"} />)}</div>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Google Setup</h2>
      <div className="sf-grid sf-grid-4">
        <IntegrationCard title="Google OAuth" status={String(googleOAuth?.status ?? "not_configured").replace(/_/g, " ")} tone={googleOAuth?.status === "connected" ? "success" : "warning"} />
        <IntegrationCard title="GA4" status={String(ga4?.selectedPropertyId ? ga4.status : "manual setup or auto-detect needed").replace(/_/g, " ")} tone={ga4?.status === "connected" ? "success" : "warning"} />
        <IntegrationCard title="Search Console" status={String(gsc?.selectedSiteUrl ? gsc.status : "manual setup or auto-detect needed").replace(/_/g, " ")} tone={gsc?.status === "connected" ? "success" : "warning"} />
        <IntegrationCard title="Google Business Profile" status={String(gbp?.selectedLocationId ? gbp.status : "optional for online POD").replace(/_/g, " ")} tone={gbp?.status === "connected" ? "success" : "warning"} />
      </div>
      <p className="sf-muted">Recommended flow: Connect Google OAuth, run Auto-detect Google setup, save the selected resources, then sync. Business Profile is optional for online-only Salty Cowhide POD launch readiness.</p>
    </section>
    <IntegrationActionsClient integrations={integrations} />
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card"><h2>Provider Capabilities</h2><DataTable columns={["Provider", "Status", "Setup required"]} rows={integrations.map((item) => [item.label, <StatusBadge key={item.key} status={item.status.replace(/_/g, " ")} tone={item.status === "configured" ? "success" : "warning"} />, item.setupRequired.length ? item.setupRequired.join(", ") : "None"])} /></section>
      <section className="sf-card"><h2>Google Data Readiness</h2><DataTable columns={["Data source", "Status", "Last sync or blocker"]} rows={[
        ["GA4", <StatusBadge key="ga4" status={String(integrations.find((item) => item.key === "ga4")?.status ?? "not configured").replace(/_/g, " ")} tone={integrations.find((item) => item.key === "ga4")?.status === "connected" ? "success" : "warning"} />, integrations.find((item) => item.key === "ga4")?.lastSuccessfulSync ?? integrations.find((item) => item.key === "ga4")?.setupRequired.join(", ") ?? "Configure Google OAuth"],
        ["Search Console", <StatusBadge key="gsc" status={String(integrations.find((item) => item.key === "google_search_console")?.status ?? "not configured").replace(/_/g, " ")} tone={integrations.find((item) => item.key === "google_search_console")?.status === "connected" ? "success" : "warning"} />, integrations.find((item) => item.key === "google_search_console")?.lastSuccessfulSync ?? integrations.find((item) => item.key === "google_search_console")?.setupRequired.join(", ") ?? "Configure Google OAuth"],
        ["Business Profile", <StatusBadge key="gbp" status={String(integrations.find((item) => item.key === "google_business_profile")?.status ?? "not configured").replace(/_/g, " ")} tone={integrations.find((item) => item.key === "google_business_profile")?.status === "connected" ? "success" : "warning"} />, integrations.find((item) => item.key === "google_business_profile")?.lastSuccessfulSync ?? integrations.find((item) => item.key === "google_business_profile")?.setupRequired.join(", ") ?? "Configure Google OAuth"]
      ]} /></section>
    </div>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card"><h2>AI Tools Configuration</h2><div className="sf-stack">{["AI Chat Assistant", "Recommendation Engine", "FAQ Agent", "Review Summarizer", "Search Enhancer", "Campaign Assistant"].map((tool) => <SiteToolToggleCard key={tool} title={tool} status="Disabled by default" tone="warning" description="Requires explicit safe configuration and approved public knowledge." />)}</div></section>
    </div>
    <RecommendationCard title="AI Readiness Insights" description="llms.txt is treated as a proposed AI-readable content signal, not a guaranteed ranking factor. Provider-backed imports require real credentials and workspace authorization." />
  </>;
}
