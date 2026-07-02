import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

const id = text("id").primaryKey();
const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const metadata = jsonb("metadata").$type<Record<string, unknown>>().notNull().default({});
const notesJson = jsonb("notes").$type<unknown[] | Record<string, unknown>>().notNull().default([]);
const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
const percent = (name: string) => numeric(name, { precision: 7, scale: 3 });
const confidence = (name = "confidence") => numeric(name, { precision: 5, scale: 4 });

const ownership = () => ({
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  createdAt,
  updatedAt
});

const optionalActors = () => ({
  organizationId: text("organization_id").references(() => organizations.id),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  metadata
});

const sharedOwnership = () => ({
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  accountId: text("account_id"),
  createdAt,
  updatedAt
});

export const users = pgTable("users", {
  id,
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique").on(table.email),
  statusIdx: index("users_status_idx").on(table.status)
}));

export const organizations = pgTable("organizations", {
  id,
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id),
  status: text("status").notNull().default("active"),
  billingEmail: text("billing_email"),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
  ownerIdx: index("organizations_owner_idx").on(table.ownerUserId)
}));

export const organizationMembers = pgTable("organization_members", {
  id,
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  invitedBy: text("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  orgUserUnique: uniqueIndex("organization_members_org_user_unique").on(table.organizationId, table.userId),
  orgIdx: index("organization_members_org_idx").on(table.organizationId),
  userIdx: index("organization_members_user_idx").on(table.userId)
}));

export const plans = pgTable("plans", {
  id,
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  billingInterval: text("billing_interval").notNull().default("month"),
  active: boolean("active").notNull().default(true),
  featureSummary: jsonb("feature_summary").$type<Record<string, unknown>>().notNull().default({}),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  codeUnique: uniqueIndex("plans_code_unique").on(table.code)
}));

export const workspaces = pgTable("workspaces", {
  id,
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  defaultBrandName: text("default_brand_name").notNull().default("Salty Cowhide Co."),
  primaryDomain: text("primary_domain"),
  status: text("status").notNull().default("active"),
  createdBy: text("created_by").references(() => users.id),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  orgSlugUnique: uniqueIndex("workspaces_org_slug_unique").on(table.organizationId, table.slug),
  orgIdx: index("workspaces_org_idx").on(table.organizationId),
  statusIdx: index("workspaces_status_idx").on(table.status)
}));

export const workspaceBrandProfiles = pgTable("workspace_brand_profiles", {
  id,
  ...ownership(),
  ...optionalActors(),
  brandName: text("brand_name").notNull(),
  voice: text("voice").notNull(),
  targetCustomer: text("target_customer").notNull(),
  bannedTerms: jsonb("banned_terms").$type<string[]>().notNull().default([]),
  colorPalette: jsonb("color_palette").$type<string[]>().notNull().default([]),
  productDefaults: jsonb("product_defaults").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  notes: text("notes")
}, (table) => ({
  workspaceIdx: index("workspace_brand_profiles_workspace_idx").on(table.workspaceId),
  statusIdx: index("workspace_brand_profiles_status_idx").on(table.status)
}));

export const brandProfiles = pgTable("brand_profiles", {
  id,
  ...ownership(),
  ...optionalActors(),
  name: text("name").notNull(),
  audience: text("audience").notNull(),
  brandVoice: text("brand_voice").notNull(),
  styleKeywords: jsonb("style_keywords").$type<string[]>().notNull().default([]),
  excludedTopics: jsonb("excluded_topics").$type<string[]>().notNull().default([]),
  defaultTags: jsonb("default_tags").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("active"),
  notes: text("notes")
}, (table) => ({
  workspaceIdx: index("brand_profiles_workspace_idx").on(table.workspaceId),
  nameIdx: index("brand_profiles_name_idx").on(table.name)
}));

export const workspaceProviderConnections = pgTable("workspace_provider_connections", {
  id,
  ...ownership(),
  ...optionalActors(),
  providerType: text("provider_type").notNull(),
  providerName: text("provider_name").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  status: text("status").notNull().default("disabled"),
  secretRef: text("secret_ref"),
  lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
  lastHealthCheckStatus: text("last_health_check_status"),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes")
}, (table) => ({
  providerUnique: uniqueIndex("workspace_provider_connections_provider_unique").on(table.workspaceId, table.providerType, table.providerName),
  workspaceIdx: index("workspace_provider_connections_workspace_idx").on(table.workspaceId),
  statusIdx: index("workspace_provider_connections_status_idx").on(table.status)
}));

export const connectedStores = pgTable("connected_stores", {
  id,
  ...ownership(),
  ...optionalActors(),
  providerType: text("provider_type").notNull(),
  storeName: text("store_name").notNull(),
  storeDomain: text("store_domain"),
  externalStoreId: text("external_store_id"),
  connectionId: text("connection_id").references(() => workspaceProviderConnections.id),
  status: text("status").notNull().default("disabled"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes")
}, (table) => ({
  workspaceIdx: index("connected_stores_workspace_idx").on(table.workspaceId),
  providerIdx: index("connected_stores_provider_idx").on(table.providerType)
}));

export const providerConnectionStatus = pgTable("provider_connection_status", {
  id,
  ...ownership(),
  providerConnectionId: text("provider_connection_id").notNull().references(() => workspaceProviderConnections.id),
  providerType: text("provider_type").notNull(),
  status: text("status").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  latencyMs: integer("latency_ms"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  responseMetadata: jsonb("response_metadata").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  connectionIdx: index("provider_connection_status_connection_idx").on(table.providerConnectionId),
  workspaceIdx: index("provider_connection_status_workspace_idx").on(table.workspaceId)
}));

export const encryptedCredentials = pgTable("encrypted_credentials", {
  id,
  ...ownership(),
  ...optionalActors(),
  providerKey: text("provider_key").notNull(),
  providerConnectionId: text("provider_connection_id").references(() => workspaceProviderConnections.id),
  credentialRef: text("credential_ref").notNull(),
  encryptedPayload: jsonb("encrypted_payload").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  status: text("status").notNull().default("active")
}, (table) => ({
  refUnique: uniqueIndex("encrypted_credentials_ref_unique").on(table.workspaceId, table.credentialRef),
  providerIdx: index("encrypted_credentials_provider_idx").on(table.workspaceId, table.providerKey),
  connectionIdx: index("encrypted_credentials_connection_idx").on(table.providerConnectionId)
}));

export const integrationSyncRuns = pgTable("integration_sync_runs", {
  id,
  ...ownership(),
  ...optionalActors(),
  providerKey: text("provider_key").notNull(),
  providerConnectionId: text("provider_connection_id").references(() => workspaceProviderConnections.id),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull().default("queued"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  recordsRead: integer("records_read").notNull().default(0),
  recordsWritten: integer("records_written").notNull().default(0),
  lastCursor: text("last_cursor"),
  errorCode: text("error_code"),
  sanitizedErrorMessage: text("sanitized_error_message"),
  setupRequired: jsonb("setup_required").$type<string[]>().notNull().default([]),
  resultSummary: jsonb("result_summary").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  providerIdx: index("integration_sync_runs_provider_idx").on(table.workspaceId, table.providerKey),
  statusIdx: index("integration_sync_runs_status_idx").on(table.workspaceId, table.status),
  connectionIdx: index("integration_sync_runs_connection_idx").on(table.providerConnectionId)
}));

export const siteAuditRuns = pgTable("site_audit_runs", {
  id,
  ...ownership(),
  ...optionalActors(),
  websiteUrl: text("website_url").notNull(),
  sitemapUrl: text("sitemap_url"),
  brandName: text("brand_name"),
  targetKeywords: jsonb("target_keywords").$type<string[]>().notNull().default([]),
  competitorUrls: jsonb("competitor_urls").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("completed"),
  overallScore: integer("overall_score").notNull().default(0),
  seoScore: integer("seo_score").notNull().default(0),
  aeoScore: integer("aeo_score").notNull().default(0),
  geoScore: integer("geo_score").notNull().default(0),
  structuredDataScore: integer("structured_data_score").notNull().default(0),
  crawlabilityScore: integer("crawlability_score").notNull().default(0),
  productSchemaScore: integer("product_schema_score").notNull().default(0),
  contentQualityScore: integer("content_quality_score").notNull().default(0),
  conversionReadinessScore: integer("conversion_readiness_score").notNull().default(0),
  indicators: jsonb("indicators").$type<Record<string, unknown>>().notNull().default({}),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
  recommendedFixes: jsonb("recommended_fixes").$type<string[]>().notNull().default([]),
  priorityActions: jsonb("priority_actions").$type<string[]>().notNull().default([]),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  auditedAt: timestamp("audited_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  workspaceIdx: index("site_audit_runs_workspace_idx").on(table.workspaceId),
  auditedAtIdx: index("site_audit_runs_audited_at_idx").on(table.workspaceId, table.auditedAt),
  statusIdx: index("site_audit_runs_status_idx").on(table.status)
}));

export const siteAuditFindings = pgTable("site_audit_findings", {
  id,
  ...ownership(),
  auditRunId: text("audit_run_id").notNull().references(() => siteAuditRuns.id),
  severity: text("severity").notNull(),
  area: text("area").notNull(),
  message: text("message").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("open"),
  createdBy: text("created_by").references(() => users.id),
  metadata
}, (table) => ({
  runIdx: index("site_audit_findings_run_idx").on(table.auditRunId),
  workspaceIdx: index("site_audit_findings_workspace_idx").on(table.workspaceId),
  severityIdx: index("site_audit_findings_severity_idx").on(table.severity)
}));

export const workspaceFeatureFlags = pgTable("workspace_feature_flags", {
  id,
  ...ownership(),
  flagKey: text("flag_key").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  reason: text("reason"),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id)
}, (table) => ({
  flagUnique: uniqueIndex("workspace_feature_flags_unique").on(table.workspaceId, table.flagKey),
  workspaceIdx: index("workspace_feature_flags_workspace_idx").on(table.workspaceId)
}));

