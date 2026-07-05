import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { createStorageProvider } from "@saltyfactory/storage";
import { computePerceptualHash, evaluateAssetQaFromMetadata, inspectImageTransparency, resolvePrintQualityRequirements } from "@saltyfactory/image-pipeline";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { findAssetDerivative, generatedDerivativeKinds, isGeneratedDerivativeAsset, metadataOf } from "../../../_image-production";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

async function hashIfLocal(asset: Record<string, unknown>) {
  const storageKey = String(asset.file_path ?? asset.filePath ?? asset.storage_key ?? asset.storageKey ?? "");
  if (!storageKey) return "";
  const localPath = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId), path.basename(storageKey));
  try {
    return await computePerceptualHash(localPath);
  } catch {
    return "";
  }
}

async function readPrivateBytes(asset: Record<string, unknown>) {
  const storageKey = String(asset.file_path ?? asset.filePath ?? asset.storage_key ?? asset.storageKey ?? "");
  if (!storageKey) return null;
  const localPath = path.resolve(process.cwd(), ".saltyfactory-private", "assets", safeSegment(workspaceId), path.basename(storageKey));
  try {
    return await readFile(localPath);
  } catch {
    // Supabase-backed assets are read through the server-side storage provider below.
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const repos = createRepositories();
    const asset = await repos.asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();
    const assetMetadata = metadataOf(asset);
    const productDraftId = String(body.productDraftId ?? body.product_draft_id ?? "");
    const draft = productDraftId ? await repos.draft.getById(productDraftId, workspaceId) : null;
    const draftMetadata = draft && typeof draft.metadata === "object" && draft.metadata ? draft.metadata as Record<string, unknown> : {};
    const variantIds = Array.isArray(draftMetadata.printify_variant_ids)
      ? draftMetadata.printify_variant_ids.map(String).filter(Boolean)
      : Array.isArray(body.variantIds)
        ? body.variantIds.map(String).filter(Boolean)
        : [];
    const printAreaInput = body.printArea && typeof body.printArea === "object"
      ? body.printArea
      : draftMetadata.printify_print_area && typeof draftMetadata.printify_print_area === "object"
        ? draftMetadata.printify_print_area
        : null;
    const printRequirements = resolvePrintQualityRequirements({
      productType: String(body.productType ?? body.product_type ?? draftMetadata.product_type ?? draft?.product_type ?? draft?.productType ?? ""),
      printTarget: String(body.printTarget ?? body.print_target ?? draftMetadata.print_target ?? assetMetadata.print_target ?? assetMetadata.printTarget ?? ""),
      blueprintId: String(body.blueprintId ?? body.blueprint_id ?? draftMetadata.printify_blueprint_id ?? ""),
      printProviderId: String(body.printProviderId ?? body.print_provider_id ?? draftMetadata.printify_print_provider_id ?? ""),
      variantIds,
      printArea: printAreaInput as any
    });
    const existingHashes = (await repos.qa.listByWorkspace(workspaceId))
      .map((row) => row.checks && typeof row.checks === "object" ? String((row.checks as any).perceptual_hash ?? "") : "")
      .filter(Boolean);
    const perceptualHash = await hashIfLocal(asset);
    const isGeneratedMaster = String(asset.asset_type ?? asset.assetType) === "generated_source_art" && !isGeneratedDerivativeAsset(asset);
    const derivatives = isGeneratedMaster
      ? await Promise.all(generatedDerivativeKinds.map(async (kind) => ({ kind, row: await findAssetDerivative(repos, workspaceId, id, kind) })))
      : [];
    const printDerivative = derivatives.find((item) => item.kind === "print_png")?.row;
    const qaSource = printDerivative ?? asset;
    const qaSourceMetadata = metadataOf(qaSource);
    const qaBytes = await readPrivateBytes(qaSource);
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
      filename: String(qaSource.original_filename ?? qaSource.originalFilename ?? qaSource.file_path ?? ""),
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
    const blockedReasons = [
      ...qaResult.blocked_reasons,
      ...(missingDerivativeKinds.length ? ["derivative_package_missing"] : [])
    ];
    const warnings = [
      ...qaResult.warnings,
      ...(isGeneratedMaster && !qaSourceHasAlpha ? ["plain_background_print_file"] : []),
      ...(assetMetadata.text_requested === true || assetMetadata.textRequested === true ? ["text_reliability_warning"] : [])
    ];
    const status = blockedReasons.length ? "failed" : qaResult.status;
    const qa = await repos.qa.create({
      id: `qa_${Date.now()}`,
      workspace_id: workspaceId,
      asset_id: id,
      checks,
      status,
      blocked_reasons: blockedReasons,
      warnings,
      evidence: { ...qaResult.evidence, printQualityRequirement: printRequirements.evidence, transparency },
      approved_for_product_draft: blockedReasons.length === 0 && qaResult.approved_for_product_draft,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id
    });
    if (printDerivative) {
      await repos.asset.update(printDerivative.id, {
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
        updated_by: user.id
      });
    }
    await repos.asset.update(id, { qa_status: status, updated_by: user.id });
    return NextResponse.json({ ok: true, status, qa });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
