import { getOwnerCustomerDesignSessions } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return getOwnerCustomerDesignSessions(req);
}
