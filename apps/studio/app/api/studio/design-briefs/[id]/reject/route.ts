import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { studioWorkspaceId } from "../../../design-suggestions/_shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, studioWorkspaceId);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const repos = createRepositories();
    const brief = await repos.brief.getById(id, studioWorkspaceId);
    if (!brief) return notFoundApiResponse();
    const updated = await repos.brief.update(id, {
      status: "rejected",
      approved_for_generation: false,
      notes: String(body.notes || "Rejected by human reviewer."),
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "rejected", brief: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
