import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../_auth";
import { parseRequestBody, workspaceId } from "../_shared";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await context.params;
    const suggestion = await createRepositories().aiWorkforce.improvementSuggestions.getById(id, workspaceId);
    if (!suggestion) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await context.params;
    const body = await parseRequestBody(req);
    const repos = createRepositories();
    const suggestion = await repos.aiWorkforce.improvementSuggestions.getById(id, workspaceId);
    if (!suggestion) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const updated = await repos.aiWorkforce.improvementSuggestions.update(id, {
      title: body.title || suggestion.title,
      summary: body.summary || suggestion.summary,
      proposed_improvement: body.proposedImprovement || body.proposed_improvement || suggestion.proposed_improvement,
      owner_notes: body.ownerNotes || body.owner_notes || suggestion.owner_notes,
      updated_by: user.id
    } as any);
    return NextResponse.json({ ok: true, status: "updated", suggestion: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
