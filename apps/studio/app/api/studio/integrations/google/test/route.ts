import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { testGoogleConnection } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { workspaceId } from "../../_shared";
import { studioAuthErrorResponse } from "../../../_auth";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const result = await testGoogleConnection({ repos: createRepositories(), workspaceId, actorId: user.id, config: parseEnv() });
    return NextResponse.json(result, { status: result.ok ? 200 : result.status === "auth_required" ? 401 : 503 });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "configured_not_verified", provider: "google_oauth", message: sanitizeProviderError(error) }, { status: 502 });
    }
  }
}
