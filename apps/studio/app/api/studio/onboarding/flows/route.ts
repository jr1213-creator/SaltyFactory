import { onboardingFlows } from "../_shared";

export async function GET(req: Request) {
  return onboardingFlows(req);
}
