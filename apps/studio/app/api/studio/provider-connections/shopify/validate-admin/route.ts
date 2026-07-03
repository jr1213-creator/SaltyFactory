import { handleShopifyValidateAdmin } from "../../_shared";

export async function POST(req: Request) {
  return handleShopifyValidateAdmin(req);
}
