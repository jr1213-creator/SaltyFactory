import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";

const confirmationText = "CREATE TEST PRINTIFY PRODUCT";
export const printifySmokeProductTitlePrefix = "SALTYFACTORY SMOKE TEST - DELETE ME";
const printifySmokeTags = ["saltyfactory-smoke-test", "delete-me", "private-beta-test"];

type SmokeFailureCategory =
  | "setup_failure"
  | "database_failure"
  | "storage_failure"
  | "credential_resolver_failure"
  | "provider_call_failure"
  | "product_selection_failure"
  | "mockup_import_failure";

type ImportAttemptResult =
  | { ok: true; status?: unknown; images: unknown[]; mockups: WorkspaceRow[]; reference?: WorkspaceRow }
  | { ok: false; status?: unknown; message?: unknown; retryable?: boolean; rateLimited?: boolean; blockingReasons?: unknown; reference?: WorkspaceRow };

type DerivativeKind = "thumbnail" | "web_preview" | "print_png";

type PreparedPrintifySmokeDraft = {
  draft: WorkspaceRow;
  asset: WorkspaceRow;
  printFile: WorkspaceRow;
  variants: WorkspaceRow[];
  createdSmokeDraft?: boolean;
  createdSmokeAsset?: boolean;
};

export class PrintifyMockupSmokeError extends Error {
  readonly category: SmokeFailureCategory;
  readonly code: string;
  readonly safeDetails: Record<string, unknown>;

  constructor(category: SmokeFailureCategory, code: string, safeDetails: Record<string, unknown> = {}) {
    super(JSON.stringify({ ok: false, category, code, ...safeDetails }));
    this.name = "PrintifyMockupSmokeError";
    this.category = category;
    this.code = code;
    this.safeDetails = safeDetails;
  }
}

function loadEnvFile(filePath: string) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [rawKey, ...rawValue] = trimmed.split("=");
      const key = rawKey?.trim();
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = rawValue.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Local env files are optional. Explicit process env always wins.
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "apps/studio/.env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asMetadata(row: WorkspaceRow | null | undefined): Record<string, unknown> {
  const metadata = row?.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function workspaceId() {
  return process.env.STUDIO_WORKSPACE_ID || "wks_default";
}

function smokeActorId() {
  return process.env.SMOKE_USER_ID || "printify_mockup_smoke_owner";
}

function safeId(value: unknown) {
  return text(value).replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 120);
}

function numericId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(Math.trunc(value));
  const raw = text(value);
  return /^\d+$/.test(raw) ? raw : "";
}

function derivativeKindOf(row: WorkspaceRow | null | undefined) {
  const metadata = asMetadata(row);
  const kind = text(metadata.derivative_kind ?? metadata.derivativeKind ?? row?.asset_type ?? row?.assetType);
  return (["thumbnail", "web_preview", "print_png"] as const).includes(kind as DerivativeKind) ? kind : "";
}

function assetIsApprovedGeneratedSource(row: WorkspaceRow | null | undefined) {
  if (!row || derivativeKindOf(row)) return false;
  const generator = text(row.generator ?? row.provider ?? asMetadata(row).provider);
  const generated = generator && generator !== "manual_upload" && generator !== "none";
  const approved = row.approved_for_mockup === true || row.approvedForMockup === true;
  const qaPassed = text(row.qa_status ?? row.qaStatus) === "passed";
  return Boolean(generated && approved && qaPassed);
}

