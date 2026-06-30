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
  storefrontThemeSettings,
  storefrontPages,
  connectedStores,
  providerConnectionStatus,
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
