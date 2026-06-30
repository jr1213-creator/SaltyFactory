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
      .filter((row) => row.status === "published" || row.approval_status === "approved" || row.approvalStatus === "approved")
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
    shopify: new ShopifyProductRefRepository(store, writer),
    printify: new PrintifyProductRefRepository(store, writer),
    fulfillment: new FulfillmentEventRepository(store, writer),
    aiEmployee: new AiEmployeeRepository(store, writer),
    marketing: new MarketingRepository(store, writer),
    support: new SupportRepository(store, writer),
    billing: new BillingRepository(store, writer)
  };
}

export const createRepositories = createMemoryRepositories;
