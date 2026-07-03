import { and, eq, getTableColumns } from "drizzle-orm";
import type { AuditEvent, PublishReview } from "@saltyfactory/domain";
import type { DbClient } from "../../client";
import { getDb } from "../../client";
import { tables } from "../../schema";
import {
  type AuditWriter,
  type RepositoryBundle,
  type WorkspaceRow,
  now,
  toPublicStorefrontProjection,
  workspaceOf
} from "../contracts";

type DrizzleTable = (typeof tables)[keyof typeof tables];
type TableName = keyof typeof tables;

const tableByName: Record<string, DrizzleTable> = Object.fromEntries(
  Object.entries(tables).map(([, table]) => [(table as any)[Symbol.for("drizzle:Name")] ?? "", table])
) as Record<string, DrizzleTable>;

const tableExportByDbName: Record<string, TableName> = {
  workspaces: "workspaces",
  brand_profiles: "brandProfiles",
  trend_signals: "trendSignals",
  trend_clusters: "trendClusters",
  phrase_candidates: "phraseCandidates",
  risk_reviews: "riskReviews",
  design_briefs: "designBriefs",
  generation_jobs: "generationJobs",
  design_assets: "designAssets",
  print_file_qa: "printFileQa",
  mockup_assets: "mockupAssets",
  product_drafts: "productDrafts",
  product_variants: "productVariants",
  product_batches: "productBatches",
  product_batch_items: "productBatchItems",
  price_margin_checks: "priceMarginChecks",
  publish_reviews: "publishReviews",
  site_audit_runs: "siteAuditRuns",
  site_audit_findings: "siteAuditFindings",
  encrypted_credentials: "encryptedCredentials",
  integration_sync_runs: "integrationSyncRuns",
  provider_connection_status: "providerConnectionStatus",
  workspace_provider_connections: "workspaceProviderConnections",
  workspace_metrics: "workspaceMetrics",
  workspace_business_profiles_v1: "workspaceBusinessProfilesV1",
  workspace_channels: "workspaceChannels",
  migration_wizard_runs: "migrationWizardRuns",
  baseline_snapshots: "baselineSnapshots",
  pod_migration_candidates: "podMigrationCandidates",
  dropship_product_candidates: "dropshipProductCandidates",
  listing_drafts_v1: "listingDraftsV1",
  social_content_items: "socialContentItems",
  shopify_product_refs: "shopifyProductRefs",
  printify_product_refs: "printifyProductRefs",
  fulfillment_events: "fulfillmentEvents",
  audit_events: "auditEvents",
  ai_employees: "aiEmployees",
  ai_employee_tasks: "aiEmployeeTasks",
  ai_employee_runs: "aiEmployeeRuns",
  ai_employee_outputs: "aiEmployeeOutputs",
  ai_employee_permissions: "aiEmployeePermissions",
  ai_employee_hire_requests: "aiEmployeeHireRequests",
  ai_employee_role_specs: "aiEmployeeRoleSpecs",
  ai_employee_definitions: "aiEmployeeDefinitions",
  ai_employee_permission_scopes: "aiEmployeePermissionScopes",
  ai_improvement_suggestions: "aiImprovementSuggestions",
  ai_capability_requests: "aiCapabilityRequests",
  ai_training_requests: "aiTrainingRequests",
  ai_tool_access_requests: "aiToolAccessRequests",
  ai_agent_feedback_events: "aiAgentFeedbackEvents",
  ai_model_providers: "aiModelProviders",
  ai_models: "aiModels",
  ai_employee_model_assignments: "aiEmployeeModelAssignments",
  ai_model_evaluations: "aiModelEvaluations",
  ai_model_usage_events: "aiModelUsageEvents",
  business_metrics_snapshots: "businessMetricsSnapshots",
  business_cost_inputs: "businessCostInputs",
  business_unit_economics: "businessUnitEconomics",
  business_opportunities: "businessOpportunities",
  business_decision_memos: "businessDecisionMemos",
  business_forecasts: "businessForecasts",
  business_experiments: "businessExperiments",
  business_channel_readiness: "businessChannelReadiness",
  business_profiles: "businessProfiles",
  business_sensitive_fields: "businessSensitiveFields",
  business_goals: "businessGoals",
  business_mantras: "businessMantras",
  business_documents: "businessDocuments",
  business_document_exports: "businessDocumentExports",
  business_print_orders: "businessPrintOrders",
  business_bank_connections: "businessBankConnections",
  business_bank_transactions: "businessBankTransactions",
  business_authority_requests: "businessAuthorityRequests",
  marketing_campaigns: "marketingCampaigns",
  marketing_assets: "marketingAssets",
  support_macros: "supportMacros",
  customer_support_drafts: "customerSupportDrafts",
  subscriptions: "subscriptions",
  plans: "plans",
  billing_events: "billingEvents",
  feature_limits: "featureLimits",
  crm_customers: "crmCustomers",
  crm_companies: "crmCompanies",
  crm_contact_methods: "crmContactMethods",
  crm_addresses: "crmAddresses",
  crm_tags: "crmTags",
  crm_customer_tags: "crmCustomerTags",
  crm_sources: "crmSources",
  crm_customer_preferences: "crmCustomerPreferences",
  crm_customer_product_interests: "crmCustomerProductInterests",
  crm_customer_metrics: "crmCustomerMetrics",
  crm_customer_external_refs: "crmCustomerExternalRefs",
  crm_timeline_events: "crmTimelineEvents",
  crm_interactions: "crmInteractions",
  crm_notes: "crmNotes",
  crm_tasks: "crmTasks",
  crm_task_templates: "crmTaskTemplates",
  crm_leads: "crmLeads",
  crm_opportunities: "crmOpportunities",
  crm_quotes: "crmQuotes",
  crm_deals: "crmDeals",
  crm_pipeline_stages: "crmPipelineStages",
  crm_service_cases: "crmServiceCases",
  crm_conversations: "crmConversations",
  crm_conversation_messages: "crmConversationMessages",
  crm_support_cases: "crmSupportCases",
  crm_help_topics: "crmHelpTopics",
  crm_inbox_channels: "crmInboxChannels",
  crm_campaigns: "crmCampaigns",
  crm_campaign_members: "crmCampaignMembers",
  crm_message_templates: "crmMessageTemplates",
  crm_landing_pages: "crmLandingPages",
  crm_forms: "crmForms",
  crm_form_submissions: "crmFormSubmissions",
  crm_consents: "crmConsents",
  crm_unsubscribe_preferences: "crmUnsubscribePreferences",
  crm_events: "crmEvents",
  crm_person_events: "crmPersonEvents",
  crm_behavioral_traits: "crmBehavioralTraits",
  crm_surveys: "crmSurveys",
  crm_survey_responses: "crmSurveyResponses",
  crm_feature_flags: "crmFeatureFlags",
  crm_customer_cohorts: "crmCustomerCohorts",
  crm_behavior_segments: "crmBehaviorSegments",
  crm_ai_insights: "crmAiInsights",
  crm_next_actions: "crmNextActions",
  crm_recommendation_events: "crmRecommendationEvents",
  crm_automation_rules: "crmAutomationRules",
  crm_automation_runs: "crmAutomationRuns",
  crm_import_batches: "crmImportBatches",
  crm_sync_state: "crmSyncState",
  crm_appointment_types: "crmAppointmentTypes",
  crm_booking_requests: "crmBookingRequests",
  crm_consultations: "crmConsultations",
  crm_availability_readiness: "crmAvailabilityReadiness",
  provider_connections: "providerConnections",
  source_records: "sourceRecords",
  events: "events",
  audit_log: "auditLog",
  setup_assistance_requests: "setupAssistanceRequests",
  approvals: "approvals",
  tasks: "tasks",
  notes: "notes",
  recommendations: "recommendations",
  readiness_scores: "readinessScores",
  export_packages: "exportPackages",
  assets: "assets",
  templates: "templates",
  automation_rules: "automationRules",
  segments: "segments",
  vertical_packs: "verticalPacks",
  campaigns: "campaigns",
  campaign_channels: "campaignChannels",
  utm_links: "utmLinks"
};