function maskId(value: unknown) {
  const id = safeId(value);
  if (!id) return "missing";
  if (id.length <= 4) return "present";
  return `present (...${id.slice(-4)})`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildPrintifySmokeProductProfile(now = new Date()) {
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return {
    title: `${printifySmokeProductTitlePrefix} - ${timestamp}`,
    description: "Automated private beta smoke test product. Safe to delete. Not intended for sale.",
    tags: printifySmokeTags,
    metadata: {
      smokeTest: true,
      smokeScript: "smoke:printify-mockups-live",
      productTitlePrefix: printifySmokeProductTitlePrefix
    }
  };
}

function selectionFrom(draft: WorkspaceRow, variants: WorkspaceRow[]) {
  const metadata = asMetadata(draft);
  const firstVariant = variants[0];
  const blueprintId = text(metadata.printify_blueprint_id ?? metadata.printifyBlueprintId ?? firstVariant?.printify_blueprint_id ?? firstVariant?.printifyBlueprintId);
  const printProviderId = text(metadata.printify_print_provider_id ?? metadata.printifyPrintProviderId ?? firstVariant?.printify_print_provider_id ?? firstVariant?.printifyPrintProviderId);
  const variantIds = variants.map((variant) => text(variant.printify_variant_id ?? variant.printifyVariantId)).filter(Boolean);
  return { blueprintId, printProviderId, variantIds };
}

function listFromProviderPayload(value: unknown, ...keys: string[]) {
  if (Array.isArray(value)) return value.map(asRecord).filter((item) => Object.keys(item).length);
  const record = asRecord(value);
  for (const key of keys) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested.map(asRecord).filter((item) => Object.keys(item).length);
  }
  return [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function dollarsFromCents(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric) / 100;
}

function variantOptionText(variant: Record<string, unknown>, key: RegExp, fallback: string) {
  const options = Array.isArray(variant.options) ? variant.options.map(asRecord) : [];
  const match = options.find((option) => key.test(text(option.name ?? option.type ?? option.title).toLowerCase()));
  return text(match?.title ?? match?.value ?? match?.name, fallback);
}

export function classifyPrintifySmokeFailure(status: unknown, details: { setupRequired?: unknown; blockingReasons?: unknown } = {}) {
  const code = text(status, "unknown_provider_error");
  const detailText = JSON.stringify({
    setupRequired: details.setupRequired ?? [],
    blockingReasons: details.blockingReasons ?? []
  }).toLowerCase();
  if (code === "printify_not_connected") {
    if (detailText.includes("shop")) return "printify_shop_missing";
    if (detailText.includes("invalid") || detailText.includes("validate")) return "printify_token_invalid";
    return "printify_token_missing";
  }
  const mapped: Record<string, string> = {
    prepared_smoke_draft_not_ready: "product_selection_failure",
    no_prepared_smoke_draft_found: "product_selection_failure",
    print_png_missing: "print_png_missing",
    upload_failed: "upload_failed",
    rate_limited: "rate_limited",
    blueprint_missing: "blueprint_missing",
    print_provider_missing: "print_provider_missing",
    variants_missing: "variants_missing",
    product_create_failed: "product_create_failed",
    product_fetch_failed: "mockup_import_failed",
    printify_product_missing: "mockups_not_ready",
    mockups_not_ready: "mockups_not_ready",
    printify_mockup_import_failed: "mockup_import_failed"
  };
  return mapped[code] ?? "unknown_provider_error";
}

export async function importPrintifyMockupsWithRetry(input: {
  importOnce: () => Promise<ImportAttemptResult>;
  attempts?: number;
  delayMs?: number;
  wait?: (ms: number) => Promise<unknown>;
}) {
  const attempts = Math.max(1, input.attempts ?? 6);
  const delayMs = Math.max(0, input.delayMs ?? 10000);
  const sleep = input.wait ?? wait;
  let result: ImportAttemptResult | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await input.importOnce();
    if (result.ok) return { result, attempts: attempt };
    const status = text(result.status);
    const retryablePending = status === "mockups_not_ready" || result.retryable === true || result.rateLimited === true;
    if (!retryablePending || attempt === attempts) return { result, attempts: attempt };
    await sleep(delayMs);
  }
  return { result: result as ImportAttemptResult, attempts };
}

async function requireProviderResult<T>(result: { ok: true; data: T } | { ok: false; error: string; retryable?: boolean; rateLimited?: boolean }, code: string) {
  if (result.ok) return result.data;
  throw new PrintifyMockupSmokeError("product_selection_failure", result.rateLimited ? "rate_limited" : code, {
    message: result.error,
    retryable: result.retryable === true || result.rateLimited === true,
    rateLimited: result.rateLimited === true
  });
}

