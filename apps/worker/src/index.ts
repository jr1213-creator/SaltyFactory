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
import { createStorageProvider, type StorageProvider } from "@saltyfactory/storage";
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

async function persistGeneratedBuffer(input: {
  repos: RepositoryBundle;
  storage: StorageProvider;
  buffer: Buffer;
  job: Record<string, any>;
  model: string;
  generator: string;
  actorId: string;
}) {
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(input.buffer).metadata();
  const checksum = crypto.createHash("sha256").update(input.buffer).digest("hex");
  const briefId = String(input.job.brief_id ?? input.job.briefId ?? input.job.payload?.briefId ?? "");
  if (!briefId) throw Object.assign(new Error("generation_job_brief_id_required"), { retryable: false });

  const assetId = `asset_worker_${Date.now()}_${checksum.slice(0, 10)}`;
  const storageKey = `workspaces/${safeSegment(workspaceId)}/private/assets/${assetId}.png`;
  const contentType = "image/png";
  const upload = await input.storage.uploadPrivateAsset(storageKey, input.buffer, contentType);
  let storageBucket = process.env.SUPABASE_PRIVATE_ASSETS_BUCKET || "local-dev-private-assets";

  if (!upload.ok) {
    if (process.env.APP_ENV === "production") throw Object.assign(new Error(upload.error), { retryable: false });
    const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId));
    await mkdir(localRoot, { recursive: true });
    await writeFile(path.resolve(localRoot, `${assetId}.png`), input.buffer);
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
    extension: "png",
    visibility: "private",
    created_by: input.actorId,
    updated_by: input.actorId,
    metadata: { generated_by_worker: true }
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
    if (job.type === "background_removal") await new BackgroundRemovalProviderDisabled().removeBackground();
    if (job.type === "upscale") await new UpscaleProviderDisabled().upscale();
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
        actorId
      });
      await markCompleted(queue, repos, job.id, asset.id);
      return { ok: true, processed: 1, outputAssetId: asset.id, textProvider: text.enabled, storefront: !!commerce.storefront };
    }
    await markCompleted(queue, repos, job.id);
    return { ok: true, processed: 1, textProvider: text.enabled, storefront: !!commerce.storefront };
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
