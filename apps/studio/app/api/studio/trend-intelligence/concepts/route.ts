import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { listProductConceptCandidates, toSafeTrendAnalysisError } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const url = new URL(req.url);
    const profileId = url.searchParams.get("profileId") ?? "";
    if (!profileId) {
      return NextResponse.json({ ok: false, status: "blocked", errorCode: "trend_profile_missing", message: "profileId is required." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      profileId,
      conceptCandidates: await listProductConceptCandidates({
        repos: createRepositories(),
        workspaceId,
        profileId
      })
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: toSafeTrendAnalysisError(error) }, { status: 500 });
    }
  }
}
