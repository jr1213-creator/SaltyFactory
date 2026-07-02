import { archiveCrmRecord, getCrmRecord, updateCrmRecord } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getCrmRecord(req, "conversations", "inbox", id);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateCrmRecord(req, "conversations", "inbox", id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateCrmRecord(req, "conversations", "inbox", id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return archiveCrmRecord(req, "conversations", "inbox", id);
}
