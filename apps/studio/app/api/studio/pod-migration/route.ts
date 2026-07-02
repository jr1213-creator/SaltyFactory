import { createPodCandidate, listResource } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "podMigration");
}

export async function POST(req: Request) {
  return createPodCandidate(req);
}

