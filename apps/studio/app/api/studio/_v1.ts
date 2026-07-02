import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireProviderMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, type BaseRepositoryContract, type WorkspaceRow } from "@saltyfactory/db";
import {
  buildMigrationRecommendations,
  calculatePricing,
  channelSchema,
  createBaselineMetrics,
  createSocialDraft,
  evaluateDropshipCandidate,
  evaluatePodCandidate,
  exportListingDraft,
  normalizeChannel,
  scoreBusinessProfile,
  validateEmployeeConfiguration,
  validateGoogleConfiguration,
  validateListingDraft,
  businessProfileSchema
} from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "./_auth";

export const studioWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

type V1Resource =
  | "businessProfileV1"
  | "channel"
  | "migrationWizard"
  | "baseline"
  | "podMigration"
  | "dropshipping"
  | "listingDraftV1"
  | "socialContent";

const idPrefix: Record<V1Resource, string> = {
  businessProfileV1: "bizprof",
  channel: "chan",
  migrationWizard: "migwiz",
  baseline: "base",
  podMigration: "podmig",
  dropshipping: "dropcand",
  listingDraftV1: "listv1",
  socialContent: "social"
};

function newId(resource: V1Resource) {
  return `${idPrefix[resource]}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeRow(row: WorkspaceRow) {
  const text = JSON.stringify(row);
  if (/access_token|refresh_token|client_secret|api[_-]?token/i.test(text)) {
    return { id: row.id, status: row.status ?? "redacted", workspace_id: row.workspace_id ?? row.workspaceId };
  }
  return row;
}

function repoByResource(repos: ReturnType<typeof createRepositories>, resource: V1Resource): BaseRepositoryContract {
  return repos[resource] as BaseRepositoryContract;
}

async function readBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return req.json().catch(() => ({}));
  if (contentType.includes("form")) {
    const form = await req.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      const text = String(value);
      if (key.endsWith("[]")) {
        const cleanKey = key.slice(0, -2);
        data[cleanKey] = [...(Array.isArray(data[cleanKey]) ? data[cleanKey] as string[] : []), text].filter(Boolean);
      } else if (["targetProductTypes", "targetChannels", "shippingRegions", "tags", "seoKeywords", "brandColors", "productCategories", "bannedWords", "trademarkCautionList"].includes(key)) {
        data[key] = text.split(",").map((item) => item.trim()).filter(Boolean);
      } else if (["ownerPriority", "currentStep", "salePrice", "baseProductCost", "shippingCost", "packagingHandlingCost", "platformFeePercent", "paymentFeePercent", "fixedTransactionFee", "adCostEstimate", "discountPercent", "minimumMarginPercent", "supplierCost", "deliveryEstimateDays", "brandFitScore", "price"].includes(key)) {
        data[key] = text === "" ? undefined : Number(text);
      } else if (["includeInAiRecommendations", "ownerApproved", "listingReady", "mockupsApproved", "aiProviderConfigured", "googleConnected", "supportsRulesOnly"].includes(key)) {
        data[key] = text === "on" || text === "true";
      } else {
        data[key] = text;
      }
    }
    return data;
  }
  return {};
}

function audit(resource: string, action: string, row: WorkspaceRow, actorId: string) {
  return {
    id: `audit_${resource}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    workspace_id: studioWorkspaceId,
    entity_type: resource,
    entity_id: row.id,
    action,
    actor_type: "human",
    actor_id: actorId,
    after_state: JSON.stringify(safeRow(row)).slice(0, 8000),
    notes: null,
    created_at: new Date().toISOString()
  };
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
}

async function writeAuditEventSafely(repos: ReturnType<typeof createRepositories>, event: WorkspaceRow) {
  try {
    await repos.audit.write(event);
    return { ok: true as const, status: "written" as const };
  } catch (error) {
    return {
      ok: false as const,
      status: "audit_failed" as const,
      message: sanitizeProviderError(error)
    };
  }
}

