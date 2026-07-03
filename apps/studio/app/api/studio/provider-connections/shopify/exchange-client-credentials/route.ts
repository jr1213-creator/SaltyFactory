import { handleShopifyValidateClientCredentials } from "../../_shared";

export async function POST(req: Request) {
  return handleShopifyValidateClientCredentials(req);
}
