import {
  calculateMarginEconomics,
  compileDeterministicCoreBundle,
  createSeoGeoPdpRecommendation,
  runDeterministicReadinessCheck,
  runUnifiedPolicyIpCheck
} from "@saltyfactory/ai-free";
import { executeAgentCorePost } from "../../_shared";

export const runtime = "nodejs";

export function POST(req: Request) {
  return executeAgentCorePost(req, async (input) => {
    const readiness = await runDeterministicReadinessCheck(input);
    const margin = await calculateMarginEconomics(input);
    const policy = await runUnifiedPolicyIpCheck(input);
    const seo = await createSeoGeoPdpRecommendation(input);
    const bundle = await compileDeterministicCoreBundle(input);
    return { readiness, margin, policy, seo, bundle };
  });
}
