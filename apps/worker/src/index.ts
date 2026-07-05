import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { parseEnv } from "@saltyfactory/config";
import {
  createFreeImageProvider,
  createFreeTextProvider,
  BackgroundRemovalProviderDisabled,
  UpscaleProviderDisabled,
  createImageProviderFromResolvedImageGenerationProvider,
  resolveImageGenerationProvider,
  type ImageGenerationProviderResolution
} from "@saltyfactory/ai-free";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { defaultQaRules, inspectImageTransparency } from "@saltyfactory/image-pipeline";
import { createStorageProvider, resolveStorageRuntimeConfig, type StorageProvider } from "@saltyfactory/storage";
import { DatabaseBackedQueue } from "@saltyfactory/queue";

type WorkerQueue = Pick<DatabaseBackedQueue, "claimQueuedJob" | "markCompleted" | "markFailed">;
type ImageProvider = Pick<ReturnType<typeof createFreeImageProvider>, "enabled" | "providerId" | "generateImage" | "getJobStatus" | "isHealthy">;

type WorkerDeps = {
  repos?: RepositoryBundle;
  imageProvider?: ImageProvider;
  storage?: StorageProvider;
  actorId?: string;
};

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

function bufferFromGenerationResult(result: any) {
  const bytes = result?.data?.bytes ?? result?.data?.buffer;
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  if (ArrayBuffer.isView(bytes)) return Buffer.from(bytes.buffer);
  if (Buffer.isBuffer(bytes)) return bytes;
  return null;
}

function extensionForContentType(contentType: string) {
  if (/jpe?g/i.test(contentType)) return "jpg";
  if (/webp/i.test(contentType)) return "webp";
  return "png";
}

function resolvePrintTargetDimensions(printTarget = "apparel_front_square") {
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

async function storeWorkerDerivative(input: {
  repos: RepositoryBundle;
  storage: StorageProvider;
  sourceAsset: Record<string, any>;
  kind: "thumbnail" | "web_preview" | "print_png";
  buffer: Buffer;
  contentType: string;
  actorId: string;
}) {
  const extension = extensionForContentType(input.contentType);
  const sourceId = String(input.sourceAsset.id);
  const storageKey = `workspaces/${safeSegment(workspaceId)}/private/assets/${sourceId}-${input.kind}.${extension}`;
  const upload = await input.storage.uploadPrivateAsset(storageKey, input.buffer, input.contentType);
  let storageBucket = resolveStorageRuntimeConfig({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PRIVATE_ASSETS_BUCKET: process.env.SUPABASE_PRIVATE_ASSETS_BUCKET,
    SUPABASE_PUBLIC_ASSETS_BUCKET: process.env.SUPABASE_PUBLIC_ASSETS_BUCKET,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET
  }).SUPABASE_PRIVATE_ASSETS_BUCKET || "local-dev-private-assets";
  if (!upload.ok) {
    if (process.env.APP_ENV === "production") throw Object.assign(new Error(upload.error), { retryable: false });
    const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId));
    await mkdir(localRoot, { recursive: true });
    await writeFile(path.resolve(localRoot, path.basename(storageKey)), input.buffer);
    storageBucket = "local-dev-private-assets";
  }
  const metadata = await (await import("sharp")).default(input.buffer).metadata();
  const transparency = await inspectImageTransparency(input.buffer);
  const transparentReady = input.kind !== "print_png"
    || (transparency.hasAlpha && transparency.transparentPixelRatio >= defaultQaRules.minTransparentPixelRatio);
  const checksum = crypto.createHash("sha256").update(input.buffer).digest("hex");
  return input.repos.asset.create({
    id: `${sourceId}_${input.kind}`,
    workspace_id: workspaceId,
    job_id: input.sourceAsset.job_id ?? input.sourceAsset.jobId,
    brief_id: input.sourceAsset.brief_id ?? input.sourceAsset.briefId,
    asset_type: input.kind,
    storage_bucket: storageBucket,
    file_path: storageKey,
    file_size_bytes: input.buffer.byteLength,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    dpi: metadata.density ?? 300,
    transparent_background: transparency.hasAlpha,
    generator: input.sourceAsset.generator ?? "image_provider",
    model: input.sourceAsset.model ?? "unknown",
    qa_status: input.kind === "print_png" && !transparentReady ? "failed" : "passed",
    risk_status: "pending",
    approved_for_mockup: false,
    checksum,
    mime_type: input.contentType,
    extension,
    visibility: "private",
    notes: `Worker-created ${input.kind.replace(/_/g, " ")} derivative.`,
    created_by: input.actorId,
    updated_by: input.actorId,
    metadata: {
      derivative_package: true,
      derivative_kind: input.kind,
      source_asset_id: sourceId,
      parent_asset_id: sourceId,
      generated_by_worker: true,
      has_alpha: transparency.hasAlpha,
      transparent_pixel_ratio: transparency.transparentPixelRatio,
      near_white_opaque_pixel_ratio: transparency.nearWhiteOpaquePixelRatio,
      transparent_background_ready: transparentReady,
      background_removal_required: input.kind === "print_png" && !transparentReady
    }
  });
}

