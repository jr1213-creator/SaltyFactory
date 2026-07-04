import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { evaluatePublishReviewGates, fixtures } from "@saltyfactory/domain";
import { studioAuthErrorResponse } from "../../_auth";
import { studioWorkspaceId } from "../../design-suggestions/_shared";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req);
    return NextResponse.json({
      ok: true,
      route: "generate/submit",
      auditActor: { actor_type: "human", actor_id: user.id },
      gates: evaluatePublishReviewGates(fixtures.publishReviewBlocked)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireProviderMutationPermission(req);
    const repos = createRepositories();
    const provider = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos, config: parseEnv() });
    if (provider.status !== "ready" && provider.status !== "local_demo") {
      return NextResponse.json({
        ok: false,
        status: "setup_required",
        safeMessage: provider.safeMessage,
        message: provider.safeMessage,
        setupRequired: provider.setupRequired,
        blockingReasons: provider.blockingReasons,
        setupAction: provider.setupAction,
        provider: publicImageGenerationProviderResolution(provider)
      }, { status: 503 });
    }
    return NextResponse.json({
      ok: false,
      status: "approved_brief_required",
      safeMessage: "Use Send to Generation from an owner-approved design brief so prompts, audit, and private asset records stay linked.",
      setupRequired: ["Open approved briefs"],
      setupAction: "/studio/briefs",
      provider: publicImageGenerationProviderResolution(provider)
    }, { status: 409 });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