const camelToSnake = (value: string) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

function tableForName(name: string): DrizzleTable {
  const exportName = tableExportByDbName[name];
  if (exportName) return tables[exportName];
  const table = tableByName[name];
  if (!table) throw new Error(`No Drizzle table registered for ${name}`);
  return table;
}

function normalizeForTable(table: DrizzleTable, row: WorkspaceRow) {
  const columns = getTableColumns(table);
  const dbNameToProp = new Map<string, string>();
  for (const [prop, column] of Object.entries(columns)) dbNameToProp.set((column as any).name, prop);
  const normalized: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(row)) {
    const prop = key in columns ? key : dbNameToProp.get(key);
    if (!prop) continue;
    const columnName = (columns as any)[prop]?.name ?? "";
    const value = typeof rawValue === "string" && columnName.endsWith("_at") && rawValue ? new Date(rawValue) : rawValue;
    normalized[prop] = value;
  }
  return normalized;
}

function addAliases<T extends WorkspaceRow>(row: T): T {
  const copy: WorkspaceRow = { ...row };
  for (const [key, value] of Object.entries(row)) {
    const snake = camelToSnake(key);
    if (!(snake in copy)) copy[snake] = value;
  }
  return copy as T;
}

export class DrizzleBaseRepository<T extends WorkspaceRow = WorkspaceRow> {
  protected readonly table: DrizzleTable;

  constructor(
    public readonly tableName: string,
    protected readonly db: DbClient = getDb(),
    protected readonly audit?: AuditWriter
  ) {
    this.table = tableForName(tableName);
  }

  async create(row: T, audit?: WorkspaceRow): Promise<T> {
    const stamped = { created_at: now(), updated_at: now(), ...row };
    const [created] = await (this.db.insert(this.table as any).values(normalizeForTable(this.table, stamped)).returning() as any);
    if (audit) await this.createAuditEvent(audit);
    return addAliases(created as T);
  }

  async update(id: string, patch: Partial<T>, audit?: WorkspaceRow): Promise<T> {
    const [updated] = await (this.db.update(this.table as any)
      .set(normalizeForTable(this.table, { ...patch, updated_at: now() } as WorkspaceRow))
      .where(eq((this.table as any).id, id))
      .returning() as any);
    if (!updated) throw new Error(`${this.tableName} ${id} not found`);
    if (audit) await this.createAuditEvent(audit);
    return addAliases(updated as T);
  }

