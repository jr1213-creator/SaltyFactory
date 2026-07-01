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
    const asset = await repos.asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();
    if ((asset.qa_status ?? asset.qaStatus) !== "passed") {
      return NextResponse.json({ ok: false, status: "blocked", message: "Asset cannot be approved until QA passes.", blockingReasons: ["asset_qa_not_passed"] }, { status: 409 });
    }
    const approved = await repos.asset.approveForMockup(id, user.id);
    return NextResponse.json({ ok: true, status: "approved_private_asset", asset: approved });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
