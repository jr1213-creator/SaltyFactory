import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";

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

const objectSchema = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  properties,
  required
});

const stringProperty = (description: string): JsonSchema => ({ type: "string", minLength: 1, description });
const stringArrayProperty = (description: string): JsonSchema => ({ type: "array", items: { type: "string" }, description });

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

export function getAgentToolsForRole(roleKey: string) {
  return productListingAssistantTools.filter((tool) => tool.allowedRoles.includes(roleKey));
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

export function registryHasForbiddenToolNames(tools: AgentToolDefinition[] = productListingAssistantTools) {
  return tools.filter((tool) => forbiddenAgentToolNamePatterns.some((pattern) => pattern.test(tool.name)));
}