  async getById(id: string, workspaceId?: string): Promise<T | null> {
    const where = workspaceId && (this.table as any).workspaceId
      ? and(eq((this.table as any).id, id), eq((this.table as any).workspaceId, workspaceId))
      : eq((this.table as any).id, id);
    const rows = await (this.db.select().from(this.table as any).where(where).limit(1) as any);
    return rows[0] ? addAliases(rows[0] as T) : null;
  }

  async list(): Promise<T[]> {
    const rows = await (this.db.select().from(this.table as any) as any);
    return rows.map((row: T) => addAliases(row));
  }

  async listByWorkspace(workspaceId: string): Promise<T[]> {
    if (!(this.table as any).workspaceId) return [];
    const rows = await (this.db.select().from(this.table as any).where(eq((this.table as any).workspaceId, workspaceId)) as any);
    return rows.map((row: T) => addAliases(row));
  }

  async listByStatus(workspaceId: string, status: string): Promise<T[]> {
    const rows = await this.listByWorkspace(workspaceId);
    return rows.filter((row) => (row.status ?? row.approval_status ?? row.approvalStatus) === status);
  }

  async archive(id: string, actorId = "system") {
    return this.update(id, { status: "archived", archived_at: now(), archivedAt: now(), updated_by: actorId, updatedBy: actorId } as unknown as Partial<T>);
  }

  async reject(id: string, actorId: string, notes?: string) {
    return this.update(id, { status: "rejected", approval_status: "rejected", approvalStatus: "rejected", updated_by: actorId, updatedBy: actorId, notes } as unknown as Partial<T>);
  }

  async approve(id: string, actorId: string) {
    if (!actorId) throw new Error("audit_actor_required");
    return this.update(id, {
      status: "approved",
      approval_status: "approved",
      approvalStatus: "approved",
      approved_by: actorId,
      approvedBy: actorId,
      approved_at: now(),
      approvedAt: now()
    } as unknown as Partial<T>);
  }

  async createAuditEvent(event: WorkspaceRow | AuditEvent) {
    if (this.audit) await this.audit(event);
  }
}

export class DrizzleWorkspaceRepository extends DrizzleBaseRepository {
  constructor(db?: DbClient, audit?: AuditWriter) { super("workspaces", db, audit); }
  async listByOrganization(organizationId: string) {
    const rows = await this.list();
    return rows.filter((row) => row.organization_id === organizationId || row.organizationId === organizationId);
  }
}

export class DrizzleBrandProfileRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("brand_profiles", db, audit); } }
export class DrizzleTrendRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("trend_signals", db, audit); } async listNew(workspaceId: string) { return this.listByStatus(workspaceId, "new"); } }
export class DrizzleClusterRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("trend_clusters", db, audit); } async approveForGeneration(id: string, actorId: string) { return this.update(id, { status: "approved", approved_for_generation: true, approvedForGeneration: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now() }); } }
export class DrizzlePhraseRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("phrase_candidates", db, audit); } async approveForDesign(id: string, actorId: string) { return this.update(id, { status: "approved", approved_for_design: true, approvedForDesign: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now() }); } }
export class DrizzleRiskReviewRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("risk_reviews", db, audit); } async listForEntity(workspaceId: string, entityType: string, entityId: string) { return (await this.listByWorkspace(workspaceId)).filter((row) => row.entity_type === entityType && row.entity_id === entityId); } }
export class DrizzleDesignBriefRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("design_briefs", db, audit); } async approveForGeneration(id: string, actorId: string) { return this.update(id, { status: "approved", approved_for_generation: true, approvedForGeneration: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now() }); } }

export class DrizzleGenerationJobRepository extends DrizzleBaseRepository {
  constructor(db?: DbClient, audit?: AuditWriter) { super("generation_jobs", db, audit); }
  async claimQueued(workspaceId?: string) {
    const rows = workspaceId ? await this.listByWorkspace(workspaceId) : await this.list();
    const job = rows.find((row) => row.status === "queued");
    if (!job) return null;
    return this.update(job.id, { status: "running", started_at: now(), startedAt: now() });
  }
  async markCompleted(id: string, outputAssetId?: string) {
    return this.update(id, { status: "completed", output_asset_id: outputAssetId, outputAssetId, completed_at: now(), completedAt: now(), error: null });
  }
  async markFailed(id: string, error: string, retryable = false) {
    const job = await this.getById(id);
    if (!job) throw new Error(`generation_jobs ${id} not found`);
    const retryCount = Number(job.retry_count ?? job.retryCount ?? 0) + 1;
    const maxRetries = Number(job.max_retries ?? job.maxRetries ?? 3);
    const status = retryable && retryCount < maxRetries ? "queued" : "failed";
    return this.update(id, { status, error, retry_count: retryCount, retryCount });
  }
}

