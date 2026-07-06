import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { runBehavioralConsultationWithPolicyReview } from "@saltyfactory/ai-free";
import { badRequest, readJsonOrFormBody, shopManagerFailureStatus, shopManagerWorkspaceId, validateBehavioralConsultationBody } from "../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../_auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const validationError = validateBehavioralConsultationBody(body);
    if (validationError) return badRequest(validationError);
    const repos = createRepositories();
    const base = {
      repos,
      workspaceId: shopManagerWorkspaceId,
      actorId: user.id,
      roleKey: "behavioral_psychology_customer_empathy",
      sourceEntityType: typeof body.sourceEntityType === "string" ? body.sourceEntityType : undefined,
      sourceEntityId: typeof body.sourceEntityId === "string" ? body.sourceEntityId : undefined,
      launchPlanId: typeof body.launchPlanId === "string" ? body.launchPlanId : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      audienceContext: typeof body.audienceContext === "string" ? body.audienceContext : undefined,
      consultationType: typeof body.consultationType === "string" ? body.consultationType : undefined
    };
    const consultation = await runBehavioralConsultationWithPolicyReview(base);
    return NextResponse.json({
      ok: true,
      consultation,
      policyReview: consultation.policyReview,
      behavioralConsultBypassedPolicyChecker: consultation.behavioralConsultBypassedPolicyChecker,
      externalMutationAttempted: false
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const message = error instanceof Error ? error.message : "behavioral_consultation_failed";
      return NextResponse.json({ ok: false, status: "failed", message }, { status: shopManagerFailureStatus(message) });
    }
  }
}
