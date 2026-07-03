import { handleShopifySelectCollection } from "../../_shared";

export async function POST(req: Request) {
  return handleShopifySelectCollection(req);
}