export async function listResource(req: Request, resource: V1Resource) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const repos = createRepositories();
    const rows = await repoByResource(repos, resource).listByWorkspace(studioWorkspaceId);
    return NextResponse.json({ ok: true, status: "retrieved", resource, records: rows.map(safeRow) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function upsertBusinessProfile(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const profile = businessProfileSchema.parse(body);
    const readiness = scoreBusinessProfile(profile);
    const repos = createRepositories();
    const existing = (await repos.businessProfileV1.listByWorkspace(studioWorkspaceId))[0];
    const row: WorkspaceRow = {
      id: existing?.id ?? newId("businessProfileV1"),
      workspace_id: studioWorkspaceId,
      business_name: profile.businessName,
      public_brand_name: profile.publicBrandName,
      business_type: profile.businessType,
      fulfillment_model: profile.fulfillmentModel,
      support_email: profile.supportEmail,
      country: profile.country,
      timezone: profile.timezone,
      currency: profile.currency,
      readiness_score: readiness.score,
      readiness_blockers: readiness.blockers,
      profile_json: profile,
      status: readiness.status,
      created_by: user.id,
      updated_by: user.id
    };
    const auditEvent = audit("business_profile", existing ? "updated" : "created", row, user.id);
    const saved = existing
      ? await repos.businessProfileV1.update(existing.id, row)
      : await repos.businessProfileV1.create(row);
    const auditResult = await writeAuditEventSafely(repos, auditEvent);
    if (!auditResult.ok) {
      const production = isProductionRuntime();
      return NextResponse.json({
        ok: !production,
        status: production ? "audit_failed_after_save" : "saved_with_audit_warning",
        saved: true,
        profile: safeRow(saved),
        readiness,
        audit: auditResult,
        message: production
          ? "Business profile saved, but audit logging failed. Resolve audit logging before production writes continue."
          : "Business profile saved, but audit logging is unavailable in this environment."
      }, { status: production ? 500 : 200 });
    }
    return NextResponse.json({ ok: true, status: "saved", profile: safeRow(saved), readiness, audit: auditResult });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function createChannel(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const input = normalizeChannel(await readBody(req));
    const repos = createRepositories();
    const row: WorkspaceRow = {
      id: newId("channel"),
      workspace_id: studioWorkspaceId,
      channel_type: input.channelType,
      category: input.category,
      display_name: input.displayName,
      url: input.url || null,
      handle: input.handle || null,
      account_id: input.accountId || null,
      status: input.status,
      owner_priority: input.ownerPriority,
      include_in_ai_recommendations: input.includeInAiRecommendations,
      channel_metadata: input.metadata,
      notes: input.notes,
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.channel.create(row, audit("channel", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "created", channel: safeRow(saved) });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function saveMigrationGuide(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const [profile] = await repos.businessProfileV1.listByWorkspace(studioWorkspaceId);
    const channels = await repos.channel.listByWorkspace(studioWorkspaceId);
    const baselines = await repos.baseline.listByWorkspace(studioWorkspaceId);
    const podCandidates = await repos.podMigration.listByWorkspace(studioWorkspaceId);
    const plan = buildMigrationRecommendations({
      businessProfileReady: Number(profile?.readiness_score ?? profile?.readinessScore ?? 0) >= 90,
      channelScore: Number(body.channelScore ?? 0),
      googleConnected: Boolean(body.googleConnected),
      baselineExists: baselines.length > 0,
      podCandidates: podCandidates.length,
      aiProviderConfigured: Boolean(body.aiProviderConfigured)
    });
    const completedSteps = Array.isArray(body.completedSteps) ? body.completedSteps : [];
    const row: WorkspaceRow = {
      id: newId("migrationWizard"),
      workspace_id: studioWorkspaceId,
      current_step: Number(body.currentStep ?? 1),
      completed_steps: completedSteps,
      skipped_steps: body.skippedSteps ?? {},
      readiness_scores: {
        migration: plan.migrationReadinessScore,
        data: Math.min(100, baselines.length * 25 + channels.length * 5),
        aiEmployee: body.aiProviderConfigured ? 80 : 55,
        pod: Math.min(100, podCandidates.length * 20),
        publishingSafety: 100
      },
      recommendations: plan.recommendations,
      approval_rules: plan.approvalRules,
      first_thirty_day_plan: plan.firstThirtyDayPlan,
      source_label: plan.sourceLabel,
      status: completedSteps.length >= 11 ? "complete" : "in_progress",
      wizard_json: body,
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.migrationWizard.create(row, audit("migration_wizard", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "saved", migrationGuide: safeRow(saved), plan });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function createBaseline(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const [profile] = await repos.businessProfileV1.listByWorkspace(studioWorkspaceId);
    const channels = await repos.channel.listByWorkspace(studioWorkspaceId);
    const metrics = await repos.workspaceMetric.listByWorkspace(studioWorkspaceId);
    const baseline = createBaselineMetrics({
      workspaceMetrics: metrics,
      businessProfileScore: Number(profile?.readiness_score ?? profile?.readinessScore ?? 0),
      channelScore: Number(body.channelScore ?? 0),
      counts: {
        product_count: (await repos.draft.listByWorkspace(studioWorkspaceId)).length,
        design_count: (await repos.asset.listByWorkspace(studioWorkspaceId)).length,
        pod_migration_candidates: (await repos.podMigration.listByWorkspace(studioWorkspaceId)).length,
        listing_drafts: (await repos.listingDraftV1.listByWorkspace(studioWorkspaceId)).length,
        social_channels_configured: channels.filter((channel) => ["configured", "connected"].includes(String(channel.status))).length
      }
    });
    const row: WorkspaceRow = {
      id: newId("baseline"),
      workspace_id: studioWorkspaceId,
      snapshot_name: String(body.snapshotName || `Baseline ${new Date().toISOString().slice(0, 10)}`),
      captured_at: new Date().toISOString(),
      source_label: "provider_imported",
      metrics_json: baseline.metrics,
      insufficient_data: baseline.insufficientData,
      comparison_json: {},
      employee_attribution: {},
      status: baseline.status,
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.baseline.create(row, audit("baseline_snapshot", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "captured", baseline: safeRow(saved) });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function createPodCandidate(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const readiness = evaluatePodCandidate({
      designFileStatus: body.designFileStatus,
      targetProductTypes: body.targetProductTypes,
      safetyFlags: body.safetyFlags,
      pricing: body.pricing ?? { salePrice: Number(body.salePrice ?? 0), baseProductCost: Number(body.baseProductCost ?? 0), shippingCost: Number(body.shippingCost ?? 0) },
      listingReady: Boolean(body.listingReady),
      mockupsApproved: Boolean(body.mockupsApproved),
      ownerApproved: Boolean(body.ownerApproved)
    });
    const row: WorkspaceRow = {
      id: newId("podMigration"),
      workspace_id: studioWorkspaceId,
      design_name: String(body.designName || "Untitled design"),
      source: String(body.source || "manual"),
      source_url: body.sourceUrl || null,
      source_listing_id: body.sourceListingId || null,
      original_product_type: body.originalProductType || null,
      design_file_status: String(body.designFileStatus || "missing"),
      design_asset_id: body.designAssetId || null,
      target_product_types: Array.isArray(body.targetProductTypes) ? body.targetProductTypes : [],
      target_channels: Array.isArray(body.targetChannels) ? body.targetChannels : [],
      readiness_json: readiness,
      pricing_json: readiness.pricing,
      safety_flags: Array.isArray(body.safetyFlags) ? body.safetyFlags : [],
      status: readiness.status === "ready_for_review" ? "ready_for_review" : String(body.status || "idea"),
      notes: body.notes || null,
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.podMigration.create(row, audit("pod_migration_candidate", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "created", candidate: safeRow(saved), readiness });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function createDropshipCandidate(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const evaluation = evaluateDropshipCandidate(body);
    const row: WorkspaceRow = {
      id: newId("dropshipping"),
      workspace_id: studioWorkspaceId,
      supplier_name: String(body.supplierName || "Manual supplier"),
      supplier_url: body.supplierUrl || null,
      product_category: String(body.productCategory || "other"),
      product_title: String(body.productTitle || "Untitled product"),
      shipping_regions: Array.isArray(body.shippingRegions) ? body.shippingRegions : [],
      pricing_json: evaluation.pricing,
      risk_score: evaluation.flags.length * 20,
      brand_fit_score: Number(body.brandFitScore ?? 0),
      flags: evaluation.flags,
      status: evaluation.status,
      notes: body.notes || null,
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.dropshipping.create(row, audit("dropship_candidate", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "created", candidate: safeRow(saved), evaluation });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function createListingDraft(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const validation = validateListingDraft(body);
    const exportPayload = exportListingDraft(body);
    const row: WorkspaceRow = {
      id: newId("listingDraftV1"),
      workspace_id: studioWorkspaceId,
      target_channel: String(body.targetChannel || ""),
      source_type: String(body.source || "manual"),
      source_id: body.sourceId || null,
      title: String(body.title || ""),
      short_hook: body.shortHook || null,
      description: String(body.description || ""),
      price: body.price ?? null,
      approval_status: body.ownerApproved ? "approved" : "draft",
      validation_status: validation.status,
      validation_blockers: validation.blockers,
      listing_json: body,
      export_payload: exportPayload,
      status: validation.status === "ready_for_export" ? "ready_for_review" : "draft",
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.listingDraftV1.create(row, audit("listing_draft", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "created", listingDraft: safeRow(saved), validation, exportPayload });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function createSocialContent(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const draft = createSocialDraft(body);
    const row: WorkspaceRow = {
      id: newId("socialContent"),
      workspace_id: studioWorkspaceId,
      channel_type: String(body.channelType || "custom"),
      title: draft.title,
      body: draft.body,
      source_label: draft.sourceLabel,
      source_type: String(body.sourceType || "manual"),
      source_id: body.sourceId || null,
      approval_status: "draft",
      constraints_json: draft.constraints,
      status: "draft",
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.socialContent.create(row, audit("social_content", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "created", socialContent: safeRow(saved), autoPosting: false });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function calculatePricingRoute(req: Request) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const body = await readBody(req);
    const pricing = calculatePricing(body);
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    if (!productDraftId) return NextResponse.json({ ok: true, status: "calculated", pricing });

    const user = await requireDraftMutationPermission(req, studioWorkspaceId);
    const repos = createRepositories();
    const draft = await repos.draft.getById(productDraftId, studioWorkspaceId);
    if (!draft) return NextResponse.json({ ok: false, status: "not_found", message: "Product draft not found for this workspace." }, { status: 404 });
    const baseCost = Number(body.baseProductCost ?? body.base_product_cost ?? 0);
    const salePrice = Number(body.salePrice ?? body.sale_price ?? 0);
    const shippingCost = Number(body.shippingCost ?? body.shipping_cost ?? 0);
    const platformFeeEstimate = salePrice * (Number(body.platformFeePercent ?? body.platform_fee_percent ?? 0) / 100);
    const marginId = String(body.id || `margin_${Date.now()}`);
    const margin = await repos.margin.create({
      id: marginId,
      workspace_id: studioWorkspaceId,
      product_draft_id: productDraftId,
      variant_id: body.variantId || body.variant_id || null,
      cost: baseCost,
      price: salePrice,
      shopify_fee_estimate: 0,
      printify_shipping_estimate: shippingCost,
      platform_fee_estimate: platformFeeEstimate,
      net_revenue_estimate: pricing.estimatedNetProfit,
      margin_percent: pricing.netMarginPercent,
      minimum_margin_threshold: Number(body.minimumMarginPercent ?? 35),
      margin_ok: !pricing.marginBelowThreshold,
      blocked: pricing.marginBelowThreshold,
      status: pricing.marginBelowThreshold ? "blocked" : "passed",
      notes: String(body.discountNotes || body.discount_notes || "Manual owner-entered pricing input. No fake Printify cost was imported."),
      created_by: user.id,
      updated_by: user.id
    }, audit("price_margin_check", "created", { id: marginId, workspace_id: studioWorkspaceId }, user.id));
    return NextResponse.json({ ok: true, status: "calculated_and_saved", pricing, marginCheck: safeRow(margin) });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function validateGoogleConfigRoute(req: Request) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const validation = validateGoogleConfiguration(await readBody(req));
    return NextResponse.json({ ok: validation.ok, status: validation.ok ? "valid" : "blocked", validation });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export async function configureAiEmployee(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const body = await readBody(req);
    const validation = validateEmployeeConfiguration(body);
    const repos = createRepositories();
    if (!validation.ok && validation.status === "blocked") return NextResponse.json({ ok: false, status: "blocked", blockers: validation.blockers }, { status: 400 });
    const row: WorkspaceRow = {
      id: `aiemp_${String(body.employeeKey || "employee")}_${Date.now()}`,
      workspace_id: studioWorkspaceId,
      employee_key: body.employeeKey,
      name: validation.definition?.name ?? body.employeeKey,
      description: body.description ?? "",
      purpose: body.purpose ?? "",
      status: validation.status,
      required_data_sources: validation.definition?.requiredDataSources ?? [],
      optional_data_sources: body.optionalDataSources ?? [],
      allowed_actions: validation.definition?.allowedActions ?? [],
      forbidden_actions: validation.definition?.forbiddenActions ?? [],
      approval_requirements: validation.definition?.approvalRequirements ?? [],
      monthly_goal: body.monthlyGoal ?? "",
      setup_blockers: validation.blockers,
      safety_profile: validation.definition?.safetyProfile ?? "drafts_only",
      configuration: body.configuration ?? {},
      created_by: user.id,
      updated_by: user.id
    };
    const saved = await repos.aiEmployee.create(row, audit("ai_employee", "created", row, user.id));
    return NextResponse.json({ ok: true, status: "configured", employee: safeRow(saved), validation });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
  }
}

export { channelSchema };
