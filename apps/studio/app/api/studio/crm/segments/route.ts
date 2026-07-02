import { createCrmRecord, listCrmRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "customerCohorts", "segments");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "customerCohorts", "segments", ["name"]);
}
