import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import {
  generateHuggingFaceImage,
  publicImageGenerationProviderResolution,
  resolveImageGenerationProvider,
  type ImageGenerationProviderResolution
} from "@saltyfactory/ai-free";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { buildPromptPackageFromBrief } from "@saltyfactory/image-pipeline";
import { checkStorageReadiness, createStorageProvider, resolveStorageRuntimeConfig } from "@saltyfactory/storage";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { studioWorkspaceId } from "../../../design-suggestions/_shared";

export const runtime = "nodejs";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

function isProduction() {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

async function writeLocalDevImage(workspaceId: string, assetId: string) {
  const sharp = (await import("sharp")).default;
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="3000">
    <rect width="3000" height="3000" fill="#f6fbfb"/>
    <rect x="220" y="220" width="2560" height="2560" rx="120" fill="#0f766e" opacity="0.16"/>
    <text x="1500" y="1350" text-anchor="middle" font-family="Arial" font-size="180" fill="#0f172a">LOCAL DEV TEST IMAGE</text>
    <text x="1500" y="1600" text-anchor="middle" font-family="Arial" font-size="96" fill="#0f766e">Not production art</text>
  </svg>`);
  const buffer = await sharp(svg).png().toBuffer();
  const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId));
  await mkdir(localRoot, { recursive: true });
  const filePath = path.resolve(localRoot, `${assetId}.png`);
  await writeFile(filePath, buffer);
  return { buffer, storageKey: `workspaces/${safeSegment(workspaceId)}/private/assets/${assetId}.png` };
}

async function storeGeneratedImage(input: { buffer: Buffer; storageKey: string; providerKey: "local_dev_mock" | "huggingface"; config: ReturnType<typeof parseEnv> }) {
  const storageConfig = resolveStorageRuntimeConfig(input.config);
  if (storageConfig.SUPABASE_URL && storageConfig.SUPABASE_SERVICE_ROLE_KEY && input.providerKey !== "local_dev_mock") {
    const uploaded = await createStorageProvider(input.config).uploadPrivateAsset(input.storageKey, input.buffer, "image/png");
    if (!uploaded.ok) {
      return { ok: false as const, status: uploaded.error, blockingReasons: ["private_storage_upload_failed"] };
    }
    return { ok: true as const, storageBucket: storageConfig.SUPABASE_PRIVATE_ASSETS_BUCKET, storageKey: input.storageKey };
  }

  if (isProduction() || input.providerKey !== "local_dev_mock") {
    return { ok: false as const, status: "not_configured", blockingReasons: ["private_storage_not_configured"] };
  }

  const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(studioWorkspaceId));
  await mkdir(localRoot, { recursive: true });
  await writeFile(path.resolve(localRoot, path.basename(input.storageKey)), input.buffer);
  return { ok: true as const, storageBucket: "local-dev-private-assets", storageKey: input.storageKey };
}

async function fetchHuggingFaceImage(provider: ImageGenerationProviderResolution, prompt: string, negativePrompt: string) {
  const token = provider.serverCredential?.token ?? "";
  const model = provider.model ?? "";
  const timeoutMs = Math.max(1000, Math.min(Number(process.env.IMAGE_GENERATION_TIMEOUT_MS || 60000), 120000));
  const maxBytes = Math.max(1024, Math.min(Number(process.env.IMAGE_GENERATION_MAX_OUTPUT_BYTES || 15000000), 25000000));
  const result = await generateHuggingFaceImage({
    token,
    model,
    prompt,
    negativePrompt,
    timeoutMs
  });
  if (!result.ok) {
    return {
      ok: false as const,
      status: "failed",
      error: result.status,
      message: result.safeMessage,
      setupRequired: result.setupRequired,
      retryable: result.retryable
    };
  }
  if (!result.bytes) return { ok: false as const, status: "failed", error: "unknown_provider_error", message: "Image provider returned no image bytes.", setupRequired: ["Validate image provider again"], retryable: true };
  if (result.bytes.byteLength > maxBytes) return { ok: false as const, status: "failed", error: "image_generation_output_too_large", message: "Image provider returned an output larger than SaltyFactory allows.", setupRequired: ["Use a smaller output size"], retryable: false };
  return { ok: true as const, buffer: Buffer.from(result.bytes), model };
}

function safeJob(job: any) {
  return {
    id: job.id,
    status: job.status,
    provider: job.provider,
    model: job.model,
    error: job.error ?? null,
    retryable: job.retryable ?? null,
    outputAssetId: job.output_asset_id ?? job.outputAssetId ?? null,
    startedAt: job.started_at ?? job.startedAt ?? null,
    completedAt: job.completed_at ?? job.completedAt ?? null
  };
}

function safeAsset(asset: any) {
  return {
    id: asset.id,
    status: asset.status ?? asset.qa_status ?? null,
    storageBucket: asset.storage_bucket ?? asset.storageBucket ?? null,
    filePath: asset.file_path ?? asset.filePath ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    generator: asset.generator ?? null,
    model: asset.model ?? null,
    visibility: asset.visibility ?? "private"
  };
}

async function createPrivateAssetFromBuffer(input: {
  buffer: Buffer;
  storageKey: string;
  jobId: string;
  briefId: string;
  model: string;
  generator: string;
  actorId: string;
  storageBucket: string;
}) {
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(input.buffer).metadata();
  const checksum = crypto.createHash("sha256").update(input.buffer).digest("hex");
  const repos = createRepositories();
  return repos.asset.create({
    id: `asset_${Date.now()}_${checksum.slice(0, 8)}`,
    workspace_id: studioWorkspaceId,
    job_id: input.jobId,
    brief_id: input.briefId,
    asset_type: "generated_source_art",
    storage_bucket: input.storageBucket,
    file_path: input.storageKey,
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
    mime_type: "image/png",
    extension: "png",
    visibility: "private",
    created_by: input.actorId,
    updated_by: input.actorId
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const brief = await repos.brief.getById(id, studioWorkspaceId);
    if (!brief) return notFoundApiResponse();
    if (brief.status !== "approved" || brief.approved_for_generation !== true) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Only approved design briefs can be sent to image generation.", blockingReasons: ["brief_not_approved"] }, { status: 409 });
    }
    const promptPackage = buildPromptPackageFromBrief(brief as any);
    if (promptPackage.blockers.length) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Generation blocked by prompt package safety checks.", blockingReasons: promptPackage.blockers, public_prompt_summary: promptPackage.public_prompt_summary }, { status: 409 });
    }
    const config = parseEnv();
    const provider = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos, config });
    const job = await repos.job.create({
      id: `job_${Date.now()}`,
      workspace_id: studioWorkspaceId,
      brief_id: id,
      provider: provider.provider,
      model: provider.model ?? "not_configured",
      prompt: promptPackage.positive_prompt,
      negative_prompt: promptPackage.negative_prompt,
      parameters: {
        ...promptPackage.generation_params,
        public_prompt_summary: promptPackage.public_prompt_summary,
        safety_metadata: promptPackage.safety_metadata,
        credentialSource: provider.credentialSource
      },
      status: provider.status === "ready" || provider.status === "local_demo" ? "running" : "blocked",
      error: provider.status === "ready" || provider.status === "local_demo" ? null : provider.status,
      notes: provider.blockingReasons.join(", "),
      created_by: user.id,
      updated_by: user.id,
      started_at: provider.status === "ready" || provider.status === "local_demo" ? new Date().toISOString() : null
    });
    if (provider.status !== "ready" && provider.status !== "local_demo") {
      await repos.brief.update(id, { status: "generation_blocked", updated_by: user.id });
      return NextResponse.json({
        ok: false,
        status: "setup_required",
        errorStatus: provider.status,
        safeMessage: provider.safeMessage,
        message: provider.safeMessage,
        blockingReasons: provider.blockingReasons.length ? provider.blockingReasons : provider.setupRequired,
        setupRequired: provider.setupRequired,
        setupAction: provider.setupAction,
        provider: publicImageGenerationProviderResolution(provider),
        job: safeJob(job),
        public_prompt_summary: promptPackage.public_prompt_summary
      }, { status: 503 });
    }
    if (provider.status === "local_demo") {
      const assetId = `asset_local_dev_${Date.now()}`;
      const image = await writeLocalDevImage(studioWorkspaceId, assetId);
      const asset = await createPrivateAssetFromBuffer({ buffer: image.buffer, storageKey: image.storageKey, storageBucket: "local-dev-private-assets", jobId: job.id, briefId: id, model: provider.model ?? "local-dev-fixture", generator: "local_dev_mock", actorId: user.id });
      const completed = await repos.job.markCompleted(job.id, asset.id);
      await repos.brief.update(id, { status: "generation_completed", updated_by: user.id });
      return NextResponse.json({ ok: true, status: "succeeded", safeMessage: "Local demo image generated for development/test preview only.", job: safeJob(completed), asset: safeAsset(asset), provider: publicImageGenerationProviderResolution(provider), warning: "Local dev image generation is a non-production test fixture." });
    }
    const storageReadiness = await checkStorageReadiness(config);
    if (!storageReadiness.ok) {
      const failed = await repos.job.markFailed(job.id, "private_storage_not_configured", false);
      return NextResponse.json({
        ok: false,
        status: "setup_required",
        errorStatus: "private_storage_not_configured",
        safeMessage: storageReadiness.safeMessage,
        message: storageReadiness.safeMessage,
        blockingReasons: storageReadiness.setupRequired.length ? storageReadiness.setupRequired : ["private_storage_not_configured"],
        setupRequired: storageReadiness.setupRequired.length ? storageReadiness.setupRequired : ["Configure private generated-asset storage"],
        setupAction: "/studio/onboarding/providers/image-generation#storage-readiness",
        storage: storageReadiness,
        provider: publicImageGenerationProviderResolution(provider),
        job: safeJob(failed)
      }, { status: 503 });
    }
    const hf = await fetchHuggingFaceImage(provider, promptPackage.positive_prompt, promptPackage.negative_prompt);
    if (!hf.ok) {
      const failed = await repos.job.markFailed(job.id, hf.error, hf.retryable);
      return NextResponse.json({
        ok: false,
        status: hf.error,
        safeMessage: hf.message,
        message: hf.message,
        setupRequired: hf.setupRequired,
        setupAction: provider.setupAction,
        provider: publicImageGenerationProviderResolution(provider),
        job: safeJob(failed)
      }, { status: hf.retryable ? 503 : 400 });
    }
    const assetId = `asset_hf_${Date.now()}`;
    const storageKey = `workspaces/${safeSegment(studioWorkspaceId)}/private/assets/${assetId}.png`;
    const stored = await storeGeneratedImage({ buffer: hf.buffer, storageKey, providerKey: "huggingface", config });
    if (!stored.ok) {
      const failed = await repos.job.markFailed(job.id, stored.status, false);
      return NextResponse.json({ ok: false, status: "setup_required", errorStatus: stored.status, safeMessage: "Private generated-asset storage could not store this provider output.", message: "Private generated-asset storage could not store this provider output.", blockingReasons: stored.blockingReasons, setupRequired: stored.blockingReasons, setupAction: "/studio/onboarding/providers/image-generation#storage-readiness", provider: publicImageGenerationProviderResolution(provider), job: safeJob(failed) }, { status: 503 });
    }
    const asset = await createPrivateAssetFromBuffer({ buffer: hf.buffer, storageKey: stored.storageKey, storageBucket: stored.storageBucket, jobId: job.id, briefId: id, model: hf.model, generator: "huggingface", actorId: user.id });
    const completed = await repos.job.markCompleted(job.id, asset.id);
    await repos.brief.update(id, { status: "generation_completed", updated_by: user.id });
    return NextResponse.json({ ok: true, status: "succeeded", safeMessage: "Image generation job completed and a private source-art asset was created.", job: safeJob(completed), asset: safeAsset(asset), provider: publicImageGenerationProviderResolution(provider) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
