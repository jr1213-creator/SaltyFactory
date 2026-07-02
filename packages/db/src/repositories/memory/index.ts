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
  approved_at?: string | null;
  approvedAt?: string | null;
  archived_at?: string | null;
  archivedAt?: string | null;
  updated_at?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type RepositoryStore = Map<string, Map<string, WorkspaceRow>>;
export type AuditWriter = (event: AuditEvent | WorkspaceRow) => Promise<void>;

const now = () => new Date().toISOString();
const workspaceOf = (row: WorkspaceRow) => String(row.workspace_id ?? row.workspaceId ?? "");

export function createRepositoryStore(): RepositoryStore {
  return new Map();
}

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
  const projection = (row.public_projection ?? row.publicProjection) as WorkspaceRow | undefined;
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

export class BaseRepository<T extends WorkspaceRow = WorkspaceRow> {
  protected rows: Map<string, WorkspaceRow>;

  constructor(
    public readonly tableName: string,
    protected readonly store: RepositoryStore = createRepositoryStore(),
    protected readonly audit?: AuditWriter
  ) {
    if (!store.has(tableName)) store.set(tableName, new Map());
    this.rows = store.get(tableName)!;
  }

  async create(row: T, audit?: WorkspaceRow): Promise<T> {
    const stamped = {
      created_at: now(),
      updated_at: now(),
      ...row
    } as T;
    this.rows.set(stamped.id, stamped);
    if (audit) await this.createAuditEvent(audit);
    return stamped;
  }

  async update(id: string, patch: Partial<T>, audit?: WorkspaceRow): Promise<T> {
    const current = this.rows.get(id) as T | undefined;
    if (!current) throw new Error(`${this.tableName} ${id} not found`);
    const next = { ...current, ...patch, updated_at: now(), updatedAt: now() } as T;
    this.rows.set(id, next);
    if (audit) await this.createAuditEvent(audit);
    return next;
  }

  async getById(id: string, workspaceId?: string): Promise<T | null> {
    const row = this.rows.get(id) as T | undefined;
    if (!row) return null;
    if (workspaceId && workspaceOf(row) !== workspaceId) return null;
    return row;
  }

  async list(): Promise<T[]> {
    return [...this.rows.values()] as T[];
  }

  async listByWorkspace(workspaceId: string): Promise<T[]> {
    return (await this.list()).filter((row) => workspaceOf(row) === workspaceId);
  }

  async listByStatus(workspaceId: string, status: string): Promise<T[]> {
    return (await this.listByWorkspace(workspaceId)).filter((row) => (row.status ?? row.approval_status ?? row.approvalStatus) === status);
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
    } as Partial<T>);
  }

  async createAuditEvent(event: WorkspaceRow | AuditEvent) {
    if (!this.audit) return;
    await this.audit(event);
  }
}

export class WorkspaceRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("workspaces", store, audit); }
  async listByOrganization(organizationId: string) {
    return (await this.list()).filter((row) => row.organization_id === organizationId || row.organizationId === organizationId);
  }
}

export class BrandProfileRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("brand_profiles", store, audit); }
}

export class TrendRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("trend_signals", store, audit); }
  async listNew(workspaceId: string) { return this.listByStatus(workspaceId, "new"); }
}

export class ClusterRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("trend_clusters", store, audit); }
  async approveForGeneration(id: string, actorId: string) {
    return this.update(id, { status: "approved", approved_for_generation: true, approvedForGeneration: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now() });
  }
}

export class PhraseRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("phrase_candidates", store, audit); }
  async approveForDesign(id: string, actorId: string) {
    return this.update(id, { status: "approved", approved_for_design: true, approvedForDesign: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now() });
  }
}

export class RiskReviewRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("risk_reviews", store, audit); }
  async listForEntity(workspaceId: string, entityType: string, entityId: string) {
    return (await this.listByWorkspace(workspaceId)).filter((row) => row.entity_type === entityType && row.entity_id === entityId);
  }
}

export class DesignBriefRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("design_briefs", store, audit); }
  async approveForGeneration(id: string, actorId: string) {
    return this.update(id, { status: "approved", approved_for_generation: true, approvedForGeneration: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now() });
  }
}

export class GenerationJobRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("generation_jobs", store, audit); }
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

export class DesignAssetRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("design_assets", store, audit); }
  async approveForMockup(id: string, actorId: string) {
    return this.update(id, { approved_for_mockup: true, approvedForMockup: true, approved_by: actorId, approvedBy: actorId, approved_at: now(), approvedAt: now(), qa_status: "passed", qaStatus: "passed" });
  }
}

export class PrintFileQaRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("print_file_qa", store, audit); }
  async markPassed(id: string, actorId = "system") {
    return this.update(id, { status: "passed", approved_for_product_draft: true, approvedForProductDraft: true, reviewed_by: actorId, reviewedBy: actorId, reviewed_at: now(), reviewedAt: now() });
  }
}

