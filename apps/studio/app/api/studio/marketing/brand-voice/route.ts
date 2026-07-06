import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { listBrandVoiceProfiles } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../_auth";
import { marketingWorkspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, marketingWorkspaceId);
    return NextResponse.json({
      ok: true,
      brandVoiceProfiles: await listBrandVoiceProfiles({ repos: createRepositories(), workspaceId: marketingWorkspaceId })
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
