import { createRepositories } from "@saltyfactory/db";

export const studioWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function getStudioLists() {
  if (!process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory") {
    return { trends: [], clusters: [], phrases: [], briefs: [], jobs: [], assets: [], mockups: [], drafts: [], publishReviews: [], products: [] };
  }
  const repos = createRepositories();
  const [trends, clusters, phrases, briefs, jobs, assets, mockups, drafts, publishReviews, products] = await Promise.all([
    repos.trend.listByWorkspace(studioWorkspaceId),
    repos.cluster.listByWorkspace(studioWorkspaceId),
    repos.phrase.listByWorkspace(studioWorkspaceId),
    repos.brief.listByWorkspace(studioWorkspaceId),
    repos.job.listByWorkspace(studioWorkspaceId),
    repos.asset.listByWorkspace(studioWorkspaceId),
    repos.mockup.listByWorkspace(studioWorkspaceId),
    repos.draft.listByWorkspace(studioWorkspaceId),
    repos.publish.listByWorkspace(studioWorkspaceId),
    repos.shopify.listByWorkspace(studioWorkspaceId)
  ]);
  return { trends, clusters, phrases, briefs, jobs, assets, mockups, drafts, publishReviews, products };
}

export function EmptyState({ label }: { label: string }) {
  return <section className="card"><p>No {label} records found for this workspace.</p></section>;
}
