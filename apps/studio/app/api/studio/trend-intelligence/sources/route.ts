import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { listTrendSources } from "@saltyfactory/integrations";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireWorkspaceMember(req, workspaceId);
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
