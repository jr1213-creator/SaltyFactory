import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({ ok: true, assets: await createRepositories().asset.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || `asset_${Date.now()}`);
    const asset = await createRepositories().asset.create({
      id,
      workspace_id: workspaceId,
      asset_type: String(body.asset_type || "source_art"),
      storage_bucket: String(body.storage_bucket || "saltyfactory-private-assets"),
      file_path: String(body.file_path || `manual/${id}`),
      file_size_bytes: Number(body.file_size_bytes || body.fileSizeBytes || 0),
      width: Number(body.width || 0),
      height: Number(body.height || 0),
      dpi: Number(body.dpi || 0),
      transparent_background: Boolean(body.transparent_background ?? body.transparentBackground),
      generator: "manual_upload",
      model: "none",
      qa_status: "pending",
      risk_status: "pending",
      approved_for_mockup: false,
      visibility: "private",
      created_by: user.id,
      updated_by: user.id
    }, {
      id: `audit_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "design_asset",
      entity_id: id,
      action: "manual_upload_created_private_asset",
      actor_type: "human",
      actor_id: user.id,
      created_at: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, status: "private_asset_created", asset });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
