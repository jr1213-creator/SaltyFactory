import { handlePrintifySelectShop } from "../../_shared";

export async function POST(req: Request) {
  return handlePrintifySelectShop(req);
}
