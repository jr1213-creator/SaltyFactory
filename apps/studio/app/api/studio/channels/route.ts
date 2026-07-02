import { createChannel, listResource } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "channel");
}

export async function POST(req: Request) {
  return createChannel(req);
}

