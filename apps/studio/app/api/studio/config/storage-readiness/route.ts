import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const diagnostic = await checkStorageReadiness(parseEnv());
    return NextResponse.json({
      ok: diagnostic.ok,
      status: diagnostic.status,
      safeMessage: diagnostic.safeMessage,
      setupRequired: diagnostic.setupRequired,
      environment: diagnostic.environment,
      checks: diagnostic.checks
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
