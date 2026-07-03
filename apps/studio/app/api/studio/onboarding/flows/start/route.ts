import { startOnboardingFlow } from "../../_shared";

export async function POST(req: Request) {
  return startOnboardingFlow(req);
}