export class DrizzleDesignAssetRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("design_assets", db, audit); } async approveForMockup(id: string, actorId: string) { return this.update(id, { approved_for_mockup: true, approvedForMockup: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now(), qa_status: "passed", qaStatus: "passed" }); } }
export class DrizzlePrintFileQaRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("print_file_qa", db, audit); } async markPassed(id: string, actorId = "system") { return this.update(id, { status: "passed", approved_for_product_draft: true, approvedForProductDraft: true, reviewed_by: actorId, reviewedBy: actorId, reviewed_at: now(), reviewedAt: now() }); } }
export class DrizzleMockupRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("mockup_assets", db, audit); } async approveForProduct(id: string, actorId: string) { return this.update(id, { approved_for_product: true, approvedForProduct: true, approved_by: actorId, approvedBy: actorId }); } }
export class DrizzleProductDraftRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("product_drafts", db, audit); } async listApprovedForStorefront(workspaceId: string) { return (await this.listByWorkspace(workspaceId)).filter((row) => ((row.public_projection ?? row.publicProjection) as WorkspaceRow | undefined)?.status === "published").map(toPublicStorefrontProjection); } }
export class DrizzleProductVariantRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("product_variants", db, audit); } async listByDraft(workspaceId: string, productDraftId: string) { return (await this.listByWorkspace(workspaceId)).filter((row) => row.product_draft_id === productDraftId || row.productDraftId === productDraftId); } }
export class DrizzleProductBatchRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("product_batches", db, audit); } }
export class DrizzleProductBatchItemRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("product_batch_items", db, audit); } }
export class DrizzlePriceMarginCheckRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("price_margin_checks", db, audit); } async listBlocked(workspaceId: string) { return (await this.listByWorkspace(workspaceId)).filter((row) => row.blocked === true || row.margin_ok === false || row.marginOk === false); } }

export class DrizzlePublishReviewRepository extends DrizzleBaseRepository<PublishReview & WorkspaceRow> {
  constructor(db?: DbClient, audit?: AuditWriter) { super("publish_reviews", db, audit); }
  async getByProductDraftId(workspaceId: string, productDraftId: string) {
    return (await this.listByWorkspace(workspaceId)).find((row) => row.product_draft_id === productDraftId || row.productDraftId === productDraftId) ?? null;
  }
  async markReviewed(id: string, actorId: string, gates: Record<string, boolean>, notes: string[] = []) {
    if (!actorId) throw new Error("audit_actor_required");
    const all = Object.values(gates).every(Boolean);
    return this.update(id, {
      gates,
      all_gates_passed: all,
      allGatesPassed: all,
      shopify_publish_allowed: all,
      shopifyPublishAllowed: all,
      printify_sync_allowed: all,
      printifySyncAllowed: all,
      reviewed_by: actorId,
      reviewedBy: actorId,
      reviewed_at: now(),
      reviewedAt: now(),
      notes
    } as unknown as Partial<PublishReview & WorkspaceRow>);
  }
}

export class DrizzleSiteAuditRepository extends DrizzleBaseRepository {
  readonly findings: DrizzleBaseRepository;
  constructor(db?: DbClient, audit?: AuditWriter) {
    super("site_audit_runs", db, audit);
    this.findings = new DrizzleBaseRepository("site_audit_findings", this.db, this.audit);
  }
  async latest(workspaceId: string) {
    const rows = await this.listByWorkspace(workspaceId);
    return rows.sort((a, b) => String(b.audited_at ?? b.auditedAt ?? b.created_at ?? "").localeCompare(String(a.audited_at ?? a.auditedAt ?? a.created_at ?? "")))[0] ?? null;
  }
  async createRun(row: WorkspaceRow, findings: WorkspaceRow[] = [], audit?: WorkspaceRow) {
    const created = await this.create(row, audit);
    const workspaceId = workspaceOf(row);
    for (const finding of findings) await this.findings.create({ ...finding, audit_run_id: created.id, auditRunId: created.id, workspace_id: workspaceId, workspaceId });
    return created;
  }
}