export class MockupRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("mockup_assets", store, audit); }
  async approveForProduct(id: string, actorId: string) {
    return this.update(id, { approved_for_product: true, approvedForProduct: true, approved_by: actorId, approvedBy: actorId });
  }
}

export class ProductDraftRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("product_drafts", store, audit); }
  async listApprovedForStorefront(workspaceId: string) {
    return (await this.listByWorkspace(workspaceId))
      .filter((row) => {
        const projection = (row.public_projection ?? row.publicProjection) as WorkspaceRow | undefined;
        return projection?.status === "published";
      })
      .map(toPublicStorefrontProjection);
  }
}

export class ProductVariantRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("product_variants", store, audit); }
  async listByDraft(workspaceId: string, productDraftId: string) {
    return (await this.listByWorkspace(workspaceId)).filter((row) => row.product_draft_id === productDraftId || row.productDraftId === productDraftId);
  }
}

export class PriceMarginCheckRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("price_margin_checks", store, audit); }
  async listBlocked(workspaceId: string) {
    return (await this.listByWorkspace(workspaceId)).filter((row) => row.blocked === true || row.margin_ok === false || row.marginOk === false);
  }
}

export class PublishReviewRepository extends BaseRepository<PublishReview & WorkspaceRow> {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("publish_reviews", store, audit); }
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

export class SiteAuditRepository extends BaseRepository {
  readonly findings: BaseRepository;
  constructor(store?: RepositoryStore, audit?: AuditWriter) {
    super("site_audit_runs", store, audit);
    this.findings = new BaseRepository("site_audit_findings", this.store, this.audit);
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

export class IntegrationRepository extends BaseRepository {
  readonly credentials: BaseRepository;
  readonly syncRuns: BaseRepository;
  readonly statuses: BaseRepository;
  constructor(store?: RepositoryStore, audit?: AuditWriter) {
    super("workspace_provider_connections", store, audit);
    this.credentials = new BaseRepository("encrypted_credentials", this.store, this.audit);
    this.syncRuns = new BaseRepository("integration_sync_runs", this.store, this.audit);
    this.statuses = new BaseRepository("provider_connection_status", this.store, this.audit);
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

export class WorkspaceMetricRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("workspace_metrics", store, audit); }
}

export class BusinessProfileV1Repository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("workspace_business_profiles_v1", store, audit); }
}

export class ChannelRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("workspace_channels", store, audit); }
}

export class MigrationWizardRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("migration_wizard_runs", store, audit); }
}

export class BaselineSnapshotRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("baseline_snapshots", store, audit); }
}

export class PodMigrationRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("pod_migration_candidates", store, audit); }
}

export class DropshippingRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("dropship_product_candidates", store, audit); }
}

export class ListingDraftV1Repository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("listing_drafts_v1", store, audit); }
}

export class SocialContentRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("social_content_items", store, audit); }
}

export class ShopifyProductRefRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("shopify_product_refs", store, audit); }
}

export class PrintifyProductRefRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("printify_product_refs", store, audit); }
}

export class FulfillmentEventRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("fulfillment_events", store, audit); }
  async listByOrder(workspaceId: string, orderId: string) {
    return (await this.listByWorkspace(workspaceId)).filter((row) => row.shopify_order_id === orderId || row.printify_order_id === orderId);
  }
}

export class AuditEventRepository extends BaseRepository<AuditEvent & WorkspaceRow> {
  constructor(store?: RepositoryStore) { super("audit_events", store); }
  async write(event: AuditEvent | WorkspaceRow) {
    return this.create(event as AuditEvent & WorkspaceRow);
  }
}

export class AiEmployeeRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("ai_employees", store, audit); }
  readonly tasks = new BaseRepository("ai_employee_tasks", this.store, this.audit);
  readonly runs = new BaseRepository("ai_employee_runs", this.store, this.audit);
  readonly outputs = new BaseRepository("ai_employee_outputs", this.store, this.audit);
  readonly permissions = new BaseRepository("ai_employee_permissions", this.store, this.audit);
  async createRun(row: WorkspaceRow) { return this.runs.create(row); }
  async listRunsByStatus(workspaceId: string, status: string) { return this.runs.listByStatus(workspaceId, status); }
}

export class MarketingRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("marketing_campaigns", store, audit); }
  readonly assets = new BaseRepository("marketing_assets", this.store, this.audit);
}

export class SupportRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("support_macros", store, audit); }
  readonly drafts = new BaseRepository("customer_support_drafts", this.store, this.audit);
}

export class BillingRepository extends BaseRepository {
  constructor(store?: RepositoryStore, audit?: AuditWriter) { super("subscriptions", store, audit); }
  readonly plans = new BaseRepository("plans", this.store, this.audit);
  readonly events = new BaseRepository("billing_events", this.store, this.audit);
  readonly featureLimits = new BaseRepository("feature_limits", this.store, this.audit);
}

