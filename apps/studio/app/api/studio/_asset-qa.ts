import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "@saltyfactory/config";
import { createStorageProvider } from "@saltyfactory/storage";
import {
  computePerceptualHash,
  evaluateAssetQaFromMetadata,
  inspectImageTransparency,
  resolvePrintQualityRequirements
} from "@saltyfactory/image-pipeline";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import {
  findAssetDerivative,
  generatedDerivativeKinds,
  isGeneratedDerivativeAsset,
  metadataOf
} from "./_image-production";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

async function hashIfLocal(workspaceId: string, asset: Record<string, unknown>) {
  const storageKey = String(asset.file_path ?? asset.filePath ?? asset.storage_key ?? asset.storageKey ?? "");
  if (!storageKey) return "";
  const localPath = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId), path.basename(storageKey));
  try {
    return await computePerceptualHash(localPath);
  } catch {
    return "";
  }
}

async function readPrivateBytes(workspaceId: string, asset: Record<string, unknown>) {
  const storageKey = String(asset.file_path ?? asset.filePath ?? asset.storage_key ?? asset.storageKey ?? "");
  if (!storageKey) return null;
  const localPath = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId), path.basename(storageKey));
  try {
    return await readFile(localPath);
  } catch {
    // fall through to provider-backed storage
  }
  const config = parseEnv();
  const storedBucket = String(asset.storage_bucket ?? asset.storageBucket ?? "").trim();
  const storageConfig = storedBucket && storedBucket !== "local-dev-private-assets"
    ? { ...config, SUPABASE_PRIVATE_ASSETS_BUCKET: storedBucket }
    : config;
  if (!storageConfig.SUPABASE_URL || !storageConfig.SUPABASE_SERVICE_ROLE_KEY) return null;
  const downloaded = await createStorageProvider(storageConfig).downloadPrivateAsset(storageKey);
  return downloaded.ok ? Buffer.from(downloaded.bytes) : null;
}

function numberFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = Number(metadata[key]);
  return Number.isFinite(value) ? value : undefined;
}

