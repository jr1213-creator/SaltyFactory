import { createSocialContent, listResource } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "socialContent");
}

export async function POST(req: Request) {
  return createSocialContent(req);
}

