import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../_auth";
import { getDesignSuggestion, studioWorkspaceId, toDesignSuggestion } from "../_shared";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const { id } = await params;
    const row = await getDesignSuggestion(createRepositories(), id, studioWorkspaceId);
    if (!row) return notFoundApiResponse();
    return NextResponse.json({ ok: true, suggestion: toDesignSuggestion(row) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
