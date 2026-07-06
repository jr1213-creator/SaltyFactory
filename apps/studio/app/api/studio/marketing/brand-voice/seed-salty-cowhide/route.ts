import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { ensureSaltyCowhideBrandVoiceProfile } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../_auth";
import { marketingWorkspaceId, readJsonOrFormBody, safeStudioRedirect } from "../../_shared";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, marketingWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const brandVoiceProfile = await ensureSaltyCowhideBrandVoiceProfile({
      repos: createRepositories(),
      workspaceId: marketingWorkspaceId,
      actorId: user.id
    });
    const redirectUrl = safeStudioRedirect(req, body.next, String(brandVoiceProfile.id));
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, brandVoiceProfile });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
