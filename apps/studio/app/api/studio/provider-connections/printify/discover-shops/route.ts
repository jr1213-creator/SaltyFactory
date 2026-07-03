import { handlePrintifyDiscoverShops } from "../../_shared";

export async function POST(req: Request) {
  return handlePrintifyDiscoverShops(req);
}
