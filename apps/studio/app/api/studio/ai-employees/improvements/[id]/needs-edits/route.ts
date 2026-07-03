import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";
import { parseRequestBody, workspaceId } from "../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await context.params;
    const body = await parseRequestBody(req);
    const repos = createRepositories();
    const suggestion = await repos.aiWorkforce.improvementSuggestions.getById(id, workspaceId);
    if (!suggestion) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const updated = await repos.aiWorkforce.improvementSuggestions.update(id, { status: "needs_edits", owner_decision: "needs_edits", owner_notes: body.note || body.notes || null, updated_by: user.id } as any);
    return NextResponse.json({ ok: true, status: "needs_edits", suggestion: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
