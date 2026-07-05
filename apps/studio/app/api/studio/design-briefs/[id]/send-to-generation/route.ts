import { NextResponse } from "next/server";
import {
  generateHuggingFaceImage,
  publicImageGenerationProviderResolution,
  resolveImageGenerationProvider,
  type ImageGenerationProviderResolution
} from "@saltyfactory/ai-free";
import { parseEnv } from "@saltyfactory/config";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { buildPodPromptRecipeFromBrief } from "@saltyfactory/image-pipeline";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { studioWorkspaceId } from "../../../design-suggestions/_shared";
import {
  createAssetDerivatives,
  createDesignAssetFromBuffer,
  extensionForContentType,
  safeImageSegment,
  storePrivateImageBuffer,
  type GeneratedDerivativeKind
} from "../../../_image-production";

export const runtime = "nodejs";

type GenerationVariantSuccess = {
  asset: Record<string, any>;
  derivatives: Record<string, any>[];
  seed: number;
};

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function numberOrUndefined(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function deriveSeed(baseSeed: number | null, variantIndex: number) {
  if (typeof baseSeed === "number" && Number.isFinite(baseSeed)) return Math.trunc(baseSeed) + variantIndex;
  return Math.trunc((Date.now() % 1_000_000_000) + variantIndex);
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
    completedAt: job.completed_at ?? job.completedAt ?? null,
    parameters: {
      requestedVariantCount: job.parameters?.requested_variant_count ?? job.parameters?.requestedVariantCount ?? null,
      completedVariantCount: job.parameters?.completed_variant_count ?? job.parameters?.completedVariantCount ?? null,
      failedVariantCount: job.parameters?.failed_variant_count ?? job.parameters?.failedVariantCount ?? null,
      derivativeKinds: job.parameters?.derivative_kinds ?? job.parameters?.derivativeKinds ?? []
    }
  };
}

function safeAsset(asset: any) {
  return {
    id: asset.id,
    status: asset.status ?? asset.qa_status ?? null,
    qaStatus: asset.qa_status ?? asset.qaStatus ?? null,
    approvedForMockup: Boolean(asset.approved_for_mockup ?? asset.approvedForMockup),
    mimeType: asset.mime_type ?? asset.mimeType ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    byteSize: asset.file_size_bytes ?? asset.fileSizeBytes ?? null,
    checksum: asset.checksum ?? null,
    assetType: asset.asset_type ?? asset.assetType ?? null,
    generator: asset.generator ?? null,
    model: asset.model ?? null,
    visibility: asset.visibility ?? "private",
    createdAt: asset.created_at ?? asset.createdAt ?? null,
    previewUrl: `/api/studio/assets/${encodeURIComponent(String(asset.id))}/preview`,
    metadata: {
      variantIndex: asset.metadata?.variant_index ?? asset.metadata?.variantIndex ?? null,
      seed: asset.metadata?.seed ?? null,
      printTarget: asset.metadata?.print_target ?? asset.metadata?.printTarget ?? null,
      stylePreset: asset.metadata?.style_preset ?? asset.metadata?.stylePreset ?? null
    }
  };
}

function safeDerivative(asset: any) {
  const kind = String(asset.metadata?.derivative_kind ?? asset.metadata?.derivativeKind ?? asset.asset_type ?? asset.assetType ?? "");
  return {
    id: asset.id,
    kind,
    mimeType: asset.mime_type ?? asset.mimeType ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    byteSize: asset.file_size_bytes ?? asset.fileSizeBytes ?? null,
    checksum: asset.checksum ?? null,
    previewUrl: `/api/studio/assets/${encodeURIComponent(String(asset.metadata?.source_asset_id ?? asset.metadata?.sourceAssetId ?? ""))}/derivatives/${encodeURIComponent(kind)}/preview`
  };
}

