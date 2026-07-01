import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { getDesignSuggestion, studioWorkspaceId, toDesignSuggestion } from "../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, studioWorkspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const row = await getDesignSuggestion(repos, id, studioWorkspaceId);
    if (!row) return notFoundApiResponse();
    const updated = await repos.phrase.update(id, {
      status: "approved",
      approved_for_design: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "approved", suggestion: toDesignSuggestion(updated) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