export const subscriptions = pgTable("subscriptions", {
  id,
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  workspaceId: text("workspace_id").references(() => workspaces.id),
  planId: text("plan_id").notNull().references(() => plans.id),
  status: text("status").notNull().default("trialing"),
  provider: text("provider").notNull().default("manual"),
  providerSubscriptionId: text("provider_subscription_id"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAt: timestamp("cancel_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  orgIdx: index("subscriptions_org_idx").on(table.organizationId),
  workspaceIdx: index("subscriptions_workspace_idx").on(table.workspaceId),
  providerIdx: index("subscriptions_provider_idx").on(table.provider, table.providerSubscriptionId)
}));

export const workspaceSubscriptionStatus = pgTable("workspace_subscription_status", {
  id,
  ...ownership(),
  subscriptionId: text("subscription_id").references(() => subscriptions.id),
  planId: text("plan_id").references(() => plans.id),
  status: text("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  renewsAt: timestamp("renews_at", { withTimezone: true }),
  limits: jsonb("limits").$type<Record<string, unknown>>().notNull().default({}),
  usageSnapshot: jsonb("usage_snapshot").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  workspaceUnique: uniqueIndex("workspace_subscription_status_workspace_unique").on(table.workspaceId)
}));

export const featureLimits = pgTable("feature_limits", {
  id,
  planId: text("plan_id").notNull().references(() => plans.id),
  featureKey: text("feature_key").notNull(),
  limitValue: integer("limit_value"),
  limitWindow: text("limit_window"),
  hardLimit: boolean("hard_limit").notNull().default(true),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  planFeatureUnique: uniqueIndex("feature_limits_plan_feature_unique").on(table.planId, table.featureKey)
}));

export const billingEvents = pgTable("billing_events", {
  id,
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  workspaceId: text("workspace_id").references(() => workspaces.id),
  subscriptionId: text("subscription_id").references(() => subscriptions.id),
  eventType: text("event_type").notNull(),
  provider: text("provider").notNull().default("manual"),
  providerEventId: text("provider_event_id"),
  amountCents: integer("amount_cents"),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("received"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  orgIdx: index("billing_events_org_idx").on(table.organizationId),
  workspaceIdx: index("billing_events_workspace_idx").on(table.workspaceId),
  eventIdx: index("billing_events_event_idx").on(table.eventType, table.status)
}));

