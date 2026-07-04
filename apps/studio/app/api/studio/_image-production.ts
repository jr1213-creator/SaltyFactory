import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { createStorageProvider, resolveStorageRuntimeConfig } from "@saltyfactory/storage";
import sharp from "sharp";

export const generatedDerivativeKinds = ["thumbnail", "web_preview", "print_png"] as const;
export type GeneratedDerivativeKind = typeof generatedDerivativeKinds[number];

export function safeImageSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

export function isGeneratedDerivativeAsset(asset: Record<string, unknown> | null | undefined) {
  const type = String(asset?.asset_type ?? asset?.assetType ?? "");
  const metadata = metadataOf(asset);
  return generatedDerivativeKinds.includes(type as GeneratedDerivativeKind)
    || generatedDerivativeKinds.includes(String(metadata.derivative_kind ?? metadata.derivativeKind ?? "") as GeneratedDerivativeKind)
    || metadata.derivative_package === true
    || metadata.derivativePackage === true;
}

export function isSourceArtworkAsset(asset: Record<string, unknown> | null | undefined) {
  return Boolean(asset) && !isGeneratedDerivativeAsset(asset);
}

export function metadataOf(asset: Record<string, unknown> | null | undefined) {
  const value = asset?.metadata;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function derivativeKindOf(asset: Record<string, unknown> | null | undefined): GeneratedDerivativeKind | "" {
  const type = String(asset?.asset_type ?? asset?.assetType ?? "");
  if (generatedDerivativeKinds.includes(type as GeneratedDerivativeKind)) return type as GeneratedDerivativeKind;
  const kind = String(metadataOf(asset).derivative_kind ?? metadataOf(asset).derivativeKind ?? "");
  return generatedDerivativeKinds.includes(kind as GeneratedDerivativeKind) ? kind as GeneratedDerivativeKind : "";
}

export async function findAssetDerivative(
  repos: RepositoryBundle,
  workspaceId: string,
  sourceAssetId: string,
  kind: GeneratedDerivativeKind
) {
  const rows = await repos.asset.listByWorkspace(workspaceId);
  return rows.find((row) => {
    const metadata = metadataOf(row);
    const parent = String(metadata.source_asset_id ?? metadata.sourceAssetId ?? metadata.parent_asset_id ?? metadata.parentAssetId ?? "");
    return parent === sourceAssetId && derivativeKindOf(row) === kind;
  }) ?? null;
}

export async function listAssetDerivatives(
  repos: RepositoryBundle,
  workspaceId: string,
  sourceAssetId: string
) {
  const rows = await repos.asset.listByWorkspace(workspaceId);
  return rows.filter((row) => {
    const metadata = metadataOf(row);
    const parent = String(metadata.source_asset_id ?? metadata.sourceAssetId ?? metadata.parent_asset_id ?? metadata.parentAssetId ?? "");
    return parent === sourceAssetId && Boolean(derivativeKindOf(row));
  });
}

export function extensionForContentType(contentType: string) {
  if (/jpe?g/i.test(contentType)) return "jpg";
  if (/webp/i.test(contentType)) return "webp";
  return "png";
}

export function contentTypeForExtension(extension: string) {
  if (/^jpe?g$/i.test(extension)) return "image/jpeg";
  if (/^webp$/i.test(extension)) return "image/webp";
  return "image/png";
}

function isProduction() {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

export function resolvePrintTargetDimensions(printTarget = "apparel_front_square") {
  const targets: Record<string, { width: number; height: number }> = {
    apparel_front_square: { width: 4500, height: 4500 },
    apparel_front_vertical: { width: 4500, height: 5400 },
    sticker_square: { width: 3000, height: 3000 },
    mug_wrap: { width: 5400, height: 2400 },
    tote_front: { width: 4200, height: 4800 },
    generic_square: { width: 3000, height: 3000 }
  };
  return targets[printTarget] ?? targets.generic_square!;
}

async function writeLocalPrivateAsset(workspaceId: string, storageKey: string, buffer: Buffer) {
  const root = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeImageSegment(workspaceId));
  await mkdir(root, { recursive: true });
  await writeFile(path.resolve(root, path.basename(storageKey)), buffer);
}

export async function storePrivateImageBuffer(input: {
  workspaceId: string;
  buffer: Buffer;
  storageKey: string;
  contentType: string;
  config: ReturnType<typeof parseEnv>;
  forceLocal?: boolean;
  allowLocalFallback?: boolean;
}) {
  const storageConfig = resolveStorageRuntimeConfig(input.config);
  if (!input.forceLocal && storageConfig.SUPABASE_URL && storageConfig.SUPABASE_SERVICE_ROLE_KEY) {
    const uploaded = await createStorageProvider(input.config).uploadPrivateAsset(input.storageKey, input.buffer, input.contentType);
    if (!uploaded.ok) {
      return { ok: false as const, status: uploaded.error, blockingReasons: ["private_storage_upload_failed"] };
    }
    return { ok: true as const, storageBucket: storageConfig.SUPABASE_PRIVATE_ASSETS_BUCKET, storageKey: input.storageKey };
  }

  if (isProduction() || !input.allowLocalFallback) {
    return { ok: false as const, status: "private_storage_not_configured", blockingReasons: ["private_storage_not_configured"] };
  }

  await writeLocalPrivateAsset(input.workspaceId, input.storageKey, input.buffer);
  return { ok: true as const, storageBucket: "local-dev-private-assets", storageKey: input.storageKey };
}

export async function createDesignAssetFromBuffer(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  id: string;
  buffer: Buffer;
  storageBucket: string;
  storageKey: string;
  contentType: string;
  jobId: string;
  briefId: string;
  assetType: string;
  generator: string;
  model: string;
  actorId: string;
  qaStatus?: string;
  approvedForMockup?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  const metadata = await sharp(input.buffer, { failOn: "warning" }).metadata();
  const contentType = input.contentType.startsWith("image/") ? input.contentType : `image/${metadata.format ?? "png"}`;
  const extension = extensionForContentType(contentType);
  const checksum = crypto.createHash("sha256").update(input.buffer).digest("hex");
  const row: WorkspaceRow = {
    id: input.id,
    workspace_id: input.workspaceId,
    job_id: input.jobId,
    brief_id: input.briefId,
    asset_type: input.assetType,
    storage_bucket: input.storageBucket,
    file_path: input.storageKey,
    file_size_bytes: input.buffer.byteLength,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    dpi: metadata.density ?? 300,
    transparent_background: Boolean(metadata.hasAlpha),
    generator: input.generator,
    model: input.model,
    qa_status: input.qaStatus ?? "pending",
    risk_status: "pending",
    approved_for_mockup: input.approvedForMockup ?? false,
    checksum,
    mime_type: contentType,
    extension,
    visibility: "private",
    notes: input.notes,
    metadata: input.metadata ?? {},
    created_by: input.actorId,
    updated_by: input.actorId
  };
  const existing = await input.repos.asset.getById(input.id, input.workspaceId);
  return existing ? input.repos.asset.update(input.id, row) : input.repos.asset.create(row);
}

export async function createAssetDerivatives(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  sourceAsset: WorkspaceRow;
  imageBytes: Buffer;
  actorId: string;
  config: ReturnType<typeof parseEnv>;
  printTarget?: string;
  forceLocal?: boolean;
}) {
  const sourceMetadata = await sharp(input.imageBytes, { failOn: "warning" }).metadata();
  const sourceId = String(input.sourceAsset.id);
  const briefId = String(input.sourceAsset.brief_id ?? input.sourceAsset.briefId ?? "");
  const jobId = String(input.sourceAsset.job_id ?? input.sourceAsset.jobId ?? "");
  const generator = String(input.sourceAsset.generator ?? "image_provider");
  const model = String(input.sourceAsset.model ?? "unknown");
  const target = resolvePrintTargetDimensions(input.printTarget);
  const printBackground = sourceMetadata.hasAlpha
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : { r: 255, g: 255, b: 255, alpha: 1 };
  const outputs: Array<{ kind: GeneratedDerivativeKind; buffer: Buffer; contentType: string; extension: string; notes: string; metadata: Record<string, unknown> }> = [
    {
      kind: "thumbnail",
      buffer: await sharp(input.imageBytes, { failOn: "warning" })
        .autoOrient()
        .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: false })
        .webp({ quality: 82 })
        .toBuffer(),
      contentType: "image/webp",
      extension: "webp",
      notes: "Private 400px thumbnail derivative for Studio previews.",
      metadata: { max_width: 400, max_height: 400 }
    },
    {
      kind: "web_preview",
      buffer: await sharp(input.imageBytes, { failOn: "warning" })
        .autoOrient()
        .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: false })
        .webp({ quality: 88 })
        .toBuffer(),
      contentType: "image/webp",
      extension: "webp",
      notes: "Private web-optimized preview derivative for owner review.",
      metadata: { max_width: 1400, max_height: 1400 }
    },
    {
      kind: "print_png",
      buffer: await sharp(input.imageBytes, { failOn: "warning" })
        .autoOrient()
        .resize({ width: target.width, height: target.height, fit: "contain", background: printBackground })
        .png({ compressionLevel: 9 })
        .toBuffer(),
      contentType: "image/png",
      extension: "png",
      notes: sourceMetadata.hasAlpha
        ? "Private print-ready PNG derivative with alpha preserved."
        : "Private plain-background print PNG derivative. The model output did not include true transparency.",
      metadata: { print_target: input.printTarget ?? "apparel_front_square", target_width: target.width, target_height: target.height, alpha_source_available: Boolean(sourceMetadata.hasAlpha) }
    }
  ];

  const created: WorkspaceRow[] = [];
  for (const output of outputs) {
    const storageKey = `workspaces/${safeImageSegment(input.workspaceId)}/private/assets/${sourceId}-${output.kind}.${output.extension}`;
    const storeInput: Parameters<typeof storePrivateImageBuffer>[0] = {
      workspaceId: input.workspaceId,
      buffer: output.buffer,
      storageKey,
      contentType: output.contentType,
      config: input.config,
      allowLocalFallback: input.forceLocal === true
    };
    if (input.forceLocal !== undefined) storeInput.forceLocal = input.forceLocal;
    const stored = await storePrivateImageBuffer(storeInput);
    if (!stored.ok) throw Object.assign(new Error(stored.status), { blockingReasons: stored.blockingReasons });
    const derivative = await createDesignAssetFromBuffer({
      repos: input.repos,
      workspaceId: input.workspaceId,
      id: `${sourceId}_${output.kind}`,
      buffer: output.buffer,
      storageBucket: stored.storageBucket,
      storageKey: stored.storageKey,
      contentType: output.contentType,
      jobId,
      briefId,
      assetType: output.kind,
      generator,
      model,
      actorId: input.actorId,
      qaStatus: "passed",
      approvedForMockup: false,
      notes: output.notes,
      metadata: {
        derivative_package: true,
        derivative_kind: output.kind,
        source_asset_id: sourceId,
        parent_asset_id: sourceId,
        immutable_master: false,
        ...output.metadata
      }
    });
    created.push(derivative);
  }
  return created;
}