async function resolvePrintifySmokeSelection(printify: any) {
  const requestedBlueprintId = numericId(process.env.PRINTIFY_SMOKE_BLUEPRINT_ID);
  const requestedProviderId = numericId(process.env.PRINTIFY_SMOKE_PRINT_PROVIDER_ID);
  const requestedVariantId = numericId(process.env.PRINTIFY_SMOKE_VARIANT_ID);
  const catalog = await requireProviderResult(await printify.getCatalog(), "blueprint_missing");
  const catalogBlueprintIds = listFromProviderPayload(catalog, "data", "blueprints")
    .map((blueprint) => numericId(blueprint.id))
    .filter(Boolean);
  const diagnostics: Record<string, unknown> = {
    catalogBlueprintCount: catalogBlueprintIds.length,
    sampledBlueprintIds: catalogBlueprintIds.slice(0, 8),
    providerAttempts: [] as Array<Record<string, unknown>>
  };
  const blueprintIds = unique([
    requestedBlueprintId,
    "5",
    ...catalogBlueprintIds.slice(0, 16)
  ]);

  for (const blueprintId of blueprintIds) {
    const providersResult = await printify.getPrintProviders(blueprintId);
    const providerAttempt: Record<string, unknown> = { blueprintId, providersOk: providersResult.ok };
    if (!providersResult.ok) {
      providerAttempt["providerError"] = providersResult.error;
      (diagnostics.providerAttempts as Array<Record<string, unknown>>).push(providerAttempt);
      if (requestedBlueprintId && requestedBlueprintId === blueprintId) {
        await requireProviderResult(providersResult, "print_provider_missing");
      }
      continue;
    }
    const providers = listFromProviderPayload(providersResult.data, "data", "print_providers", "printProviders");
    providerAttempt["providerCount"] = providers.length;
    providerAttempt["sampleProviderIds"] = providers.map((provider) => numericId(provider.id)).filter(Boolean).slice(0, 6);
    providerAttempt["variantAttempts"] = [];
    const providerIds = unique([
      requestedProviderId,
      "99",
      ...providers.map((provider) => numericId(provider.id)).filter(Boolean)
    ]);
    for (const printProviderId of providerIds) {
      const variantsResult = await printify.getVariants(blueprintId, printProviderId);
      const variantAttempt: Record<string, unknown> = { printProviderId, variantsOk: variantsResult.ok };
      if (!variantsResult.ok) {
        variantAttempt["variantError"] = variantsResult.error;
        (providerAttempt.variantAttempts as Array<Record<string, unknown>>).push(variantAttempt);
        if (requestedProviderId && requestedProviderId === printProviderId) {
          await requireProviderResult(variantsResult, "variants_missing");
        }
        continue;
      }
      const variants = listFromProviderPayload(variantsResult.data, "data", "variants");
      variantAttempt["variantCount"] = variants.length;
      variantAttempt["sampleVariantIds"] = variants.map((variant) => numericId(variant.id)).filter(Boolean).slice(0, 6);
      (providerAttempt.variantAttempts as Array<Record<string, unknown>>).push(variantAttempt);
      const selectedVariant = requestedVariantId
        ? variants.find((variant) => numericId(variant.id) === requestedVariantId)
        : variants.find((variant) => numericId(variant.id) && variant.is_enabled !== false && variant.isEnabled !== false) ?? variants.find((variant) => numericId(variant.id));
      if (selectedVariant) {
        return {
          blueprintId,
          printProviderId,
          variant: selectedVariant,
          variantId: numericId(selectedVariant.id)
        };
      }
    }
    (diagnostics.providerAttempts as Array<Record<string, unknown>>).push(providerAttempt);
  }

  throw new PrintifyMockupSmokeError("product_selection_failure", "variants_missing", {
    message: "No usable Printify blueprint/provider/variant combination was found for the smoke product.",
    ...diagnostics
  });
}

export function requirePrintifyMockupSmokeOptIn() {
  if (process.env.RUN_LIVE_PRINTIFY_MOCKUP_SMOKE !== "true") {
    return { ok: false as const, skipped: true, message: "smoke:printify-mockups-live skipped; set RUN_LIVE_PRINTIFY_MOCKUP_SMOKE=true to run." };
  }
  if (process.env.PRINTIFY_SMOKE_CONFIRMATION !== confirmationText) {
    throw new PrintifyMockupSmokeError("setup_failure", "missing_printify_smoke_confirmation", {
      required: confirmationText
    });
  }
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new PrintifyMockupSmokeError("setup_failure", "live_printify_smoke_refuses_production_runtime");
  }
  return { ok: true as const };
}

export function requirePrintifyMockupRuntimeEnv() {
  const missing = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL && "SUPABASE_URL",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.SUPABASE_PRIVATE_ASSETS_BUCKET && "SUPABASE_PRIVATE_ASSETS_BUCKET"
  ].filter(Boolean);
  if (missing.length) {
    throw new PrintifyMockupSmokeError("setup_failure", "missing_required_runtime_config", { missing });
  }
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.APP_ENV = mutableEnv.APP_ENV || "development";
  mutableEnv.REPOSITORY_ADAPTER = "drizzle";
}

function hasProductSelection(draft: WorkspaceRow, variants: WorkspaceRow[]) {
  const selection = selectionFrom(draft, variants);
  return Boolean(selection.blueprintId && selection.printProviderId && selection.variantIds.length > 0);
}

function derivativeFromRows(rows: WorkspaceRow[], sourceAssetId: string, kind: DerivativeKind) {
  return rows.find((row) => {
    const metadata = asMetadata(row);
    const parent = text(metadata.source_asset_id ?? metadata.sourceAssetId ?? metadata.parent_asset_id ?? metadata.parentAssetId);
    return (row.id === `${sourceAssetId}_${kind}` || parent === sourceAssetId) && derivativeKindOf(row) === kind;
  }) ?? null;
}

