import { listResource, upsertBusinessProfile } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "businessProfileV1");
}

export async function POST(req: Request) {
  return upsertBusinessProfile(req);
}

