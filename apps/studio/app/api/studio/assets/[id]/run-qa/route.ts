import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { evaluateAssetQaFromMetadata } from "@saltyfactory/image-pipeline";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const asset = await repos.asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();
    const qaResult = evaluateAssetQaFromMetadata({
      width: Number(asset.width || 0),
      height: Number(asset.height || 0),
      format: String(asset.extension || asset.mime_type || asset.mimeType || asset.file_path || "").split(".").pop() || "png",
      hasAlpha: Boolean(asset.transparent_background || asset.transparentBackground),
      density: Number(asset.dpi || 0),
      fileSizeBytes: Number(asset.file_size_bytes || asset.fileSizeBytes || 0),
      filename: String(asset.original_filename ?? asset.originalFilename ?? asset.file_path ?? "")
    });
    const qa = await repos.qa.create({
      id: `qa_${Date.now()}`,
      workspace_id: workspaceId,
      asset_id: id,
      checks: qaResult.checks,
      status: qaResult.status,
      blocked_reasons: qaResult.blocked_reasons,
      warnings: qaResult.warnings,
      evidence: qaResult.evidence,
      approved_for_product_draft: qaResult.approved_for_product_draft,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id
    });
    await repos.asset.update(id, { qa_status: qaResult.status, updated_by: user.id });
    return NextResponse.json({ ok: true, status: qaResult.status, qa });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
