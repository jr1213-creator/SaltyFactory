import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { createMarketingLaunchPlan, ensureSaltyCowhideBrandVoiceProfile, ensureMarketingSourceRegistry, toSafeMarketingLaunchError } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../_auth";
import { marketingWorkspaceId, readJsonOrFormBody, safeStudioRedirect } from "../../_shared";

function failureStatus(errorCode: string) {
  if (errorCode === "marketing_no_approved_source_entity") return 409;
  if (errorCode === "marketing_source_entity_not_found") return 409;
  if (errorCode === "marketing_source_entity_not_approved") return 409;
  if (errorCode === "brand_voice_profile_missing") return 409;
  return 500;
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, marketingWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const repos = createRepositories();
    await ensureMarketingSourceRegistry({ repos, workspaceId: marketingWorkspaceId, actorId: user.id });
    await ensureSaltyCowhideBrandVoiceProfile({ repos, workspaceId: marketingWorkspaceId, actorId: user.id });
    const launchPlan = await createMarketingLaunchPlan({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: user.id,
      sourceEntityType: typeof body.sourceEntityType === "string" ? body.sourceEntityType : undefined,
      sourceEntityId: typeof body.sourceEntityId === "string" ? body.sourceEntityId : undefined,
      brandVoiceProfileId: typeof body.brandVoiceProfileId === "string" ? body.brandVoiceProfileId : undefined,
      launchName: typeof body.launchName === "string" ? body.launchName : undefined,
      campaignType: typeof body.campaignType === "string" ? body.campaignType : undefined,
      spendType: typeof body.spendType === "string" ? body.spendType : undefined
    });
    const redirectUrl = safeStudioRedirect(req, body.next, launchPlan.id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, launchPlan });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const message = toSafeMarketingLaunchError(error);
      return NextResponse.json({ ok: false, status: "failed", message }, { status: failureStatus(message) });
    }
  }
}