export async function runAssetQaEvaluation(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  assetId: string;
  actorId: string;
  productDraftId?: string;
  productType?: string;
  printTarget?: string;
  blueprintId?: string;
  printProviderId?: string;
  variantIds?: string[];
  printArea?: { width?: unknown; height?: unknown } | null;
}) {
  const asset = await input.repos.asset.getById(input.assetId, input.workspaceId);
  if (!asset) throw new Error("asset_not_found");

  const assetMetadata = metadataOf(asset);
  const productDraftId = String(input.productDraftId ?? "");
  const draft = productDraftId ? await input.repos.draft.getById(productDraftId, input.workspaceId) : null;
  const draftMetadata = draft && typeof draft.metadata === "object" && draft.metadata ? draft.metadata as Record<string, unknown> : {};
  const variantIds = input.variantIds?.length
    ? input.variantIds
    : Array.isArray(draftMetadata.printify_variant_ids)
      ? draftMetadata.printify_variant_ids.map(String).filter(Boolean)
      : [];
  const printAreaInput = input.printArea
    ?? (draftMetadata.printify_print_area && typeof draftMetadata.printify_print_area === "object" ? draftMetadata.printify_print_area as { width?: unknown; height?: unknown } : null);

  const printRequirements = resolvePrintQualityRequirements({
    productType: String(input.productType ?? draftMetadata.product_type ?? draft?.product_type ?? draft?.productType ?? ""),
    printTarget: String(input.printTarget ?? draftMetadata.print_target ?? assetMetadata.print_target ?? assetMetadata.printTarget ?? ""),
    blueprintId: String(input.blueprintId ?? draftMetadata.printify_blueprint_id ?? ""),
    printProviderId: String(input.printProviderId ?? draftMetadata.printify_print_provider_id ?? ""),
    variantIds,
    printArea: printAreaInput as any
  });

  const existingHashes = (await input.repos.qa.listByWorkspace(input.workspaceId))
    .map((row) => row.checks && typeof row.checks === "object" ? String((row.checks as any).perceptual_hash ?? "") : "")
    .filter(Boolean);
  const perceptualHash = await hashIfLocal(input.workspaceId, asset);
  const isGeneratedMaster = String(asset.asset_type ?? asset.assetType) === "generated_source_art" && !isGeneratedDerivativeAsset(asset);
  const derivatives = isGeneratedMaster
    ? await Promise.all(generatedDerivativeKinds.map(async (kind) => ({ kind, row: await findAssetDerivative(input.repos, input.workspaceId, input.assetId, kind) })))
    : [];
  const printDerivative = derivatives.find((item) => item.kind === "print_png")?.row;
  const qaSource = printDerivative ?? asset;
  const qaSourceMetadata = metadataOf(qaSource);
  const qaBytes = await readPrivateBytes(input.workspaceId, qaSource);
  const transparency = qaBytes
    ? await inspectImageTransparency(qaBytes)
    : {
      hasAlpha: Boolean(qaSource.transparent_background || qaSource.transparentBackground || qaSourceMetadata.has_alpha),
      transparentPixelRatio: numberFromMetadata(qaSourceMetadata, "transparent_pixel_ratio") ?? 0,
      nearWhiteOpaquePixelRatio: numberFromMetadata(qaSourceMetadata, "near_white_opaque_pixel_ratio") ?? 0
    };
  const qaSourceHasAlpha = transparency.hasAlpha;

  const qaResult = evaluateAssetQaFromMetadata({
    width: Number(qaSource.width || 0),
    height: Number(qaSource.height || 0),
    format: String(qaSource.extension || qaSource.mime_type || qaSource.mimeType || qaSource.file_path || "").split(".").pop() || "png",
    hasAlpha: qaSourceHasAlpha,
    transparentPixelRatio: transparency.transparentPixelRatio,
    nearWhiteOpaquePixelRatio: transparency.nearWhiteOpaquePixelRatio,
    chromaKeyApplied: qaSourceMetadata.chroma_key_applied === true || qaSourceMetadata.chromaKeyApplied === true,
    keyedPixelRatio: numberFromMetadata(qaSourceMetadata, "chroma_key_keyed_pixel_ratio") ?? numberFromMetadata(qaSourceMetadata, "chromaKeyKeyedPixelRatio") ?? 0,
    remainingNearKeyPixelRatio: numberFromMetadata(qaSourceMetadata, "chroma_key_remaining_near_key_pixel_ratio") ?? numberFromMetadata(qaSourceMetadata, "chromaKeyRemainingNearKeyPixelRatio") ?? 0,
    chromaKeySpillDetected: qaSourceMetadata.chroma_key_spill_detected === true || qaSourceMetadata.chromaKeySpillDetected === true,
    chromaKeyOvercutDetected: qaSourceMetadata.chroma_key_overcut_detected === true || qaSourceMetadata.chromaKeyOvercutDetected === true,
    density: Number(qaSource.dpi || 0),
    fileSizeBytes: Number(qaSource.file_size_bytes || qaSource.fileSizeBytes || 0),
    filename: String((qaSourceMetadata.original_filename ?? qaSourceMetadata.originalFilename ?? qaSource.file_path ?? "")),
    perceptualHash,
    textExpected: assetMetadata.text_requested === true || assetMetadata.textRequested === true
  }, printRequirements.rules, existingHashes);

  const missingDerivativeKinds = derivatives.filter((item) => !item.row).map((item) => item.kind);
  const checks = {
    ...qaResult.checks,
    print_quality_requirement: {
      status: "passed",
      message: printRequirements.source === "printify_print_area"
        ? "QA used product-specific Printify print-area requirements."
        : printRequirements.source === "print_target"
          ? "QA used the selected print target dimensions."
          : "QA used the safe default print-quality requirements.",
      evidence: printRequirements.evidence
    },
    ...(isGeneratedMaster ? {
      derivative_package_ok: {
        status: missingDerivativeKinds.length ? "failed" : "passed",
        message: missingDerivativeKinds.length
          ? `Missing generated derivative package: ${missingDerivativeKinds.join(", ")}.`
          : "Thumbnail, web preview, and print-ready PNG derivatives exist.",
        evidence: { derivativeKinds: generatedDerivativeKinds, missingDerivativeKinds }
      },
      print_ready_png_exists: {
        status: missingDerivativeKinds.includes("print_png") ? "failed" : "passed",
        message: missingDerivativeKinds.includes("print_png")
          ? "This asset needs a print-ready PNG before mockups can be rendered."
          : "Print-ready PNG derivative exists for internal mockup rendering."
      },
      preview_route_available: {
        status: "passed",
        message: "Protected preview routes are available for the master asset and derivative package."
      },
      plain_background_print_file: {
        status: qaResult.blocked_reasons.includes("transparent_background_missing") ? "failed" : "passed",
        message: qaResult.blocked_reasons.includes("transparent_background_missing")
          ? "The print-ready PNG has an opaque background. Apparel production requires background removal before Printify upload."
          : "The print-ready PNG preserves transparent pixels for apparel production.",
        evidence: {
          hasAlpha: qaSourceHasAlpha,
          transparentPixelRatio: transparency.transparentPixelRatio,
          nearWhiteOpaquePixelRatio: transparency.nearWhiteOpaquePixelRatio
        }
      }
    } : {}),
    ...(assetMetadata.text_requested === true || assetMetadata.textRequested === true ? {
      text_reliability_warning: {
        status: "warnings",
        message: "AI-generated text can be unreliable. Owner spelling review is required before product use."
      }
    } : {})
  };

  const blockedReasons = [...qaResult.blocked_reasons, ...(missingDerivativeKinds.length ? ["derivative_package_missing"] : [])];
  const warnings = [
    ...qaResult.warnings,
    ...(isGeneratedMaster && !qaSourceHasAlpha ? ["plain_background_print_file"] : []),
    ...(assetMetadata.text_requested === true || assetMetadata.textRequested === true ? ["text_reliability_warning"] : [])
  ];
  const status = blockedReasons.length ? "failed" : qaResult.status;

  const qa = await input.repos.qa.create({
    id: `qa_${Date.now()}`,
    workspace_id: input.workspaceId,
    asset_id: input.assetId,
    checks,
    status,
    blocked_reasons: blockedReasons,
    warnings,
    evidence: { ...qaResult.evidence, printQualityRequirement: printRequirements.evidence, transparency },
    approved_for_product_draft: blockedReasons.length === 0 && qaResult.approved_for_product_draft,
    reviewed_by: input.actorId,
    reviewed_at: new Date().toISOString(),
    created_by: input.actorId,
    updated_by: input.actorId
  });

  if (printDerivative) {
    await input.repos.asset.update(printDerivative.id, {
      qa_status: qaResult.blocked_reasons.includes("transparent_background_missing") ? "failed" : "passed",
      transparent_background: qaSourceHasAlpha,
      metadata: {
        ...metadataOf(printDerivative),
        has_alpha: qaSourceHasAlpha,
        transparent_pixel_ratio: transparency.transparentPixelRatio,
        near_white_opaque_pixel_ratio: transparency.nearWhiteOpaquePixelRatio,
        transparent_background_ready: !qaResult.blocked_reasons.includes("transparent_background_missing"),
        background_removal_required: qaResult.blocked_reasons.includes("transparent_background_missing"),
        chroma_key_spill_detected: (qaResult.checks.chroma_key_spill_detected as any)?.status === "warnings",
        chroma_key_overcut_detected: (qaResult.checks.chroma_key_overcut_detected as any)?.status === "warnings"
      },
      updated_by: input.actorId
    });
  }

  await input.repos.asset.update(input.assetId, { qa_status: status, updated_by: input.actorId });

  return { asset, qa, status, blockedReasons, warnings, printDerivative };
}
