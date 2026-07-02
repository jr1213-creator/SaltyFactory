import { createCrmRecord, listCrmRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "appointmentTypes", "scheduling");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "appointmentTypes", "scheduling", ["name"]);
}