export class DrizzleIntegrationRepository extends DrizzleBaseRepository {
  readonly credentials: DrizzleBaseRepository;
  readonly syncRuns: DrizzleBaseRepository;
  readonly statuses: DrizzleBaseRepository;
  constructor(db?: DbClient, audit?: AuditWriter) {
    super("workspace_provider_connections", db, audit);
    this.credentials = new DrizzleBaseRepository("encrypted_credentials", this.db, this.audit);
    this.syncRuns = new DrizzleBaseRepository("integration_sync_runs", this.db, this.audit);
    this.statuses = new DrizzleBaseRepository("provider_connection_status", this.db, this.audit);
  }
  async createProviderConnection(row: WorkspaceRow, audit?: WorkspaceRow) { return this.create(row, audit); }
  async updateProviderConnectionStatus(workspaceId: string, providerKey: string, patch: WorkspaceRow, audit?: WorkspaceRow) {
    const row = await this.getProviderConnectionForWorkspace(workspaceId, providerKey);
    if (!row) return this.create({ ...patch, id: `conn_${Date.now()}`, workspace_id: workspaceId, provider_type: providerKey, provider_name: providerKey, enabled: false, status: String(patch.status ?? "not_configured") }, audit);
    return this.update(row.id, patch, audit);
  }
  async listProviderConnectionsForWorkspace(workspaceId: string) { return this.listByWorkspace(workspaceId); }
  async getProviderConnectionForWorkspace(workspaceId: string, providerKey: string) {
    return (await this.listByWorkspace(workspaceId)).find((row) =>
      row.provider_key === providerKey || row.providerKey === providerKey || row.provider_type === providerKey || row.providerType === providerKey
    ) ?? null;
  }
  async saveEncryptedCredential(row: WorkspaceRow, audit?: WorkspaceRow) { return this.credentials.create(row, audit); }
  async getCredentialForServerUseOnly(workspaceId: string, credentialRef: string) {
    return (await this.credentials.listByWorkspace(workspaceId)).find((row) => row.credential_ref === credentialRef || row.credentialRef === credentialRef) ?? null;
  }
  async deleteCredential(workspaceId: string, credentialRef: string, actorId = "system") {
    const row = await this.getCredentialForServerUseOnly(workspaceId, credentialRef);
    return row ? this.credentials.update(row.id, { status: "revoked", revoked_at: now(), revokedAt: now(), updated_by: actorId, updatedBy: actorId }) : null;
  }
  async createIntegrationSyncRun(row: WorkspaceRow, audit?: WorkspaceRow) { return this.syncRuns.create(row, audit); }
  async updateIntegrationSyncRun(id: string, patch: WorkspaceRow, audit?: WorkspaceRow) { return this.syncRuns.update(id, patch, audit); }
  async listIntegrationSyncRuns(workspaceId: string, providerKey?: string) {
    const rows = await this.syncRuns.listByWorkspace(workspaceId);
    return providerKey ? rows.filter((row) => row.provider_key === providerKey || row.providerKey === providerKey) : rows;
  }
  async writeIntegrationAuditEvent(event: WorkspaceRow | AuditEvent) { await this.createAuditEvent(event); }
}

export class DrizzleWorkspaceMetricRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("workspace_metrics", db, audit); } }
export class DrizzleBusinessProfileV1Repository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("workspace_business_profiles_v1", db, audit); } }
export class DrizzleChannelRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("workspace_channels", db, audit); } }
export class DrizzleMigrationWizardRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("migration_wizard_runs", db, audit); } }
export class DrizzleBaselineSnapshotRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("baseline_snapshots", db, audit); } }
export class DrizzlePodMigrationRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("pod_migration_candidates", db, audit); } }
export class DrizzleDropshippingRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("dropship_product_candidates", db, audit); } }
export class DrizzleListingDraftV1Repository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("listing_drafts_v1", db, audit); } }
export class DrizzleSocialContentRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("social_content_items", db, audit); } }

export class DrizzleShopifyProductRefRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("shopify_product_refs", db, audit); } }
export class DrizzlePrintifyProductRefRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("printify_product_refs", db, audit); } }
export class DrizzleFulfillmentEventRepository extends DrizzleBaseRepository { constructor(db?: DbClient, audit?: AuditWriter) { super("fulfillment_events", db, audit); } async listByOrder(workspaceId: string, orderId: string) { return (await this.listByWorkspace(workspaceId)).filter((row) => row.shopify_order_id === orderId || row.printify_order_id === orderId); } }

export class DrizzleAuditEventRepository extends DrizzleBaseRepository<AuditEvent & WorkspaceRow> {
  constructor(db?: DbClient) { super("audit_events", db); }
  async write(event: AuditEvent | WorkspaceRow) {
    return this.create(event as AuditEvent & WorkspaceRow);
  }
}

export class DrizzleAiEmployeeRepository extends DrizzleBaseRepository {
  readonly tasks: DrizzleBaseRepository;
  readonly runs: DrizzleBaseRepository;
  readonly outputs: DrizzleBaseRepository;
  readonly permissions: DrizzleBaseRepository;
  constructor(db?: DbClient, audit?: AuditWriter) {
    super("ai_employees", db, audit);
    this.tasks = new DrizzleBaseRepository("ai_employee_tasks", this.db, this.audit);
    this.runs = new DrizzleBaseRepository("ai_employee_runs", this.db, this.audit);
    this.outputs = new DrizzleBaseRepository("ai_employee_outputs", this.db, this.audit);
    this.permissions = new DrizzleBaseRepository("ai_employee_permissions", this.db, this.audit);
  }
  async createRun(row: WorkspaceRow) { return this.runs.create(row); }
  async listRunsByStatus(workspaceId: string, status: string) { return this.runs.listByStatus(workspaceId, status); }
}

export class DrizzleAiWorkforceRepository {
  readonly hireRequests: DrizzleBaseRepository;
  readonly roleSpecs: DrizzleBaseRepository;
  readonly employeeDefinitions: DrizzleBaseRepository;
  readonly permissionScopes: DrizzleBaseRepository;
  readonly improvementSuggestions: DrizzleBaseRepository;
  readonly capabilityRequests: DrizzleBaseRepository;
  readonly trainingRequests: DrizzleBaseRepository;
  readonly toolAccessRequests: DrizzleBaseRepository;
  readonly feedbackEvents: DrizzleBaseRepository;

