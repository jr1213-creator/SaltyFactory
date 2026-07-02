import { createCrmRecord, listCrmRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "serviceCases", "service-cases");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "serviceCases", "service-cases", ["subject"]);
}
