import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await params;
    const asset = await createRepositories().asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();
    const body = await req.json().catch(() => ({}));
    const rejected = await createRepositories().asset.reject(id, user.id, String(body.notes || "Rejected during manual asset review."));
    return NextResponse.json({ ok: true, status: "asset_rejected", asset: rejected });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
