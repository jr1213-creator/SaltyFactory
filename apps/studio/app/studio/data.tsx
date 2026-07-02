import { createRepositories } from "@saltyfactory/db";

export const studioWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const emptyLists = { trends: [], clusters: [], phrases: [], briefs: [], jobs: [], assets: [], mockups: [], drafts: [], publishReviews: [], products: [], providerConnections: [], integrationSyncRuns: [], workspaceMetrics: [], businessProfiles: [], channels: [], migrationGuides: [], baselines: [], podCandidates: [], dropshipCandidates: [], listingDraftsV1: [], socialContent: [], aiEmployees: [], activity: [] };
type StudioDataSetupKind =
  | "schema_incomplete"
  | "database_not_configured"
  | "database_unreachable"
  | "database_permission_denied"
  | "workspace_setup_required"
  | "data_unavailable";

const setupMessages: Record<StudioDataSetupKind, string> = {
  schema_incomplete: "Database schema incomplete. Apply migrations to enable this feature.",
  database_not_configured: "Studio database is not configured. Set DATABASE_URL for the Studio runtime, or explicitly use REPOSITORY_ADAPTER=memory for local fixtures.",
  database_unreachable: "Studio database is configured but unreachable. Check local network access, DATABASE_URL/DIRECT_DATABASE_URL, and restart Studio.",
  database_permission_denied: "Studio database access is blocked. Check database grants, row-level security, and workspace access.",
  workspace_setup_required: "Studio workspace setup is incomplete. Confirm the configured workspace exists and the signed-in user is a member.",
  data_unavailable: "Studio data is unavailable. Check the database connection and workspace setup."
};
const businessProfileUnavailableMessage = "Business profile unavailable. Check database access and workspace setup.";

function collectErrorInfo(error: unknown) {
  const parts: string[] = [];
  const codes = new Set<string>();
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) parts.push(current.message);
    if (typeof current === "object") {
      const record = current as { code?: unknown; cause?: unknown; detail?: unknown };
      if (record.code) {
        const code = String(record.code);
        codes.add(code);
        parts.push(code);
      }
      if (record.detail) parts.push(String(record.detail));
      current = record.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return { text: parts.join("\n"), codes };
}

export function sanitizeStudioDataError(error: unknown) {
  return collectErrorInfo(error).text
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]")
    .replace(/\b(access|refresh|id)_token\b\s*[:=]\s*["']?[^"',\s]+/gi, "$1_token=[redacted]")
    .replace(/\b(client_secret|service_role_key|api_key)\b\s*[:=]\s*["']?[^"',\s]+/gi, "$1=[redacted]")
    .slice(0, 800);
}

export function classifyStudioDataError(error: unknown): StudioDataSetupKind {
  const { text, codes } = collectErrorInfo(error);
  if (codes.has("42P01") || codes.has("42703") || /(?:relation|column)\s+"?[\w. ]+"?\s+does not exist/i.test(text)) {
    return "schema_incomplete";
  }
  if (/DATABASE_URL is (missing|required)|DATABASE_URL is required/i.test(text)) return "database_not_configured";
  if (
    ["EACCES", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].some((code) => codes.has(code)) ||
    /\bconnect\s+(?:EACCES|ECONNREFUSED|ETIMEDOUT|ENOTFOUND)|connection terminated|could not connect|network|timeout/i.test(text)
  ) {
    return "database_unreachable";
  }
  if (codes.has("42501") || /permission denied|row-level security|rls\b|not authorized|forbidden/i.test(text)) {
    return "database_permission_denied";
  }
  if (/workspace .*not found|organization .*not found|membership .*required|not a workspace member|workspace access/i.test(text)) {
    return "workspace_setup_required";
  }
  return "data_unavailable";
}

export function isSchemaIncompleteError(error: unknown) {
  return classifyStudioDataError(error) === "schema_incomplete";
}

function setupState(kind: StudioDataSetupKind, setupMessage = setupMessages[kind]) {
  return {
    ...emptyLists,
    schemaIncomplete: kind === "schema_incomplete",
    setupMessage
  };
}

function logStudioDataDiagnostic(kind: StudioDataSetupKind, error: unknown, source = "studio_data") {
  if (process.env.STUDIO_DATA_DIAGNOSTICS !== "true") return;
  console.warn(JSON.stringify({
    component: source,
    setupKind: kind,
    error: sanitizeStudioDataError(error)
  }));
}

export function businessProfileSetupStateForError(error: unknown) {
  const kind = classifyStudioDataError(error);
  const message = kind === "data_unavailable" ? businessProfileUnavailableMessage : setupMessages[kind];
  return setupState(kind, message);
}

function handleStudioDataError(error: unknown, source?: string) {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") throw error;
  const kind = classifyStudioDataError(error);
  logStudioDataDiagnostic(kind, error, source);
  return setupState(kind);
}

function handleBusinessProfileDataError(error: unknown) {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") throw error;
  const state = businessProfileSetupStateForError(error);
  logStudioDataDiagnostic(classifyStudioDataError(error), error, "business_profile_loader");
  return state;
}

export async function getBusinessProfileStudioData() {
  if (!process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory") {
    return setupState("database_not_configured");
  }
  try {
    const repos = createRepositories();
    const businessProfiles = await repos.businessProfileV1.listByWorkspace(studioWorkspaceId);
    return { ...emptyLists, businessProfiles, schemaIncomplete: false, setupMessage: "" };
  } catch (error) {
    return handleBusinessProfileDataError(error);
  }
}

export async function getStudioLists() {
  if (!process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory") {
    return setupState("database_not_configured");
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
    return handleStudioDataError(error, "studio_lists_loader");
  }
}

export function EmptyState({ label }: { label: string }) {
  return <section className="card"><p>No {label} records found for this workspace.</p></section>;
}

export function SchemaSetupState({ message }: { message?: string }) {
  return message ? <section className="card"><p>{message}</p></section> : null;
}