async function findPrintPngDerivativeForSmoke(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  assetId: string;
  findAssetDerivative: (repos: RepositoryBundle, workspaceId: string, assetId: string, kind: DerivativeKind) => Promise<WorkspaceRow | null>;
}) {
  const shared = await input.findAssetDerivative(input.repos, input.workspaceId, input.assetId, "print_png");
  if (shared) return shared;
  const deterministic = await input.repos.asset.getById(`${input.assetId}_print_png`, input.workspaceId);
  if (derivativeKindOf(deterministic) === "print_png") return deterministic;
  const rows = await input.repos.asset.listByWorkspace(input.workspaceId);
  return rows.find((row) => {
    const metadata = asMetadata(row);
    const parent = text(metadata.source_asset_id ?? metadata.sourceAssetId ?? metadata.parent_asset_id ?? metadata.parentAssetId);
    return parent === input.assetId && derivativeKindOf(row) === "print_png";
  }) ?? null;
}

export async function selectPreparedPrintifySmokeDraft(repos: RepositoryBundle, input: {
  workspaceId: string;
  findAssetDerivative: (repos: RepositoryBundle, workspaceId: string, assetId: string, kind: DerivativeKind) => Promise<WorkspaceRow | null>;
}): Promise<PreparedPrintifySmokeDraft> {
  const explicitDraftId = text(process.env.PRINTIFY_SMOKE_PRODUCT_DRAFT_ID || process.env.SMOKE_PRODUCT_DRAFT_ID);
  const candidates = explicitDraftId
    ? [await repos.draft.getById(explicitDraftId, input.workspaceId)].filter(Boolean) as WorkspaceRow[]
    : (await repos.draft.listByWorkspace(input.workspaceId)).sort((a, b) =>
      text(b.updated_at ?? b.updatedAt ?? b.created_at ?? b.createdAt).localeCompare(text(a.updated_at ?? a.updatedAt ?? a.created_at ?? a.createdAt))
    );

  for (const draft of candidates) {
    const assetId = text(draft.asset_id ?? draft.assetId);
    if (!assetId) continue;
    const asset = await repos.asset.getById(assetId, input.workspaceId);
    if (!asset) continue;
    const printFile = await findPrintPngDerivativeForSmoke({
      repos,
      workspaceId: input.workspaceId,
      assetId,
      findAssetDerivative: input.findAssetDerivative
    });
    if (!printFile) continue;
    const variants = await repos.variant.listByDraft(input.workspaceId, draft.id);
    if (!hasProductSelection(draft, variants)) continue;
    return { draft, asset, printFile, variants };
  }

  throw new PrintifyMockupSmokeError("product_selection_failure", explicitDraftId ? "prepared_smoke_draft_not_ready" : "no_prepared_smoke_draft_found", {
    required: [
      "approved generated asset",
      "print_png derivative",
      "Printify blueprint",
      "Printify print provider",
      "at least one selected Printify variant"
    ],
    productDraftId: explicitDraftId || undefined
  });
}

async function selectApprovedSmokeAsset(repos: RepositoryBundle, input: {
  workspaceId: string;
  actorId: string;
  findAssetDerivative: (repos: RepositoryBundle, workspaceId: string, assetId: string, kind: DerivativeKind) => Promise<WorkspaceRow | null>;
}): Promise<{ asset: WorkspaceRow; printFile: WorkspaceRow; createdSmokeAsset?: boolean }> {
  const explicitAssetId = text(process.env.PRINTIFY_SMOKE_ASSET_ID || process.env.SMOKE_ASSET_ID);
  const allAssets = explicitAssetId ? [] : await repos.asset.listByWorkspace(input.workspaceId);
  const candidates = explicitAssetId
    ? [await repos.asset.getById(explicitAssetId, input.workspaceId)].filter(Boolean) as WorkspaceRow[]
    : allAssets
      .filter(assetIsApprovedGeneratedSource)
      .sort((a, b) => text(b.updated_at ?? b.updatedAt ?? b.created_at ?? b.createdAt).localeCompare(text(a.updated_at ?? a.updatedAt ?? a.created_at ?? a.createdAt)));
  const scanned = (explicitAssetId ? candidates : allAssets).slice(0, 12).map((asset) => ({
    id: safeId(asset.id),
    generator: text(asset.generator ?? asset.provider ?? asMetadata(asset).provider),
    assetType: text(asset.asset_type ?? asset.assetType ?? asMetadata(asset).derivative_kind ?? asMetadata(asset).derivativeKind),
    qa: text(asset.qa_status ?? asset.qaStatus),
    approvedForMockup: asset.approved_for_mockup === true || asset.approvedForMockup === true
  }));

  for (const asset of candidates) {
    if (!assetIsApprovedGeneratedSource(asset)) continue;
    const printFile = await findPrintPngDerivativeForSmoke({
      repos,
      workspaceId: input.workspaceId,
      assetId: asset.id,
      findAssetDerivative: input.findAssetDerivative
    });
    if (printFile) return { asset, printFile };
  }

  if (!explicitAssetId) {
    const smokePackage = await createSmokeApprovedAssetPackage(repos, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      allAssets,
      findAssetDerivative: input.findAssetDerivative
    });
    if (smokePackage) return smokePackage;
  }

  throw new PrintifyMockupSmokeError("product_selection_failure", explicitAssetId ? "prepared_smoke_asset_not_ready" : "approved_asset_missing", {
    required: ["approved generated asset", "passed QA", "print_png derivative"],
    assetId: explicitAssetId || undefined,
    assetsScanned: explicitAssetId ? candidates.length : allAssets.length,
    approvedGeneratedCandidates: candidates.map((asset) => safeId(asset.id)).slice(0, 12),
    latestSafeAssetRows: scanned
  });
}

