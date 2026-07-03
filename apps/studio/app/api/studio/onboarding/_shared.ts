import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { buildFeatureReadiness, buildOwnerSetupCards, parseEnv, setupFieldGuides } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";
import { createSetupHelpRequest, handleSetupHelpList, workspaceId } from "../provider-connections/_shared";

const onboardingSteps = [
  { stepKey: "business_profile", label: "Business profile", route: "/studio/onboarding/business-profile", purpose: "Set the brand, business identity, goals, and owner context." },
  { stepKey: "image_generation", label: "Image generation", route: "/studio/onboarding/providers/image-generation", purpose: "Connect the image engine before generating real artwork." },
  { stepKey: "printify", label: "Printify", route: "/studio/onboarding/providers/printify", purpose: "Validate Printify and choose the shop for draft products." },
  { stepKey: "shopify", label: "Shopify", route: "/studio/onboarding/providers/shopify", purpose: "Validate Shopify Admin and choose the default collection." },
  { stepKey: "pod_batch", label: "First 15-product batch", route: "/studio/pod-batches/new", purpose: "Create the first owner-reviewed product batch." },
  { stepKey: "launch_packet", label: "Launch packet", route: "/studio/launch-packet", purpose: "Prepare export-ready materials without live publishing." },
  { stepKey: "publish_review", label: "Publish review readiness", route: "/studio/publish-review", purpose: "Review all gates before provider drafts or live publish actions." }
];

function safeJson(data: unknown) {
  return NextResponse.json(data);
}

export async function onboardingSummary(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const report = buildFeatureReadiness(parseEnv(), process.env, workspaceId);
    return safeJson({
      ok: true,
      title: "Launch Setup Concierge",
      cards: buildOwnerSetupCards(report),
      steps: onboardingSteps,
      helpWarning: "Do not paste tokens, passwords, EIN, routing numbers, or bank account details into setup help requests."
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function setupGuides(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return safeJson({ ok: true, guides: setupFieldGuides });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function onboardingFlows(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return safeJson({
      ok: true,
      flows: [
        { id: "guided_launch_setup", label: "Guided launch setup", steps: onboardingSteps },
        { id: "quick_provider_setup", label: "Quick provider setup", steps: onboardingSteps.filter((step) => ["image_generation", "printify", "shopify"].includes(step.stepKey)) }
      ]
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function startOnboardingFlow(req: Request) {
  try {
    const user = await requireWorkspaceMember(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const flowId = String(body.flowId || "guided_launch_setup");
    const repos = createRepositories();
    const event = await repos.shared.events.create({
      id: `onboarding_flow_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "onboarding_flow",
      entity_id: flowId,
      event_type: "started",
      event_label: "Onboarding flow started",
      payload: { flowId, source: "setup_concierge" },
      created_by: user.id
    });
    return safeJson({ ok: true, flowId, event, nextStep: onboardingSteps[0] });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function getOnboardingFlow(req: Request, flowId: string) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return safeJson({ ok: true, flow: { id: flowId, label: flowId === "quick_provider_setup" ? "Quick provider setup" : "Guided launch setup", steps: onboardingSteps } });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function completeOnboardingStep(req: Request, stepId: string) {
  try {
    const user = await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    const step = onboardingSteps.find((item) => item.stepKey === stepId) ?? { stepKey: stepId, label: stepId, route: "/studio/onboarding", purpose: "Custom setup step" };
    const event = await repos.shared.events.create({
      id: `onboarding_step_${stepId}_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "onboarding_step",
      entity_id: stepId,
      event_type: "completed",
      event_label: `${step.label} completed`,
      payload: { stepKey: step.stepKey, route: step.route },
      created_by: user.id
    });
    return safeJson({ ok: true, step, event });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export { createSetupHelpRequest, handleSetupHelpList };
