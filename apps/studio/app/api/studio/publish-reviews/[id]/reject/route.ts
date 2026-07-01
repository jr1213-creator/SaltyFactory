import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const review = await repos.publish.getById(id, workspaceId);
    if (!review) return notFoundApiResponse();
    const body = await req.json().catch(() => ({}));
    const rejected = await repos.publish.update(id, {
      status: "rejected",
      all_gates_passed: false,
      shopify_publish_allowed: false,
      printify_sync_allowed: false,
      notes: [String(body.notes || "Rejected by owner/admin during publish review.")],
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_by: user.id
    } as any);
    return NextResponse.json({ ok: true, status: "publish_review_rejected", review: rejected });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
