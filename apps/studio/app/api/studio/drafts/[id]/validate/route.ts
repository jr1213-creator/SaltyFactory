import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../_auth";
import { validateProductDraft } from "../../_validation";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const result = await validateProductDraft({ repos: createRepositories(), workspaceId, draftId: id, actorId: user.id });
    return NextResponse.json({
      ok: result.valid,
      status: result.valid ? "validated" : "blocked",
      validation: result,
      blockingReasons: result.blockers,
      warnings: result.warnings
    }, { status: result.valid ? 200 : 409 });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
