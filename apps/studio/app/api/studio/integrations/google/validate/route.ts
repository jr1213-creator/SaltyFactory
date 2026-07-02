import { validateGoogleConfigRoute } from "../../../_v1";

export async function POST(req: Request) {
  return validateGoogleConfigRoute(req);
}

