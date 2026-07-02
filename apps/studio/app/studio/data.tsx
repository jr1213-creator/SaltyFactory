import { createRepositories } from "@saltyfactory/db";

export const studioWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const emptyLists = { trends: [], clusters: [], phrases: [], briefs: [], jobs: [], assets: [], mockups: [], drafts: [], publishReviews: [], products: [], providerConnections: [], integrationSyncRuns: [], workspaceMetrics: [], businessProfiles: [], channels: [], migrationGuides: [], baselines: [], podCandidates: [], dropshipCandidates: [], listingDraftsV1: [], socialContent: [], aiEmployees: [], activity: [] };

function isMissingTableError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /relation .* does not exist|42P01|Failed query/i.test(text);
}

function schemaIncomplete(error: unknown) {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") throw error;
  if (!isMissingTableError(error)) throw error;
  return {
    ...emptyLists,
    schemaIncomplete: true,
    setupMessage: "Database schema incomplete. Apply migrations to enable this feature."
  };
}

export async function getStudioLists() {
  if (!process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory") {
    return { ...emptyLists, schemaIncomplete: true, setupMessage: "Database schema incomplete. Apply migrations to enable this feature." };
  }
  try {
    const repos = createRepositories();
    const [trends, clusters, phrases, briefs, jobs, assets, mockups, drafts, publishReviews, products, providerConnections, integrationSyncRuns, workspaceMetrics, businessProfiles, channels, migrationGuides, baselines, podCandidates, dropshipCandidates, listingDraftsV1, socialContent, aiEmployees, activity] = await Promise.all([
      repos.trend.listByWorkspace(studioWorkspaceId),
      repos.cluster.listByWorkspace(studioWorkspaceId),
      repos.phrase.listByWorkspace(studioWorkspaceId),
      repos.brief.listByWorkspace(studioWorkspaceId),
      repos.job.listByWorkspace(studioWorkspaceId),
      repos.asset.listByWorkspace(studioWorkspaceId),
      repos.mockup.listByWorkspace(studioWorkspaceId),
      repos.draft.listByWorkspace(studioWorkspaceId),
      repos.publish.listByWorkspace(studioWorkspaceId),
      repos.shopify.listByWorkspace(studioWorkspaceId),
      repos.integration.listProviderConnectionsForWorkspace(studioWorkspaceId),
      repos.integration.listIntegrationSyncRuns(studioWorkspaceId),
      repos.workspaceMetric.listByWorkspace(studioWorkspaceId),
      repos.businessProfileV1.listByWorkspace(studioWorkspaceId),
      repos.channel.listByWorkspace(studioWorkspaceId),
      repos.migrationWizard.listByWorkspace(studioWorkspaceId),
      repos.baseline.listByWorkspace(studioWorkspaceId),
      repos.podMigration.listByWorkspace(studioWorkspaceId),
      repos.dropshipping.listByWorkspace(studioWorkspaceId),
      repos.listingDraftV1.listByWorkspace(studioWorkspaceId),
      repos.socialContent.listByWorkspace(studioWorkspaceId),
      repos.aiEmployee.listByWorkspace(studioWorkspaceId),
      repos.audit.listByWorkspace(studioWorkspaceId)
    ]);
    return { trends, clusters, phrases, briefs, jobs, assets, mockups, drafts, publishReviews, products, providerConnections, integrationSyncRuns, workspaceMetrics, businessProfiles, channels, migrationGuides, baselines, podCandidates, dropshipCandidates, listingDraftsV1, socialContent, aiEmployees, activity, schemaIncomplete: false, setupMessage: "" };
  } catch (error) {
    return schemaIncomplete(error);
  }
}

export function EmptyState({ label }: { label: string }) {
  return <section className="card"><p>No {label} records found for this workspace.</p></section>;
}

export function SchemaSetupState({ message }: { message?: string }) {
  return message ? <section className="card"><p>{message}</p></section> : null;
}
