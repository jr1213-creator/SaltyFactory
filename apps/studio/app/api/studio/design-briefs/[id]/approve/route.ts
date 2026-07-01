import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { buildPromptPackageFromBrief } from "@saltyfactory/image-pipeline";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { studioWorkspaceId } from "../../../design-suggestions/_shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, studioWorkspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const brief = await repos.brief.getById(id, studioWorkspaceId);
    if (!brief) return notFoundApiResponse();
    const promptPackage = buildPromptPackageFromBrief(brief as any);
    if (promptPackage.blockers.length) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Brief approval is blocked by prompt safety checks.", blockingReasons: promptPackage.blockers, public_prompt_summary: promptPackage.public_prompt_summary }, { status: 409 });
    }
    const updated = await repos.brief.update(id, {
      status: "approved",
      approved_for_generation: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      metadata: {
        ...((brief.metadata && typeof brief.metadata === "object") ? brief.metadata : {}),
        public_prompt_summary: promptPackage.public_prompt_summary,
        prompt_safety_metadata: promptPackage.safety_metadata
      },
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "approved", brief: updated, public_prompt_summary: promptPackage.public_prompt_summary, warnings: promptPackage.warnings });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
