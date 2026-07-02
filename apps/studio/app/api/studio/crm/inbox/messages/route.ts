import { createCrmRecord, listCrmRecords } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return listCrmRecords(req, "conversationMessages", "conversation-messages");
}

export async function POST(req: Request) {
  return createCrmRecord(req, "conversationMessages", "conversation-messages", ["conversation_id", "body"]);
}
