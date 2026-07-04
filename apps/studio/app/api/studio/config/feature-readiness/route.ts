import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { createRepositories } from "@saltyfactory/db";
import { applyImageGenerationRuntimeReadiness, applyStorageRuntimeReadiness, buildFeatureReadiness, parseEnv } from "@saltyfactory/config";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const config = parseEnv();
    const repos = createRepositories();
    const runtime = await resolveImageGenerationProvider({ workspaceId, repos, config });
    const storage = await checkStorageReadiness(config);
    const readiness = applyImageGenerationRuntimeReadiness(
      applyStorageRuntimeReadiness(buildFeatureReadiness(config, process.env, workspaceId), storage),
      publicImageGenerationProviderResolution(runtime)
    );
    return NextResponse.json(readiness);
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
