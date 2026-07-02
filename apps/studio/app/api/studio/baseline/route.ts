import { createBaseline, listResource } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "baseline");
}

export async function POST(req: Request) {
  return createBaseline(req);
}

