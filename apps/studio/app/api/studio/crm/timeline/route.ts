import { createCrmRecord, listCrmRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "timelineEvents", "timeline");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "timelineEvents", "timeline", ["event_type", "title"]);
}