export class CrmRepository {
  readonly customers: BaseRepository;
  readonly companies: BaseRepository;
  readonly contactMethods: BaseRepository;
  readonly addresses: BaseRepository;
  readonly tags: BaseRepository;
  readonly customerTags: BaseRepository;
  readonly sources: BaseRepository;
  readonly preferences: BaseRepository;
  readonly productInterests: BaseRepository;
  readonly metrics: BaseRepository;
  readonly externalRefs: BaseRepository;
  readonly timelineEvents: BaseRepository;
  readonly interactions: BaseRepository;
  readonly notes: BaseRepository;
  readonly tasks: BaseRepository;
  readonly taskTemplates: BaseRepository;
  readonly leads: BaseRepository;
  readonly opportunities: BaseRepository;
  readonly quotes: BaseRepository;
  readonly deals: BaseRepository;
  readonly pipelineStages: BaseRepository;
  readonly serviceCases: BaseRepository;
  readonly conversations: BaseRepository;
  readonly conversationMessages: BaseRepository;
  readonly supportCases: BaseRepository;
  readonly helpTopics: BaseRepository;
  readonly inboxChannels: BaseRepository;
  readonly campaigns: BaseRepository;
  readonly campaignMembers: BaseRepository;
  readonly messageTemplates: BaseRepository;
  readonly landingPages: BaseRepository;
  readonly forms: BaseRepository;
  readonly formSubmissions: BaseRepository;
  readonly consents: BaseRepository;
  readonly unsubscribePreferences: BaseRepository;
  readonly events: BaseRepository;
  readonly personEvents: BaseRepository;
  readonly behavioralTraits: BaseRepository;
  readonly surveys: BaseRepository;
  readonly surveyResponses: BaseRepository;
  readonly featureFlags: BaseRepository;
  readonly customerCohorts: BaseRepository;
  readonly behaviorSegments: BaseRepository;
  readonly aiInsights: BaseRepository;
  readonly nextActions: BaseRepository;
  readonly recommendationEvents: BaseRepository;
  readonly automationRules: BaseRepository;
  readonly automationRuns: BaseRepository;
  readonly importBatches: BaseRepository;
  readonly syncState: BaseRepository;
  readonly appointmentTypes: BaseRepository;
  readonly bookingRequests: BaseRepository;
  readonly consultations: BaseRepository;
  readonly availabilityReadiness: BaseRepository;

  constructor(store?: RepositoryStore, audit?: AuditWriter) {
    const repo = (tableName: string) => new BaseRepository(tableName, store, audit);
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

export function createMemoryRepositories(store = createRepositoryStore()) {
  const audit = new AuditEventRepository(store);
  const writer: AuditWriter = async (event) => { await audit.write(event); };
  return {
    adapter: "memory" as const,
    audit,
    workspace: new WorkspaceRepository(store, writer),
    brandProfile: new BrandProfileRepository(store, writer),
    trend: new TrendRepository(store, writer),
    cluster: new ClusterRepository(store, writer),
    phrase: new PhraseRepository(store, writer),
    risk: new RiskReviewRepository(store, writer),
    brief: new DesignBriefRepository(store, writer),
    job: new GenerationJobRepository(store, writer),
    asset: new DesignAssetRepository(store, writer),
    qa: new PrintFileQaRepository(store, writer),
    mockup: new MockupRepository(store, writer),
    draft: new ProductDraftRepository(store, writer),
    variant: new ProductVariantRepository(store, writer),
    margin: new PriceMarginCheckRepository(store, writer),
    publish: new PublishReviewRepository(store, writer),
    siteAudit: new SiteAuditRepository(store, writer),
    integration: new IntegrationRepository(store, writer),
    workspaceMetric: new WorkspaceMetricRepository(store, writer),
    businessProfileV1: new BusinessProfileV1Repository(store, writer),
    channel: new ChannelRepository(store, writer),
    migrationWizard: new MigrationWizardRepository(store, writer),
    baseline: new BaselineSnapshotRepository(store, writer),
    podMigration: new PodMigrationRepository(store, writer),
    dropshipping: new DropshippingRepository(store, writer),
    listingDraftV1: new ListingDraftV1Repository(store, writer),
    socialContent: new SocialContentRepository(store, writer),
    shopify: new ShopifyProductRefRepository(store, writer),
    printify: new PrintifyProductRefRepository(store, writer),
    fulfillment: new FulfillmentEventRepository(store, writer),
    aiEmployee: new AiEmployeeRepository(store, writer),
    marketing: new MarketingRepository(store, writer),
    support: new SupportRepository(store, writer),
    billing: new BillingRepository(store, writer),
    crm: new CrmRepository(store, writer)
  };
}

export const createRepositories = createMemoryRepositories;
