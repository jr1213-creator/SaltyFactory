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
    const mockup = await repos.mockup.getById(id, workspaceId);
    if (!mockup) return notFoundApiResponse();
    const updated = await repos.mockup.approveForProduct(id, user.id);
    return NextResponse.json({ ok: true, status: "mockup_approved_for_product", mockup: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
