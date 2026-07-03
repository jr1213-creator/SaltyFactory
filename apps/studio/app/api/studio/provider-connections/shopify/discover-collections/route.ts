import { handleShopifyDiscoverCollections } from "../../_shared";

export async function POST(req: Request) {
  return handleShopifyDiscoverCollections(req);
}
