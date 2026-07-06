import { runUnifiedPolicyIpCheck } from "@saltyfactory/ai-free";
import { executeAgentCorePost } from "../../_shared";

export const runtime = "nodejs";

export function POST(req: Request) {
  return executeAgentCorePost(req, (input) => runUnifiedPolicyIpCheck(input));
}