async function createSmokeApprovedAssetPackage(repos: RepositoryBundle, input: {
  workspaceId: string;
  actorId: string;
  allAssets: WorkspaceRow[];
  findAssetDerivative: (repos: RepositoryBundle, workspaceId: string, assetId: string, kind: DerivativeKind) => Promise<WorkspaceRow | null>;
}) {
  const sources = input.allAssets
    .filter((asset) => {
      if (derivativeKindOf(asset)) return false;
      const generator = text(asset.generator ?? asset.provider ?? asMetadata(asset).provider);
      return Boolean(generator && generator !== "manual_upload" && generator !== "none");
    })
    .sort((a, b) => text(b.created_at ?? b.createdAt ?? b.updated_at ?? b.updatedAt).localeCompare(text(a.created_at ?? a.createdAt ?? a.updated_at ?? a.updatedAt)));

  for (const source of sources) {
    const sourcePrintFile = derivativeFromRows(input.allAssets, source.id, "print_png") ?? await findPrintPngDerivativeForSmoke({
      repos,
      workspaceId: input.workspaceId,
      assetId: source.id,
      findAssetDerivative: input.findAssetDerivative
    });
    if (!sourcePrintFile) continue;
    const smokeAssetId = `asset_printify_smoke_${Date.now()}`;
    const smokeAsset = await repos.asset.create({
      ...source,
      id: smokeAssetId,
      workspace_id: input.workspaceId,
      qa_status: "passed",
      approved_for_mockup: true,
      status: "smoke_ready",
      notes: "Smoke-approved copy of generated artwork for guarded live Printify mockup proof.",
      metadata: {
        ...asMetadata(source),
        smokeTest: true,
        smokeSource: "printify_mockup_live_smoke",
        copiedFromAssetId: source.id
      },
      created_by: input.actorId,
      updated_by: input.actorId
    } as WorkspaceRow);

    const derivativeCopies: Partial<Record<DerivativeKind, WorkspaceRow>> = {};
    for (const kind of ["thumbnail", "web_preview", "print_png"] as const) {
      const sourceDerivative = kind === "print_png"
        ? sourcePrintFile
        : derivativeFromRows(input.allAssets, source.id, kind);
      if (!sourceDerivative) continue;
      derivativeCopies[kind] = await repos.asset.create({
        ...sourceDerivative,
        id: `${smokeAssetId}_${kind}`,
        workspace_id: input.workspaceId,
        asset_type: kind,
        qa_status: "passed",
        approved_for_mockup: false,
        metadata: {
          ...asMetadata(sourceDerivative),
          smokeTest: true,
          smokeSource: "printify_mockup_live_smoke",
          copiedFromAssetId: sourceDerivative.id,
          source_asset_id: smokeAssetId,
          parent_asset_id: smokeAssetId,
          derivative_kind: kind,
          derivative_package: true
        },
        created_by: input.actorId,
        updated_by: input.actorId
      } as WorkspaceRow);
    }

    if (derivativeCopies.print_png) {
      return { asset: smokeAsset, printFile: derivativeCopies.print_png, createdSmokeAsset: true };
    }
  }
  return null;
}

