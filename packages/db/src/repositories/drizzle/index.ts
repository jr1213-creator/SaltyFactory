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
  price_margin_checks: "priceMarginChecks",
  publish_reviews: "publishReviews",
  site_audit_runs: "siteAuditRuns",
  site_audit_findings: "siteAuditFindings",
  encrypted_credentials: "encryptedCredentials",
  integration_sync_runs: "integrationSyncRuns",
  provider_connection_status: "providerConnectionStatus",
  workspace_provider_connections: "workspaceProviderConnections",
  shopify_product_refs: "shopifyProductRefs",
  printify_product_refs: "printifyProductRefs",
  fulfillment_events: "fulfillmentEvents",
  audit_events: "auditEvents",
  ai_employees: "aiEmployees",
  ai_employee_tasks: "aiEmployeeTasks",
  ai_employee_runs: "aiEmployeeRuns",
  ai_employee_outputs: "aiEmployeeOutputs",
  ai_employee_permissions: "aiEmployeePermissions",
  marketing_campaigns: "marketingCampaigns",
  marketing_assets: "marketingAssets",
  support_macros: "supportMacros",
  customer_support_drafts: "customerSupportDrafts",
  subscriptions: "subscriptions",
  plans: "plans",
  billing_events: "billingEvents",
  feature_limits: "featureLimits"
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
    margin: new DrizzlePriceMarginCheckRepository(db, writer),
    publish: new DrizzlePublishReviewRepository(db, writer),
    siteAudit: new DrizzleSiteAuditRepository(db, writer),
    integration: new DrizzleIntegrationRepository(db, writer),
    shopify: new DrizzleShopifyProductRefRepository(db, writer),
    printify: new DrizzlePrintifyProductRefRepository(db, writer),
    fulfillment: new DrizzleFulfillmentEventRepository(db, writer),
    aiEmployee: new DrizzleAiEmployeeRepository(db, writer),
    marketing: new DrizzleMarketingRepository(db, writer),
    support: new DrizzleSupportRepository(db, writer),
    billing: new DrizzleBillingRepository(db, writer)
  };
}