async function createWorkerAssetDerivatives(input: {
  repos: RepositoryBundle;
  storage: StorageProvider;
  sourceAsset: Record<string, any>;
  imageBytes: Buffer;
  actorId: string;
  printTarget?: string;
}) {
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(input.imageBytes).metadata();
  const target = resolvePrintTargetDimensions(input.printTarget);
  const printBackground = metadata.hasAlpha
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : { r: 255, g: 255, b: 255, alpha: 1 };
  const thumbnail = await sharp(input.imageBytes).autoOrient().resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: false }).webp({ quality: 82 }).toBuffer();
  const webPreview = await sharp(input.imageBytes).autoOrient().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: false }).webp({ quality: 88 }).toBuffer();
  const printPng = await sharp(input.imageBytes).autoOrient().resize({ width: target.width, height: target.height, fit: "contain", background: printBackground }).png({ compressionLevel: 9 }).toBuffer();
  await storeWorkerDerivative({ repos: input.repos, storage: input.storage, sourceAsset: input.sourceAsset, kind: "thumbnail", buffer: thumbnail, contentType: "image/webp", actorId: input.actorId });
  await storeWorkerDerivative({ repos: input.repos, storage: input.storage, sourceAsset: input.sourceAsset, kind: "web_preview", buffer: webPreview, contentType: "image/webp", actorId: input.actorId });
  await storeWorkerDerivative({ repos: input.repos, storage: input.storage, sourceAsset: input.sourceAsset, kind: "print_png", buffer: printPng, contentType: "image/png", actorId: input.actorId });
}

async function persistGeneratedBuffer(input: {
  repos: RepositoryBundle;
  storage: StorageProvider;
  buffer: Buffer;
  job: Record<string, any>;
  model: string;
  generator: string;
  actorId: string;
  contentType: string;
}) {
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(input.buffer).metadata();
  const checksum = crypto.createHash("sha256").update(input.buffer).digest("hex");
  const briefId = String(input.job.brief_id ?? input.job.briefId ?? input.job.payload?.briefId ?? "");
  if (!briefId) throw Object.assign(new Error("generation_job_brief_id_required"), { retryable: false });

  const assetId = `asset_worker_${Date.now()}_${checksum.slice(0, 10)}`;
  const contentType = input.contentType.startsWith("image/") ? input.contentType : `image/${metadata.format ?? "png"}`;
  const extension = extensionForContentType(contentType);
  const storageKey = `workspaces/${safeSegment(workspaceId)}/private/assets/${assetId}.${extension}`;
  const upload = await input.storage.uploadPrivateAsset(storageKey, input.buffer, contentType);
  let storageBucket = resolveStorageRuntimeConfig({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PRIVATE_ASSETS_BUCKET: process.env.SUPABASE_PRIVATE_ASSETS_BUCKET,
    SUPABASE_PUBLIC_ASSETS_BUCKET: process.env.SUPABASE_PUBLIC_ASSETS_BUCKET,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET
  }).SUPABASE_PRIVATE_ASSETS_BUCKET || "local-dev-private-assets";

  if (!upload.ok) {
    if (process.env.APP_ENV === "production") throw Object.assign(new Error(upload.error), { retryable: false });
    const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId));
    await mkdir(localRoot, { recursive: true });
    await writeFile(path.resolve(localRoot, `${assetId}.${extension}`), input.buffer);
    storageBucket = "local-dev-private-assets";
  }

  const asset = await input.repos.asset.create({
    id: assetId,
    workspace_id: workspaceId,
    job_id: input.job.id,
    brief_id: briefId,
    asset_type: "generated_source_art",
    storage_bucket: storageBucket,
    file_path: storageKey,
    file_size_bytes: input.buffer.byteLength,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    dpi: metadata.density ?? 0,
    transparent_background: Boolean(metadata.hasAlpha),
    generator: input.generator,
    model: input.model,
    qa_status: "pending",
    risk_status: "pending",
    approved_for_mockup: false,
    checksum,
    mime_type: contentType,
      extension,
    visibility: "private",
    created_by: input.actorId,
    updated_by: input.actorId,
    metadata: { generated_by_worker: true }
  });

  await createWorkerAssetDerivatives({
    repos: input.repos,
    storage: input.storage,
    sourceAsset: asset,
    imageBytes: input.buffer,
    actorId: input.actorId,
    printTarget: String(input.job.parameters?.print_target ?? input.job.parameters?.printTarget ?? "apparel_front_square")
  });

  await input.repos.qa.create({
    id: `qa_${Date.now()}`,
    workspace_id: workspaceId,
    asset_id: asset.id,
    checks: {},
    status: "pending",
    blocked_reasons: [],
    approved_for_product_draft: false,
    notes: "Pending print-file QA after worker image generation.",
    created_by: input.actorId,
    updated_by: input.actorId
  });

  return asset;
}

