import { createCrmRecord, listCrmRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "tasks", "tasks");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "tasks", "tasks", ["title"]);
}
