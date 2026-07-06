import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { createManualTrendSourceBlockedResponse, listTrendSources } from "@saltyfactory/integrations";
import { studioAuthErrorResponse } from "../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req, workspaceId);
    const sources = await listTrendSources({
      repos: createRepositories(),
      workspaceId,
      actorId: user.id,
      config: parseEnv()
    });
    return NextResponse.json({ ok: true, sources });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireDraftMutationPermission(req, workspaceId);
    return NextResponse.json(createManualTrendSourceBlockedResponse(), { status: 409 });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
