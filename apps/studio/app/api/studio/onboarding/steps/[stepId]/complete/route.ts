import { completeOnboardingStep } from "../../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ stepId: string }> }) {
  const { stepId } = await params;
  return completeOnboardingStep(req, stepId);
}
