import { createSharedRecord, listSharedRecords } from "../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  return listSharedRecords(req, resource);
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  return createSharedRecord(req, resource);
}
