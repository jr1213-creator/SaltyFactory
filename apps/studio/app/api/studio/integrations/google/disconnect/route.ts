import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { disconnectGoogleWorkspace } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { workspaceId } from "../../_shared";
import { studioAuthErrorResponse } from "../../../_auth";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const result = await disconnectGoogleWorkspace({ repos: createRepositories(), workspaceId, actorId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "error", provider: "google_oauth", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
