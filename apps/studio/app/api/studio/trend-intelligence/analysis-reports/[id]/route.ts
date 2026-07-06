import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { getTrendAnalysisReportDetail, toSafeTrendAnalysisError } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const params = await context.params;
    const detail = await getTrendAnalysisReportDetail({
      repos: createRepositories(),
      workspaceId,
      reportId: params.id
    });
    if (!detail) {
      return NextResponse.json({ ok: false, status: "not_found", message: "Trend analysis report not found." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      report: detail.report,
      clusters: detail.clusters,
      scores: detail.scores,
      conceptCandidates: detail.conceptCandidates
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: toSafeTrendAnalysisError(error) }, { status: 500 });
    }
  }
}
