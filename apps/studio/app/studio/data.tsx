import { createRepositories } from "@saltyfactory/db";

export const studioWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const emptyLists = { trends: [], clusters: [], phrases: [], briefs: [], jobs: [], assets: [], mockups: [], drafts: [], publishReviews: [], products: [], providerConnections: [], integrationSyncRuns: [], workspaceMetrics: [], businessProfiles: [], channels: [], migrationGuides: [], baselines: [], podCandidates: [], dropshipCandidates: [], listingDraftsV1: [], socialContent: [], aiEmployees: [], activity: [] };

function collectErrorText(error: unknown) {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) parts.push(current.message);
    if (typeof current === "object") {
      const record = current as { code?: unknown; cause?: unknown; detail?: unknown };
      if (record.code) parts.push(String(record.code));
      if (record.detail) parts.push(String(record.detail));
      current = record.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

export function isSchemaIncompleteError(error: unknown) {
  const text = collectErrorText(error);
  return /relation .* does not exist|column .* does not exist|42P01|42703/i.test(text);
}

function schemaIncomplete(error: unknown) {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") throw error;
  if (!isSchemaIncompleteError(error)) throw error;
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