export const workspaceUsageEvents = pgTable("workspace_usage_events", {
  id,
  ...ownership(),
  eventType: text("event_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit").notNull().default("count"),
  source: text("source").notNull().default("system"),
  refType: text("ref_type"),
  refId: text("ref_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  metadata
}, (table) => ({
  workspaceTypeIdx: index("workspace_usage_events_workspace_type_idx").on(table.workspaceId, table.eventType),
  occurredIdx: index("workspace_usage_events_occurred_idx").on(table.occurredAt)
}));

export const workspaceAuditEvents = pgTable("workspace_audit_events", {
  id,
  ...ownership(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeState: jsonb("before_state").$type<Record<string, unknown> | null>(),
  afterState: jsonb("after_state").$type<Record<string, unknown> | null>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  metadata
}, (table) => ({
  workspaceEntityIdx: index("workspace_audit_events_workspace_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  actorIdx: index("workspace_audit_events_actor_idx").on(table.actorType, table.actorId)
}));

export const aiEmployees = pgTable("ai_employees", {
  id,
  ...ownership(),
  ...optionalActors(),
  employeeType: text("employee_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("disabled"),
  providerPreference: text("provider_preference"),
  modelPreference: text("model_preference"),
  allowedTaskTypes: jsonb("allowed_task_types").$type<string[]>().notNull().default([]),
  requiresHumanApproval: boolean("requires_human_approval").notNull().default(true),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes")
}, (table) => ({
  workspaceTypeIdx: index("ai_employees_workspace_type_idx").on(table.workspaceId, table.employeeType),
  statusIdx: index("ai_employees_status_idx").on(table.status)
}));

export const aiEmployeeTasks = pgTable("ai_employee_tasks", {
  id,
  ...ownership(),
  employeeId: text("employee_id").references(() => aiEmployees.id),
  employeeType: text("employee_type").notNull(),
  taskType: text("task_type").notNull(),
  inputRefType: text("input_ref_type"),
  inputRefId: text("input_ref_id"),
  priority: integer("priority").notNull().default(0),
  status: text("status").notNull().default("queued"),
  requestedBy: text("requested_by").references(() => users.id),
  dueAt: timestamp("due_at", { withTimezone: true }),
  instructions: text("instructions"),
  inputJson: jsonb("input_json").$type<Record<string, unknown>>().notNull().default({}),
  metadata
}, (table) => ({
  workspaceStatusIdx: index("ai_employee_tasks_workspace_status_idx").on(table.workspaceId, table.status),
  employeeIdx: index("ai_employee_tasks_employee_idx").on(table.employeeId)
}));

export const aiEmployeeRuns = pgTable("ai_employee_runs", {
  id,
  ...ownership(),
  employeeId: text("employee_id").references(() => aiEmployees.id),
  taskId: text("task_id").references(() => aiEmployeeTasks.id),
  employeeType: text("employee_type").notNull(),
  taskType: text("task_type").notNull(),
  inputRefType: text("input_ref_type"),
  inputRefId: text("input_ref_id"),
  status: text("status").notNull().default("queued"),
  providerUsed: text("provider_used"),
  modelUsed: text("model_used"),
  promptRef: text("prompt_ref"),
  outputJson: jsonb("output_json").$type<Record<string, unknown>>().notNull().default({}),
  blockedReasons: jsonb("blocked_reasons").$type<string[]>().notNull().default([]),
  requiresHumanReview: boolean("requires_human_review").notNull().default(true),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text("error"),
  metadata
}, (table) => ({
  workspaceStatusIdx: index("ai_employee_runs_workspace_status_idx").on(table.workspaceId, table.status),
  inputIdx: index("ai_employee_runs_input_idx").on(table.inputRefType, table.inputRefId)
}));

export const aiEmployeeOutputs = pgTable("ai_employee_outputs", {
  id,
  ...ownership(),
  runId: text("run_id").notNull().references(() => aiEmployeeRuns.id),
  outputType: text("output_type").notNull(),
  refType: text("ref_type"),
  refId: text("ref_id"),
  outputJson: jsonb("output_json").$type<Record<string, unknown>>().notNull().default({}),
  storageBucket: text("storage_bucket"),
  filePath: text("file_path"),
  status: text("status").notNull().default("pending_review"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  metadata
}, (table) => ({
  runIdx: index("ai_employee_outputs_run_idx").on(table.runId),
  workspaceStatusIdx: index("ai_employee_outputs_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const aiEmployeePermissions = pgTable("ai_employee_permissions", {
  id,
  ...ownership(),
  employeeId: text("employee_id").notNull().references(() => aiEmployees.id),
  permissionKey: text("permission_key").notNull(),
  allowed: boolean("allowed").notNull().default(false),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  scopeJson: jsonb("scope_json").$type<Record<string, unknown>>().notNull().default({}),
  grantedBy: text("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  metadata
}, (table) => ({
  permissionUnique: uniqueIndex("ai_employee_permissions_unique").on(table.employeeId, table.permissionKey)
}));

export const aiEmployeeAuditEvents = pgTable("ai_employee_audit_events", {
  id,
  ...ownership(),
  employeeId: text("employee_id").references(() => aiEmployees.id),
  runId: text("run_id").references(() => aiEmployeeRuns.id),
  taskId: text("task_id").references(() => aiEmployeeTasks.id),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  beforeState: jsonb("before_state").$type<Record<string, unknown> | null>(),
  afterState: jsonb("after_state").$type<Record<string, unknown> | null>(),
  notes: text("notes"),
  metadata
}, (table) => ({
  workspaceIdx: index("ai_employee_audit_events_workspace_idx").on(table.workspaceId),
  runIdx: index("ai_employee_audit_events_run_idx").on(table.runId)
}));

export const trendSources = pgTable("trend_sources", {
  id,
  ...ownership(),
  ...optionalActors(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  allowedUse: text("allowed_use").notNull(),
  requiresManualImport: boolean("requires_manual_import").notNull().default(true),
  status: text("status").notNull().default("active"),
  active: boolean("active").notNull().default(true),
  sourcePolicyUrl: text("source_policy_url"),
  notes: text("notes")
}, (table) => ({
  workspaceTypeIdx: index("trend_sources_workspace_type_idx").on(table.workspaceId, table.type)
}));

export const trendClusters = pgTable("trend_clusters", {
  id,
  ...ownership(),
  ...optionalActors(),
  name: text("name").notNull(),
  signalIds: jsonb("signal_ids").$type<string[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  aestheticTags: jsonb("aesthetic_tags").$type<string[]>().notNull().default([]),
  seasonality: jsonb("seasonality").$type<string[]>().notNull().default([]),
  targetCustomer: text("target_customer").notNull(),
  confidence: confidence().notNull(),
  status: text("status").notNull().default("pending_approval"),
  approvedForGeneration: boolean("approved_for_generation").notNull().default(false),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("trend_clusters_workspace_status_idx").on(table.workspaceId, table.status),
  nameIdx: index("trend_clusters_name_idx").on(table.name)
}));

export const trendSignals = pgTable("trend_signals", {
  id,
  ...ownership(),
  ...optionalActors(),
  sourceId: text("source_id").notNull().references(() => trendSources.id),
  sourceUrl: text("source_url"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  keyword: text("keyword").notNull(),
  relatedTerms: jsonb("related_terms").$type<string[]>().notNull().default([]),
  category: text("category").notNull(),
  region: text("region").notNull(),
  season: text("season"),
  confidence: confidence().notNull(),
  allowedUse: text("allowed_use").notNull(),
  status: text("status").notNull().default("new"),
  clusterId: text("cluster_id").references(() => trendClusters.id),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("trend_signals_workspace_status_idx").on(table.workspaceId, table.status),
  sourceIdx: index("trend_signals_source_idx").on(table.sourceId),
  clusterIdx: index("trend_signals_cluster_idx").on(table.clusterId),
  keywordIdx: index("trend_signals_keyword_idx").on(table.keyword)
}));

export const trendClusterSignals = pgTable("trend_cluster_signals", {
  id,
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  clusterId: text("cluster_id").notNull().references(() => trendClusters.id),
  signalId: text("signal_id").notNull().references(() => trendSignals.id),
  createdAt,
  updatedAt,
  metadata
}, (table) => ({
  clusterSignalUnique: uniqueIndex("trend_cluster_signals_unique").on(table.clusterId, table.signalId),
  workspaceIdx: index("trend_cluster_signals_workspace_idx").on(table.workspaceId)
}));

export const phraseCandidates = pgTable("phrase_candidates", {
  id,
  ...ownership(),
  ...optionalActors(),
  clusterId: text("cluster_id").notNull().references(() => trendClusters.id),
  text: text("text").notNull(),
  generatedBy: text("generated_by").notNull(),
  generationPromptRef: text("generation_prompt_ref").notNull(),
  status: text("status").notNull().default("draft"),
  trademarkReview: jsonb("trademark_review").$type<Record<string, unknown>>().notNull().default({}),
  approvedForDesign: boolean("approved_for_design").notNull().default(false),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("phrase_candidates_workspace_status_idx").on(table.workspaceId, table.status),
  clusterIdx: index("phrase_candidates_cluster_idx").on(table.clusterId)
}));

export const riskReviews = pgTable("risk_reviews", {
  id,
  ...ownership(),
  ...optionalActors(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  checks: jsonb("checks").$type<Record<string, boolean>>().notNull().default({}),
  riskScore: confidence("risk_score").notNull().default("0"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewerId: text("reviewer_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  entityIdx: index("risk_reviews_entity_idx").on(table.entityType, table.entityId),
  workspaceStatusIdx: index("risk_reviews_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const designBriefs = pgTable("design_briefs", {
  id,
  ...ownership(),
  ...optionalActors(),
  phraseId: text("phrase_id").notNull().references(() => phraseCandidates.id),
  clusterId: text("cluster_id").notNull().references(() => trendClusters.id),
  collection: text("collection").notNull(),
  productTargets: jsonb("product_targets").$type<string[]>().notNull().default([]),
  styleDirection: jsonb("style_direction").$type<Record<string, unknown>>().notNull().default({}),
  generationPrompt: text("generation_prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  status: text("status").notNull().default("draft"),
  approvedForGeneration: boolean("approved_for_generation").notNull().default(false),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("design_briefs_workspace_status_idx").on(table.workspaceId, table.status),
  clusterIdx: index("design_briefs_cluster_idx").on(table.clusterId)
}));

export const generationJobs = pgTable("generation_jobs", {
  id,
  ...ownership(),
  ...optionalActors(),
  briefId: text("brief_id").notNull().references(() => designBriefs.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  parameters: jsonb("parameters").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("queued"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  outputAssetId: text("output_asset_id"),
  error: text("error"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("generation_jobs_workspace_status_idx").on(table.workspaceId, table.status),
  briefIdx: index("generation_jobs_brief_idx").on(table.briefId)
}));

export const designAssets = pgTable("design_assets", {
  id,
  ...ownership(),
  ...optionalActors(),
  jobId: text("job_id").references(() => generationJobs.id),
  briefId: text("brief_id").notNull().references(() => designBriefs.id),
  assetType: text("asset_type").notNull(),
  storageBucket: text("storage_bucket").notNull(),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  dpi: integer("dpi").notNull(),
  transparentBackground: boolean("transparent_background").notNull().default(false),
  generator: text("generator").notNull(),
  model: text("model").notNull(),
  qaStatus: text("qa_status").notNull().default("pending"),
  riskStatus: text("risk_status").notNull().default("pending"),
  approvedForMockup: boolean("approved_for_mockup").notNull().default(false),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  workspaceQaIdx: index("design_assets_workspace_qa_idx").on(table.workspaceId, table.qaStatus),
  briefIdx: index("design_assets_brief_idx").on(table.briefId)
}));

export const printFileQa = pgTable("print_file_qa", {
  id,
  ...ownership(),
  ...optionalActors(),
  assetId: text("asset_id").notNull().references(() => designAssets.id),
  checks: jsonb("checks").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("pending"),
  blockedReasons: jsonb("blocked_reasons").$type<string[]>().notNull().default([]),
  approvedForProductDraft: boolean("approved_for_product_draft").notNull().default(false),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  assetIdx: index("print_file_qa_asset_idx").on(table.assetId),
  workspaceStatusIdx: index("print_file_qa_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const mockupTemplates = pgTable("mockup_templates", {
  id,
  ...ownership(),
  ...optionalActors(),
  name: text("name").notNull(),
  productType: text("product_type").notNull(),
  printifyBlueprintId: text("printify_blueprint_id"),
  canvas: jsonb("canvas").$type<Record<string, unknown>>().notNull().default({}),
  baseImagePath: text("base_image_path").notNull(),
  colorVariants: jsonb("color_variants").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("active"),
  notes: text("notes")
}, (table) => ({
  workspaceProductIdx: index("mockup_templates_workspace_product_idx").on(table.workspaceId, table.productType)
}));

export const productDrafts = pgTable("product_drafts", {
  id,
  ...ownership(),
  ...optionalActors(),
  brand: text("brand").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  productType: text("product_type").notNull(),
  collection: text("collection").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  briefId: text("brief_id").references(() => designBriefs.id),
  assetId: text("asset_id").references(() => designAssets.id),
  mockupIds: jsonb("mockup_ids").$type<string[]>().notNull().default([]),
  variantIds: jsonb("variant_ids").$type<string[]>().notNull().default([]),
  shopifyStatus: text("shopify_status").notNull().default("not_published"),
  printifyStatus: text("printify_status").notNull().default("not_synced"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  status: text("status").notNull().default("draft"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  publishReviewId: text("publish_review_id"),
  publicHandle: text("public_handle"),
  publicProjection: jsonb("public_projection").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("product_drafts_workspace_status_idx").on(table.workspaceId, table.status),
  approvalIdx: index("product_drafts_approval_idx").on(table.approvalStatus),
  publicHandleIdx: uniqueIndex("product_drafts_public_handle_unique").on(table.workspaceId, table.publicHandle)
}));

export const mockupAssets = pgTable("mockup_assets", {
  id,
  ...ownership(),
  ...optionalActors(),
  assetId: text("asset_id").notNull().references(() => designAssets.id),
  templateId: text("template_id").notNull().references(() => mockupTemplates.id),
  productDraftId: text("product_draft_id").references(() => productDrafts.id),
  colorVariant: text("color_variant").notNull(),
  storageBucket: text("storage_bucket").notNull(),
  filePath: text("file_path").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  status: text("status").notNull().default("generated"),
  approvedForProduct: boolean("approved_for_product").notNull().default(false),
  notes: text("notes")
}, (table) => ({
  draftIdx: index("mockup_assets_draft_idx").on(table.productDraftId),
  workspaceStatusIdx: index("mockup_assets_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const productVariants = pgTable("product_variants", {
  id,
  ...ownership(),
  ...optionalActors(),
  productDraftId: text("product_draft_id").notNull().references(() => productDrafts.id),
  sku: text("sku").notNull(),
  size: text("size").notNull(),
  color: text("color").notNull(),
  colorHex: text("color_hex"),
  printifyVariantId: text("printify_variant_id"),
  printifyBlueprintId: text("printify_blueprint_id"),
  printifyPrintProviderId: text("printify_print_provider_id"),
  cost: money("cost").notNull(),
  price: money("price").notNull(),
  compareAtPrice: money("compare_at_price"),
  marginDollars: money("margin_dollars").notNull(),
  marginPercent: percent("margin_percent").notNull(),
  marginOk: boolean("margin_ok").notNull().default(false),
  weightOz: numeric("weight_oz", { precision: 8, scale: 2 }),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("active"),
  notes: text("notes")
}, (table) => ({
  skuUnique: uniqueIndex("product_variants_sku_unique").on(table.workspaceId, table.sku),
  draftIdx: index("product_variants_draft_idx").on(table.productDraftId)
}));

export const priceMarginChecks = pgTable("price_margin_checks", {
  id,
  ...ownership(),
  ...optionalActors(),
  productDraftId: text("product_draft_id").notNull().references(() => productDrafts.id),
  variantId: text("variant_id").references(() => productVariants.id),
  cost: money("cost").notNull(),
  price: money("price").notNull(),
  shopifyFeeEstimate: money("shopify_fee_estimate").notNull().default("0"),
  printifyShippingEstimate: money("printify_shipping_estimate").notNull().default("0"),
  platformFeeEstimate: money("platform_fee_estimate").notNull().default("0"),
  netRevenueEstimate: money("net_revenue_estimate").notNull(),
  marginPercent: percent("margin_percent").notNull(),
  minimumMarginThreshold: percent("minimum_margin_threshold").notNull().default("40"),
  marginOk: boolean("margin_ok").notNull().default(false),
  blocked: boolean("blocked").notNull().default(true),
  status: text("status").notNull().default("pending"),
  notes: text("notes")
}, (table) => ({
  draftIdx: index("price_margin_checks_draft_idx").on(table.productDraftId),
  workspaceStatusIdx: index("price_margin_checks_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const publishReviews = pgTable("publish_reviews", {
  id,
  ...ownership(),
  ...optionalActors(),
  productDraftId: text("product_draft_id").notNull().references(() => productDrafts.id),
  gates: jsonb("gates").$type<Record<string, boolean>>().notNull().default({}),
  allGatesPassed: boolean("all_gates_passed").notNull().default(false),
  shopifyPublishAllowed: boolean("shopify_publish_allowed").notNull().default(false),
  printifySyncAllowed: boolean("printify_sync_allowed").notNull().default(false),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  notes: notesJson,
  status: text("status").notNull().default("pending")
}, (table) => ({
  draftUnique: uniqueIndex("publish_reviews_draft_unique").on(table.productDraftId),
  workspaceStatusIdx: index("publish_reviews_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const shopifyProductRefs = pgTable("shopify_product_refs", {
  id,
  ...ownership(),
  ...optionalActors(),
  productDraftId: text("product_draft_id").notNull().references(() => productDrafts.id),
  connectedStoreId: text("connected_store_id").references(() => connectedStores.id),
  shopifyProductId: text("shopify_product_id").notNull(),
  shopifyHandle: text("shopify_handle").notNull(),
  shopifyStatus: text("shopify_status").notNull().default("draft"),
  shopifyPublishedAt: timestamp("shopify_published_at", { withTimezone: true }),
  shopifyCollectionIds: jsonb("shopify_collection_ids").$type<string[]>().notNull().default([]),
  shopifyVariantIds: jsonb("shopify_variant_ids").$type<Record<string, string>>().notNull().default({}),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("active"),
  notes: text("notes")
}, (table) => ({
  draftIdx: index("shopify_product_refs_draft_idx").on(table.productDraftId),
  shopifyUnique: uniqueIndex("shopify_product_refs_product_unique").on(table.workspaceId, table.shopifyProductId)
}));

export const printifyProductRefs = pgTable("printify_product_refs", {
  id,
  ...ownership(),
  ...optionalActors(),
  productDraftId: text("product_draft_id").notNull().references(() => productDrafts.id),
  connectedStoreId: text("connected_store_id").references(() => connectedStores.id),
  printifyProductId: text("printify_product_id").notNull(),
  printifyShopId: text("printify_shop_id").notNull(),
  printifyBlueprintId: text("printify_blueprint_id").notNull(),
  printifyPrintProviderId: text("printify_print_provider_id").notNull(),
  printifyStatus: text("printify_status").notNull().default("draft"),
  printifyPublished: boolean("printify_published").notNull().default(false),
  printifyExternalId: text("printify_external_id"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("active"),
  notes: text("notes")
}, (table) => ({
  draftIdx: index("printify_product_refs_draft_idx").on(table.productDraftId),
  printifyUnique: uniqueIndex("printify_product_refs_product_unique").on(table.workspaceId, table.printifyProductId)
}));

export const fulfillmentEvents = pgTable("fulfillment_events", {
  id,
  ...ownership(),
  ...optionalActors(),
  shopifyProductRefId: text("shopify_product_ref_id").references(() => shopifyProductRefs.id),
  printifyProductRefId: text("printify_product_ref_id").references(() => printifyProductRefs.id),
  eventType: text("event_type").notNull(),
  shopifyOrderId: text("shopify_order_id"),
  printifyOrderId: text("printify_order_id"),
  status: text("status").notNull().default("pending"),
  lineItems: jsonb("line_items").$type<Array<Record<string, unknown>>>().notNull().default([]),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  carrier: text("carrier"),
  rawWebhookPayloadRef: text("raw_webhook_payload_ref"),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("fulfillment_events_workspace_status_idx").on(table.workspaceId, table.status),
  shopifyOrderIdx: index("fulfillment_events_shopify_order_idx").on(table.shopifyOrderId)
}));

export const auditEvents = pgTable("audit_events", {
  id,
  ...ownership(),
  organizationId: text("organization_id").references(() => organizations.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  beforeState: text("before_state"),
  afterState: text("after_state"),
  notes: text("notes"),
  metadata
}, (table) => ({
  workspaceEntityIdx: index("audit_events_workspace_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  actorIdx: index("audit_events_actor_idx").on(table.actorType, table.actorId)
}));

export const productCollectionPlans = pgTable("product_collection_plans", {
  id,
  ...ownership(),
  ...optionalActors(),
  brandProfileId: text("brand_profile_id").references(() => brandProfiles.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  season: text("season"),
  targetLaunchAt: timestamp("target_launch_at", { withTimezone: true }),
  productTargets: jsonb("product_targets").$type<string[]>().notNull().default([]),
  sourceClusterIds: jsonb("source_cluster_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("planning"),
  notes: text("notes")
}, (table) => ({
  workspaceSlugUnique: uniqueIndex("product_collection_plans_slug_unique").on(table.workspaceId, table.slug),
  statusIdx: index("product_collection_plans_status_idx").on(table.workspaceId, table.status)
}));

export const dropCalendars = pgTable("drop_calendars", {
  id,
  ...ownership(),
  ...optionalActors(),
  collectionPlanId: text("collection_plan_id").references(() => productCollectionPlans.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  launchAt: timestamp("launch_at", { withTimezone: true }),
  closeAt: timestamp("close_at", { withTimezone: true }),
  productDraftIds: jsonb("product_draft_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  publicVisibility: text("public_visibility").notNull().default("hidden"),
  notes: text("notes")
}, (table) => ({
  workspaceSlugUnique: uniqueIndex("drop_calendars_slug_unique").on(table.workspaceId, table.slug),
  launchIdx: index("drop_calendars_launch_idx").on(table.launchAt)
}));

export const marketingAssets = pgTable("marketing_assets", {
  id,
  ...ownership(),
  ...optionalActors(),
  productDraftId: text("product_draft_id").references(() => productDrafts.id),
  assetType: text("asset_type").notNull(),
  channel: text("channel").notNull(),
  storageBucket: text("storage_bucket"),
  filePath: text("file_path"),
  copyText: text("copy_text"),
  status: text("status").notNull().default("draft"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  metadata
}, (table) => ({
  workspaceStatusIdx: index("marketing_assets_workspace_status_idx").on(table.workspaceId, table.status),
  draftIdx: index("marketing_assets_draft_idx").on(table.productDraftId)
}));

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id,
  ...ownership(),
  ...optionalActors(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  objective: text("objective"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  productDraftIds: jsonb("product_draft_ids").$type<string[]>().notNull().default([]),
  marketingAssetIds: jsonb("marketing_asset_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  performance: jsonb("performance").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("marketing_campaigns_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const supportMacros = pgTable("support_macros", {
  id,
  ...ownership(),
  ...optionalActors(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  body: text("body").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("active"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  metadata
}, (table) => ({
  workspaceCategoryIdx: index("support_macros_workspace_category_idx").on(table.workspaceId, table.category)
}));

export const customerSupportDrafts = pgTable("customer_support_drafts", {
  id,
  ...ownership(),
  ...optionalActors(),
  macroId: text("macro_id").references(() => supportMacros.id),
  customerRef: text("customer_ref"),
  orderRef: text("order_ref"),
  channel: text("channel").notNull().default("email"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  requiresHumanReview: boolean("requires_human_review").notNull().default(true),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  metadata
}, (table) => ({
  workspaceStatusIdx: index("customer_support_drafts_workspace_status_idx").on(table.workspaceId, table.status),
  orderIdx: index("customer_support_drafts_order_idx").on(table.orderRef)
}));

export const workspaceMetrics = pgTable("workspace_metrics", {
  id,
  ...ownership(),
  metricKey: text("metric_key").notNull(),
  metricValue: numeric("metric_value", { precision: 18, scale: 4 }).notNull(),
  dimensionJson: jsonb("dimension_json").$type<Record<string, unknown>>().notNull().default({}),
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull().default("system"),
  metadata
}, (table) => ({
  metricIdx: index("workspace_metrics_metric_idx").on(table.workspaceId, table.metricKey, table.measuredAt)
}));

export const workspaceBusinessProfilesV1 = pgTable("workspace_business_profiles_v1", {
  id,
  ...ownership(),
  ...optionalActors(),
  businessName: text("business_name").notNull(),
  publicBrandName: text("public_brand_name").notNull(),
  businessType: text("business_type").notNull().default("hybrid"),
  fulfillmentModel: text("fulfillment_model").notNull().default("hybrid"),
  supportEmail: text("support_email"),
  country: text("country").notNull().default("US"),
  timezone: text("timezone").notNull().default("America/New_York"),
  currency: text("currency").notNull().default("USD"),
  readinessScore: integer("readiness_score").notNull().default(0),
  readinessBlockers: jsonb("readiness_blockers").$type<string[]>().notNull().default([]),
  profileJson: jsonb("profile_json").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft")
}, (table) => ({
  workspaceUnique: uniqueIndex("workspace_business_profiles_v1_workspace_unique").on(table.workspaceId),
  statusIdx: index("workspace_business_profiles_v1_status_idx").on(table.workspaceId, table.status)
}));

export const workspaceChannels = pgTable("workspace_channels", {
  id,
  ...ownership(),
  ...optionalActors(),
  channelType: text("channel_type").notNull(),
  category: text("category").notNull(),
  displayName: text("display_name").notNull(),
  url: text("url"),
  handle: text("handle"),
  accountId: text("account_id"),
  status: text("status").notNull().default("missing"),
  ownerPriority: integer("owner_priority").notNull().default(3),
  includeInAiRecommendations: boolean("include_in_ai_recommendations").notNull().default(true),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  channelMetadata: jsonb("channel_metadata").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes")
}, (table) => ({
  workspaceTypeIdx: index("workspace_channels_type_idx").on(table.workspaceId, table.channelType),
  workspaceStatusIdx: index("workspace_channels_status_idx").on(table.workspaceId, table.status)
}));

export const migrationWizardRuns = pgTable("migration_wizard_runs", {
  id,
  ...ownership(),
  ...optionalActors(),
  currentStep: integer("current_step").notNull().default(1),
  completedSteps: jsonb("completed_steps").$type<string[]>().notNull().default([]),
  skippedSteps: jsonb("skipped_steps").$type<Record<string, string>>().notNull().default({}),
  readinessScores: jsonb("readiness_scores").$type<Record<string, number>>().notNull().default({}),
  recommendations: jsonb("recommendations").$type<Array<Record<string, unknown>>>().notNull().default([]),
  approvalRules: jsonb("approval_rules").$type<Record<string, unknown>>().notNull().default({}),
  firstThirtyDayPlan: jsonb("first_thirty_day_plan").$type<Array<Record<string, unknown>>>().notNull().default([]),
  sourceLabel: text("source_label").notNull().default("rules_based"),
  status: text("status").notNull().default("in_progress"),
  wizardJson: jsonb("wizard_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  workspaceStatusIdx: index("migration_wizard_runs_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const baselineSnapshots = pgTable("baseline_snapshots", {
  id,
  ...ownership(),
  ...optionalActors(),
  snapshotName: text("snapshot_name").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  sourceLabel: text("source_label").notNull().default("provider_imported"),
  metricsJson: jsonb("metrics_json").$type<Record<string, unknown>>().notNull().default({}),
  insufficientData: jsonb("insufficient_data").$type<string[]>().notNull().default([]),
  comparisonJson: jsonb("comparison_json").$type<Record<string, unknown>>().notNull().default({}),
  employeeAttribution: jsonb("employee_attribution").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("captured")
}, (table) => ({
  workspaceCapturedIdx: index("baseline_snapshots_workspace_captured_idx").on(table.workspaceId, table.capturedAt),
  statusIdx: index("baseline_snapshots_status_idx").on(table.workspaceId, table.status)
}));

export const podMigrationCandidates = pgTable("pod_migration_candidates", {
  id,
  ...ownership(),
  ...optionalActors(),
  designName: text("design_name").notNull(),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"),
  sourceListingId: text("source_listing_id"),
  originalProductType: text("original_product_type"),
  designFileStatus: text("design_file_status").notNull().default("missing"),
  designAssetId: text("design_asset_id").references(() => designAssets.id),
  targetProductTypes: jsonb("target_product_types").$type<string[]>().notNull().default([]),
  targetChannels: jsonb("target_channels").$type<string[]>().notNull().default([]),
  readinessJson: jsonb("readiness_json").$type<Record<string, unknown>>().notNull().default({}),
  pricingJson: jsonb("pricing_json").$type<Record<string, unknown>>().notNull().default({}),
  safetyFlags: jsonb("safety_flags").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("idea"),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("pod_migration_candidates_workspace_status_idx").on(table.workspaceId, table.status)
}));

export const dropshipProductCandidates = pgTable("dropship_product_candidates", {
  id,
  ...ownership(),
  ...optionalActors(),
  supplierName: text("supplier_name").notNull(),
  supplierUrl: text("supplier_url"),
  productCategory: text("product_category").notNull().default("other"),
  productTitle: text("product_title").notNull(),
  shippingRegions: jsonb("shipping_regions").$type<string[]>().notNull().default([]),
  pricingJson: jsonb("pricing_json").$type<Record<string, unknown>>().notNull().default({}),
  riskScore: integer("risk_score").notNull().default(0),
  brandFitScore: integer("brand_fit_score").notNull().default(0),
  flags: jsonb("flags").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("idea"),
  notes: text("notes")
}, (table) => ({
  workspaceStatusIdx: index("dropship_product_candidates_workspace_status_idx").on(table.workspaceId, table.status),
  categoryIdx: index("dropship_product_candidates_category_idx").on(table.workspaceId, table.productCategory)
}));

export const listingDraftsV1 = pgTable("listing_drafts_v1", {
  id,
  ...ownership(),
  ...optionalActors(),
  targetChannel: text("target_channel").notNull(),
  sourceType: text("source_type").notNull().default("manual"),
  sourceId: text("source_id"),
  title: text("title").notNull(),
  shortHook: text("short_hook"),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }),
  approvalStatus: text("approval_status").notNull().default("draft"),
  validationStatus: text("validation_status").notNull().default("blocked"),
  validationBlockers: jsonb("validation_blockers").$type<string[]>().notNull().default([]),
  listingJson: jsonb("listing_json").$type<Record<string, unknown>>().notNull().default({}),
  exportPayload: jsonb("export_payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft")
}, (table) => ({
  workspaceStatusIdx: index("listing_drafts_v1_workspace_status_idx").on(table.workspaceId, table.status),
  approvalIdx: index("listing_drafts_v1_approval_idx").on(table.workspaceId, table.approvalStatus)
}));

export const socialContentItems = pgTable("social_content_items", {
  id,
  ...ownership(),
  ...optionalActors(),
  channelType: text("channel_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sourceLabel: text("source_label").notNull().default("rules_based"),
  sourceType: text("source_type").notNull().default("manual"),
  sourceId: text("source_id"),
  approvalStatus: text("approval_status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedManuallyAt: timestamp("published_manually_at", { withTimezone: true }),
  constraintsJson: jsonb("constraints_json").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("idea")
}, (table) => ({
  workspaceStatusIdx: index("social_content_items_workspace_status_idx").on(table.workspaceId, table.status),
  channelIdx: index("social_content_items_channel_idx").on(table.workspaceId, table.channelType)
}));

export const storefrontThemeSettings = pgTable("storefront_theme_settings", {
  id,
  ...ownership(),
  ...optionalActors(),
  themeKey: text("theme_key").notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  themeUnique: uniqueIndex("storefront_theme_settings_unique").on(table.workspaceId, table.themeKey)
}));

export const storefrontPages = pgTable("storefront_pages", {
  id,
  ...ownership(),
  ...optionalActors(),
  pageType: text("page_type").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  bodyJson: jsonb("body_json").$type<Record<string, unknown>>().notNull().default({}),
  seoJson: jsonb("seo_json").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  pageUnique: uniqueIndex("storefront_pages_slug_unique").on(table.workspaceId, table.slug),
  statusIdx: index("storefront_pages_workspace_status_idx").on(table.workspaceId, table.status)
}));

const crmOwnership = () => ({
  id,
  ...ownership(),
  ...optionalActors(),
  sourceLabel: text("source_label").notNull().default("manual_entry"),
  status: text("status").notNull().default("active")
});

export const crmCustomers = pgTable("crm_customers", {
  ...crmOwnership(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  lifecycleStage: text("lifecycle_stage").notNull().default("lead"),
  customerType: text("customer_type").notNull().default("unknown"),
  marketingConsentStatus: text("marketing_consent_status").notNull().default("unknown"),
  lifetimeValue: money("lifetime_value").notNull().default("0"),
  averageOrderValue: money("average_order_value").notNull().default("0"),
  orderCount: integer("order_count").notNull().default(0),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
  lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  nextAction: text("next_action"),
  assignedOwnerId: text("assigned_owner_id").references(() => users.id),
  profileJson: jsonb("profile_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  workspaceEmailIdx: index("crm_customers_workspace_email_idx").on(table.workspaceId, table.email),
  workspaceStatusIdx: index("crm_customers_workspace_status_idx").on(table.workspaceId, table.status),
  sourceIdx: index("crm_customers_source_idx").on(table.workspaceId, table.sourceLabel),
  lifecycleIdx: index("crm_customers_lifecycle_idx").on(table.workspaceId, table.lifecycleStage)
}));

export const crmCompanies = pgTable("crm_companies", {
  ...crmOwnership(),
  name: text("name").notNull(),
  websiteUrl: text("website_url"),
  companyType: text("company_type").notNull().default("account"),
  lifecycleStage: text("lifecycle_stage").notNull().default("prospect"),
  notes: text("notes")
}, (table) => ({
  workspaceNameIdx: index("crm_companies_workspace_name_idx").on(table.workspaceId, table.name),
  statusIdx: index("crm_companies_status_idx").on(table.workspaceId, table.status)
}));

export const crmContactMethods = pgTable("crm_contact_methods", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  methodType: text("method_type").notNull(),
  value: text("value").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  consentStatus: text("consent_status").notNull().default("unknown"),
  verificationStatus: text("verification_status").notNull().default("unverified")
}, (table) => ({
  customerIdx: index("crm_contact_methods_customer_idx").on(table.workspaceId, table.customerId),
  valueIdx: index("crm_contact_methods_value_idx").on(table.workspaceId, table.value)
}));

export const crmAddresses = pgTable("crm_addresses", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  addressType: text("address_type").notNull().default("shipping"),
  name: text("name"),
  line1: text("line1"),
  line2: text("line2"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("US")
}, (table) => ({
  customerIdx: index("crm_addresses_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmTags = pgTable("crm_tags", {
  ...crmOwnership(),
  name: text("name").notNull(),
  color: text("color"),
  category: text("category").notNull().default("customer")
}, (table) => ({
  tagUnique: uniqueIndex("crm_tags_workspace_name_unique").on(table.workspaceId, table.name),
  categoryIdx: index("crm_tags_category_idx").on(table.workspaceId, table.category)
}));

export const crmCustomerTags = pgTable("crm_customer_tags", {
  ...crmOwnership(),
  customerId: text("customer_id").notNull().references(() => crmCustomers.id),
  tagId: text("tag_id").notNull().references(() => crmTags.id)
}, (table) => ({
  customerTagUnique: uniqueIndex("crm_customer_tags_unique").on(table.workspaceId, table.customerId, table.tagId),
  customerIdx: index("crm_customer_tags_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmSources = pgTable("crm_sources", {
  ...crmOwnership(),
  sourceKey: text("source_key").notNull(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull().default("manual")
}, (table) => ({
  sourceUnique: uniqueIndex("crm_sources_workspace_key_unique").on(table.workspaceId, table.sourceKey)
}));

export const crmCustomerPreferences = pgTable("crm_customer_preferences", {
  ...crmOwnership(),
  customerId: text("customer_id").notNull().references(() => crmCustomers.id),
  preferenceKey: text("preference_key").notNull(),
  preferenceValue: text("preference_value")
}, (table) => ({
  customerIdx: index("crm_customer_preferences_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmCustomerProductInterests = pgTable("crm_customer_product_interests", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  productType: text("product_type").notNull(),
  productId: text("product_id"),
  interestScore: integer("interest_score").notNull().default(0),
  interestNotes: text("interest_notes")
}, (table) => ({
  customerIdx: index("crm_customer_product_interests_customer_idx").on(table.workspaceId, table.customerId),
  productTypeIdx: index("crm_customer_product_interests_type_idx").on(table.workspaceId, table.productType)
}));

export const crmCustomerMetrics = pgTable("crm_customer_metrics", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  metricKey: text("metric_key").notNull(),
  metricValue: numeric("metric_value", { precision: 14, scale: 4 }).notNull().default("0"),
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  metricIdx: index("crm_customer_metrics_metric_idx").on(table.workspaceId, table.customerId, table.metricKey)
}));

export const crmCustomerExternalRefs = pgTable("crm_customer_external_refs", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  providerKey: text("provider_key").notNull(),
  externalId: text("external_id").notNull(),
  externalUrl: text("external_url")
}, (table) => ({
  externalUnique: uniqueIndex("crm_customer_external_refs_unique").on(table.workspaceId, table.providerKey, table.externalId),
  customerIdx: index("crm_customer_external_refs_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmTimelineEvents = pgTable("crm_timeline_events", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
  sourceRecordId: text("source_record_id"),
  aiSuggested: boolean("ai_suggested").notNull().default(false)
}, (table) => ({
  customerTimeIdx: index("crm_timeline_events_customer_time_idx").on(table.workspaceId, table.customerId, table.eventAt),
  eventTypeIdx: index("crm_timeline_events_type_idx").on(table.workspaceId, table.eventType)
}));

export const crmInteractions = pgTable("crm_interactions", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  interactionType: text("interaction_type").notNull(),
  channel: text("channel").notNull().default("manual"),
  direction: text("direction").notNull().default("internal"),
  subject: text("subject"),
  body: text("body"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  customerIdx: index("crm_interactions_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmNotes = pgTable("crm_notes", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false)
}, (table) => ({
  customerIdx: index("crm_notes_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmTasks = pgTable("crm_tasks", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  priority: text("priority").notNull().default("normal"),
  assignedOwnerId: text("assigned_owner_id").references(() => users.id)
}, (table) => ({
  dueIdx: index("crm_tasks_due_status_idx").on(table.workspaceId, table.status, table.dueAt),
  customerIdx: index("crm_tasks_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmTaskTemplates = pgTable("crm_task_templates", {
  ...crmOwnership(),
  title: text("title").notNull(),
  description: text("description"),
  triggerKey: text("trigger_key"),
  defaultPriority: text("default_priority").notNull().default("normal")
}, (table) => ({
  triggerIdx: index("crm_task_templates_trigger_idx").on(table.workspaceId, table.triggerKey)
}));

export const crmLeads = pgTable("crm_leads", {
  ...crmOwnership(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  interest: text("interest"),
  estimatedValue: money("estimated_value"),
  assignedSegment: text("assigned_segment"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  consentStatus: text("consent_status").notNull().default("unknown"),
  notes: text("notes")
}, (table) => ({
  emailIdx: index("crm_leads_email_idx").on(table.workspaceId, table.email),
  statusIdx: index("crm_leads_status_idx").on(table.workspaceId, table.status)
}));

export const crmOpportunities = pgTable("crm_opportunities", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  leadId: text("lead_id").references(() => crmLeads.id),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("new"),
  estimatedValue: money("estimated_value"),
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  productInterest: text("product_interest"),
  nextAction: text("next_action")
}, (table) => ({
  stageIdx: index("crm_opportunities_stage_idx").on(table.workspaceId, table.stage)
}));

export const crmQuotes = pgTable("crm_quotes", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  leadId: text("lead_id").references(() => crmLeads.id),
  title: text("title").notNull(),
  estimatedValue: money("estimated_value"),
  requestJson: jsonb("request_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  statusIdx: index("crm_quotes_status_idx").on(table.workspaceId, table.status)
}));

export const crmDeals = pgTable("crm_deals", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  opportunityId: text("opportunity_id").references(() => crmOpportunities.id),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("new"),
  estimatedValue: money("estimated_value"),
  nextAction: text("next_action")
}, (table) => ({
  stageIdx: index("crm_deals_stage_idx").on(table.workspaceId, table.stage)
}));

export const crmPipelineStages = pgTable("crm_pipeline_stages", {
  ...crmOwnership(),
  pipelineKey: text("pipeline_key").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0)
}, (table) => ({
  pipelineUnique: uniqueIndex("crm_pipeline_stages_unique").on(table.workspaceId, table.pipelineKey, table.name)
}));

export const crmServiceCases = pgTable("crm_service_cases", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  subject: text("subject").notNull(),
  issueType: text("issue_type").notNull().default("general"),
  priority: text("priority").notNull().default("normal"),
  channel: text("channel").notNull().default("manual"),
  assignedOwnerId: text("assigned_owner_id").references(() => users.id),
  resolutionNotes: text("resolution_notes")
}, (table) => ({
  customerIdx: index("crm_service_cases_customer_idx").on(table.workspaceId, table.customerId),
  statusIdx: index("crm_service_cases_status_idx").on(table.workspaceId, table.status)
}));

export const crmConversations = pgTable("crm_conversations", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  channel: text("channel").notNull().default("manual"),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true })
}, (table) => ({
  statusIdx: index("crm_conversations_status_idx").on(table.workspaceId, table.status),
  customerIdx: index("crm_conversations_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmConversationMessages = pgTable("crm_conversation_messages", {
  ...crmOwnership(),
  conversationId: text("conversation_id").references(() => crmConversations.id),
  customerId: text("customer_id").references(() => crmCustomers.id),
  direction: text("direction").notNull().default("internal"),
  body: text("body").notNull(),
  messageAt: timestamp("message_at", { withTimezone: true }).notNull().defaultNow(),
  senderLabel: text("sender_label")
}, (table) => ({
  conversationIdx: index("crm_conversation_messages_conversation_idx").on(table.workspaceId, table.conversationId)
}));

export const crmSupportCases = pgTable("crm_support_cases", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  conversationId: text("conversation_id").references(() => crmConversations.id),
  subject: text("subject").notNull(),
  priority: text("priority").notNull().default("normal"),
  resolutionNotes: text("resolution_notes")
}, (table) => ({
  statusIdx: index("crm_support_cases_status_idx").on(table.workspaceId, table.status)
}));

export const crmHelpTopics = pgTable("crm_help_topics", {
  ...crmOwnership(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  category: text("category").notNull().default("general"),
  body: text("body").notNull().default("")
}, (table) => ({
  slugUnique: uniqueIndex("crm_help_topics_slug_unique").on(table.workspaceId, table.slug)
}));

export const crmInboxChannels = pgTable("crm_inbox_channels", {
  ...crmOwnership(),
  channelType: text("channel_type").notNull(),
  displayName: text("display_name").notNull(),
  setupStatus: text("setup_status").notNull().default("not_configured"),
  configurationJson: jsonb("configuration_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  channelUnique: uniqueIndex("crm_inbox_channels_unique").on(table.workspaceId, table.channelType)
}));

export const crmCampaigns = pgTable("crm_campaigns", {
  ...crmOwnership(),
  name: text("name").notNull(),
  goal: text("goal"),
  targetSegmentId: text("target_segment_id"),
  consentRequired: boolean("consent_required").notNull().default(true),
  campaignJson: jsonb("campaign_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  statusIdx: index("crm_campaigns_status_idx").on(table.workspaceId, table.status)
}));

export const crmCampaignMembers = pgTable("crm_campaign_members", {
  ...crmOwnership(),
  campaignId: text("campaign_id").references(() => crmCampaigns.id),
  customerId: text("customer_id").references(() => crmCustomers.id),
  leadId: text("lead_id").references(() => crmLeads.id),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true })
}, (table) => ({
  campaignIdx: index("crm_campaign_members_campaign_idx").on(table.workspaceId, table.campaignId)
}));

export const crmMessageTemplates = pgTable("crm_message_templates", {
  ...crmOwnership(),
  name: text("name").notNull(),
  category: text("category").notNull().default("customer_success"),
  subject: text("subject"),
  body: text("body").notNull()
}, (table) => ({
  categoryIdx: index("crm_message_templates_category_idx").on(table.workspaceId, table.category)
}));

export const crmLandingPages = pgTable("crm_landing_pages", {
  ...crmOwnership(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  targetSegmentId: text("target_segment_id"),
  pageJson: jsonb("page_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  slugUnique: uniqueIndex("crm_landing_pages_slug_unique").on(table.workspaceId, table.slug)
}));

export const crmForms = pgTable("crm_forms", {
  ...crmOwnership(),
  title: text("title").notNull(),
  description: text("description"),
  fieldsJson: jsonb("fields_json").$type<Array<Record<string, unknown>>>().notNull().default([]),
  targetSegmentKey: text("target_segment_key"),
  suggestedFollowUpTask: text("suggested_follow_up_task"),
  consentLanguage: text("consent_language"),
  embedReadinessStatus: text("embed_readiness_status").notNull().default("future_integration"),
  publicFormId: text("public_form_id")
}, (table) => ({
  publicFormIdx: index("crm_forms_public_form_idx").on(table.workspaceId, table.publicFormId),
  statusIdx: index("crm_forms_status_idx").on(table.workspaceId, table.status)
}));

export const crmFormSubmissions = pgTable("crm_form_submissions", {
  ...crmOwnership(),
  formId: text("form_id").references(() => crmForms.id),
  customerId: text("customer_id").references(() => crmCustomers.id),
  leadId: text("lead_id").references(() => crmLeads.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  dataJson: jsonb("data_json").$type<Record<string, unknown>>().notNull().default({}),
  consentStatus: text("consent_status").notNull().default("unknown")
}, (table) => ({
  formIdx: index("crm_form_submissions_form_idx").on(table.workspaceId, table.formId)
}));

export const crmConsents = pgTable("crm_consents", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  email: text("email"),
  consentType: text("consent_type").notNull().default("marketing"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true })
}, (table) => ({
  customerIdx: index("crm_consents_customer_idx").on(table.workspaceId, table.customerId),
  emailIdx: index("crm_consents_email_idx").on(table.workspaceId, table.email)
}));

export const crmUnsubscribePreferences = pgTable("crm_unsubscribe_preferences", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  email: text("email"),
  channel: text("channel").notNull().default("email"),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true })
}, (table) => ({
  emailIdx: index("crm_unsubscribe_preferences_email_idx").on(table.workspaceId, table.email)
}));

export const crmEvents = pgTable("crm_events", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  eventType: text("event_type").notNull(),
  eventName: text("event_name").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
  propertiesJson: jsonb("properties_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  eventIdx: index("crm_events_type_idx").on(table.workspaceId, table.eventType, table.eventAt)
}));

export const crmPersonEvents = pgTable("crm_person_events", {
  ...crmOwnership(),
  personKey: text("person_key").notNull(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  eventType: text("event_type").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
  propertiesJson: jsonb("properties_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  personIdx: index("crm_person_events_person_idx").on(table.workspaceId, table.personKey)
}));

export const crmBehavioralTraits = pgTable("crm_behavioral_traits", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  traitKey: text("trait_key").notNull(),
  traitValue: text("trait_value"),
  confidence: confidence("confidence").notNull().default("0")
}, (table) => ({
  customerIdx: index("crm_behavioral_traits_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmSurveys = pgTable("crm_surveys", {
  ...crmOwnership(),
  title: text("title").notNull(),
  questionsJson: jsonb("questions_json").$type<Array<Record<string, unknown>>>().notNull().default([])
}, (table) => ({
  statusIdx: index("crm_surveys_status_idx").on(table.workspaceId, table.status)
}));

export const crmSurveyResponses = pgTable("crm_survey_responses", {
  ...crmOwnership(),
  surveyId: text("survey_id").references(() => crmSurveys.id),
  customerId: text("customer_id").references(() => crmCustomers.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  answersJson: jsonb("answers_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  surveyIdx: index("crm_survey_responses_survey_idx").on(table.workspaceId, table.surveyId)
}));

export const crmFeatureFlags = pgTable("crm_feature_flags", {
  ...crmOwnership(),
  flagKey: text("flag_key").notNull(),
  name: text("name").notNull(),
  description: text("description")
}, (table) => ({
  flagUnique: uniqueIndex("crm_feature_flags_unique").on(table.workspaceId, table.flagKey)
}));

export const crmCustomerCohorts = pgTable("crm_customer_cohorts", {
  ...crmOwnership(),
  name: text("name").notNull(),
  description: text("description"),
  ruleJson: jsonb("rule_json").$type<Record<string, unknown>>().notNull().default({}),
  sourceDataRequired: jsonb("source_data_required").$type<string[]>().notNull().default([])
}, (table) => ({
  nameIdx: index("crm_customer_cohorts_name_idx").on(table.workspaceId, table.name),
  statusIdx: index("crm_customer_cohorts_status_idx").on(table.workspaceId, table.status)
}));

export const crmBehaviorSegments = pgTable("crm_behavior_segments", {
  ...crmOwnership(),
  name: text("name").notNull(),
  description: text("description"),
  ruleJson: jsonb("rule_json").$type<Record<string, unknown>>().notNull().default({}),
  memberCount: integer("member_count").notNull().default(0)
}, (table) => ({
  nameIdx: index("crm_behavior_segments_name_idx").on(table.workspaceId, table.name)
}));

export const crmAiInsights = pgTable("crm_ai_insights", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  confidence: confidence("confidence").notNull().default("0"),
  approvalStatus: text("approval_status").notNull().default("draft")
}, (table) => ({
  customerIdx: index("crm_ai_insights_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmNextActions = pgTable("crm_next_actions", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  actionType: text("action_type").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  priority: text("priority").notNull().default("normal"),
  dueAt: timestamp("due_at", { withTimezone: true })
}, (table) => ({
  customerIdx: index("crm_next_actions_customer_idx").on(table.workspaceId, table.customerId),
  statusIdx: index("crm_next_actions_status_idx").on(table.workspaceId, table.status)
}));

export const crmRecommendationEvents = pgTable("crm_recommendation_events", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  recommendationType: text("recommendation_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull()
}, (table) => ({
  customerIdx: index("crm_recommendation_events_customer_idx").on(table.workspaceId, table.customerId)
}));

export const crmAutomationRules = pgTable("crm_automation_rules", {
  ...crmOwnership(),
  name: text("name").notNull(),
  triggerKey: text("trigger_key").notNull(),
  conditionsJson: jsonb("conditions_json").$type<Record<string, unknown>>().notNull().default({}),
  actionsJson: jsonb("actions_json").$type<Array<Record<string, unknown>>>().notNull().default([])
}, (table) => ({
  triggerIdx: index("crm_automation_rules_trigger_idx").on(table.workspaceId, table.triggerKey)
}));

export const crmAutomationRuns = pgTable("crm_automation_runs", {
  ...crmOwnership(),
  automationRuleId: text("automation_rule_id").references(() => crmAutomationRules.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  resultJson: jsonb("result_json").$type<Record<string, unknown>>().notNull().default({})
}, (table) => ({
  ruleIdx: index("crm_automation_runs_rule_idx").on(table.workspaceId, table.automationRuleId)
}));

export const crmImportBatches = pgTable("crm_import_batches", {
  ...crmOwnership(),
  importType: text("import_type").notNull(),
  recordsTotal: integer("records_total").notNull().default(0),
  recordsImported: integer("records_imported").notNull().default(0),
  sanitizedError: text("sanitized_error")
}, (table) => ({
  statusIdx: index("crm_import_batches_status_idx").on(table.workspaceId, table.status)
}));

export const crmSyncState = pgTable("crm_sync_state", {
  ...crmOwnership(),
  providerKey: text("provider_key").notNull(),
  syncType: text("sync_type").notNull(),
  lastCursor: text("last_cursor"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  sanitizedError: text("sanitized_error")
}, (table) => ({
  providerUnique: uniqueIndex("crm_sync_state_unique").on(table.workspaceId, table.providerKey, table.syncType)
}));

export const crmAppointmentTypes = pgTable("crm_appointment_types", {
  ...crmOwnership(),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  bookingReadiness: text("booking_readiness").notNull().default("manual_setup_required")
}, (table) => ({
  nameIdx: index("crm_appointment_types_name_idx").on(table.workspaceId, table.name)
}));

export const crmBookingRequests = pgTable("crm_booking_requests", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  appointmentTypeId: text("appointment_type_id").references(() => crmAppointmentTypes.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  preferredTimesJson: jsonb("preferred_times_json").$type<string[]>().notNull().default([])
}, (table) => ({
  statusIdx: index("crm_booking_requests_status_idx").on(table.workspaceId, table.status)
}));

export const crmConsultations = pgTable("crm_consultations", {
  ...crmOwnership(),
  customerId: text("customer_id").references(() => crmCustomers.id),
  appointmentTypeId: text("appointment_type_id").references(() => crmAppointmentTypes.id),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes")
}, (table) => ({
  statusIdx: index("crm_consultations_status_idx").on(table.workspaceId, table.status)
}));

export const crmAvailabilityReadiness = pgTable("crm_availability_readiness", {
  ...crmOwnership(),
  calendarProvider: text("calendar_provider").notNull().default("manual"),
  setupRequiredJson: jsonb("setup_required_json").$type<string[]>().notNull().default([]),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
}, (table) => ({
  providerIdx: index("crm_availability_readiness_provider_idx").on(table.workspaceId, table.calendarProvider)
}));

export const providerConnections = pgTable("provider_connections", {
  id,
  ...sharedOwnership(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("not_configured"),
  blockers: jsonb("blockers").$type<string[]>().notNull().default([]),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  sourceRecordId: text("source_record_id"),
  metadata
}, (table) => ({
  providerUnique: uniqueIndex("provider_connections_workspace_provider_unique").on(table.workspaceId, table.provider),
  statusIdx: index("provider_connections_status_idx").on(table.workspaceId, table.status)
}));

export const sourceRecords = pgTable("source_records", {
  id,
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  accountId: text("account_id"),
  origin: text("origin").notNull().default("manual"),
  sourceName: text("source_name").notNull(),
  sourceLabel: text("source_label").notNull(),
  sourceUrl: text("source_url"),
  provider: text("provider"),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull().default({}),
  confidence: confidence(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ownerVerifiedAt: timestamp("owner_verified_at", { withTimezone: true }),
  createdAt,
  updatedAt
}, (table) => ({
  originIdx: index("source_records_origin_idx").on(table.workspaceId, table.origin),
  providerIdx: index("source_records_provider_idx").on(table.workspaceId, table.provider)
}));

export const events = pgTable("events", {
  id,
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  accountId: text("account_id"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  eventType: text("event_type").notNull(),
  eventLabel: text("event_label").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id),
  sourceLabel: text("source_label"),
  createdBy: text("created_by").references(() => users.id),
  createdAt,
  updatedAt
}, (table) => ({
  entityIdx: index("events_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  typeIdx: index("events_type_idx").on(table.workspaceId, table.eventType)
}));

export const auditLog = pgTable("audit_log", {
  id,
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  accountId: text("account_id"),
  actorId: text("actor_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  before: jsonb("before").$type<Record<string, unknown> | null>(),
  after: jsonb("after").$type<Record<string, unknown> | null>(),
  diff: jsonb("diff").$type<Record<string, unknown> | null>(),
  requestId: text("request_id"),
  createdAt,
  updatedAt
}, (table) => ({
  entityIdx: index("audit_log_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  actorIdx: index("audit_log_actor_idx").on(table.workspaceId, table.actorId)
}));

export const approvals = pgTable("approvals", {
  id,
  ...sharedOwnership(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  approvalType: text("approval_type").notNull(),
  status: text("status").notNull().default("pending"),
  requestedBy: text("requested_by").references(() => users.id),
  decidedBy: text("decided_by").references(() => users.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  notes: text("notes"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  entityIdx: index("approvals_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  statusIdx: index("approvals_status_idx").on(table.workspaceId, table.status)
}));

export const tasks = pgTable("tasks", {
  id,
  ...sharedOwnership(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  assignedTo: text("assigned_to").references(() => users.id),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id),
  recommendationId: text("recommendation_id")
}, (table) => ({
  entityIdx: index("tasks_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  dueIdx: index("tasks_due_status_idx").on(table.workspaceId, table.status, table.dueAt)
}));

export const notes = pgTable("notes", {
  id,
  ...sharedOwnership(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  body: text("body").notNull(),
  noteType: text("note_type").notNull().default("owner_note"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id),
  createdBy: text("created_by").references(() => users.id)
}, (table) => ({
  entityIdx: index("notes_entity_idx").on(table.workspaceId, table.entityType, table.entityId)
}));

export const recommendations = pgTable("recommendations", {
  id,
  ...sharedOwnership(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  recommendationType: text("recommendation_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("rule_based"),
  confidence: confidence(),
  status: text("status").notNull().default("pending"),
  automationRuleId: text("automation_rule_id"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  entityIdx: index("recommendations_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  statusIdx: index("recommendations_status_idx").on(table.workspaceId, table.status)
}));

export const readinessScores = pgTable("readiness_scores", {
  id,
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  accountId: text("account_id"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  scoreType: text("score_type").notNull(),
  scoreValue: integer("score_value").notNull().default(0),
  maxScore: integer("max_score").notNull().default(100),
  status: text("status").notNull().default("setup_needed"),
  criteria: jsonb("criteria").$type<Array<Record<string, unknown>>>().notNull().default([]),
  blockers: jsonb("blockers").$type<string[]>().notNull().default([]),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt,
  updatedAt
}, (table) => ({
  entityIdx: index("readiness_scores_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  typeIdx: index("readiness_scores_type_idx").on(table.workspaceId, table.scoreType)
}));

export const exportPackages = pgTable("export_packages", {
  id,
  ...sharedOwnership(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  packageType: text("package_type").notNull(),
  title: text("title").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  entityIdx: index("export_packages_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  typeIdx: index("export_packages_type_idx").on(table.workspaceId, table.packageType)
}));

export const assets = pgTable("assets", {
  id,
  ...sharedOwnership(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  assetType: text("asset_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileRef: text("file_ref"),
  spec: jsonb("spec").$type<Record<string, unknown> | null>(),
  status: text("status").notNull().default("needed"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  entityIdx: index("assets_entity_idx").on(table.workspaceId, table.entityType, table.entityId),
  typeIdx: index("assets_type_idx").on(table.workspaceId, table.assetType)
}));

export const templates = pgTable("templates", {
  id,
  workspaceId: text("workspace_id").references(() => workspaces.id),
  accountId: text("account_id"),
  verticalPackId: text("vertical_pack_id"),
  templateType: text("template_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("active"),
  createdAt,
  updatedAt
}, (table) => ({
  typeIdx: index("templates_type_idx").on(table.workspaceId, table.templateType),
  nameIdx: index("templates_name_idx").on(table.workspaceId, table.name)
}));

export const automationRules = pgTable("automation_rules", {
  id,
  workspaceId: text("workspace_id").references(() => workspaces.id),
  accountId: text("account_id"),
  verticalPackId: text("vertical_pack_id"),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  condition: jsonb("condition").$type<Record<string, unknown>>().notNull().default({}),
  action: jsonb("action").$type<Record<string, unknown>>().notNull().default({}),
  active: boolean("active").notNull().default(true),
  createdAt,
  updatedAt
}, (table) => ({
  triggerIdx: index("automation_rules_trigger_idx").on(table.workspaceId, table.trigger)
}));

export const segments = pgTable("segments", {
  id,
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  accountId: text("account_id"),
  verticalPackId: text("vertical_pack_id"),
  name: text("name").notNull(),
  description: text("description"),
  entityType: text("entity_type").notNull().default("customer"),
  queryDefinition: jsonb("query_definition").$type<Record<string, unknown>>().notNull().default({}),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id),
  createdAt,
  updatedAt
}, (table) => ({
  entityIdx: index("segments_entity_idx").on(table.workspaceId, table.entityType),
  nameIdx: index("segments_name_idx").on(table.workspaceId, table.name)
}));

export const verticalPacks = pgTable("vertical_packs", {
  id,
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  createdAt,
  updatedAt
}, (table) => ({
  keyUnique: uniqueIndex("vertical_packs_key_unique").on(table.key)
}));

export const campaigns = pgTable("campaigns", {
  id,
  ...sharedOwnership(),
  verticalPackId: text("vertical_pack_id").references(() => verticalPacks.id),
  name: text("name").notNull(),
  campaignType: text("campaign_type").notNull().default("product_launch"),
  goal: text("goal").notNull().default("manual_export_ready_campaign"),
  productRef: text("product_ref"),
  offerRef: text("offer_ref"),
  manualOffer: jsonb("manual_offer").$type<Record<string, unknown> | null>(),
  targetSegmentId: text("target_segment_id").references(() => segments.id),
  audience: text("audience"),
  offer: text("offer"),
  landingUrl: text("landing_url"),
  status: text("status").notNull().default("draft"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  statusIdx: index("campaigns_status_idx").on(table.workspaceId, table.status),
  typeIdx: index("campaigns_type_idx").on(table.workspaceId, table.campaignType)
}));

export const campaignChannels = pgTable("campaign_channels", {
  id,
  ...sharedOwnership(),
  campaignId: text("campaign_id").references(() => campaigns.id),
  channelType: text("channel_type").notNull(),
  draftContent: jsonb("draft_content").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  providerConnectionId: text("provider_connection_id").references(() => providerConnections.id),
  approvalId: text("approval_id").references(() => approvals.id),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  campaignIdx: index("campaign_channels_campaign_idx").on(table.workspaceId, table.campaignId),
  channelIdx: index("campaign_channels_type_idx").on(table.workspaceId, table.channelType, table.status)
}));

export const utmLinks = pgTable("utm_links", {
  id,
  ...sharedOwnership(),
  campaignId: text("campaign_id").references(() => campaigns.id),
  channelId: text("channel_id").references(() => campaignChannels.id),
  baseUrl: text("base_url").notNull(),
  source: text("source").notNull(),
  medium: text("medium").notNull(),
  campaignName: text("campaign_name").notNull(),
  term: text("term"),
  content: text("content"),
  generatedUrl: text("generated_url").notNull(),
  status: text("status").notNull().default("draft"),
  sourceRecordId: text("source_record_id").references(() => sourceRecords.id)
}, (table) => ({
  campaignIdx: index("utm_links_campaign_idx").on(table.workspaceId, table.campaignId),
  statusIdx: index("utm_links_status_idx").on(table.workspaceId, table.status)
}));

export const tables = {
  users,
  organizations,
  organizationMembers,
  workspaces,
  workspaceBrandProfiles,
  workspaceProviderConnections,
  workspaceFeatureFlags,
  workspaceSubscriptionStatus,
  workspaceUsageEvents,
  workspaceAuditEvents,
  aiEmployees,
  aiEmployeeTasks,
  aiEmployeeRuns,
  aiEmployeeOutputs,
  aiEmployeePermissions,
  aiEmployeeAuditEvents,
  brandProfiles,
  productCollectionPlans,
  dropCalendars,
  marketingAssets,
  marketingCampaigns,
  supportMacros,
  customerSupportDrafts,
  workspaceMetrics,
  workspaceBusinessProfilesV1,
  workspaceChannels,
  migrationWizardRuns,
  baselineSnapshots,
  podMigrationCandidates,
  dropshipProductCandidates,
  listingDraftsV1,
  socialContentItems,
  storefrontThemeSettings,
  storefrontPages,
  crmCustomers,
  crmCompanies,
  crmContactMethods,
  crmAddresses,
  crmTags,
  crmCustomerTags,
  crmSources,
  crmCustomerPreferences,
  crmCustomerProductInterests,
  crmCustomerMetrics,
  crmCustomerExternalRefs,
  crmTimelineEvents,
  crmInteractions,
  crmNotes,
  crmTasks,
  crmTaskTemplates,
  crmLeads,
  crmOpportunities,
  crmQuotes,
  crmDeals,
  crmPipelineStages,
  crmServiceCases,
  crmConversations,
  crmConversationMessages,
  crmSupportCases,
  crmHelpTopics,
  crmInboxChannels,
  crmCampaigns,
  crmCampaignMembers,
  crmMessageTemplates,
  crmLandingPages,
  crmForms,
  crmFormSubmissions,
  crmConsents,
  crmUnsubscribePreferences,
  crmEvents,
  crmPersonEvents,
  crmBehavioralTraits,
  crmSurveys,
  crmSurveyResponses,
  crmFeatureFlags,
  crmCustomerCohorts,
  crmBehaviorSegments,
  crmAiInsights,
  crmNextActions,
  crmRecommendationEvents,
  crmAutomationRules,
  crmAutomationRuns,
  crmImportBatches,
  crmSyncState,
  crmAppointmentTypes,
  crmBookingRequests,
  crmConsultations,
  crmAvailabilityReadiness,
  providerConnections,
  sourceRecords,
  events,
  auditLog,
  approvals,
  tasks,
  notes,
  recommendations,
  readinessScores,
  exportPackages,
  assets,
  templates,
  automationRules,
  segments,
  verticalPacks,
  campaigns,
  campaignChannels,
  utmLinks,
  connectedStores,
  providerConnectionStatus,
  encryptedCredentials,
  integrationSyncRuns,
  siteAuditRuns,
  siteAuditFindings,
  plans,
  subscriptions,
  billingEvents,
  featureLimits,
  trendSources,
  trendSignals,
  trendClusters,
  trendClusterSignals,
  phraseCandidates,
  riskReviews,
  designBriefs,
  generationJobs,
  designAssets,
  printFileQa,
  mockupTemplates,
  mockupAssets,
  productDrafts,
  productVariants,
  priceMarginChecks,
  publishReviews,
  shopifyProductRefs,
  printifyProductRefs,
  fulfillmentEvents,
  auditEvents
};