async function markCompleted(queue: WorkerQueue | undefined, repos: RepositoryBundle, jobId: string, outputAssetId?: string) {
  if (queue) return queue.markCompleted(jobId);
  return repos.job.markCompleted(jobId, outputAssetId);
}

async function markFailed(queue: WorkerQueue | undefined, repos: RepositoryBundle, jobId: string, error: string, retryable: boolean) {
  if (queue) return queue.markFailed(jobId, error, retryable);
  return repos.job.markFailed(jobId, error, retryable);
}

export async function runWorkerOnce(queue?: WorkerQueue, deps: WorkerDeps = {}) {
  const repos = deps.repos ?? createRepositories();
  const claimed = queue ? await queue.claimQueuedJob() : await repos.job.claimQueued();
  const job = claimed
    ? {
      ...claimed,
      type: String((claimed as any).type ?? "generation"),
      payload: ((claimed as any).payload ?? (claimed as any).parameters ?? {}) as Record<string, unknown>
    }
    : null;

  if (!job) return { ok: true, processed: 0, message: "no queued jobs" };

  const cfg = parseEnv();
  const text = createFreeTextProvider(cfg);
  let imageResolution: ImageGenerationProviderResolution | null = null;
  if (!deps.imageProvider) {
    imageResolution = await resolveImageGenerationProvider({ workspaceId, repos, config: cfg });
  }
  const image = deps.imageProvider ?? createImageProviderFromResolvedImageGenerationProvider(imageResolution!);
  const commerce = createCommerceProviders(cfg);
  const storage = deps.storage ?? createStorageProvider(cfg);
  const actorId = deps.actorId ?? String((job as any).created_by ?? (job as any).createdBy ?? "worker");

  try {
    if (job.type === "publish") {
      throw Object.assign(new Error("publish blocked without approval"), { retryable: false });
    }
    if (job.type === "background_removal") {
      const result = await new BackgroundRemovalProviderDisabled().removeBackground();
      throw Object.assign(new Error(result.ok ? "background_removal_handler_missing" : result.error), { retryable: false });
    }
    if (job.type === "upscale") {
      const result = await new UpscaleProviderDisabled().upscale();
      throw Object.assign(new Error(result.ok ? "upscale_handler_missing" : result.error), { retryable: false });
    }
    if (job.type === "generation") {
      if (!image.enabled) {
        const error = imageResolution?.status === "config_required" ? "setup_required" : imageResolution?.status ?? "provider_disabled";
        throw Object.assign(new Error(error), { retryable: false });
      }
      const result = await image.generateImage(
        String(job.payload.prompt || (job as any).prompt || ""),
        String(job.payload.negativePrompt || (job as any).negative_prompt || ""),
        (job.payload.parameters as Record<string, unknown> | undefined) ?? (job.payload as Record<string, unknown>)
      );
      if (!result.ok) {
        const rateLimited = "rateLimited" in result && result.rateLimited === true;
        throw Object.assign(new Error(result.error), { retryable: result.retryable || rateLimited });
      }
      const buffer = bufferFromGenerationResult(result);
      if (!buffer) throw Object.assign(new Error("image_provider_returned_no_bytes"), { retryable: false });
      const asset = await persistGeneratedBuffer({
        repos,
        storage,
        buffer,
        job,
        model: String(result.modelUsed ?? imageResolution?.model ?? "unknown"),
        generator: String(imageResolution?.provider ?? image.providerId ?? "image_provider"),
        actorId,
        contentType: String(result.data?.contentType ?? "image/png")
      });
      await markCompleted(queue, repos, job.id, asset.id);
      return { ok: true, processed: 1, outputAssetId: asset.id, textProvider: text.enabled, storefront: !!commerce.storefront };
    }
    throw Object.assign(new Error(`worker_job_type_unhandled:${job.type}`), { retryable: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryable = Boolean((error as any)?.retryable);
    await markFailed(queue, repos, job.id, message, retryable);
    return { ok: false, processed: 1, error: message, retryable };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const once = process.argv.includes("--once");
  const result = await runWorkerOnce();
  console.log(JSON.stringify(result));
  if (!once) {
    setInterval(() => void runWorkerOnce().then((run) => console.log(JSON.stringify(run))), 5000);
  }
}
