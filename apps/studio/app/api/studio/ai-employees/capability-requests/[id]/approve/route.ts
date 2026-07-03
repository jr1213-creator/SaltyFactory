import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";
import { workspaceId } from "../../../improvements/_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await context.params;
    const repos = createRepositories();
    const request = await repos.aiWorkforce.capabilityRequests.getById(id, workspaceId);
    if (!request) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const updated = await repos.aiWorkforce.capabilityRequests.update(id, { status: "approved", updated_by: user.id } as any);
    return NextResponse.json({ ok: true, status: "approved", request: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