  constructor(db?: DbClient, audit?: AuditWriter) {
    const repo = (tableName: string) => new DrizzleBaseRepository(tableName, db, audit);
    this.hireRequests = repo("ai_employee_hire_requests");
    this.roleSpecs = repo("ai_employee_role_specs");
    this.employeeDefinitions = repo("ai_employee_definitions");
    this.permissionScopes = repo("ai_employee_permission_scopes");
    this.improvementSuggestions = repo("ai_improvement_suggestions");
    this.capabilityRequests = repo("ai_capability_requests");
    this.trainingRequests = repo("ai_training_requests");
    this.toolAccessRequests = repo("ai_tool_access_requests");
    this.feedbackEvents = repo("ai_agent_feedback_events");
  }
}

export class DrizzleAiModelRuntimeRepository {
  readonly providers: DrizzleBaseRepository;
  readonly models: DrizzleBaseRepository;
  readonly assignments: DrizzleBaseRepository;
  readonly evaluations: DrizzleBaseRepository;
  readonly usageEvents: DrizzleBaseRepository;

  constructor(db?: DbClient, audit?: AuditWriter) {
    const repo = (tableName: string) => new DrizzleBaseRepository(tableName, db, audit);
    this.providers = repo("ai_model_providers");
    this.models = repo("ai_models");
    this.assignments = repo("ai_employee_model_assignments");
    this.evaluations = repo("ai_model_evaluations");
    this.usageEvents = repo("ai_model_usage_events");
  }
}

export class DrizzleMarketingRepository extends DrizzleBaseRepository {
  readonly assets: DrizzleBaseRepository;
  constructor(db?: DbClient, audit?: AuditWriter) {
    super("marketing_campaigns", db, audit);
    this.assets = new DrizzleBaseRepository("marketing_assets", this.db, this.audit);
  }
}

export class DrizzleSupportRepository extends DrizzleBaseRepository {
  readonly drafts: DrizzleBaseRepository;
  constructor(db?: DbClient, audit?: AuditWriter) {
    super("support_macros", db, audit);
    this.drafts = new DrizzleBaseRepository("customer_support_drafts", this.db, this.audit);
  }
}

export class DrizzleBillingRepository extends DrizzleBaseRepository {
  readonly plans: DrizzleBaseRepository;
  readonly events: DrizzleBaseRepository;
  readonly featureLimits: DrizzleBaseRepository;
  constructor(db?: DbClient, audit?: AuditWriter) {
    super("subscriptions", db, audit);
    this.plans = new DrizzleBaseRepository("plans", this.db, this.audit);
    this.events = new DrizzleBaseRepository("billing_events", this.db, this.audit);
    this.featureLimits = new DrizzleBaseRepository("feature_limits", this.db, this.audit);
  }
}

export class DrizzleCrmRepository {
  readonly customers: DrizzleBaseRepository;
  readonly companies: DrizzleBaseRepository;
  readonly contactMethods: DrizzleBaseRepository;
  readonly addresses: DrizzleBaseRepository;
  readonly tags: DrizzleBaseRepository;
  readonly customerTags: DrizzleBaseRepository;
  readonly sources: DrizzleBaseRepository;
  readonly preferences: DrizzleBaseRepository;
  readonly productInterests: DrizzleBaseRepository;
  readonly metrics: DrizzleBaseRepository;
  readonly externalRefs: DrizzleBaseRepository;
  readonly timelineEvents: DrizzleBaseRepository;
  readonly interactions: DrizzleBaseRepository;
  readonly notes: DrizzleBaseRepository;
  readonly tasks: DrizzleBaseRepository;
  readonly taskTemplates: DrizzleBaseRepository;
  readonly leads: DrizzleBaseRepository;
  readonly opportunities: DrizzleBaseRepository;
  readonly quotes: DrizzleBaseRepository;
  readonly deals: DrizzleBaseRepository;
  readonly pipelineStages: DrizzleBaseRepository;
  readonly serviceCases: DrizzleBaseRepository;
  readonly conversations: DrizzleBaseRepository;
  readonly conversationMessages: DrizzleBaseRepository;
  readonly supportCases: DrizzleBaseRepository;
  readonly helpTopics: DrizzleBaseRepository;
  readonly inboxChannels: DrizzleBaseRepository;
  readonly campaigns: DrizzleBaseRepository;
  readonly campaignMembers: DrizzleBaseRepository;
  readonly messageTemplates: DrizzleBaseRepository;
  readonly landingPages: DrizzleBaseRepository;
  readonly forms: DrizzleBaseRepository;
  readonly formSubmissions: DrizzleBaseRepository;
  readonly consents: DrizzleBaseRepository;
  readonly unsubscribePreferences: DrizzleBaseRepository;
  readonly events: DrizzleBaseRepository;
  readonly personEvents: DrizzleBaseRepository;
  readonly behavioralTraits: DrizzleBaseRepository;
  readonly surveys: DrizzleBaseRepository;
  readonly surveyResponses: DrizzleBaseRepository;
  readonly featureFlags: DrizzleBaseRepository;
  readonly customerCohorts: DrizzleBaseRepository;
  readonly behaviorSegments: DrizzleBaseRepository;
  readonly aiInsights: DrizzleBaseRepository;
  readonly nextActions: DrizzleBaseRepository;
  readonly recommendationEvents: DrizzleBaseRepository;
  readonly automationRules: DrizzleBaseRepository;
  readonly automationRuns: DrizzleBaseRepository;
  readonly importBatches: DrizzleBaseRepository;
  readonly syncState: DrizzleBaseRepository;
  readonly appointmentTypes: DrizzleBaseRepository;
  readonly bookingRequests: DrizzleBaseRepository;
  readonly consultations: DrizzleBaseRepository;
  readonly availabilityReadiness: DrizzleBaseRepository;

