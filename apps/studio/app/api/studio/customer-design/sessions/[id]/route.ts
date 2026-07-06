import { getOwnerCustomerDesignSession } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getOwnerCustomerDesignSession(req, id);
}
