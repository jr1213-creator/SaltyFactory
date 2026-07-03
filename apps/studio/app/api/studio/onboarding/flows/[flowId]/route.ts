import { getOnboardingFlow } from "../../_shared";

export async function GET(req: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  return getOnboardingFlow(req, flowId);
}
