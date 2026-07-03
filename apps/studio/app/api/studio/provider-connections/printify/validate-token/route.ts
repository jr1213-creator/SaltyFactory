import { handlePrintifyValidateToken } from "../../_shared";

export async function POST(req: Request) {
  return handlePrintifyValidateToken(req);
}