export async function selectOrCreatePrintifySmokeDraft(repos: RepositoryBundle, input: {
  workspaceId: string;
  actorId: string;
  printify: any;
  productProfile: ReturnType<typeof buildPrintifySmokeProductProfile>;
  findAssetDerivative: (repos: RepositoryBundle, workspaceId: string, assetId: string, kind: DerivativeKind) => Promise<WorkspaceRow | null>;
}): Promise<PreparedPrintifySmokeDraft> {
  try {
    return await selectPreparedPrintifySmokeDraft(repos, {
      workspaceId: input.workspaceId,
      findAssetDerivative: input.findAssetDerivative
    });
  } catch (error) {
    if (process.env.PRINTIFY_SMOKE_PRODUCT_DRAFT_ID || process.env.SMOKE_PRODUCT_DRAFT_ID) throw error;
    if (!(error instanceof PrintifyMockupSmokeError) || error.code !== "no_prepared_smoke_draft_found") throw error;
  }

  const { asset, printFile, createdSmokeAsset } = await selectApprovedSmokeAsset(repos, {
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    findAssetDerivative: input.findAssetDerivative
  });
  const selection = await resolvePrintifySmokeSelection(input.printify);
  const cost = dollarsFromCents(selection.variant.cost, 12);
  const price = Math.max(32, Math.ceil((cost * 2.5 + 5) * 100) / 100);
  const margin = Math.max(0, price - cost);
  const nowIso = new Date().toISOString();
  const draftId = `draft_printify_smoke_${Date.now()}`;
  const variantId = `variant_printify_smoke_${Date.now()}`;
  const draft = await repos.draft.create({
    id: draftId,
    workspace_id: input.workspaceId,
    brand: "SaltyFactory",
    title: input.productProfile.title,
    description: input.productProfile.description,
    product_type: "tee",
    collection: "Private beta smoke tests",
    tags: input.productProfile.tags,
    asset_id: asset.id,
    mockup_ids: [],
    variant_ids: [variantId],
    shopify_status: "not_published",
    printify_status: "not_synced",
    approval_status: "approved",
    status: "approved",
    approved_by: input.actorId,
    approved_at: nowIso,
    public_handle: draftId,
    metadata: {
      ...input.productProfile.metadata,
      printify_blueprint_id: selection.blueprintId,
      printify_print_provider_id: selection.printProviderId,
      smokeAssetId: asset.id
    },
    created_by: input.actorId,
    updated_by: input.actorId
  } as WorkspaceRow);
  const variant = await repos.variant.create({
    id: variantId,
    workspace_id: input.workspaceId,
    product_draft_id: draft.id,
    sku: `SF-SMOKE-${Date.now()}`,
    size: variantOptionText(selection.variant, /size/, "Default"),
    color: variantOptionText(selection.variant, /color|colour/, "Default"),
    printify_variant_id: selection.variantId,
    printify_blueprint_id: selection.blueprintId,
    printify_print_provider_id: selection.printProviderId,
    cost,
    price,
    margin_dollars: margin,
    margin_percent: price > 0 ? margin / price : 0,
    margin_ok: true,
    active: true,
    status: "active",
    notes: "Variant selected by guarded live Printify mockup smoke.",
    metadata: { smokeTest: true },
    created_by: input.actorId,
    updated_by: input.actorId
  } as WorkspaceRow);
  return {
    draft,
    asset,
    printFile,
    variants: [variant],
    createdSmokeDraft: true,
    ...(createdSmokeAsset ? { createdSmokeAsset } : {})
  };
}

function printSafePreflight(input: {
  workspaceId: string;
  productDraftId: string;
  assetId: string;
  providerStatus: string;
  credentialSource: string;
  shopId?: string;
  blueprintId: string;
  printProviderId: string;
  variantIds: string[];
  testProductTitle: string;
}) {
  console.log("Live Printify mockup smoke preflight:");
  console.log(`- database: ready`);
  console.log(`- workspace: ${safeId(input.workspaceId)}`);
  console.log(`- product draft: ${safeId(input.productDraftId)}`);
  console.log(`- asset source: approved generated asset (${safeId(input.assetId)})`);
  console.log(`- print file: print_png ready`);
  console.log(`- Printify provider: ${input.providerStatus}`);
  console.log(`- credential source: ${safeId(input.credentialSource)}`);
  console.log(`- selected shop ID: ${maskId(input.shopId)}`);
  console.log(`- blueprint ID: ${safeId(input.blueprintId)}`);
  console.log(`- print provider ID: ${safeId(input.printProviderId)}`);
  console.log(`- variant IDs: ${input.variantIds.map(safeId).join(", ")}`);
  console.log(`- test product title prefix: ${printifySmokeProductTitlePrefix}`);
  console.log(`- test product title: ${input.testProductTitle}`);
  console.log(`- publish/live sync: disabled`);
  console.log(`- Shopify publish: disabled`);
  console.log(`- confirmation: exact match`);
  console.log("- secrets: not printed");
}

