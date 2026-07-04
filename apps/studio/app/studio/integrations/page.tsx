import { AiReadinessScoreCard, DataTable, IntegrationCard, PageHeader, RecommendationCard, SiteToolToggleCard, StatusBadge } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getIntegrationStates } from "@saltyfactory/integrations";
import { getStudioLists } from "../data";
import { IntegrationActionsClient } from "./IntegrationActionsClient";
import { getWorkspaceProviderReadiness, isProviderReady, providerCredentialSourceLabel, providerReadinessItems, type WorkspaceProviderReadinessItem } from "../_provider-readiness";

function rowProvider(row: any) {
  return String(row.provider_type ?? row.providerType ?? row.provider_key ?? row.providerKey ?? "");
}

function latestSync(rows: any[], provider: string) {
  return rows
    .filter((row) => rowProvider(row) === provider)
    .sort((a, b) => String(b.completed_at ?? b.completedAt ?? b.created_at ?? "").localeCompare(String(a.completed_at ?? a.completedAt ?? a.created_at ?? "")))[0] ?? null;
}

function ownerSafeSetupRequired(item: { key: string; setupRequired?: string[] }) {
  const setupRequired = item.setupRequired ?? [];
  if (!setupRequired.length) return [];
  if (item.key === "google_oauth") return ["Connect Google OAuth"];
  if (item.key === "ga4") return ["Connect Google OAuth", "Select GA4 property"];
  if (item.key === "google_search_console") return ["Connect Google OAuth", "Select Search Console site"];
  if (item.key === "google_business_profile") return ["Connect Google OAuth", "Select Business Profile account/location if applicable"];
  return setupRequired.map((value) => /[A-Z0-9_]{3,}/.test(value) ? "Use guided setup or advanced server fallback." : value);
}

function readinessStatusTone(item: WorkspaceProviderReadinessItem) {
  if (isProviderReady(item)) return "success" as const;
  if (item.status === "invalid" || item.status === "admin_setup_required") return "danger" as const;
  return "warning" as const;
}

function readinessStatusLabel(item: WorkspaceProviderReadinessItem) {
  if (item.status === "disabled_for_safety") return "blocked for safety";
  return item.status.replace(/_/g, " ");
}

function nextAction(item: WorkspaceProviderReadinessItem) {
  if (item.businessFacingSetupRequired.length) return item.businessFacingSetupRequired.join(", ");
  if (item.providerKey === "printify") return "Catalog browsing ready. Product creation still requires approved artwork, variants, pricing, and owner gates.";
  if (item.providerKey === "shopify") return "Draft creation ready after product gates pass. Live publish remains owner-gated.";
  if (item.providerKey === "image_generation") return "Model selected. Approved briefs can be sent to generation when storage is ready.";
  if (item.providerKey === "storage") return "Private generated asset storage and public approved asset buckets are ready.";
  return item.safeMessage;
}

