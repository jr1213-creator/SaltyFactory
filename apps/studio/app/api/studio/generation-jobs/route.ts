import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";
import { studioWorkspaceId } from "../design-suggestions/_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const repos = createRepositories();
    const jobs = await repos.job.listByWorkspace(studioWorkspaceId);
    const provider = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos, config: parseEnv() });
    return NextResponse.json({ ok: true, provider: publicImageGenerationProviderResolution(provider), jobs });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
