import { updateOwnerCustomerSpecificProduct } from "../../../_shared";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateOwnerCustomerSpecificProduct(req, id, "pending_review");
}
