import { setupGuides } from "../_shared";

export async function GET(req: Request) {
  return setupGuides(req);
}
