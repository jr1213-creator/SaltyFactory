import { NextResponse } from "next/server";
import path from "node:path";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { computePerceptualHash, evaluateAssetQaFromMetadata } from "@saltyfactory/image-pipeline";
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const asset = await repos.asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();
    const existingHashes = (await repos.qa.listByWorkspace(workspaceId))
      .map((row) => row.checks && typeof row.checks === "object" ? String((row.checks as any).perceptual_hash ?? "") : "")
      .filter(Boolean);
    const perceptualHash = await hashIfLocal(asset);
    const qaResult = evaluateAssetQaFromMetadata({
      width: Number(asset.width || 0),
      height: Number(asset.height || 0),
      format: String(asset.extension || asset.mime_type || asset.mimeType || asset.file_path || "").split(".").pop() || "png",
      hasAlpha: Boolean(asset.transparent_background || asset.transparentBackground),
      density: Number(asset.dpi || 0),
      fileSizeBytes: Number(asset.file_size_bytes || asset.fileSizeBytes || 0),
      filename: String(asset.original_filename ?? asset.originalFilename ?? asset.file_path ?? ""),
      perceptualHash
    }, undefined, existingHashes);
    const isGeneratedMaster = String(asset.asset_type ?? asset.assetType) === "generated_source_art" && !isGeneratedDerivativeAsset(asset);
    const derivatives = isGeneratedMaster
      ? await Promise.all(generatedDerivativeKinds.map(async (kind) => ({ kind, row: await findAssetDerivative(repos, workspaceId, id, kind) })))
      : [];
    const missingDerivativeKinds = derivatives.filter((item) => !item.row).map((item) => item.kind);
    const assetMetadata = metadataOf(asset);
    const checks = {
      ...qaResult.checks,
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
      evidence: qaResult.evidence,
      approved_for_product_draft: blockedReasons.length === 0 && qaResult.approved_for_product_draft,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id
    });
    await repos.asset.update(id, { qa_status: status, updated_by: user.id });
    return NextResponse.json({ ok: true, status, qa });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
