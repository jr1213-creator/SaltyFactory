import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import {
  clusterPersistedTrendSignals,
  draftProductConceptCandidates,
  readPersistedTrendSignals,
  readTrendWatchProfile,
  saveProductConceptCandidates,
  saveTrendAnalysisReport,
  scoreTrendCluster,
  toSafeTrendAnalysisError,
  trendAnalysisTaskOptions
} from "./trend-analysis";
import {
  calculateBudgetRecommendation,
  calculateProductMargin,
  compileCampaignBuildSheet,
  createApprovalRequest,
  createMarketingLaunchPlan,
  draftAdAngles,
  draftAdCopyVariants,
  draftAudienceHypotheses,
  draftCreativeBriefs,
  draftEmailSmsDrafts,
  draftMarketplaceSeoSuggestions,
  draftOfferHypotheses,
  draftOrganicLaunchPlan,
  draftOutreachDrafts,
  draftPinterestOrganicPlan,
  draftPositioningStatement,
  draftSeoPdpRecommendations,
  draftSocialContent,
  getMarketingLaunchPlanDetail,
  MARKETING_LAUNCH_PLAN_INVALID,
  MARKETING_POLICY_BLOCKED,
  marketingLaunchTaskOptions,
  readApprovedProductOrConcept,
  readBrandVoiceProfile,
  readProductReadinessData,
  readTrendEvidenceForProduct,
  runPolicyReview,
  saveMarketingOutputForReview,
  toSafeMarketingLaunchError
} from "./marketing-launch";
import {
  calculateBudgetRecommendation as calculateCommerceBudgetRecommendation,
  commerceAgentRoleCatalog,
  commerceAgentToolNames,
  consultBehavioralPsychology,
  createApprovalPrediction,
  createProcessImprovementFinding,
  createQualityCheck as createCommerceQualityCheck,
  createShopManagerBrief,
  draftAdAngles as draftCommerceAdAngles,
  draftAdCopyVariants as draftCommerceAdCopyVariants,
  draftAudienceHypotheses as draftCommerceAudienceHypotheses,
  draftCampaignBuildSheet as draftCommerceCampaignBuildSheet,
  draftCatalogMerchandisingRecommendation,
  draftEmailSmsDrafts as draftCommerceEmailSmsDrafts,
  draftMarketplaceSeoSuggestions as draftCommerceMarketplaceSeoSuggestions,
  draftOrganicLaunchPlan as draftCommerceOrganicLaunchPlan,
  draftOutreachDrafts as draftCommerceOutreachDrafts,
  draftPinterestOrganicPlan as draftCommercePinterestOrganicPlan,
  draftSeoGeoPdpRecommendation,
  draftSocialContent as draftCommerceSocialContent,
  prioritizeApprovalQueue,
  readAssetQaData,
  readMarketingLaunchPlan as readCommerceMarketingLaunchPlan,
  readMockupData,
  recordOwnerApprovalFeedback,
  runCreativeQaCheck,
  runIpTrademarkCheck,
  runPolicyReview as runCommercePolicyReview,
  runProductReadinessCheck,
  saveCommerceOutputForReview,
  saveCommerceRecommendation,
  updateOwnerDecisionPatterns
} from "./shop-manager-agent-os";

export type JsonSchema = Record<string, unknown>;

export type AgentToolDefinition = {
  name: string;
  description: string;
  parameters: JsonSchema;
  riskLevel: "read_only" | "draft_only";
  allowedRoles: string[];
  forbidden: false;
  execute: (ctx: AgentToolContext, args: unknown) => Promise<AgentToolResult>;
};

export type AgentToolContext = {
  workspaceId: string;
  actorId?: string | undefined;
  agentRunId: string;
  roleKey: string;
  taskType?: string | undefined;
  taskInput?: Record<string, unknown> | undefined;
  repos: RepositoryBundle;
  state?: {
    savedOutputIds?: string[];
  };
};

export type AgentToolResult = {
  ok: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type ToolArgumentValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; code: "invalid_tool_arguments"; message: string };

const productListingRole = "product_listing_assistant";
const trendIntelligenceRole = "trend_intelligence_agent";
const marketingLaunchRole = "marketing_launch_planner";

const objectSchema = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  properties,
  required
});

const stringProperty = (description: string): JsonSchema => ({ type: "string", minLength: 1, description });
const stringArrayProperty = (description: string): JsonSchema => ({ type: "array", items: { type: "string" }, description });
const numberProperty = (description: string): JsonSchema => ({ type: "number", description });

