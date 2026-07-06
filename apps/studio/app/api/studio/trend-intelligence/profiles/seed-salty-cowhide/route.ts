import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { ensureSaltyCowhideTrendProfile } from "@saltyfactory/integrations";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const profile = await ensureSaltyCowhideTrendProfile({
      repos: createRepositories(),
      workspaceId,
      actorId: user.id
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
