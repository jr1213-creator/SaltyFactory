import { compileDeterministicCoreBundle } from "@saltyfactory/ai-free";
import { executeAgentCoreBundleGet } from "../_shared";

export const runtime = "nodejs";

export function GET(req: Request) {
  return executeAgentCoreBundleGet(req, (input) => compileDeterministicCoreBundle(input));
}
