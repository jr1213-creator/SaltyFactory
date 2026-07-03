import { onboardingSummary } from "./_shared";

export async function GET(req: Request) {
  return onboardingSummary(req);
}
