import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { generateHuggingFaceImage } from "@saltyfactory/ai-free";
import { createRepositories } from "@saltyfactory/db";
import { buildPromptPackageFromBrief, resolveImageGenerationProvider } from "@saltyfactory/image-pipeline";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { studioWorkspaceId } from "../../../design-suggestions/_shared";

export const runtime = "nodejs";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

function isProduction() {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

function privateStorageConfig() {
  const url = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = process.env.SUPABASE_PRIVATE_ASSETS_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "";
  return {
    configured: Boolean(url && serviceRoleKey && bucket),
    url,
    serviceRoleKey,
    bucket
  };
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

async function storeGeneratedImage(input: { buffer: Buffer; storageKey: string; providerKey: "local_dev_mock" | "hugging_face" }) {
  const storage = privateStorageConfig();
  if (storage.configured && input.providerKey !== "local_dev_mock") {
    const supabase = createClient(storage.url, storage.serviceRoleKey, { auth: { persistSession: false } });
    const uploaded = await supabase.storage.from(storage.bucket).upload(input.storageKey, input.buffer, {
      contentType: "image/png",
      cacheControl: "private, max-age=0",
      upsert: false
    });
    if (uploaded.error) {
      return { ok: false as const, status: "storage_upload_failed", blockingReasons: ["private_storage_upload_failed"] };
    }
    return { ok: true as const, storageBucket: storage.bucket, storageKey: input.storageKey };
  }

  if (isProduction() || input.providerKey !== "local_dev_mock") {
    return { ok: false as const, status: "not_configured", blockingReasons: ["private_storage_not_configured"] };
  }

  const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(studioWorkspaceId));
  await mkdir(localRoot, { recursive: true });
  await writeFile(path.resolve(localRoot, path.basename(input.storageKey)), input.buffer);
  return { ok: true as const, storageBucket: "local-dev-private-assets", storageKey: input.storageKey };
}

async function fetchHuggingFaceImage(prompt: string, negativePrompt: string) {
  const token = process.env.HUGGING_FACE_API_TOKEN || process.env.HF_API_TOKEN || "";
  const model = process.env.HUGGING_FACE_IMAGE_MODEL || process.env.HF_IMAGE_MODEL || "";
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
    const provider = resolveImageGenerationProvider();
    const job = await repos.job.create({
      id: `job_${Date.now()}`,
      workspace_id: studioWorkspaceId,
      brief_id: id,
      provider: provider.key,
      model: provider.model,
      prompt: promptPackage.positive_prompt,
      negative_prompt: promptPackage.negative_prompt,
      parameters: {
        ...promptPackage.generation_params,
        public_prompt_summary: promptPackage.public_prompt_summary,
        safety_metadata: promptPackage.safety_metadata
      },
      status: provider.status === "ready" ? "running" : "blocked",
      error: provider.status === "ready" ? null : provider.status,
      notes: provider.blockingReasons.join(", "),
      created_by: user.id,
      updated_by: user.id,
      started_at: provider.status === "ready" ? new Date().toISOString() : null
    });
    if (provider.status !== "ready") {
      await repos.brief.update(id, { status: "generation_blocked", updated_by: user.id });
      return NextResponse.json({ ok: false, status: provider.status, message: "Image generation is not configured. Continue with manual upload.", blockingReasons: provider.blockingReasons, job, public_prompt_summary: promptPackage.public_prompt_summary }, { status: 503 });
    }
    if (provider.key === "local_dev_mock") {
      const assetId = `asset_local_dev_${Date.now()}`;
      const image = await writeLocalDevImage(studioWorkspaceId, assetId);
      const asset = await createPrivateAssetFromBuffer({ buffer: image.buffer, storageKey: image.storageKey, storageBucket: "local-dev-private-assets", jobId: job.id, briefId: id, model: provider.model, generator: "local_dev_mock", actorId: user.id });
      const completed = await repos.job.markCompleted(job.id, asset.id);
      await repos.brief.update(id, { status: "generation_completed", updated_by: user.id });
      return NextResponse.json({ ok: true, status: "succeeded", job: completed, asset, warning: "Local dev image generation is a non-production test fixture." });
    }
    if (!privateStorageConfig().configured) {
      const failed = await repos.job.markFailed(job.id, "private_storage_not_configured", false);
      return NextResponse.json({ ok: false, status: "not_configured", message: "Private generated-asset storage is not configured for this provider.", blockingReasons: ["private_storage_not_configured"], job: failed }, { status: 503 });
    }
    const hf = await fetchHuggingFaceImage(promptPackage.positive_prompt, promptPackage.negative_prompt);
    if (!hf.ok) {
      const failed = await repos.job.markFailed(job.id, hf.error, hf.retryable);
      return NextResponse.json({
        ok: false,
        status: hf.error,
        message: hf.message,
        setupRequired: hf.setupRequired,
        job: failed
      }, { status: hf.retryable ? 503 : 400 });
    }
    const assetId = `asset_hf_${Date.now()}`;
    const storageKey = `workspaces/${safeSegment(studioWorkspaceId)}/private/assets/${assetId}.png`;
    const stored = await storeGeneratedImage({ buffer: hf.buffer, storageKey, providerKey: "hugging_face" });
    if (!stored.ok) {
      const failed = await repos.job.markFailed(job.id, stored.status, false);
      return NextResponse.json({ ok: false, status: "not_configured", message: "Private generated-asset storage is not configured for this provider.", blockingReasons: stored.blockingReasons, job: failed }, { status: 503 });
    }
    const asset = await createPrivateAssetFromBuffer({ buffer: hf.buffer, storageKey: stored.storageKey, storageBucket: stored.storageBucket, jobId: job.id, briefId: id, model: hf.model, generator: "hugging_face", actorId: user.id });
    const completed = await repos.job.markCompleted(job.id, asset.id);
    await repos.brief.update(id, { status: "generation_completed", updated_by: user.id });
    return NextResponse.json({ ok: true, status: "succeeded", job: completed, asset });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
