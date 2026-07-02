import { createCrmRecord, listCrmRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "events", "intelligence");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "events", "intelligence", ["event_type", "event_name"]);
}