const value = (row: WorkspaceRow | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;

const asArray = (input: unknown): unknown[] => Array.isArray(input) ? input : [];
const asRecord = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input : fallback;

const safeShortRow = (row: WorkspaceRow | null | undefined, fields: string[]) => {
  if (!row) return null;
  const out: Record<string, unknown> = { id: row.id };
  for (const field of fields) out[field] = value(row, field);
  return out;
};

const taskOptions = (ctx: AgentToolContext) => trendAnalysisTaskOptions(ctx.taskInput);
const marketingOptions = (ctx: AgentToolContext) => marketingLaunchTaskOptions(ctx.taskInput);

function errorResult(code: string, message: string): AgentToolResult {
  return { ok: false, error: { code, message } };
}

function trendErrorCode(error: unknown, fallback = "trend_analysis_failed") {
  return error instanceof Error && error.message ? error.message : fallback;
}

function marketingErrorCode(error: unknown, fallback = "marketing_launch_failed") {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function validateToolArguments(schema: JsonSchema, args: unknown): ToolArgumentValidationResult {
  const input = asRecord(args);
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  const properties = asRecord(schema.properties);
  for (const key of required) {
    if (!(key in input) || input[key] == null || input[key] === "") {
      return { ok: false, code: "invalid_tool_arguments", message: `Missing required argument: ${key}` };
    }
  }
  for (const [key, rawSchema] of Object.entries(properties)) {
    if (!(key in input) || input[key] == null) continue;
    const prop = asRecord(rawSchema);
    const type = String(prop.type ?? "");
    if (type === "string" && typeof input[key] !== "string") {
      return { ok: false, code: "invalid_tool_arguments", message: `Argument ${key} must be a string.` };
    }
    if (type === "array" && !Array.isArray(input[key])) {
      return { ok: false, code: "invalid_tool_arguments", message: `Argument ${key} must be an array.` };
    }
  }
  return { ok: true, value: input };
}

async function getDraft(ctx: AgentToolContext, args: Record<string, unknown>) {
  const productDraftId = text(args.productDraftId);
  if (!productDraftId) return null;
  return ctx.repos.draft.getById(productDraftId, ctx.workspaceId);
}

export const productListingAssistantTools: AgentToolDefinition[] = [
  {
    name: "get_product_draft_summary",
    description: "Read compact product draft facts needed for listing copy. This tool never mutates product state.",
    parameters: objectSchema({
      productDraftId: stringProperty("Product draft ID to summarize.")
    }, ["productDraftId"]),
    riskLevel: "read_only",
    allowedRoles: [productListingRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(productListingAssistantTools[0]!.parameters, args);
      if (!validated.ok) return { ok: false, error: { code: validated.code, message: validated.message } };
      const draft = await getDraft(ctx, validated.value);
      if (!draft) return { ok: false, error: { code: "product_draft_missing", message: "Product draft was not found in this workspace." } };
      const variants = await ctx.repos.variant.listByDraft(ctx.workspaceId, draft.id);
      const margins = (await ctx.repos.margin.listByWorkspace(ctx.workspaceId)).filter((row) => value(row, "product_draft_id") === draft.id);
      return {
        ok: true,
        data: {
          draft: safeShortRow(draft, ["title", "description", "product_type", "collection", "tags", "approval_status", "shopify_status", "printify_status", "asset_id", "mockup_ids"]),
          targetProductType: value(draft, "product_type"),
          providerTarget: {
            shopifyStatus: value(draft, "shopify_status"),
            printifyStatus: value(draft, "printify_status")
          },
          variants: variants.map((variant) => safeShortRow(variant, ["printify_variant_id", "title", "sku", "price_cents", "cost_cents", "status"])),
          pricingMarginSummary: margins.map((row) => safeShortRow(row, ["status", "blocked", "margin_ok", "sale_price", "product_cost", "margin_percent"])),
          blockers: asArray(value(draft, "blocked_reasons"))
        }
      };
    }
  },
  {
    name: "get_asset_quality_summary",
    description: "Read generated asset and print-file QA details for a product draft or asset. This tool never runs image generation.",
    parameters: objectSchema({
      productDraftId: stringProperty("Product draft ID used to resolve the source asset."),
      assetId: { type: "string", description: "Optional direct asset ID." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [productListingRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(productListingAssistantTools[1]!.parameters, args);
      if (!validated.ok) return { ok: false, error: { code: validated.code, message: validated.message } };
      const draft = validated.value.productDraftId ? await getDraft(ctx, validated.value) : null;
      const assetId = text(validated.value.assetId) || text(value(draft, "asset_id"));
      if (!assetId) return { ok: false, error: { code: "asset_missing", message: "No source asset is attached to this product draft." } };
      const asset = await ctx.repos.asset.getById(assetId, ctx.workspaceId);
      if (!asset) return { ok: false, error: { code: "asset_missing", message: "Source asset was not found in this workspace." } };
      const qaRows = (await ctx.repos.qa.listByWorkspace(ctx.workspaceId)).filter((row) => value(row, "asset_id") === asset.id || value(row, "source_asset_id") === asset.id);
      const latestQa = qaRows.at(-1) ?? null;
      const evidence = asRecord(value(latestQa, "evidence") ?? value(latestQa, "metadata"));
      return {
        ok: true,
        data: {
          asset: safeShortRow(asset, ["provider", "model", "qa_status", "mime_type", "width", "height", "asset_kind"]),
          derivativeIds: asArray(value(asset, "derivative_ids")),
          printPngState: value(latestQa, "status") ?? value(asset, "print_png_status"),
          hasAlpha: evidence.hasAlpha ?? value(asset, "has_alpha"),
          transparentPixelRatio: evidence.transparentPixelRatio ?? value(asset, "transparent_pixel_ratio"),
          chromaEvidence: evidence.chromaKey ?? evidence.chromaEvidence ?? null,
          qaStatus: value(latestQa, "status") ?? value(asset, "qa_status"),
          blockingCodes: asArray(value(latestQa, "blocking_codes") ?? evidence.blockingCodes),
          warningCodes: asArray(value(latestQa, "warning_codes") ?? evidence.warningCodes)
        }
      };
    }
  },
  {
    name: "get_mockup_summary",
    description: "Read persisted mockup proof for a product draft or asset. This does not call Printify or render internal mockups.",
    parameters: objectSchema({
      productDraftId: stringProperty("Product draft ID used to resolve mockups."),
      assetId: { type: "string", description: "Optional source asset ID." },
      mockupId: { type: "string", description: "Optional mockup ID." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [productListingRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(productListingAssistantTools[2]!.parameters, args);
      if (!validated.ok) return { ok: false, error: { code: validated.code, message: validated.message } };
      const draftId = text(validated.value.productDraftId);
      const assetId = text(validated.value.assetId);
      const mockupId = text(validated.value.mockupId);
      const all = await ctx.repos.mockup.listByWorkspace(ctx.workspaceId);
      const rows = all.filter((row) =>
        (mockupId && row.id === mockupId) ||
        (draftId && value(row, "product_draft_id") === draftId) ||
        (assetId && (value(row, "asset_id") === assetId || value(row, "source_asset_id") === assetId))
      );
      const providerRows = rows.filter((row) => String(value(row, "source") ?? value(row, "provider_source") ?? "").toLowerCase() === "printify");
      const hero = rows.find((row) => value(row, "is_hero") === true || value(row, "is_default") === true) ?? providerRows[0] ?? rows[0] ?? null;
      return {
        ok: true,
        data: {
          providerMockupCount: providerRows.length,
          totalMockupCount: rows.length,
          sourceProvider: providerRows.length ? "printify" : rows.length ? "internal_or_dev" : "none",
          heroMockupId: hero?.id ?? null,
          approvalState: value(hero, "approval_status") ?? value(hero, "status") ?? null,
          internalMockupExistsOnlyAsDevTest: rows.some((row) => String(value(row, "source") ?? value(row, "provider_source") ?? "").toLowerCase() !== "printify"),
          mockups: rows.map((row) => safeShortRow(row, ["source", "provider_source", "is_hero", "is_default", "approval_status", "status", "printify_product_id"]))
        }
      };
    }
  },
  {
    name: "get_publish_readiness_summary",
    description: "Read persisted publish readiness gates and blockers. This tool never overrides gates.",
    parameters: objectSchema({
      productDraftId: stringProperty("Product draft ID to check.")
    }, ["productDraftId"]),
    riskLevel: "read_only",
    allowedRoles: [productListingRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(productListingAssistantTools[3]!.parameters, args);
      if (!validated.ok) return { ok: false, error: { code: validated.code, message: validated.message } };
      const review = await ctx.repos.publish.getByProductDraftId(ctx.workspaceId, text(validated.value.productDraftId));
      if (!review) return { ok: true, data: { passedGates: [], failedGates: ["publish_review_missing"], warnings: [], nextBlocker: "Create a publish review before final launch approval." } };
      const gates = asRecord(value(review, "gates"));
      const passedGates = Object.entries(gates).filter(([, passed]) => passed === true).map(([key]) => key);
      const failedGates = Object.entries(gates).filter(([, passed]) => passed !== true).map(([key]) => key);
      return {
        ok: true,
        data: {
          passedGates,
          failedGates,
          warnings: asArray(value(review, "notes")),
          nextBlocker: failedGates[0] ?? null,
          allGatesPassed: value(review, "all_gates_passed") === true
        }
      };
    }
  },
  {
    name: "save_product_listing_draft_output",
    description: "Save generated product listing copy as a draft for human review. This does not publish or update provider products.",
    parameters: objectSchema({
      productDraftId: stringProperty("Product draft ID this output belongs to."),
      title: stringProperty("Suggested product title."),
      shortDescription: stringProperty("Short listing description."),
      longDescription: stringProperty("Long listing description."),
      seoTitle: stringProperty("SEO title suggestion."),
      seoDescription: stringProperty("SEO description suggestion."),
      tags: stringArrayProperty("Suggested tags."),
      readinessSummary: stringProperty("Summary of readiness and blockers."),
      blockingReasons: { type: "array", items: { type: "string" }, description: "Specific remaining blockers." },
      humanReviewNotes: { type: "array", items: { type: "string" }, description: "Notes for owner review." }
    }, ["productDraftId", "title", "shortDescription", "longDescription", "seoTitle", "seoDescription", "tags", "readinessSummary"]),
    riskLevel: "draft_only",
    allowedRoles: [productListingRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(productListingAssistantTools[4]!.parameters, args);
      if (!validated.ok) return { ok: false, error: { code: validated.code, message: validated.message } };
      const draft = await getDraft(ctx, validated.value);
      if (!draft) return { ok: false, error: { code: "product_draft_missing", message: "Product draft was not found in this workspace." } };
      const output = await ctx.repos.aiEmployee.outputs.create({
        id: `aiout_ollama_listing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        workspace_id: ctx.workspaceId,
        run_id: ctx.agentRunId,
        output_type: "product_listing_draft",
        ref_type: "product_draft",
        ref_id: draft.id,
        output_json: {
          ...validated.value,
          source: "local_ollama_agent",
          requiresHumanReview: true
        },
        status: "pending_review",
        metadata: {
          roleKey: ctx.roleKey,
          providerAction: false,
          publishAction: false
        }
      } as WorkspaceRow);
      ctx.state ??= {};
      ctx.state.savedOutputIds ??= [];
      ctx.state.savedOutputIds.push(output.id);
      return { ok: true, data: { finalOutputId: output.id, requiresHumanReview: true } };
    }
  }
];

export const trendIntelligenceAgentTools: AgentToolDefinition[] = [
  {
    name: "read_trend_watch_profile",
    description: "Read the saved trend watch profile that defines keywords, motifs, exclusions, and score weights for analysis.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[0]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const profileId = text(validated.value.profileId) || taskOptions(ctx).profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        return { ok: true, data: await readTrendWatchProfile({ repos: ctx.repos, workspaceId: ctx.workspaceId, profileId }) };
      } catch (error) {
        const code = trendErrorCode(error, "trend_profile_missing");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  },
  {
    name: "read_persisted_trend_signals",
    description: "Read persisted trend signals for a profile. This never calls external source APIs and only reads saved workspace data.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." },
      sourceKeys: stringArrayProperty("Optional source-key subset to read from persisted trend signals."),
      maxSignals: numberProperty("Maximum number of persisted signals to read.")
    }, []),
    riskLevel: "read_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[1]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = taskOptions(ctx);
      const profileId = text(validated.value.profileId) || defaults.profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        return {
          ok: true,
          data: await readPersistedTrendSignals({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            profileId,
            sourceKeys: Array.isArray(validated.value.sourceKeys) ? validated.value.sourceKeys.map(String) : defaults.sourceKeys,
            maxSignals: Number.isFinite(Number(validated.value.maxSignals)) ? Number(validated.value.maxSignals) : defaults.maxSignals
          })
        };
      } catch (error) {
        const code = trendErrorCode(error, "trend_analysis_failed");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  },
  {
    name: "cluster_persisted_trend_signals",
    description: "Deterministically cluster persisted trend signals into stable trend groups and save the cluster rows for later scoring.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." },
      signalIds: stringArrayProperty("Optional specific persisted signal IDs to cluster."),
      sourceKeys: stringArrayProperty("Optional source-key subset to cluster."),
      maxSignals: numberProperty("Maximum number of persisted signals to cluster.")
    }, []),
    riskLevel: "draft_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[2]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = taskOptions(ctx);
      const profileId = text(validated.value.profileId) || defaults.profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        return {
          ok: true,
          data: {
            clusters: await clusterPersistedTrendSignals({
              repos: ctx.repos,
              workspaceId: ctx.workspaceId,
              actorId: ctx.actorId,
              profileId,
              signalIds: Array.isArray(validated.value.signalIds) ? validated.value.signalIds.map(String) : undefined,
              sourceKeys: Array.isArray(validated.value.sourceKeys) ? validated.value.sourceKeys.map(String) : defaults.sourceKeys,
              maxSignals: Number.isFinite(Number(validated.value.maxSignals)) ? Number(validated.value.maxSignals) : defaults.maxSignals,
              agentRunId: ctx.agentRunId
            })
          }
        };
      } catch (error) {
        const code = trendErrorCode(error, "trend_analysis_failed");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  },
  {
    name: "score_trend_cluster",
    description: "Run the transparent deterministic scoring model for a persisted trend cluster and save the score row.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." },
      clusterId: stringProperty("Trend cluster ID to score.")
    }, ["clusterId"]),
    riskLevel: "draft_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[3]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const profileId = text(validated.value.profileId) || taskOptions(ctx).profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        return {
          ok: true,
          data: await scoreTrendCluster({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            actorId: ctx.actorId,
            profileId,
            clusterId: text(validated.value.clusterId),
            agentRunId: ctx.agentRunId
          })
        };
      } catch (error) {
        const code = trendErrorCode(error, "trend_analysis_failed");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  },
  {
    name: "draft_product_concept_candidates",
    description: "Draft deterministic concept scaffolds from scored trend clusters. This only reads saved signals, clusters, and scores.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." },
      clusterIds: stringArrayProperty("Trend cluster IDs to turn into owner-reviewable concept scaffolds."),
      maxConcepts: numberProperty("Maximum number of concept drafts to prepare.")
    }, ["clusterIds"]),
    riskLevel: "read_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[4]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = taskOptions(ctx);
      const profileId = text(validated.value.profileId) || defaults.profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        return {
          ok: true,
          data: await draftProductConceptCandidates({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            profileId,
            clusterIds: asArray(validated.value.clusterIds).map(String),
            maxConcepts: Number.isFinite(Number(validated.value.maxConcepts)) ? Number(validated.value.maxConcepts) : defaults.maxConcepts,
            agentRunId: ctx.agentRunId
          })
        };
      } catch (error) {
        const code = trendErrorCode(error, "trend_analysis_failed");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  },
  {
    name: "save_trend_analysis_report",
    description: "Save or update the trend analysis report summary for the current agent run and persist the reviewable report output.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." },
      summary: stringProperty("Concise owner-facing summary of the trend analysis."),
      warnings: { type: "array", items: { type: "string" }, description: "Warnings or caveats for owner review." },
      status: { type: "string", description: "Report status: pending_review, reviewed, failed, or blocked." },
      clusterSummaries: { type: "array", items: { type: "object" }, description: "Optional refined cluster labels and summaries." }
    }, ["summary"]),
    riskLevel: "draft_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[5]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const profileId = text(validated.value.profileId) || taskOptions(ctx).profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        const saved = await saveTrendAnalysisReport({
          repos: ctx.repos,
          workspaceId: ctx.workspaceId,
          actorId: ctx.actorId,
          profileId,
          agentRunId: ctx.agentRunId,
          payload: validated.value
        });
        ctx.state ??= {};
        ctx.state.savedOutputIds ??= [];
        if (!ctx.state.savedOutputIds.includes(saved.aiOutputId)) ctx.state.savedOutputIds.push(saved.aiOutputId);
        return { ok: true, data: saved };
      } catch (error) {
        const code = trendErrorCode(error, "trend_analysis_report_invalid");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  },
  {
    name: "save_product_concept_candidates",
    description: "Save owner-reviewable product concept candidates grounded in persisted trend clusters and source citations. This never creates product drafts or provider records.",
    parameters: objectSchema({
      profileId: { type: "string", description: "Trend watch profile ID. Defaults to the current task profile when omitted." },
      candidates: { type: "array", items: { type: "object" }, description: "Schema-valid concept candidates grounded in source evidence." }
    }, ["candidates"]),
    riskLevel: "draft_only",
    allowedRoles: [trendIntelligenceRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(trendIntelligenceAgentTools[6]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const profileId = text(validated.value.profileId) || taskOptions(ctx).profileId;
      if (!profileId) return errorResult("trend_profile_missing", "Trend watch profile ID is required.");
      try {
        return {
          ok: true,
          data: await saveProductConceptCandidates({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            actorId: ctx.actorId,
            profileId,
            agentRunId: ctx.agentRunId,
            candidates: asArray(validated.value.candidates)
          })
        };
      } catch (error) {
        const code = trendErrorCode(error, "trend_concept_candidate_invalid");
        return errorResult(code, toSafeTrendAnalysisError(error));
      }
    }
  }
];

export const marketingLaunchPlannerTools: AgentToolDefinition[] = [
  {
    name: "read_brand_voice_profile",
    description: "Read the saved brand voice profile and claim guardrails for the current workspace.",
    parameters: objectSchema({
      brandVoiceProfileId: { type: "string", description: "Optional brand voice profile ID. Defaults to the current launch plan profile when omitted." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[0]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return {
          ok: true,
          data: await readBrandVoiceProfile({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            brandVoiceProfileId: text(validated.value.brandVoiceProfileId) || marketingOptions(ctx).brandVoiceProfileId || undefined
          })
        };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "brand_voice_profile_missing"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "read_approved_product_or_concept",
    description: "Read the approved product concept, product draft, or listing draft that the launch package should be built around.",
    parameters: objectSchema({
      launchPlanId: { type: "string", description: "Optional launch plan ID. Defaults to the current task launch plan." },
      sourceEntityType: { type: "string", description: "Optional source entity type." },
      sourceEntityId: { type: "string", description: "Optional source entity ID." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[1]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = marketingOptions(ctx);
      try {
        return {
          ok: true,
          data: await readApprovedProductOrConcept({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            launchPlanId: text(validated.value.launchPlanId) || defaults.launchPlanId || undefined,
            sourceEntityType: text(validated.value.sourceEntityType) || defaults.sourceEntityType || undefined,
            sourceEntityId: text(validated.value.sourceEntityId) || defaults.sourceEntityId || undefined
          })
        };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "marketing_source_entity_missing"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "read_trend_evidence_for_product",
    description: "Read persisted trend evidence attached to the approved product concept or listing input. This never calls external source APIs.",
    parameters: objectSchema({
      launchPlanId: { type: "string", description: "Optional launch plan ID. Defaults to the current task launch plan." },
      sourceEntityType: { type: "string", description: "Optional source entity type." },
      sourceEntityId: { type: "string", description: "Optional source entity ID." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[2]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = marketingOptions(ctx);
      try {
        return {
          ok: true,
          data: await readTrendEvidenceForProduct({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            launchPlanId: text(validated.value.launchPlanId) || defaults.launchPlanId || undefined,
            sourceEntityType: text(validated.value.sourceEntityType) || defaults.sourceEntityType || undefined,
            sourceEntityId: text(validated.value.sourceEntityId) || defaults.sourceEntityId || undefined
          })
        };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "trend_evidence_missing"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "read_product_readiness_data",
    description: "Calculate and persist marketing readiness for the selected source entity. This does not mutate providers or publish content.",
    parameters: objectSchema({
      launchPlanId: { type: "string", description: "Optional launch plan ID. Defaults to the current task launch plan." },
      sourceEntityType: { type: "string", description: "Optional source entity type." },
      sourceEntityId: { type: "string", description: "Optional source entity ID." }
    }, []),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[3]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = marketingOptions(ctx);
      try {
        return {
          ok: true,
          data: await readProductReadinessData({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            actorId: ctx.actorId,
            launchPlanId: text(validated.value.launchPlanId) || defaults.launchPlanId || undefined,
            sourceEntityType: text(validated.value.sourceEntityType) || defaults.sourceEntityType || undefined,
            sourceEntityId: text(validated.value.sourceEntityId) || defaults.sourceEntityId || undefined
          })
        };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "marketing_readiness_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "calculate_product_margin",
    description: "Read or derive the current margin estimate without changing product pricing or storefront content.",
    parameters: objectSchema({
      launchPlanId: { type: "string", description: "Optional launch plan ID. Defaults to the current task launch plan." },
      sourceEntityType: { type: "string", description: "Optional source entity type." },
      sourceEntityId: { type: "string", description: "Optional source entity ID." }
    }, []),
    riskLevel: "read_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[4]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = marketingOptions(ctx);
      try {
        return {
          ok: true,
          data: await calculateProductMargin({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            launchPlanId: text(validated.value.launchPlanId) || defaults.launchPlanId || undefined,
            sourceEntityType: text(validated.value.sourceEntityType) || defaults.sourceEntityType || undefined,
            sourceEntityId: text(validated.value.sourceEntityId) || defaults.sourceEntityId || undefined
          })
        };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "marketing_margin_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "save_marketing_launch_plan",
    description: "Create the root marketing launch plan or refresh it for the current approved source entity. This only persists internal draft records.",
    parameters: objectSchema({
      launchPlanId: { type: "string", description: "Optional existing launch plan ID to inspect." },
      brandVoiceProfileId: { type: "string", description: "Optional brand voice profile ID." },
      sourceEntityType: { type: "string", description: "Optional source entity type." },
      sourceEntityId: { type: "string", description: "Optional source entity ID." },
      launchName: { type: "string", description: "Optional launch plan name." },
      campaignType: { type: "string", description: "organic, paid, marketplace, outreach, or hybrid." },
      spendType: { type: "string", description: "no_spend, owner_time_only, commission_only, paid_media, or paid_tooling." }
    }, []),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[5]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      const defaults = marketingOptions(ctx);
      try {
        if (text(validated.value.launchPlanId) || defaults.launchPlanId) {
          const detail = await getMarketingLaunchPlanDetail({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            launchPlanId: text(validated.value.launchPlanId) || defaults.launchPlanId
          });
          if (!detail) return errorResult("marketing_launch_plan_invalid", "Marketing launch plan was not found.");
          return { ok: true, data: detail.launchPlan };
        }
        return {
          ok: true,
          data: await createMarketingLaunchPlan({
            repos: ctx.repos,
            workspaceId: ctx.workspaceId,
            actorId: ctx.actorId,
            brandVoiceProfileId: text(validated.value.brandVoiceProfileId) || defaults.brandVoiceProfileId || undefined,
            sourceEntityType: text(validated.value.sourceEntityType) || defaults.sourceEntityType || undefined,
            sourceEntityId: text(validated.value.sourceEntityId) || defaults.sourceEntityId || undefined,
            launchName: text(validated.value.launchName) || undefined,
            campaignType: text(validated.value.campaignType) || "hybrid",
            spendType: text(validated.value.spendType) || "owner_time_only"
          })
        };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "marketing_launch_plan_invalid"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_organic_launch_plan",
    description: "Create the no-spend 7-day, 14-day, and 30-day organic launch plan drafts for owner review.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[6]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftOrganicLaunchPlan({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "organic_launch_plan_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_seo_pdp_recommendations",
    description: "Create SEO metadata, PDP recommendations, and landing-page recommendation drafts without mutating Shopify.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[7]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftSeoPdpRecommendations({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "seo_pdp_recommendations_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_social_content",
    description: "Create Instagram, Facebook, and short-form social draft content without posting or scheduling.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[8]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftSocialContent({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "social_content_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_pinterest_organic_plan",
    description: "Create Pinterest organic pin ideas and board recommendations without publishing pins.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[9]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftPinterestOrganicPlan({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "pinterest_plan_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_email_sms_drafts",
    description: "Create no-send email and SMS drafts plus lifecycle-flow draft rows.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[10]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftEmailSmsDrafts({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "email_sms_drafts_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_marketplace_seo_suggestions",
    description: "Create marketplace SEO title, tag, and photo-order suggestion drafts without mutating any marketplace listing.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[11]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftMarketplaceSeoSuggestions({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "marketplace_seo_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_outreach_drafts",
    description: "Create outreach and collaboration pitch drafts without sending them.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[12]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftOutreachDrafts({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "outreach_drafts_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_positioning_statement",
    description: "Create the launch positioning statement for owner review.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[13]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftPositioningStatement({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "positioning_statement_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_offer_hypotheses",
    description: "Create owner-reviewable offer and bundle hypotheses without configuring live discounts.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[14]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftOfferHypotheses({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "offer_hypotheses_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_audience_hypotheses",
    description: "Create audience hypotheses without sensitive-attribute targeting or live ad-platform mutation.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[15]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftAudienceHypotheses({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "audience_hypotheses_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_ad_angles",
    description: "Create owner-reviewable ad angles grounded in existing product and trend evidence.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[16]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftAdAngles({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "ad_angles_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_ad_copy_variants",
    description: "Create ad-copy variants for review without creating live ad-platform objects.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[17]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftAdCopyVariants({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "ad_copy_variants_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "draft_creative_briefs",
    description: "Create creative briefs only. This does not trigger image generation or asset mutation.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[18]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await draftCreativeBriefs({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "creative_briefs_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "run_policy_review",
    description: "Run deterministic policy, claims, and IP review against all current launch outputs and persist the results.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[19]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await runPolicyReview({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, MARKETING_POLICY_BLOCKED), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "calculate_budget_recommendation",
    description: "Create the no-spend/paid-draft budget recommendation and channel-priority records without spending money.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[20]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await calculateBudgetRecommendation({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "budget_recommendation_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "compile_campaign_build_sheet",
    description: "Create media-plan and campaign-draft build sheets in manual/export-only mode with null live platform object IDs.",
    parameters: objectSchema({ launchPlanId: stringProperty("Launch plan ID.") }, ["launchPlanId"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[21]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        return { ok: true, data: await compileCampaignBuildSheet({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId) }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "campaign_build_sheet_failed"), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "save_marketing_output_for_review",
    description: "Finalize the launch package summary, persist the reviewable AI output, and create missing owner approval requests.",
    parameters: objectSchema({
      launchPlanId: stringProperty("Launch plan ID."),
      summary: stringProperty("Owner-facing launch summary."),
      warnings: { type: "array", items: { type: "string" }, description: "Warnings or manual follow-up notes." }
    }, ["launchPlanId", "summary"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[22]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        const saved = await saveMarketingOutputForReview({
          repos: ctx.repos,
          workspaceId: ctx.workspaceId,
          actorId: ctx.actorId,
          launchPlanId: text(validated.value.launchPlanId),
          agentRunId: ctx.agentRunId,
          summary: text(validated.value.summary),
          warnings: asArray(validated.value.warnings).map(String)
        });
        ctx.state ??= {};
        ctx.state.savedOutputIds ??= [];
        if (!ctx.state.savedOutputIds.includes(saved.aiOutputId)) ctx.state.savedOutputIds.push(saved.aiOutputId);
        return { ok: true, data: saved };
      } catch (error) {
        return errorResult(marketingErrorCode(error, MARKETING_LAUNCH_PLAN_INVALID), toSafeMarketingLaunchError(error));
      }
    }
  },
  {
    name: "create_approval_request",
    description: "Create one or more owner approval requests for launch artifacts. This does not approve or publish anything.",
    parameters: objectSchema({
      launchPlanId: stringProperty("Launch plan ID."),
      targets: { type: "array", items: { type: "object" }, description: "Target rows that require owner review." }
    }, ["launchPlanId", "targets"]),
    riskLevel: "draft_only",
    allowedRoles: [marketingLaunchRole],
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(marketingLaunchPlannerTools[23]!.parameters, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      try {
        const targets = asArray(validated.value.targets).map((entry) => {
          const row = asRecord(entry);
          return {
            targetType: text(row.targetType ?? row.target_type),
            targetId: text(row.targetId ?? row.target_id),
            ...(text(row.requestedAction ?? row.requested_action) ? { requestedAction: text(row.requestedAction ?? row.requested_action) } : {}),
            ...(Object.keys(asRecord(row.riskSummary ?? row.risk_summary)).length ? { riskSummary: asRecord(row.riskSummary ?? row.risk_summary) } : {})
          };
        }).filter((entry) => entry.targetType && entry.targetId);
        return { ok: true, data: await createApprovalRequest({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, launchPlanId: text(validated.value.launchPlanId), targets }) };
      } catch (error) {
        return errorResult(marketingErrorCode(error, "approval_request_failed"), toSafeMarketingLaunchError(error));
      }
    }
  }
];

const commerceToolSchema = objectSchema({
  sourceEntityType: { type: "string", description: "Optional source entity type." },
  sourceEntityId: { type: "string", description: "Optional exact source entity ID." },
  launchPlanId: { type: "string", description: "Optional marketing launch plan ID." },
  approvalItemId: { type: "string", description: "Optional shop-manager approval queue item ID." },
  recommendationId: { type: "string", description: "Optional commerce recommendation ID." },
  assetId: { type: "string", description: "Optional asset ID." },
  mockupId: { type: "string", description: "Optional mockup ID." },
  content: { type: "string", description: "Optional owner-reviewable draft copy or content to check." },
  audienceContext: { type: "string", description: "Optional audience context for behavioral consultation." },
  consultationType: { type: "string", description: "Optional consultation type." },
  ownerDecision: { type: "string", description: "Optional owner decision value." },
  ownerNotes: { type: "string", description: "Optional owner notes." },
  rejectionReason: { type: "string", description: "Optional rejection reason." },
  recommendationType: { type: "string", description: "Optional recommendation type." },
  title: { type: "string", description: "Optional title." },
  summary: { type: "string", description: "Optional summary." },
  rationale: { type: "string", description: "Optional rationale." },
  checkType: { type: "string", description: "Optional quality check type." },
  verdict: { type: "string", description: "Optional quality check verdict." },
  severity: { type: "string", description: "Optional severity." },
  evidenceRefs: { type: "array", description: "Optional evidence references." },
  reasons: { type: "array", description: "Optional quality check reasons." },
  fixSuggestions: { type: "array", description: "Optional quality check fixes." },
  outputJson: { type: "object", description: "Optional output JSON." },
  editedFields: { type: "object", description: "Optional edited fields." },
  preferenceSignal: { type: "object", description: "Optional preference signal." }
});

const commerceToolInput = (ctx: AgentToolContext, args: Record<string, unknown>) => ({
  repos: ctx.repos,
  workspaceId: ctx.workspaceId,
  actorId: ctx.actorId,
  roleKey: ctx.roleKey,
  sourceEntityType: text(args.sourceEntityType) || marketingOptions(ctx).sourceEntityType,
  sourceEntityId: text(args.sourceEntityId) || marketingOptions(ctx).sourceEntityId,
  launchPlanId: text(args.launchPlanId) || marketingOptions(ctx).launchPlanId,
  approvalItemId: text(args.approvalItemId),
  recommendationId: text(args.recommendationId),
  content: text(args.content),
  audienceContext: text(args.audienceContext),
  consultationType: text(args.consultationType),
  agentRunId: ctx.agentRunId
});

function commerceErrorCode(error: unknown, fallback = "commerce_agent_tool_failed") {
  return error instanceof Error && error.message ? error.message : fallback;
}

function commerceTool(name: string, description: string, execute: (ctx: AgentToolContext, args: Record<string, unknown>) => Promise<unknown>): AgentToolDefinition {
  const allowedRoles = commerceAgentRoleCatalog
    .filter((role) => role.is_enabled && role.allowed_tools.includes(name))
    .map((role) => role.role_key);
  return {
    name,
    description,
    parameters: commerceToolSchema,
    riskLevel: "draft_only",
    allowedRoles,
    forbidden: false,
    execute: async (ctx, args) => {
      const validated = validateToolArguments(commerceToolSchema, args);
      if (!validated.ok) return errorResult(validated.code, validated.message);
      if (!commerceAgentToolNames.includes(name)) return errorResult("commerce_agent_tool_not_allowlisted", "Commerce agent tool is not allowlisted.");
      if (!allowedRoles.includes(ctx.roleKey)) return errorResult("commerce_agent_tool_not_allowed_for_role", "Commerce agent tool is not allowed for this role.");
      try {
        return { ok: true, data: await execute(ctx, validated.value) };
      } catch (error) {
        return errorResult(commerceErrorCode(error), error instanceof Error ? error.message : "Commerce agent tool failed.");
      }
    }
  };
}

export const shopManagerAgentTools: AgentToolDefinition[] = [
  commerceTool("readApprovedProductOrConcept", "Read an exact approved product/concept/listing source entity. This never falls back when an exact ID is supplied.", async (ctx, args) =>
    readApprovedProductOrConcept({ repos: ctx.repos, workspaceId: ctx.workspaceId, sourceEntityType: text(args.sourceEntityType) || marketingOptions(ctx).sourceEntityType, sourceEntityId: text(args.sourceEntityId) || marketingOptions(ctx).sourceEntityId, launchPlanId: text(args.launchPlanId) || marketingOptions(ctx).launchPlanId })),
  commerceTool("readTrendEvidenceForProduct", "Read persisted trend evidence attached to the approved source entity. This never calls external source APIs.", async (ctx, args) =>
    readTrendEvidenceForProduct({ repos: ctx.repos, workspaceId: ctx.workspaceId, sourceEntityType: text(args.sourceEntityType) || marketingOptions(ctx).sourceEntityType, sourceEntityId: text(args.sourceEntityId) || marketingOptions(ctx).sourceEntityId, launchPlanId: text(args.launchPlanId) || marketingOptions(ctx).launchPlanId })),
  commerceTool("readMarketingLaunchPlan", "Read persisted marketing launch plan detail and its draft outputs.", async (ctx, args) => readCommerceMarketingLaunchPlan(commerceToolInput(ctx, args))),
  commerceTool("readProductReadinessData", "Read and persist product readiness data through the existing marketing readiness path.", async (ctx, args) =>
    readProductReadinessData({ repos: ctx.repos, workspaceId: ctx.workspaceId, actorId: ctx.actorId, sourceEntityType: text(args.sourceEntityType) || marketingOptions(ctx).sourceEntityType, sourceEntityId: text(args.sourceEntityId) || marketingOptions(ctx).sourceEntityId, launchPlanId: text(args.launchPlanId) || marketingOptions(ctx).launchPlanId })),
  commerceTool("readAssetQaData", "Read existing asset QA data. This does not generate or edit images.", async (ctx, args) => readAssetQaData({ ...commerceToolInput(ctx, args), assetId: text(args.assetId) })),
  commerceTool("readMockupData", "Read existing mockup data. This does not create Printify mockups or mutate providers.", async (ctx, args) => readMockupData({ ...commerceToolInput(ctx, args), mockupId: text(args.mockupId) })),
  commerceTool("calculateProductMargin", "Read margin data or margin hypotheses. This does not change prices or discounts.", async (ctx, args) =>
    calculateProductMargin({ repos: ctx.repos, workspaceId: ctx.workspaceId, sourceEntityType: text(args.sourceEntityType) || marketingOptions(ctx).sourceEntityType, sourceEntityId: text(args.sourceEntityId) || marketingOptions(ctx).sourceEntityId, launchPlanId: text(args.launchPlanId) || marketingOptions(ctx).launchPlanId })),
  commerceTool("runProductReadinessCheck", "Persist a product readiness quality check and recommendation.", async (ctx, args) => runProductReadinessCheck(commerceToolInput(ctx, args))),
  commerceTool("runCreativeQaCheck", "Persist a creative QA/print-risk quality check from existing asset and mockup data.", async (ctx, args) => runCreativeQaCheck(commerceToolInput(ctx, args))),
  commerceTool("runIpTrademarkCheck", "Run rule-based IP, trademark, claims, and copycat checks before any LLM explanation.", async (ctx, args) => runIpTrademarkCheck(commerceToolInput(ctx, args))),
  commerceTool("draftCatalogMerchandisingRecommendation", "Persist collection, bundle, cross-sell, and merchandising recommendations without Shopify mutation.", async (ctx, args) => draftCatalogMerchandisingRecommendation(commerceToolInput(ctx, args))),
  commerceTool("draftSeoGeoPdpRecommendation", "Persist SEO/GEO/PDP recommendations without Shopify mutation or unsupported claims.", async (ctx, args) => draftSeoGeoPdpRecommendation(commerceToolInput(ctx, args))),
  commerceTool("draftOrganicLaunchPlan", "Draft no-spend organic launch outputs for owner review.", async (ctx, args) => draftCommerceOrganicLaunchPlan(commerceToolInput(ctx, args))),
  commerceTool("draftSocialContent", "Draft social content for owner manual posting review only.", async (ctx, args) => draftCommerceSocialContent(commerceToolInput(ctx, args))),
  commerceTool("draftPinterestOrganicPlan", "Draft Pinterest organic outputs for owner manual publishing review only.", async (ctx, args) => draftCommercePinterestOrganicPlan(commerceToolInput(ctx, args))),
  commerceTool("draftEmailSmsDrafts", "Draft email/SMS outputs in no-send mode only.", async (ctx, args) => draftCommerceEmailSmsDrafts(commerceToolInput(ctx, args))),
  commerceTool("draftMarketplaceSeoSuggestions", "Draft marketplace SEO suggestions without marketplace mutation.", async (ctx, args) => draftCommerceMarketplaceSeoSuggestions(commerceToolInput(ctx, args))),
  commerceTool("draftOutreachDrafts", "Draft outreach templates for owner review without sending messages.", async (ctx, args) => draftCommerceOutreachDrafts(commerceToolInput(ctx, args))),
  commerceTool("draftAudienceHypotheses", "Draft owner-reviewed audience hypotheses without launching campaigns.", async (ctx, args) => draftCommerceAudienceHypotheses(commerceToolInput(ctx, args))),
  commerceTool("draftAdAngles", "Draft ad angles without ad platform writes.", async (ctx, args) => draftCommerceAdAngles(commerceToolInput(ctx, args))),
  commerceTool("draftAdCopyVariants", "Draft ad copy variants without ad platform writes.", async (ctx, args) => draftCommerceAdCopyVariants(commerceToolInput(ctx, args))),
  commerceTool("draftCampaignBuildSheet", "Draft manual campaign build sheets only; no ad platform writes.", async (ctx, args) => draftCommerceCampaignBuildSheet(commerceToolInput(ctx, args))),
  commerceTool("consultBehavioralPsychology", "Persist an ethical behavioral/customer-empathy consultation that always requires policy review.", async (ctx, args) => consultBehavioralPsychology(commerceToolInput(ctx, args))),
  commerceTool("runPolicyReview", "Run policy review after draft or behavioral consultation work.", async (ctx, args) => runCommercePolicyReview(commerceToolInput(ctx, args))),
  commerceTool("calculateBudgetRecommendation", "Persist recommendation-only budget guidance without changing budgets.", async (ctx, args) => calculateCommerceBudgetRecommendation(commerceToolInput(ctx, args))),
  commerceTool("prioritizeApprovalQueue", "Persist and prioritize internal approval queue items.", async (ctx, args) => prioritizeApprovalQueue(commerceToolInput(ctx, args))),
  commerceTool("createApprovalPrediction", "Persist advisory approval prediction records. Predictions never approve anything.", async (ctx, args) => createApprovalPrediction(commerceToolInput(ctx, args))),
  commerceTool("recordOwnerApprovalFeedback", "Record real owner decision feedback and update advisory learning records.", async (ctx, args) =>
    recordOwnerApprovalFeedback({ ...commerceToolInput(ctx, args), ownerDecision: text(args.ownerDecision), ownerNotes: text(args.ownerNotes), rejectionReason: text(args.rejectionReason), editedFields: asRecord(args.editedFields), preferenceSignal: asRecord(args.preferenceSignal) })),
  commerceTool("updateOwnerDecisionPatterns", "Update tentative owner decision patterns from real feedback evidence.", async (ctx, args) => updateOwnerDecisionPatterns(commerceToolInput(ctx, args))),
  commerceTool("createShopManagerBrief", "Persist a daily shop-manager brief for owner review.", async (ctx, args) => createShopManagerBrief(commerceToolInput(ctx, args))),
  commerceTool("createQualityCheck", "Persist a generic commerce quality check.", async (ctx, args) =>
    createCommerceQualityCheck({ ...commerceToolInput(ctx, args), checkType: text(args.checkType, "manual_quality_check"), verdict: text(args.verdict, "warning"), reasons: asArray(args.reasons), fixSuggestions: asArray(args.fixSuggestions), evidenceRefs: asArray(args.evidenceRefs) })),
  commerceTool("createProcessImprovementFinding", "Persist process improvement findings without applying code, schema, prompt, or tool changes.", async (ctx, args) =>
    createProcessImprovementFinding({ ...commerceToolInput(ctx, args), findingType: text(args.recommendationType), title: text(args.title), summary: text(args.summary) })),
  commerceTool("saveCommerceRecommendation", "Persist a generic owner-reviewable commerce recommendation.", async (ctx, args) =>
    saveCommerceRecommendation({ ...commerceToolInput(ctx, args), recommendationType: text(args.recommendationType, ctx.roleKey), title: text(args.title, ctx.roleKey), summary: text(args.summary, "Owner review required."), rationale: text(args.rationale, "Recommendation created from existing workspace data only."), evidenceRefs: asArray(args.evidenceRefs), severity: text(args.severity, "medium") })),
  commerceTool("saveCommerceOutputForReview", "Persist the final commerce agent output to AI employee outputs for owner review.", async (ctx, args) =>
    {
      const saved = await saveCommerceOutputForReview({ ...commerceToolInput(ctx, args), outputJson: asRecord(args.outputJson) });
      if (saved?.id) {
        ctx.state ??= {};
        ctx.state.savedOutputIds ??= [];
        if (!ctx.state.savedOutputIds.includes(saved.id)) ctx.state.savedOutputIds.push(saved.id);
      }
      return saved;
    })
];

export const forbiddenAgentToolNamePatterns = [
  /(^|_)publish($|_live|_product)/i,
  /go[_-]?live/i,
  /shopify[_-]?publish/i,
  /printify[_-]?create/i,
  /printify[_-]?upload/i,
  /send[_-]?email/i,
  /delete/i,
  /spend/i,
  /credential/i,
  /provider[_-]?sync/i,
  /qa[_-]?override/i,
  /shell/i,
  /filesystem/i,
  /sql/i,
  /http[_-]?fetch/i
];

export const allAgentTools: AgentToolDefinition[] = [
  ...productListingAssistantTools,
  ...trendIntelligenceAgentTools,
  ...marketingLaunchPlannerTools,
  ...shopManagerAgentTools
];

export function getAgentToolsForRole(roleKey: string) {
  return allAgentTools.filter((tool) => tool.allowedRoles.includes(roleKey));
}

export function toModelRuntimeTools(tools: AgentToolDefinition[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

export function registryHasForbiddenToolNames(tools: AgentToolDefinition[] = allAgentTools) {
  return tools.filter((tool) => forbiddenAgentToolNamePatterns.some((pattern) => pattern.test(tool.name)));
}
