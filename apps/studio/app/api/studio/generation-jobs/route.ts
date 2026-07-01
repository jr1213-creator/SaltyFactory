import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { resolveImageGenerationProvider } from "@saltyfactory/image-pipeline";
import { studioAuthErrorResponse } from "../_auth";
import { studioWorkspaceId } from "../design-suggestions/_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const jobs = await createRepositories().job.listByWorkspace(studioWorkspaceId);
    return NextResponse.json({ ok: true, provider: resolveImageGenerationProvider(), jobs });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
