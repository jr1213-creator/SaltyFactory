import { calculatePricingRoute } from "../../_v1";

export async function POST(req: Request) {
  return calculatePricingRoute(req);
}

