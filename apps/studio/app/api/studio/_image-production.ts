import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import {
  createTransparentPrintPngFromChromaKey,
  defaultPodChromaKeyConfig,
  defaultQaRules,
  inspectImageTransparency,
  shouldUseChromaKeyForPrintTarget
} from "@saltyfactory/image-pipeline";
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

function numberFromMetadataValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveChromaKeyConfig(sourceAsset: WorkspaceRow, printTarget: string) {
  const sourceMetadata = metadataOf(sourceAsset);
  const raw = sourceMetadata.chroma_key && typeof sourceMetadata.chroma_key === "object"
    ? sourceMetadata.chroma_key as Record<string, unknown>
    : sourceMetadata.chromaKey && typeof sourceMetadata.chromaKey === "object"
      ? sourceMetadata.chromaKey as Record<string, unknown>
      : null;
  const transparentIntent = sourceMetadata.transparent_background_intent === true
    || sourceMetadata.transparentBackgroundIntent === true
    || raw?.enabled === true;
  if (!shouldUseChromaKeyForPrintTarget({ printTarget, transparentIntent })) return null;
  return {
    ...defaultPodChromaKeyConfig,
    ...(raw ?? {}),
    enabled: true,
    keyColor: String(raw?.keyColor ?? raw?.key_color ?? defaultPodChromaKeyConfig.keyColor),
    tolerance: numberFromMetadataValue(raw?.tolerance, defaultPodChromaKeyConfig.tolerance),
    edgeSoftness: numberFromMetadataValue(raw?.edgeSoftness ?? raw?.edge_softness, defaultPodChromaKeyConfig.edgeSoftness)
  };
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
  const sourceTransparency = await inspectImageTransparency(input.imageBytes);
  const sourceId = String(input.sourceAsset.id);
  const briefId = String(input.sourceAsset.brief_id ?? input.sourceAsset.briefId ?? "");
  const jobId = String(input.sourceAsset.job_id ?? input.sourceAsset.jobId ?? "");
  const generator = String(input.sourceAsset.generator ?? "image_provider");
  const model = String(input.sourceAsset.model ?? "unknown");
  const printTarget = input.printTarget ?? "apparel_front_square";
  const target = resolvePrintTargetDimensions(printTarget);
  const chromaKeyConfig = resolveChromaKeyConfig(input.sourceAsset, printTarget);
  const sourceAlphaReady = Boolean(sourceMetadata.hasAlpha)
    && sourceTransparency.transparentPixelRatio >= defaultQaRules.minTransparentPixelRatio;
  let printSourceBytes = input.imageBytes;
  let chromaKeyEvidence: Awaited<ReturnType<typeof createTransparentPrintPngFromChromaKey>>["evidence"] | null = null;
  let chromaKeyError = "";
  if (!sourceAlphaReady && chromaKeyConfig?.enabled) {
    try {
      const cleaned = await createTransparentPrintPngFromChromaKey(
        input.imageBytes,
        chromaKeyConfig.keyColor,
        chromaKeyConfig.tolerance,
        {
          edgeSoftness: chromaKeyConfig.edgeSoftness,
          maxKeyedPixelRatio: chromaKeyConfig.maxKeyedPixelRatio,
          maxRemainingNearKeyPixelRatio: chromaKeyConfig.maxRemainingNearKeyPixelRatio
        }
      );
      printSourceBytes = cleaned.png;
      chromaKeyEvidence = cleaned.evidence;
    } catch (error) {
      chromaKeyError = error instanceof Error ? error.message : "chroma_key_cleanup_failed";
    }
  }
  const printSourceTransparency = await inspectImageTransparency(printSourceBytes);
  const printSourceAlphaReady = printSourceTransparency.hasAlpha
    && printSourceTransparency.transparentPixelRatio >= defaultQaRules.minTransparentPixelRatio;
  const printBackground = printSourceAlphaReady
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : { r: 255, g: 255, b: 255, alpha: 1 };
  const printPngBuffer = await sharp(printSourceBytes, { failOn: "warning" })
    .autoOrient()
    .resize({ width: target.width, height: target.height, fit: "contain", background: printBackground })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const printTransparency = await inspectImageTransparency(printPngBuffer);
  const chromaKeyRequired = Boolean(chromaKeyConfig?.enabled && !sourceAlphaReady);
  const chromaKeyCleanupSucceeded = !chromaKeyRequired
    || Boolean(chromaKeyEvidence && chromaKeyEvidence.keyedPixelRatio >= defaultQaRules.minTransparentPixelRatio);
  const printTransparentReady = printTransparency.hasAlpha
    && printTransparency.transparentPixelRatio >= defaultQaRules.minTransparentPixelRatio
    && chromaKeyCleanupSucceeded;
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
      buffer: printPngBuffer,
      contentType: "image/png",
      extension: "png",
      notes: printTransparentReady
        ? "Private print-ready PNG derivative with alpha preserved."
        : "Private plain-background print PNG derivative. The model output did not include true transparency, so background removal is required before apparel production.",
      metadata: {
        print_target: printTarget,
        target_width: target.width,
        target_height: target.height,
        alpha_source_available: Boolean(sourceMetadata.hasAlpha),
        source_transparent_pixel_ratio: sourceTransparency.transparentPixelRatio,
        source_near_white_opaque_pixel_ratio: sourceTransparency.nearWhiteOpaquePixelRatio,
        has_alpha: printTransparency.hasAlpha,
        transparent_pixel_ratio: printTransparency.transparentPixelRatio,
        near_white_opaque_pixel_ratio: printTransparency.nearWhiteOpaquePixelRatio,
        transparent_background_ready: printTransparentReady,
        background_removal_required: !printTransparentReady,
        chroma_key_enabled: Boolean(chromaKeyConfig?.enabled),
        chroma_key_applied: Boolean(chromaKeyEvidence),
        chroma_key_mode: chromaKeyConfig?.mode ?? null,
        chroma_key_color: chromaKeyConfig?.keyColor ?? null,
        chroma_key_tolerance: chromaKeyConfig?.tolerance ?? null,
        chroma_key_edge_softness: chromaKeyConfig?.edgeSoftness ?? null,
        chroma_key_keyed_pixel_ratio: chromaKeyEvidence?.keyedPixelRatio ?? 0,
        chroma_key_transparent_pixel_ratio: chromaKeyEvidence?.transparentPixelRatio ?? 0,
        chroma_key_remaining_near_key_pixel_ratio: chromaKeyEvidence?.remainingNearKeyPixelRatio ?? 0,
        chroma_key_spill_detected: chromaKeyEvidence?.spillDetected ?? false,
        chroma_key_overcut_detected: chromaKeyEvidence?.overcutDetected ?? false,
        chroma_key_cleanup_failed: chromaKeyRequired && !chromaKeyCleanupSucceeded,
        chroma_key_error: chromaKeyError || null
      }
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
      qaStatus: output.kind === "print_png" && output.metadata.transparent_background_ready !== true ? "failed" : "passed",
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