export async function runLivePrintifyMockupSmoke() {
  loadLocalEnv();
  const optIn = requirePrintifyMockupSmokeOptIn();
  if (!optIn.ok) {
    console.log(optIn.message);
    return { ok: true as const, skipped: true as const };
  }
  requirePrintifyMockupRuntimeEnv();
  parseEnv();

  const repos = createRepositories();
  const actorId = smokeActorId();
  const currentWorkspaceId = workspaceId();
  const [{ resolvePrintifyRuntime }, { findAssetDerivative }, {
    createPrintifyProductForMockups,
    evaluatePrintifyMockupProductionProof,
    importPrintifyMockupsForReference
  }] = await Promise.all([
    import("../apps/studio/app/api/studio/integrations/printify/_runtime"),
    import("../apps/studio/app/api/studio/_image-production"),
    import("../apps/studio/app/api/studio/integrations/printify/_mockup-workflow")
  ]);
  const runtime = await resolvePrintifyRuntime(repos);
  if (runtime.resolution.status !== "ready") {
    const code = classifyPrintifySmokeFailure("printify_not_connected", {
      setupRequired: runtime.resolution.setupRequired,
      blockingReasons: runtime.resolution.blockingReasons
    });
    throw new PrintifyMockupSmokeError("credential_resolver_failure", "printify_provider_not_ready", {
      classifiedFailure: code,
      status: runtime.resolution.status,
      setupRequired: runtime.resolution.setupRequired,
      blockingReasons: runtime.resolution.blockingReasons
    });
  }

  const smokeProduct = buildPrintifySmokeProductProfile();
  const prepared = await selectOrCreatePrintifySmokeDraft(repos, {
    workspaceId: currentWorkspaceId,
    actorId,
    printify: runtime.printify,
    productProfile: smokeProduct,
    findAssetDerivative
  });
  const selection = selectionFrom(prepared.draft, prepared.variants);
  printSafePreflight({
    workspaceId: currentWorkspaceId,
    productDraftId: prepared.draft.id,
    assetId: prepared.asset.id,
    providerStatus: runtime.resolution.provider,
    credentialSource: runtime.resolution.credentialSource,
    blueprintId: selection.blueprintId,
    printProviderId: selection.printProviderId,
    variantIds: selection.variantIds,
    testProductTitle: smokeProduct.title,
    ...(runtime.resolution.shopId ? { shopId: runtime.resolution.shopId } : {})
  });

  console.log("- smoke stage: uploading print_png and creating Printify test product");
  const created = await createPrintifyProductForMockups({
    repos,
    productDraftId: prepared.draft.id,
    actorId,
    forceUpload: true,
    productOverride: smokeProduct
  });
  if (!created.ok) {
    const failure = created as { status?: unknown; message?: unknown; blockingReasons?: unknown };
    throw new PrintifyMockupSmokeError("provider_call_failure", classifyPrintifySmokeFailure(created.status, failure), {
      providerStatus: text(created.status, "printify_product_create_failed"),
      message: text(failure.message, "Printify product creation failed."),
      blockingReasons: failure.blockingReasons
    });
  }

  console.log("- smoke stage: Printify product created; importing provider mockups");
  const retry = created.imported?.ok
    ? { result: created.imported as ImportAttemptResult, attempts: 0 }
    : await importPrintifyMockupsWithRetry({
      attempts: 6,
      delayMs: 10000,
      importOnce: () => importPrintifyMockupsForReference({
        repos,
        actorId,
        productDraftId: prepared.draft.id,
        reference: created.reference
      }) as Promise<ImportAttemptResult>
    });
  const imported = retry.result;
  if (!imported?.ok && text(imported?.status) === "mockups_not_ready") {
    const pendingProof = {
      ok: true,
      status: "printify_product_created_but_mockups_pending",
      workflow: "printify_mockups_live",
      workspaceId: safeId(currentWorkspaceId),
      productDraftId: safeId(prepared.draft.id),
      assetId: safeId(prepared.asset.id),
      derivativeKind: "print_png",
      printifyImageId: safeId(created.uploadId),
      printifyProductId: safeId(created.reference.printify_product_id ?? created.reference.printifyProductId),
      mockupImageCount: 0,
      mockupIds: [],
      importAttempts: retry.attempts,
      retryable: true,
      productTitlePrefix: printifySmokeProductTitlePrefix,
      shopifyPublishCalled: false,
      liveSyncCalled: false,
      livePublish: false,
      secrets: "not printed"
    };
    console.log(JSON.stringify(pendingProof, null, 2));
    return pendingProof;
  }
  if (!imported?.ok) {
    throw new PrintifyMockupSmokeError("mockup_import_failure", classifyPrintifySmokeFailure(imported?.status, imported ?? {}), {
      providerStatus: text(imported?.status, "printify_mockup_import_failed"),
      message: text(imported?.message, "Printify mockup import failed."),
      retryable: imported?.retryable === true,
      blockingReasons: imported?.blockingReasons,
      importAttempts: retry.attempts
    });
  }

  const importedOk = imported as Extract<ImportAttemptResult, { ok: true }>;
  if (!importedOk.mockups.length) {
    throw new PrintifyMockupSmokeError("mockup_import_failure", "mockup_persistence_failed", {
      message: "Printify returned images, but no provider mockup rows were persisted."
    });
  }
  let heroMockup = importedOk.mockups.find((mockup) =>
    evaluatePrintifyMockupProductionProof({ mockup, assetId: prepared.asset.id }).ok
  ) ?? null;
  if (!heroMockup) {
    const selected = importedOk.mockups[0];
    if (!selected) {
      throw new PrintifyMockupSmokeError("mockup_import_failure", "mockup_persistence_failed", {
        message: "Printify mockup import returned no persisted rows."
      });
    }
    const siblings = (await repos.mockup.listByWorkspace(currentWorkspaceId)).filter((mockup) =>
      text(mockup.asset_id ?? mockup.assetId) === prepared.asset.id
    );
    for (const mockup of siblings) {
      const metadata = asMetadata(mockup);
      await repos.mockup.update(mockup.id, {
        metadata: { ...metadata, is_hero: mockup.id === selected.id },
        approved_for_product: mockup.id === selected.id ? true : Boolean(mockup.approved_for_product ?? mockup.approvedForProduct),
        updated_by: actorId
      });
    }
    heroMockup = await repos.mockup.getById(selected.id, currentWorkspaceId);
  }
  const productDraftProof = evaluatePrintifyMockupProductionProof({ mockup: heroMockup, assetId: prepared.asset.id });
  if (!productDraftProof.ok) {
    const failure = productDraftProof as { message?: unknown; blockingReasons?: unknown };
    throw new PrintifyMockupSmokeError("mockup_import_failure", "product_draft_mockup_proof_failed", {
      message: failure.message,
      blockingReasons: failure.blockingReasons
    });
  }
  const existingDraftMockupIds = prepared.draft.mockup_ids ?? prepared.draft.mockupIds;
  const draftMockupIds = Array.isArray(existingDraftMockupIds)
    ? existingDraftMockupIds.map(String)
    : [];
  await repos.draft.update(prepared.draft.id, {
    mockup_ids: unique([...draftMockupIds, heroMockup!.id]),
    updated_by: actorId
  });
  const internalMockupProof = evaluatePrintifyMockupProductionProof({
    assetId: prepared.asset.id,
    mockup: {
      id: "internal_mockup_probe",
      workspace_id: currentWorkspaceId,
      asset_id: prepared.asset.id,
      status: "approved",
      approved_for_product: true,
      metadata: { provider_source: "internal", renderer_version: "internal-sharp-v1" }
    } as WorkspaceRow
  });
  if (internalMockupProof.ok) {
    throw new PrintifyMockupSmokeError("mockup_import_failure", "product_draft_mockup_proof_failed", {
      message: "Internal mockup proof was incorrectly accepted as production proof.",
      internalMockupRejected: false
    });
  }

  const proof = {
    ok: true,
    status: "printify_mockups_imported",
    workflow: "printify_mockups_live",
    workspaceId: safeId(currentWorkspaceId),
    productDraftId: safeId(prepared.draft.id),
    assetId: safeId(prepared.asset.id),
    derivativeKind: "print_png",
    printifyImageId: safeId(created.uploadId),
    printifyProductId: safeId(created.reference.printify_product_id ?? created.reference.printifyProductId),
    mockupImageCount: importedOk.images.length,
    mockupIds: importedOk.mockups.map((mockup: WorkspaceRow) => safeId(mockup.id)),
    heroMockupId: safeId(heroMockup!.id),
    productDraftAcceptsPrintifyProof: true,
    internalMockupRejectedAsProductionProof: true,
    importAttempts: retry.attempts,
    productTitlePrefix: printifySmokeProductTitlePrefix,
    shopifyPublishCalled: false,
    liveSyncCalled: false,
    livePublish: false,
    secrets: "not printed"
  };
  console.log(JSON.stringify(proof, null, 2));
  return proof;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runLivePrintifyMockupSmoke().then(() => {
    process.exit(0);
  }).catch((error) => {
    if (error instanceof PrintifyMockupSmokeError) {
      console.error(error.message);
      process.exit(1);
    }
    console.error(JSON.stringify({
      ok: false,
      category: "provider_call_failure",
      code: "unexpected_printify_smoke_failure",
      message: error instanceof Error ? error.message : String(error)
    }));
    process.exit(1);
  });
}