export default async function Page() {
  const { providerConnections, integrationSyncRuns } = await getStudioLists();
  const providerReadiness = await getWorkspaceProviderReadiness();
  const providerItems = providerReadinessItems(providerReadiness);
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
      lastErrorMessage: lastSync?.sanitized_error_message ?? lastSync?.sanitizedErrorMessage ?? item.lastErrorMessage ?? null,
      setupRequired: ownerSafeSetupRequired(item)
    };
  }).filter((item) => !["shopify", "printify", "supabase_storage", "hugging_face"].includes(item.key));
  const configuredCount = integrations.filter((item) => item.status === "connected").length + providerItems.filter((item) => isProviderReady(item)).length;
  const readiness = Math.round((configuredCount / (integrations.length + providerItems.length)) * 100);
  const googleOAuth = integrations.find((item) => item.key === "google_oauth");
  const ga4 = integrations.find((item) => item.key === "ga4");
  const gsc = integrations.find((item) => item.key === "google_search_console");
  const gbp = integrations.find((item) => item.key === "google_business_profile");
  return <>
    <PageHeader title="Integrations & AI Readiness" description="Connect Google OAuth, auto-detect available data sources, then sync only verified GA4/Search Console/optional Business Profile data. Disabled providers do not show fake live data.">
      <a className="btn btn-secondary" href="/studio/settings/setup">Setup Guide</a><a className="btn btn-primary" href="/studio/ai-readiness/audit">Run Site Audit</a>
    </PageHeader>
    <div className="layout-grid layout-grid-4">
      <AiReadinessScoreCard title="Overall AI Readiness Score" score={readiness} />
      <AiReadinessScoreCard title="SEO Score" score={0} />
      <AiReadinessScoreCard title="AEO Score" score={0} />
      <AiReadinessScoreCard title="GEO Score" score={0} />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Provider Runtime Readiness</h2>
      <p className="text-muted">These cards use the same credential-store-aware resolver layer as runtime routes. Advanced server fallback is optional and not the primary owner setup path.</p>
      <div className="layout-grid layout-grid-4">
        {providerItems.map((item) => <IntegrationCard
          key={item.providerKey}
          title={item.label}
          status={readinessStatusLabel(item)}
          tone={readinessStatusTone(item)}
          description={`${item.safeMessage} Credential source: ${providerCredentialSourceLabel(item.credentialSource)}.`}
          actionHref={item.setupRoute}
          actionLabel={isProviderReady(item) ? "Review setup" : "Open setup"}
        />)}
      </div>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Connected Integrations</h2>
      <div className="layout-grid layout-grid-4">{integrations.map((item) => <IntegrationCard key={item.key} title={item.label} status={item.status.replace(/_/g, " ")} tone={item.status === "connected" ? "success" : item.status === "disabled" ? "warning" : "danger"} />)}</div>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Google Setup</h2>
      <div className="layout-grid layout-grid-4">
        <IntegrationCard title="Google OAuth" status={String(googleOAuth?.status ?? "not_configured").replace(/_/g, " ")} tone={googleOAuth?.status === "connected" ? "success" : "warning"} />
        <IntegrationCard title="GA4" status={String(ga4?.selectedPropertyId ? ga4.status : "manual setup or auto-detect needed").replace(/_/g, " ")} tone={ga4?.status === "connected" ? "success" : "warning"} />
        <IntegrationCard title="Search Console" status={String(gsc?.selectedSiteUrl ? gsc.status : "manual setup or auto-detect needed").replace(/_/g, " ")} tone={gsc?.status === "connected" ? "success" : "warning"} />
        <IntegrationCard title="Google Business Profile" status={String(gbp?.selectedLocationId ? gbp.status : "optional for online POD").replace(/_/g, " ")} tone={gbp?.status === "connected" ? "success" : "warning"} />
      </div>
      <p className="text-muted">Recommended flow: Connect Google OAuth, run Auto-detect Google setup, save the selected resources, then sync. Business Profile is optional for online-only Salty Cowhide POD launch readiness.</p>
    </section>
    <IntegrationActionsClient integrations={integrations} />
    <div className="layout-grid layout-grid-2" style={{ marginTop: 18 }}>
      <section className="surface-card"><h2>Provider Capabilities</h2><DataTable columns={["Provider", "Status", "Next owner action"]} rows={providerItems.map((item) => [
        item.label,
        <StatusBadge key={item.providerKey} status={readinessStatusLabel(item)} tone={readinessStatusTone(item)} />,
        nextAction(item)
      ])} /></section>
      <section className="surface-card"><h2>Google Data Readiness</h2><DataTable columns={["Data source", "Status", "Last sync or blocker"]} rows={[
        ["GA4", <StatusBadge key="ga4" status={String(integrations.find((item) => item.key === "ga4")?.status ?? "not configured").replace(/_/g, " ")} tone={integrations.find((item) => item.key === "ga4")?.status === "connected" ? "success" : "warning"} />, integrations.find((item) => item.key === "ga4")?.lastSuccessfulSync ?? integrations.find((item) => item.key === "ga4")?.setupRequired.join(", ") ?? "Configure Google OAuth"],
        ["Search Console", <StatusBadge key="gsc" status={String(integrations.find((item) => item.key === "google_search_console")?.status ?? "not configured").replace(/_/g, " ")} tone={integrations.find((item) => item.key === "google_search_console")?.status === "connected" ? "success" : "warning"} />, integrations.find((item) => item.key === "google_search_console")?.lastSuccessfulSync ?? integrations.find((item) => item.key === "google_search_console")?.setupRequired.join(", ") ?? "Configure Google OAuth"],
        ["Business Profile", <StatusBadge key="gbp" status={String(integrations.find((item) => item.key === "google_business_profile")?.status ?? "not configured").replace(/_/g, " ")} tone={integrations.find((item) => item.key === "google_business_profile")?.status === "connected" ? "success" : "warning"} />, integrations.find((item) => item.key === "google_business_profile")?.lastSuccessfulSync ?? integrations.find((item) => item.key === "google_business_profile")?.setupRequired.join(", ") ?? "Configure Google OAuth"]
      ]} /></section>
    </div>
    <div className="layout-grid layout-grid-2" style={{ marginTop: 18 }}>
      <section className="surface-card"><h2>AI Tools Configuration</h2><div className="stack-list">{["AI Chat Assistant", "Recommendation Engine", "FAQ Agent", "Review Summarizer", "Search Enhancer", "Campaign Assistant"].map((tool) => <SiteToolToggleCard key={tool} title={tool} status="Disabled by default" tone="warning" description="Requires explicit safe configuration and approved public knowledge." />)}</div></section>
    </div>
    <RecommendationCard title="AI Readiness Insights" description="llms.txt is treated as a proposed AI-readable content signal, not a guaranteed ranking factor. Provider-backed imports require real credentials and workspace authorization." />
  </>;
}