  constructor(db?: DbClient, audit?: AuditWriter) {
    const repo = (tableName: string) => new DrizzleBaseRepository(tableName, db, audit);
    this.customers = repo("crm_customers");
    this.companies = repo("crm_companies");
    this.contactMethods = repo("crm_contact_methods");
    this.addresses = repo("crm_addresses");
    this.tags = repo("crm_tags");
    this.customerTags = repo("crm_customer_tags");
    this.sources = repo("crm_sources");
    this.preferences = repo("crm_customer_preferences");
    this.productInterests = repo("crm_customer_product_interests");
    this.metrics = repo("crm_customer_metrics");
    this.externalRefs = repo("crm_customer_external_refs");
    this.timelineEvents = repo("crm_timeline_events");
    this.interactions = repo("crm_interactions");
    this.notes = repo("crm_notes");
    this.tasks = repo("crm_tasks");
    this.taskTemplates = repo("crm_task_templates");
    this.leads = repo("crm_leads");
    this.opportunities = repo("crm_opportunities");
    this.quotes = repo("crm_quotes");
    this.deals = repo("crm_deals");
    this.pipelineStages = repo("crm_pipeline_stages");
    this.serviceCases = repo("crm_service_cases");
    this.conversations = repo("crm_conversations");
    this.conversationMessages = repo("crm_conversation_messages");
    this.supportCases = repo("crm_support_cases");
    this.helpTopics = repo("crm_help_topics");
    this.inboxChannels = repo("crm_inbox_channels");
    this.campaigns = repo("crm_campaigns");
    this.campaignMembers = repo("crm_campaign_members");
    this.messageTemplates = repo("crm_message_templates");
    this.landingPages = repo("crm_landing_pages");
    this.forms = repo("crm_forms");
    this.formSubmissions = repo("crm_form_submissions");
    this.consents = repo("crm_consents");
    this.unsubscribePreferences = repo("crm_unsubscribe_preferences");
    this.events = repo("crm_events");
    this.personEvents = repo("crm_person_events");
    this.behavioralTraits = repo("crm_behavioral_traits");
    this.surveys = repo("crm_surveys");
    this.surveyResponses = repo("crm_survey_responses");
    this.featureFlags = repo("crm_feature_flags");
    this.customerCohorts = repo("crm_customer_cohorts");
    this.behaviorSegments = repo("crm_behavior_segments");
    this.aiInsights = repo("crm_ai_insights");
    this.nextActions = repo("crm_next_actions");
    this.recommendationEvents = repo("crm_recommendation_events");
    this.automationRules = repo("crm_automation_rules");
    this.automationRuns = repo("crm_automation_runs");
    this.importBatches = repo("crm_import_batches");
    this.syncState = repo("crm_sync_state");
    this.appointmentTypes = repo("crm_appointment_types");
    this.bookingRequests = repo("crm_booking_requests");
    this.consultations = repo("crm_consultations");
    this.availabilityReadiness = repo("crm_availability_readiness");
  }
}

export class DrizzleSharedKernelRepository {
  readonly providerConnections: DrizzleBaseRepository;
  readonly sourceRecords: DrizzleBaseRepository;
  readonly events: DrizzleBaseRepository;
  readonly auditLog: DrizzleBaseRepository;
  readonly approvals: DrizzleBaseRepository;
  readonly tasks: DrizzleBaseRepository;
  readonly notes: DrizzleBaseRepository;
  readonly recommendations: DrizzleBaseRepository;
  readonly readinessScores: DrizzleBaseRepository;
  readonly exportPackages: DrizzleBaseRepository;
  readonly assets: DrizzleBaseRepository;
  readonly templates: DrizzleBaseRepository;
  readonly automationRules: DrizzleBaseRepository;
  readonly setupAssistanceRequests: DrizzleBaseRepository;
  readonly segments: DrizzleBaseRepository;
  readonly verticalPacks: DrizzleBaseRepository;
  readonly campaigns: DrizzleBaseRepository;
  readonly campaignChannels: DrizzleBaseRepository;
  readonly utmLinks: DrizzleBaseRepository;

  constructor(db?: DbClient, audit?: AuditWriter) {
    const repo = (tableName: string) => new DrizzleBaseRepository(tableName, db, audit);
    this.providerConnections = repo("provider_connections");
    this.sourceRecords = repo("source_records");
    this.events = repo("events");
    this.auditLog = repo("audit_log");
    this.approvals = repo("approvals");
    this.tasks = repo("tasks");
    this.notes = repo("notes");
    this.recommendations = repo("recommendations");
    this.readinessScores = repo("readiness_scores");
    this.exportPackages = repo("export_packages");
    this.assets = repo("assets");
    this.templates = repo("templates");
    this.automationRules = repo("automation_rules");
    this.setupAssistanceRequests = repo("setup_assistance_requests");
    this.segments = repo("segments");
    this.verticalPacks = repo("vertical_packs");
    this.campaigns = repo("campaigns");
    this.campaignChannels = repo("campaign_channels");
    this.utmLinks = repo("utm_links");
  }
}

