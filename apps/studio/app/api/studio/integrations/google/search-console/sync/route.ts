import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { syncGoogleSearchConsole } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { workspaceId } from "../../../_shared";
import { studioAuthErrorResponse } from "../../../../_auth";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const result = await syncGoogleSearchConsole({ repos: createRepositories(), workspaceId, actorId: user.id, config: parseEnv() });
    return NextResponse.json(result, { status: result.ok ? 200 : result.status === "auth_required" ? 401 : result.status === "access_denied" ? 403 : 503 });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "error", provider: "google_search_console", message: sanitizeProviderError(error) }, { status: 502 });
    }
  }
}
