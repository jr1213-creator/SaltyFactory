import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { buildFeatureReadiness, parseEnv } from "@saltyfactory/config";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const readiness = buildFeatureReadiness(parseEnv(), process.env, workspaceId);
    return NextResponse.json(readiness);
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
