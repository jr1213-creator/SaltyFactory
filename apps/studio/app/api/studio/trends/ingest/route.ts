import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req, workspaceId);
    const trends = await createRepositories().trend.listByWorkspace(workspaceId);
    return NextResponse.json({
      ok: true,
      route: "trends/ingest",
      auditActor: { actor_type: "human", actor_id: user.id },
      trends
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const trendId = String(body.id || `tsig_${Date.now()}`);
    const row = await createRepositories().trend.create(
      {
        id: trendId,
        workspace_id: workspaceId,
        status: "new",
        keyword: String(body.keyword || ""),
        source_id: String(body.source_id || "tsrc_manual"),
        captured_at: new Date().toISOString(),
        related_terms: Array.isArray(body.related_terms) ? body.related_terms : [],
        category: String(body.category || "fashion_pod"),
        region: String(body.region || "US"),
        confidence: Number(body.confidence || 0.5),
        allowed_use: "inspiration_only"
      },
      {
        id: `audit_${Date.now()}`,
        workspace_id: workspaceId,
        entity_type: "trend_signal",
        entity_id: trendId,
        action: "created",
        actor_type: "human",
        actor_id: user.id,
        created_at: new Date().toISOString()
      }
    );
    return NextResponse.json({ ok: true, trend: row });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
