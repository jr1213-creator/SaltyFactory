import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";

const confirmationText = "CREATE TEST PRINTIFY PRODUCT";

type SmokeFailureCategory =
  | "setup_failure"
  | "database_failure"
  | "storage_failure"
  | "credential_resolver_failure"
  | "provider_call_failure"
  | "product_selection_failure"
  | "mockup_import_failure";

type DerivativeKind = "thumbnail" | "web_preview" | "print_png";

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

function workspaceId() {
  return process.env.STUDIO_WORKSPACE_ID || "wks_default";
}

function smokeActorId() {
  return process.env.SMOKE_USER_ID || "printify_mockup_smoke_owner";
}

function safeId(value: unknown) {
  return text(value).replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 120);
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
  const metadata = asMetadata(draft);
  const firstVariant = variants[0];
  return Boolean(
    text(metadata.printify_blueprint_id ?? metadata.printifyBlueprintId ?? firstVariant?.printify_blueprint_id ?? firstVariant?.printifyBlueprintId)
    && text(metadata.printify_print_provider_id ?? metadata.printifyPrintProviderId ?? firstVariant?.printify_print_provider_id ?? firstVariant?.printifyPrintProviderId)
    && variants.length > 0
  );
}

export async function selectPreparedPrintifySmokeDraft(repos: RepositoryBundle, input: {
  workspaceId: string;
  findAssetDerivative: (repos: RepositoryBundle, workspaceId: string, assetId: string, kind: DerivativeKind) => Promise<WorkspaceRow | null>;
}) {
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
    const printFile = await input.findAssetDerivative(repos, input.workspaceId, assetId, "print_png");
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

function printSafePreflight(input: {
  workspaceId: string;
  productDraftId: string;
  assetId: string;
  model?: string;
  providerStatus: string;
  shopId?: string;
  variantCount: number;
}) {
  console.log("Live Printify mockup smoke preflight:");
  console.log(`- database: ready`);
  console.log(`- workspace: ${safeId(input.workspaceId)}`);
  console.log(`- product draft: ${safeId(input.productDraftId)}`);
  console.log(`- source asset: ${safeId(input.assetId)}`);
  console.log(`- print file: print_png ready`);
  console.log(`- Printify provider: ${input.providerStatus}`);
  console.log(`- Printify shop: ${input.shopId ? "selected" : "missing"}`);
  console.log(`- selected variants: ${input.variantCount}`);
  if (input.model) console.log(`- model: ${input.model}`);
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
  const [{ resolvePrintifyRuntime }, { findAssetDerivative }, { createPrintifyProductForMockups, importPrintifyMockupsForReference }] = await Promise.all([
    import("../apps/studio/app/api/studio/integrations/printify/_runtime"),
    import("../apps/studio/app/api/studio/_image-production"),
    import("../apps/studio/app/api/studio/integrations/printify/_mockup-workflow")
  ]);
  const runtime = await resolvePrintifyRuntime(repos);
  if (runtime.resolution.status !== "ready") {
    throw new PrintifyMockupSmokeError("credential_resolver_failure", "printify_provider_not_ready", {
      status: runtime.resolution.status,
      setupRequired: runtime.resolution.setupRequired,
      blockingReasons: runtime.resolution.blockingReasons
    });
  }

  const prepared = await selectPreparedPrintifySmokeDraft(repos, {
    workspaceId: currentWorkspaceId,
    findAssetDerivative
  });
  printSafePreflight({
    workspaceId: currentWorkspaceId,
    productDraftId: prepared.draft.id,
    assetId: prepared.asset.id,
    providerStatus: runtime.resolution.provider,
    variantCount: prepared.variants.length,
    ...(runtime.resolution.shopId ? { shopId: runtime.resolution.shopId } : {})
  });

  const created = await createPrintifyProductForMockups({
    repos,
    productDraftId: prepared.draft.id,
    actorId
  });
  if (!created.ok) {
    const failure = created as { status?: unknown; message?: unknown; blockingReasons?: unknown };
    throw new PrintifyMockupSmokeError("provider_call_failure", text(created.status, "printify_product_create_failed"), {
      message: text(failure.message, "Printify product creation failed."),
      blockingReasons: failure.blockingReasons
    });
  }

  const imported = created.imported?.ok
    ? created.imported
    : await importPrintifyMockupsForReference({
      repos,
      actorId,
      productDraftId: prepared.draft.id,
      reference: created.reference
    });
  if (!imported.ok) {
    throw new PrintifyMockupSmokeError("mockup_import_failure", text(imported.status, "printify_mockup_import_failed"), {
      message: text(imported.message, "Printify mockup import failed."),
      retryable: imported.retryable === true,
      blockingReasons: imported.blockingReasons
    });
  }

  const proof = {
    ok: true,
    workflow: "printify_mockups_live",
    workspaceId: safeId(currentWorkspaceId),
    productDraftId: safeId(prepared.draft.id),
    assetId: safeId(prepared.asset.id),
    printifyImageId: safeId(created.uploadId),
    printifyProductId: safeId(created.reference.printify_product_id ?? created.reference.printifyProductId),
    derivativeKind: "print_png",
    mockupImageCount: imported.images.length,
    mockupIds: imported.mockups.map((mockup: WorkspaceRow) => safeId(mockup.id)),
    livePublish: false,
    secrets: "not printed"
  };
  console.log(JSON.stringify(proof, null, 2));
  return proof;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runLivePrintifyMockupSmoke().catch((error) => {
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
