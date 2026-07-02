import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { getIntegrationStates, googleOAuthSetupRequired } from "@saltyfactory/integrations";
import { workspaceId } from "../../_shared";
import { studioAuthErrorResponse } from "../../../_auth";

function safeConnection(row: any) {
  if (!row) return null;
  const configuration = (row.configuration ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    provider: row.provider_type ?? row.providerType,
    status: row.status,
    enabled: Boolean(row.enabled),
    lastHealthCheckAt: row.last_health_check_at ?? row.lastHealthCheckAt ?? null,
    lastHealthCheckStatus: row.last_health_check_status ?? row.lastHealthCheckStatus ?? null,
    credentialStored: Boolean(row.secret_ref ?? row.secretRef),
    googleEmail: typeof configuration.googleEmail === "string" ? configuration.googleEmail : null,
    scopes: Array.isArray(configuration.scopes) ? configuration.scopes : [],
    selectedPropertyId: configuration.ga4PropertyId ?? configuration.selectedPropertyId ?? null,
    selectedSiteUrl: configuration.searchConsoleSiteUrl ?? configuration.selectedSiteUrl ?? null,
    selectedAccountId: configuration.businessProfileAccountId ?? configuration.selectedAccountId ?? null,
    selectedLocationId: configuration.businessProfileLocationId ?? configuration.selectedLocationId ?? null
  };
}

function latestRun(rows: any[], provider: string) {
  return rows
    .filter((row) => (row.provider_key ?? row.providerKey) === provider)
    .sort((a, b) => String(b.completed_at ?? b.completedAt ?? b.created_at ?? "").localeCompare(String(a.completed_at ?? a.completedAt ?? a.created_at ?? "")))[0] ?? null;
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const config = parseEnv();
    const repos = createRepositories();
    const [connections, syncRuns, metrics] = await Promise.all([
      repos.integration.listProviderConnectionsForWorkspace(workspaceId),
      repos.integration.listIntegrationSyncRuns(workspaceId),
      repos.workspaceMetric.listByWorkspace(workspaceId)
    ]);
    const byProvider = Object.fromEntries(connections.map((connection: any) => [String(connection.provider_type ?? connection.providerType), connection]));
    const states = getIntegrationStates(config).filter((state) => ["google_oauth", "ga4", "google_search_console", "google_business_profile"].includes(state.key));
    const oauthSetupRequired = googleOAuthSetupRequired(config);
    return NextResponse.json({
      ok: true,
      status: "retrieved",
      provider: "google",
      setupRequired: oauthSetupRequired,
      integrations: states.map((state) => ({ ...state, persistedStatus: byProvider[state.key]?.status ?? null })),
      connection: safeConnection(byProvider.google_oauth),
      dataSources: {
        ga4: { connection: safeConnection(byProvider.ga4), lastSync: latestRun(syncRuns, "ga4") },
        searchConsole: { connection: safeConnection(byProvider.google_search_console), lastSync: latestRun(syncRuns, "google_search_console") },
        businessProfile: { connection: safeConnection(byProvider.google_business_profile), lastSync: latestRun(syncRuns, "google_business_profile") }
      },
      metrics: metrics
        .filter((metric: any) => ["ga4", "google_search_console", "google_business_profile"].includes(String(metric.source)))
        .slice(-50)
        .map((metric: any) => ({
          metricKey: metric.metric_key ?? metric.metricKey,
          metricValue: metric.metric_value ?? metric.metricValue,
          source: metric.source,
          dimensionJson: metric.dimension_json ?? metric.dimensionJson ?? {},
          measuredAt: metric.measured_at ?? metric.measuredAt
        }))
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
