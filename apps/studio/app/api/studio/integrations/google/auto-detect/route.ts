import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { autoDetectGoogleSetup } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { workspaceId } from "../../_shared";
import { studioAuthErrorResponse } from "../../../_auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const result = await autoDetectGoogleSetup({
      repos: createRepositories(),
      workspaceId,
      actorId: user.id,
      config: parseEnv(),
      autoSave: body.auto_save !== false
    });
    return NextResponse.json(result, { status: result.ok ? 200 : result.status === "auth_required" ? 401 : 503 });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "error", provider: "google_oauth", message: sanitizeProviderError(error) }, { status: 502 });
    }
  }
}
