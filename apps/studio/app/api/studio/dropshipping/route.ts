import { createDropshipCandidate, listResource } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "dropshipping");
}

export async function POST(req: Request) {
  return createDropshipCandidate(req);
}

