import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const projections = await createRepositories().draft.listApprovedForStorefront(workspaceId);
    return NextResponse.json({ ok: true, projections });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