export class DrizzleBusinessOsRepository {
  readonly metricsSnapshots: DrizzleBaseRepository;
  readonly costInputs: DrizzleBaseRepository;
  readonly unitEconomics: DrizzleBaseRepository;
  readonly opportunities: DrizzleBaseRepository;
  readonly decisionMemos: DrizzleBaseRepository;
  readonly forecasts: DrizzleBaseRepository;
  readonly experiments: DrizzleBaseRepository;
  readonly channelReadiness: DrizzleBaseRepository;
  readonly profiles: DrizzleBaseRepository;
  readonly sensitiveFields: DrizzleBaseRepository;
  readonly goals: DrizzleBaseRepository;
  readonly mantras: DrizzleBaseRepository;
  readonly documents: DrizzleBaseRepository;
  readonly documentExports: DrizzleBaseRepository;
  readonly printOrders: DrizzleBaseRepository;
  readonly bankConnections: DrizzleBaseRepository;
  readonly bankTransactions: DrizzleBaseRepository;
  readonly authorityRequests: DrizzleBaseRepository;

  constructor(db?: DbClient, audit?: AuditWriter) {
    const repo = (tableName: string) => new DrizzleBaseRepository(tableName, db, audit);
    this.metricsSnapshots = repo("business_metrics_snapshots");
    this.costInputs = repo("business_cost_inputs");
    this.unitEconomics = repo("business_unit_economics");
    this.opportunities = repo("business_opportunities");
    this.decisionMemos = repo("business_decision_memos");
    this.forecasts = repo("business_forecasts");
    this.experiments = repo("business_experiments");
    this.channelReadiness = repo("business_channel_readiness");
    this.profiles = repo("business_profiles");
    this.sensitiveFields = repo("business_sensitive_fields");
    this.goals = repo("business_goals");
    this.mantras = repo("business_mantras");
    this.documents = repo("business_documents");
    this.documentExports = repo("business_document_exports");
    this.printOrders = repo("business_print_orders");
    this.bankConnections = repo("business_bank_connections");
    this.bankTransactions = repo("business_bank_transactions");
    this.authorityRequests = repo("business_authority_requests");
  }
}

export function createDrizzleRepositories(db: DbClient = getDb()): RepositoryBundle {
  const audit = new DrizzleAuditEventRepository(db);
  const writer: AuditWriter = async (event) => { await audit.write(event); };
  return {
    adapter: "drizzle",
    audit,
    workspace: new DrizzleWorkspaceRepository(db, writer),
    brandProfile: new DrizzleBrandProfileRepository(db, writer),
    trend: new DrizzleTrendRepository(db, writer),
    cluster: new DrizzleClusterRepository(db, writer),
    phrase: new DrizzlePhraseRepository(db, writer),
    risk: new DrizzleRiskReviewRepository(db, writer),
    brief: new DrizzleDesignBriefRepository(db, writer),
    job: new DrizzleGenerationJobRepository(db, writer),
    asset: new DrizzleDesignAssetRepository(db, writer),
    qa: new DrizzlePrintFileQaRepository(db, writer),
    mockup: new DrizzleMockupRepository(db, writer),
    draft: new DrizzleProductDraftRepository(db, writer),
    variant: new DrizzleProductVariantRepository(db, writer),
    productBatch: new DrizzleProductBatchRepository(db, writer),
    productBatchItem: new DrizzleProductBatchItemRepository(db, writer),
    margin: new DrizzlePriceMarginCheckRepository(db, writer),
    publish: new DrizzlePublishReviewRepository(db, writer),
    siteAudit: new DrizzleSiteAuditRepository(db, writer),
    integration: new DrizzleIntegrationRepository(db, writer),
    workspaceMetric: new DrizzleWorkspaceMetricRepository(db, writer),
    businessProfileV1: new DrizzleBusinessProfileV1Repository(db, writer),
    channel: new DrizzleChannelRepository(db, writer),
    migrationWizard: new DrizzleMigrationWizardRepository(db, writer),
    baseline: new DrizzleBaselineSnapshotRepository(db, writer),
    podMigration: new DrizzlePodMigrationRepository(db, writer),
    dropshipping: new DrizzleDropshippingRepository(db, writer),
    listingDraftV1: new DrizzleListingDraftV1Repository(db, writer),
    socialContent: new DrizzleSocialContentRepository(db, writer),
    shopify: new DrizzleShopifyProductRefRepository(db, writer),
    printify: new DrizzlePrintifyProductRefRepository(db, writer),
    fulfillment: new DrizzleFulfillmentEventRepository(db, writer),
    aiEmployee: new DrizzleAiEmployeeRepository(db, writer),
    marketing: new DrizzleMarketingRepository(db, writer),
    support: new DrizzleSupportRepository(db, writer),
    billing: new DrizzleBillingRepository(db, writer),
    crm: new DrizzleCrmRepository(db, writer),
    shared: new DrizzleSharedKernelRepository(db, writer),
    aiWorkforce: new DrizzleAiWorkforceRepository(db, writer),
    aiModelRuntime: new DrizzleAiModelRuntimeRepository(db, writer),
    business: new DrizzleBusinessOsRepository(db, writer)
  };
}
