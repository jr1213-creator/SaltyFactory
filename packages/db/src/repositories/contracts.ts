import type { AuditEvent, PublishReview } from "@saltyfactory/domain";

export type WorkspaceRow = {
  id: string;
  workspace_id?: string;
  workspaceId?: string;
  status?: string;
  approval_status?: string;
  approvalStatus?: string;
  approved_by?: string | null;
  approvedBy?: string | null;
  approved_at?: string | Date | null;
  approvedAt?: string | Date | null;
  archived_at?: string | Date | null;
  archivedAt?: string | Date | null;
  updated_at?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

export type AuditWriter = (event: AuditEvent | WorkspaceRow) => Promise<void>;

export type RepositoryAdapterKind = "memory" | "drizzle";

export interface BaseRepositoryContract<T extends WorkspaceRow = WorkspaceRow> {
  readonly tableName: string;
  create(row: T, audit?: WorkspaceRow): Promise<T>;
  update(id: string, patch: Partial<T>, audit?: WorkspaceRow): Promise<T>;
  getById(id: string, workspaceId?: string): Promise<T | null>;
  list(): Promise<T[]>;
  listByWorkspace(workspaceId: string): Promise<T[]>;
  listByStatus(workspaceId: string, status: string): Promise<T[]>;
  archive(id: string, actorId?: string): Promise<T>;
  reject(id: string, actorId: string, notes?: string): Promise<T>;
  approve(id: string, actorId: string): Promise<T>;
  createAuditEvent(event: WorkspaceRow | AuditEvent): Promise<void>;
}

export interface GenerationJobRepositoryContract extends BaseRepositoryContract {
  claimQueued(workspaceId?: string): Promise<WorkspaceRow | null>;
  markCompleted(id: string, outputAssetId?: string): Promise<WorkspaceRow>;
  markFailed(id: string, error: string, retryable?: boolean): Promise<WorkspaceRow>;
}

export interface PublishReviewRepositoryContract extends BaseRepositoryContract<PublishReview & WorkspaceRow> {
  getByProductDraftId(workspaceId: string, productDraftId: string): Promise<(PublishReview & WorkspaceRow) | null>;
  markReviewed(id: string, actorId: string, gates: Record<string, boolean>, notes?: string[]): Promise<PublishReview & WorkspaceRow>;
}

export interface ProductDraftRepositoryContract extends BaseRepositoryContract {
  listApprovedForStorefront(workspaceId: string): Promise<Array<Record<string, unknown>>>;
}

export interface SiteAuditRepositoryContract extends BaseRepositoryContract {
  findings: BaseRepositoryContract;
  latest(workspaceId: string): Promise<WorkspaceRow | null>;
  createRun(row: WorkspaceRow, findings?: WorkspaceRow[], audit?: WorkspaceRow): Promise<WorkspaceRow>;
}

export interface TrendIntelligenceRepositoryContract {
  profiles: BaseRepositoryContract;
  sources: BaseRepositoryContract;
  runs: BaseRepositoryContract;
  clusters: BaseRepositoryContract;
  clusterSignals: BaseRepositoryContract;
  scores: BaseRepositoryContract;
  reports: BaseRepositoryContract;
  concepts: BaseRepositoryContract;
  citations: BaseRepositoryContract;
  rejectedSignals: BaseRepositoryContract;
  getSourceByKey(workspaceId: string, sourceKey: string): Promise<WorkspaceRow | null>;
  listSourcesByKeys(workspaceId: string, sourceKeys: string[]): Promise<WorkspaceRow[]>;
  listSignalsByProfile(workspaceId: string, profileId: string): Promise<WorkspaceRow[]>;
  listRunsByProfile(workspaceId: string, profileId: string): Promise<WorkspaceRow[]>;
  listSignalsByRun(workspaceId: string, runId: string): Promise<WorkspaceRow[]>;
  listClustersByProfile(workspaceId: string, profileId: string): Promise<WorkspaceRow[]>;
  listScoresByProfile(workspaceId: string, profileId: string): Promise<WorkspaceRow[]>;
  listScoresByCluster(workspaceId: string, clusterId: string): Promise<WorkspaceRow[]>;
  listReportsByProfile(workspaceId: string, profileId: string): Promise<WorkspaceRow[]>;
  getReportByAgentRunId(workspaceId: string, agentRunId: string): Promise<WorkspaceRow | null>;
  listConceptsByProfile(workspaceId: string, profileId: string): Promise<WorkspaceRow[]>;
  listCitationsForEntity(workspaceId: string, entityType: string, entityId: string): Promise<WorkspaceRow[]>;
}

export interface MarketingRepositoryContract {
  campaigns: BaseRepositoryContract;
  assets: BaseRepositoryContract;
  brandVoiceProfiles: BaseRepositoryContract;
  sources: BaseRepositoryContract;
  sourceRuns: BaseRepositoryContract;
  readiness: BaseRepositoryContract;
  launchPlans: BaseRepositoryContract;
  positioningStatements: BaseRepositoryContract;
  offerHypotheses: BaseRepositoryContract;
  audienceHypotheses: BaseRepositoryContract;
  adAngles: BaseRepositoryContract;
  adCopyVariants: BaseRepositoryContract;
  organicContentDrafts: BaseRepositoryContract;
  lifecycleCampaignFlows: BaseRepositoryContract;
  creativeBriefs: BaseRepositoryContract;
  landingPageRecommendations: BaseRepositoryContract;
  channelRecommendations: BaseRepositoryContract;
  mediaPlanDrafts: BaseRepositoryContract;
  campaignDrafts: BaseRepositoryContract;
  approvalRequests: BaseRepositoryContract;
  policyReviewResults: BaseRepositoryContract;
  budgetRecommendations: BaseRepositoryContract;
  getSourceByKey(workspaceId: string, sourceKey: string): Promise<WorkspaceRow | null>;
  getBrandVoiceProfileByName(workspaceId: string, brandName: string): Promise<WorkspaceRow | null>;
  listLaunchPlansBySourceEntity(workspaceId: string, sourceEntityType: string, sourceEntityId: string): Promise<WorkspaceRow[]>;
  listApprovalRequestsByLaunchPlan(workspaceId: string, launchPlanId: string): Promise<WorkspaceRow[]>;
  listApprovalRequestsByStatus(workspaceId: string, ownerDecision: string): Promise<WorkspaceRow[]>;
}

export interface CrmRepositoryContract {
  customers: BaseRepositoryContract;
  companies: BaseRepositoryContract;
  contactMethods: BaseRepositoryContract;
  addresses: BaseRepositoryContract;
  tags: BaseRepositoryContract;
  customerTags: BaseRepositoryContract;
  sources: BaseRepositoryContract;
  preferences: BaseRepositoryContract;
  productInterests: BaseRepositoryContract;
  metrics: BaseRepositoryContract;
  externalRefs: BaseRepositoryContract;
  timelineEvents: BaseRepositoryContract;
  interactions: BaseRepositoryContract;
  notes: BaseRepositoryContract;
  tasks: BaseRepositoryContract;
  taskTemplates: BaseRepositoryContract;
  leads: BaseRepositoryContract;
  opportunities: BaseRepositoryContract;
  quotes: BaseRepositoryContract;
  deals: BaseRepositoryContract;
  pipelineStages: BaseRepositoryContract;
  serviceCases: BaseRepositoryContract;
  conversations: BaseRepositoryContract;
  conversationMessages: BaseRepositoryContract;
  supportCases: BaseRepositoryContract;
  helpTopics: BaseRepositoryContract;
  inboxChannels: BaseRepositoryContract;
  campaigns: BaseRepositoryContract;
  campaignMembers: BaseRepositoryContract;
  messageTemplates: BaseRepositoryContract;
  landingPages: BaseRepositoryContract;
  forms: BaseRepositoryContract;
  formSubmissions: BaseRepositoryContract;
  consents: BaseRepositoryContract;
  unsubscribePreferences: BaseRepositoryContract;
  events: BaseRepositoryContract;
  personEvents: BaseRepositoryContract;
  behavioralTraits: BaseRepositoryContract;
  surveys: BaseRepositoryContract;
  surveyResponses: BaseRepositoryContract;
  featureFlags: BaseRepositoryContract;
  customerCohorts: BaseRepositoryContract;
  behaviorSegments: BaseRepositoryContract;
  aiInsights: BaseRepositoryContract;
  nextActions: BaseRepositoryContract;
  recommendationEvents: BaseRepositoryContract;
  automationRules: BaseRepositoryContract;
  automationRuns: BaseRepositoryContract;
  importBatches: BaseRepositoryContract;
  syncState: BaseRepositoryContract;
  appointmentTypes: BaseRepositoryContract;
  bookingRequests: BaseRepositoryContract;
  consultations: BaseRepositoryContract;
  availabilityReadiness: BaseRepositoryContract;
}

export interface SharedKernelRepositoryContract {
  providerConnections: BaseRepositoryContract;
  sourceRecords: BaseRepositoryContract;
  events: BaseRepositoryContract;
  auditLog: BaseRepositoryContract;
  approvals: BaseRepositoryContract;
  tasks: BaseRepositoryContract;
  notes: BaseRepositoryContract;
  recommendations: BaseRepositoryContract;
  readinessScores: BaseRepositoryContract;
  exportPackages: BaseRepositoryContract;
  assets: BaseRepositoryContract;
  templates: BaseRepositoryContract;
  automationRules: BaseRepositoryContract;
  setupAssistanceRequests: BaseRepositoryContract;
  segments: BaseRepositoryContract;
  verticalPacks: BaseRepositoryContract;
  campaigns: BaseRepositoryContract;
  campaignChannels: BaseRepositoryContract;
  utmLinks: BaseRepositoryContract;
}

export interface AiWorkforceRepositoryContract {
  hireRequests: BaseRepositoryContract;
  roleSpecs: BaseRepositoryContract;
  employeeDefinitions: BaseRepositoryContract;
  permissionScopes: BaseRepositoryContract;
  improvementSuggestions: BaseRepositoryContract;
  capabilityRequests: BaseRepositoryContract;
  trainingRequests: BaseRepositoryContract;
  toolAccessRequests: BaseRepositoryContract;
  feedbackEvents: BaseRepositoryContract;
}

export interface AiModelRuntimeRepositoryContract {
  providers: BaseRepositoryContract;
  models: BaseRepositoryContract;
  assignments: BaseRepositoryContract;
  evaluations: BaseRepositoryContract;
  usageEvents: BaseRepositoryContract;
}

export interface BusinessOsRepositoryContract {
  metricsSnapshots: BaseRepositoryContract;
  costInputs: BaseRepositoryContract;
  unitEconomics: BaseRepositoryContract;
  opportunities: BaseRepositoryContract;
  decisionMemos: BaseRepositoryContract;
  forecasts: BaseRepositoryContract;
  experiments: BaseRepositoryContract;
  channelReadiness: BaseRepositoryContract;
  profiles: BaseRepositoryContract;
  sensitiveFields: BaseRepositoryContract;
  goals: BaseRepositoryContract;
  mantras: BaseRepositoryContract;
  documents: BaseRepositoryContract;
  documentExports: BaseRepositoryContract;
  printOrders: BaseRepositoryContract;
  bankConnections: BaseRepositoryContract;
  bankTransactions: BaseRepositoryContract;
  authorityRequests: BaseRepositoryContract;
}

export interface IntegrationRepositoryContract extends BaseRepositoryContract {
  credentials: BaseRepositoryContract;
  syncRuns: BaseRepositoryContract;
  statuses: BaseRepositoryContract;
  createProviderConnection(row: WorkspaceRow, audit?: WorkspaceRow): Promise<WorkspaceRow>;
  updateProviderConnectionStatus(workspaceId: string, providerKey: string, patch: WorkspaceRow, audit?: WorkspaceRow): Promise<WorkspaceRow>;
  listProviderConnectionsForWorkspace(workspaceId: string): Promise<WorkspaceRow[]>;
  getProviderConnectionForWorkspace(workspaceId: string, providerKey: string): Promise<WorkspaceRow | null>;
  saveEncryptedCredential(row: WorkspaceRow, audit?: WorkspaceRow): Promise<WorkspaceRow>;
  getCredentialForServerUseOnly(workspaceId: string, credentialRef: string): Promise<WorkspaceRow | null>;
  deleteCredential(workspaceId: string, credentialRef: string, actorId?: string): Promise<WorkspaceRow | null>;
  createIntegrationSyncRun(row: WorkspaceRow, audit?: WorkspaceRow): Promise<WorkspaceRow>;
  updateIntegrationSyncRun(id: string, patch: WorkspaceRow, audit?: WorkspaceRow): Promise<WorkspaceRow>;
  listIntegrationSyncRuns(workspaceId: string, providerKey?: string): Promise<WorkspaceRow[]>;
  writeIntegrationAuditEvent(event: WorkspaceRow | AuditEvent): Promise<void>;
}

export interface RepositoryBundle {
  readonly adapter: RepositoryAdapterKind;
  audit: BaseRepositoryContract & { write(event: AuditEvent | WorkspaceRow): Promise<WorkspaceRow> };
  workspace: BaseRepositoryContract & { listByOrganization(organizationId: string): Promise<WorkspaceRow[]> };
  brandProfile: BaseRepositoryContract;
  trend: BaseRepositoryContract & { listNew(workspaceId: string): Promise<WorkspaceRow[]> };
  cluster: BaseRepositoryContract & { approveForGeneration(id: string, actorId: string): Promise<WorkspaceRow> };
  phrase: BaseRepositoryContract & { approveForDesign(id: string, actorId: string): Promise<WorkspaceRow> };
  risk: BaseRepositoryContract & { listForEntity(workspaceId: string, entityType: string, entityId: string): Promise<WorkspaceRow[]> };
  brief: BaseRepositoryContract & { approveForGeneration(id: string, actorId: string): Promise<WorkspaceRow> };
  job: GenerationJobRepositoryContract;
  asset: BaseRepositoryContract & { approveForMockup(id: string, actorId: string): Promise<WorkspaceRow> };
  qa: BaseRepositoryContract & { markPassed(id: string, actorId?: string): Promise<WorkspaceRow> };
  mockup: BaseRepositoryContract & { approveForProduct(id: string, actorId: string): Promise<WorkspaceRow> };
  draft: ProductDraftRepositoryContract;
  variant: BaseRepositoryContract & { listByDraft(workspaceId: string, productDraftId: string): Promise<WorkspaceRow[]> };
  productBatch: BaseRepositoryContract;
  productBatchItem: BaseRepositoryContract;
  margin: BaseRepositoryContract & { listBlocked(workspaceId: string): Promise<WorkspaceRow[]> };
  publish: PublishReviewRepositoryContract;
  siteAudit: SiteAuditRepositoryContract;
  trendIntelligence: TrendIntelligenceRepositoryContract;
  integration: IntegrationRepositoryContract;
  workspaceMetric: BaseRepositoryContract;
  businessProfileV1: BaseRepositoryContract;
  channel: BaseRepositoryContract;
  migrationWizard: BaseRepositoryContract;
  baseline: BaseRepositoryContract;
  podMigration: BaseRepositoryContract;
  dropshipping: BaseRepositoryContract;
  listingDraftV1: BaseRepositoryContract;
  socialContent: BaseRepositoryContract;
  shopify: BaseRepositoryContract;
  printify: BaseRepositoryContract;
  fulfillment: BaseRepositoryContract & { listByOrder(workspaceId: string, orderId: string): Promise<WorkspaceRow[]> };
  aiEmployee: BaseRepositoryContract & {
    tasks: BaseRepositoryContract;
    runs: BaseRepositoryContract;
    outputs: BaseRepositoryContract;
    transcriptEvents: BaseRepositoryContract;
    permissions: BaseRepositoryContract;
    createRun(row: WorkspaceRow): Promise<WorkspaceRow>;
    listRunsByStatus(workspaceId: string, status: string): Promise<WorkspaceRow[]>;
  };
  marketing: MarketingRepositoryContract;
  support: BaseRepositoryContract & { drafts: BaseRepositoryContract };
  billing: BaseRepositoryContract & { plans: BaseRepositoryContract; events: BaseRepositoryContract; featureLimits: BaseRepositoryContract };
  crm: CrmRepositoryContract;
  shared: SharedKernelRepositoryContract;
  aiWorkforce: AiWorkforceRepositoryContract;
  aiModelRuntime: AiModelRuntimeRepositoryContract;
  business: BusinessOsRepositoryContract;
}

export type RepositoryRuntimeConfig = {
  NODE_ENV?: string;
  APP_ENV?: string;
  DATABASE_URL?: string;
  DIRECT_DATABASE_URL?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  REPOSITORY_ADAPTER?: string;
  PLAYWRIGHT_AUTH_BYPASS?: string;
};

export const now = () => new Date().toISOString();

export const workspaceOf = (row: WorkspaceRow) => String(row.workspace_id ?? row.workspaceId ?? "");

export function requireWorkspaceAccess(
  memberships: Array<{ user_id?: string; userId?: string; workspace_id?: string; workspaceId?: string; status?: string }>,
  userId: string,
  workspaceId: string
) {
  const ok = memberships.some((membership) =>
    (membership.user_id ?? membership.userId) === userId &&
    (membership.workspace_id ?? membership.workspaceId) === workspaceId &&
    (membership.status ?? "active") === "active"
  );
  if (!ok) throw new Error("workspace_access_denied");
  return true;
}

export function toPublicStorefrontProjection(row: WorkspaceRow) {
  const projection = (row.public_projection ?? row.publicProjection) as Record<string, unknown> | undefined;
  if (projection && projection.status === "published") {
    return {
      id: projection.id ?? row.id,
      handle: projection.handle ?? row.public_handle ?? row.publicHandle,
      title: projection.title ?? row.title,
      description: projection.description ?? row.description,
      product_type: projection.product_type ?? projection.productType ?? row.product_type ?? row.productType,
      collection: projection.collection ?? row.collection,
      tags: projection.tags ?? [],
      images: projection.images ?? [],
      variants: projection.variants ?? [],
      price: projection.price,
      seo_title: projection.seo_title ?? projection.seoTitle,
      seo_description: projection.seo_description ?? projection.seoDescription,
      schema: projection.schema
    };
  }
  return {
    id: row.id,
    handle: row.public_handle ?? row.publicHandle,
    title: row.title,
    description: row.description,
    product_type: row.product_type ?? row.productType,
    collection: row.collection,
    tags: row.tags ?? [],
    images: row.public_images ?? row.publicImages ?? [],
    variants: row.public_variants ?? row.publicVariants ?? []
  };
}
