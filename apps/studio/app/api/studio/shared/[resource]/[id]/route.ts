import { archiveSharedRecord, getSharedRecord, updateSharedRecord } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  return getSharedRecord(req, resource, id);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  return updateSharedRecord(req, resource, id);
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  return updateSharedRecord(req, resource, id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  return archiveSharedRecord(req, resource, id);
}