async function createLocalDemoImage(input: { assetId: string; variantIndex: number; seed: number; prompt: string }) {
  const sharp = (await import("sharp")).default;
  const accent = ["#0f766e", "#ef675b", "#122a40", "#8b5b38"][input.variantIndex % 4] ?? "#0f766e";
  const promptSummary = input.prompt.replace(/[<>&]/g, "").slice(0, 90);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" fill="#f6ede0"/>
    <rect x="72" y="72" width="880" height="880" rx="48" fill="${accent}" opacity="0.16"/>
    <circle cx="512" cy="420" r="210" fill="${accent}" opacity="0.28"/>
    <text x="512" y="498" text-anchor="middle" font-family="Arial" font-size="62" fill="#0c1826">LOCAL DEMO ART</text>
    <text x="512" y="580" text-anchor="middle" font-family="Arial" font-size="34" fill="#122a40">Variant ${input.variantIndex + 1} / seed ${input.seed}</text>
    <text x="512" y="660" text-anchor="middle" font-family="Arial" font-size="26" fill="#5c3a27">${promptSummary}</text>
  </svg>`);
  return sharp(svg).png().toBuffer();
}

async function fetchHuggingFaceImage(
  provider: ImageGenerationProviderResolution,
  input: {
    prompt: string;
    negativePrompt: string;
    width: number;
    height: number;
    guidanceScale: number;
    numInferenceSteps: number;
    scheduler?: string | undefined;
    seed: number;
    transparentBackground?: boolean;
  }
) {
  const token = provider.serverCredential?.token ?? "";
  const model = provider.model ?? "";
  const timeoutMs = Math.max(1000, Math.min(Number(process.env.IMAGE_GENERATION_TIMEOUT_MS || 60000), 120000));
  const maxBytes = Math.max(1024, Math.min(Number(process.env.IMAGE_GENERATION_MAX_OUTPUT_BYTES || 15000000), 25000000));
  const parameters: Record<string, unknown> = {
    width: input.width,
    height: input.height,
    guidance_scale: input.guidanceScale,
    num_inference_steps: input.numInferenceSteps,
    seed: input.seed
  };
  if (input.scheduler) parameters.scheduler = input.scheduler;
  if (input.transparentBackground === true) parameters.transparent_background = true;
  const result = await generateHuggingFaceImage({
    token,
    model,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    parameters,
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
  if (!result.bytes) return { ok: false as const, status: "failed", error: "invalid_image_response", message: "Image provider returned no image bytes.", setupRequired: ["Try again or use a recommended model"], retryable: true };
  if (result.bytes.byteLength > maxBytes) return { ok: false as const, status: "failed", error: "image_generation_output_too_large", message: "Image provider returned an output larger than SaltyFactory allows.", setupRequired: ["Use a smaller output size"], retryable: false };
  return { ok: true as const, buffer: Buffer.from(result.bytes), model, contentType: result.contentType };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireProviderMutationPermission(req, studioWorkspaceId);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const repos = createRepositories();
    const brief = await repos.brief.getById(id, studioWorkspaceId);
    if (!brief) return notFoundApiResponse();
    if (brief.status !== "approved" || brief.approved_for_generation !== true) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Only approved design briefs can be sent to image generation.", blockingReasons: ["brief_not_approved"] }, { status: 409 });
    }

    const variantCount = clampInt(body.variantCount ?? body.variant_count, 4, 1, 4);
    const recipeOptions: Parameters<typeof buildPodPromptRecipeFromBrief>[1] = { variantCount };
    const requestedStylePreset = typeof body.stylePreset === "string" ? body.stylePreset : typeof body.style_preset === "string" ? body.style_preset : "";
    const requestedPrintTarget = typeof body.printTarget === "string" ? body.printTarget : typeof body.print_target === "string" ? body.print_target : "";
    const requestedWidth = numberOrUndefined(body.width);
    const requestedHeight = numberOrUndefined(body.height);
    const requestedSeed = numberOrUndefined(body.seed);
    const requestedNegativePrompt = typeof body.negativePrompt === "string" ? body.negativePrompt : typeof body.negative_prompt === "string" ? body.negative_prompt : "";
    const requestedGuidanceScale = numberOrUndefined(body.guidanceScale ?? body.guidance_scale);
    const requestedNumInferenceSteps = numberOrUndefined(body.numInferenceSteps ?? body.num_inference_steps);
    if (requestedStylePreset) recipeOptions.stylePreset = requestedStylePreset;
    if (requestedPrintTarget) recipeOptions.printTarget = requestedPrintTarget;
    if (requestedWidth !== undefined) recipeOptions.width = requestedWidth;
    if (requestedHeight !== undefined) recipeOptions.height = requestedHeight;
    recipeOptions.seed = requestedSeed ?? null;
    if (requestedNegativePrompt) recipeOptions.negativePrompt = requestedNegativePrompt;
    if (requestedGuidanceScale !== undefined) recipeOptions.guidanceScale = requestedGuidanceScale;
    if (requestedNumInferenceSteps !== undefined) recipeOptions.numInferenceSteps = requestedNumInferenceSteps;
    const recipe = buildPodPromptRecipeFromBrief(brief as any, recipeOptions);
    if (recipe.basePackage.blockers.length) {
      return NextResponse.json({
        ok: false,
        status: "blocked",
        message: "Generation blocked by prompt package safety checks.",
        blockingReasons: recipe.basePackage.blockers,
        public_prompt_summary: recipe.basePackage.public_prompt_summary
      }, { status: 409 });
    }

    const config = parseEnv();
    const provider = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos, config });
    const canRun = provider.status === "ready" || provider.status === "local_demo";
    const job = await repos.job.create({
      id: `job_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      workspace_id: studioWorkspaceId,
      brief_id: id,
      provider: provider.provider,
      model: provider.model ?? "not_configured",
      prompt: recipe.prompt,
      negative_prompt: recipe.negativePrompt,
      parameters: {
        public_prompt_summary: recipe.basePackage.public_prompt_summary,
        safety_metadata: recipe.basePackage.safety_metadata,
        safety_notes: recipe.safetyNotes,
        credential_source: provider.credentialSource,
        requested_variant_count: variantCount,
        completed_variant_count: 0,
        failed_variant_count: 0,
        width: recipe.width,
        height: recipe.height,
        guidance_scale: recipe.guidanceScale,
        num_inference_steps: recipe.numInferenceSteps,
        seed: recipe.seed,
        style_preset: recipe.stylePreset,
        print_target: recipe.printTarget,
        text_requested: recipe.textRequested,
        transparent_background_intent: recipe.basePackage.generation_params.transparentBackground,
        provider_transparent_background_requested: recipe.basePackage.generation_params.providerTransparentBackground,
        chroma_key: recipe.chromaKey
      },
      status: canRun ? "running" : "blocked",
      error: canRun ? null : provider.status,
      notes: provider.blockingReasons.join(", "),
      created_by: user.id,
      updated_by: user.id,
      started_at: canRun ? new Date().toISOString() : null
    });
    if (!canRun) {
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
        public_prompt_summary: recipe.basePackage.public_prompt_summary
      }, { status: 503 });
    }

    if (provider.status === "ready") {
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
    }

    const successes: GenerationVariantSuccess[] = [];
    const failures: Array<{ variantIndex: number; seed: number; error: string; message: string; retryable?: boolean }> = [];

    for (let variantIndex = 0; variantIndex < variantCount; variantIndex++) {
      const seed = deriveSeed(recipe.seed, variantIndex);
      try {
        const generated = provider.status === "local_demo"
          ? {
            ok: true as const,
            buffer: await createLocalDemoImage({ assetId: `asset_local_${job.id}_${variantIndex}`, variantIndex, seed, prompt: recipe.prompt }),
            model: provider.model ?? "local-dev-fixture",
            contentType: "image/png"
          }
          : await fetchHuggingFaceImage(provider, {
            prompt: recipe.prompt,
            negativePrompt: recipe.negativePrompt,
            width: recipe.width,
            height: recipe.height,
            guidanceScale: recipe.guidanceScale,
            numInferenceSteps: recipe.numInferenceSteps,
            scheduler: typeof body.scheduler === "string" ? body.scheduler : undefined,
            seed,
            transparentBackground: recipe.basePackage.generation_params.providerTransparentBackground
          });
        if (!generated.ok) {
          failures.push({ variantIndex, seed, error: generated.error, message: generated.message, retryable: generated.retryable });
          continue;
        }
        const extension = extensionForContentType(generated.contentType);
        const checksumPrefix = Math.random().toString(16).slice(2, 10);
        const assetId = `${provider.status === "local_demo" ? "asset_local_dev" : "asset_hf"}_${Date.now()}_${variantIndex}_${checksumPrefix}`;
        const storageKey = `workspaces/${safeImageSegment(studioWorkspaceId)}/private/assets/${assetId}.${extension}`;
        const stored = await storePrivateImageBuffer({
          workspaceId: studioWorkspaceId,
          buffer: generated.buffer,
          storageKey,
          contentType: generated.contentType,
          config,
          forceLocal: provider.status === "local_demo",
          allowLocalFallback: provider.status === "local_demo"
        });
        if (!stored.ok) {
          failures.push({ variantIndex, seed, error: stored.status, message: "Private generated-asset storage could not store this provider output.", retryable: false });
          continue;
        }
        const asset = await createDesignAssetFromBuffer({
          repos,
          workspaceId: studioWorkspaceId,
          id: assetId,
          buffer: generated.buffer,
          storageBucket: stored.storageBucket,
          storageKey: stored.storageKey,
          contentType: generated.contentType,
          jobId: job.id,
          briefId: id,
          assetType: "generated_source_art",
          generator: provider.status === "local_demo" ? "local_dev_mock" : "huggingface",
          model: generated.model,
          actorId: user.id,
          metadata: {
            generated_master: true,
            variant_index: variantIndex,
            seed,
            prompt: recipe.prompt,
            negative_prompt: recipe.negativePrompt,
            style_preset: recipe.stylePreset,
            print_target: recipe.printTarget,
            width: recipe.width,
            height: recipe.height,
            guidance_scale: recipe.guidanceScale,
            num_inference_steps: recipe.numInferenceSteps,
            transparent_background_intent: recipe.basePackage.generation_params.transparentBackground,
            provider_transparent_background_requested: recipe.basePackage.generation_params.providerTransparentBackground,
            chroma_key: recipe.chromaKey,
            safety_notes: recipe.safetyNotes,
            text_requested: recipe.textRequested
          }
        });
        const derivatives = await createAssetDerivatives({
          repos,
          workspaceId: studioWorkspaceId,
          sourceAsset: asset,
          imageBytes: generated.buffer,
          actorId: user.id,
          config,
          printTarget: recipe.printTarget,
          forceLocal: provider.status === "local_demo"
        });
        successes.push({ asset, derivatives, seed });
      } catch (error) {
        failures.push({
          variantIndex,
          seed,
          error: error instanceof Error ? error.message : "unknown_provider_error",
          message: "This variant could not be generated or stored safely.",
          retryable: false
        });
      }
    }

    const derivativeKinds: GeneratedDerivativeKind[] = ["thumbnail", "web_preview", "print_png"];
    if (!successes.length) {
      const failed = await repos.job.update(job.id, {
        parameters: {
          ...(job.parameters as Record<string, unknown>),
          completed_variant_count: 0,
          failed_variant_count: failures.length,
          variant_failures: failures
        },
        updated_by: user.id
      });
      const finalFailed = await repos.job.markFailed(failed.id, failures[0]?.error ?? "all_variants_failed", failures.some((failure) => failure.retryable));
      return NextResponse.json({
        ok: false,
        status: "all_variants_failed",
        safeMessage: "No image variants were generated.",
        message: "No image variants were generated.",
        blockingReasons: failures.map((failure) => failure.error),
        provider: publicImageGenerationProviderResolution(provider),
        job: safeJob(finalFailed),
        variantFailures: failures.map((failure) => ({ variantIndex: failure.variantIndex, seed: failure.seed, error: failure.error, message: failure.message }))
      }, { status: 503 });
    }

    await repos.job.update(job.id, {
      parameters: {
        ...(job.parameters as Record<string, unknown>),
        completed_variant_count: successes.length,
        failed_variant_count: failures.length,
        asset_ids: successes.map((success) => success.asset.id),
        derivative_kinds: derivativeKinds,
        variant_failures: failures
      },
      updated_by: user.id
    });
    const completed = await repos.job.markCompleted(job.id, successes[0]!.asset.id);
    await repos.brief.update(id, { status: "generation_completed", updated_by: user.id });

    const safeAssets = successes.map((success) => ({
      ...safeAsset(success.asset),
      derivatives: success.derivatives.map(safeDerivative)
    }));
    return NextResponse.json({
      ok: true,
      status: "succeeded",
      safeMessage: successes.length === variantCount
        ? "Image generation completed and private source-art variants were created."
        : "Image generation completed with partial variant failures. The successful private source-art variants are ready for review.",
      job: safeJob(completed),
      asset: safeAssets[0],
      assets: safeAssets,
      completedVariantCount: successes.length,
      failedVariantCount: failures.length,
      derivativeKinds,
      promptRecipe: {
        stylePreset: recipe.stylePreset,
        printTarget: recipe.printTarget,
        width: recipe.width,
        height: recipe.height,
        guidanceScale: recipe.guidanceScale,
        numInferenceSteps: recipe.numInferenceSteps,
        seed: recipe.seed,
        safetyNotes: recipe.safetyNotes,
        textRequested: recipe.textRequested,
        chromaKey: recipe.chromaKey
      },
      provider: publicImageGenerationProviderResolution(provider),
      ...(failures.length ? { variantFailures: failures.map((failure) => ({ variantIndex: failure.variantIndex, seed: failure.seed, error: failure.error, message: failure.message })) } : {})
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
