import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    return NextResponse.json({ ok: true, sources: await createRepositories().trend.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const source = await createRepositories().integration.createProviderConnection({
      id: String(body.id || `tsrc_${Date.now()}`),
      workspace_id: workspaceId,
      provider_type: "trend_source",
      provider_name: String(body.name || "Manual trend source"),
      enabled: true,
      status: "configured",
      configuration: {
        sourceUrl: body.source_url || body.sourceUrl || null,
        sourceType: body.source_type || body.sourceType || "manual",
        allowedUse: "inspiration_only"
      },
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "configured", source });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
