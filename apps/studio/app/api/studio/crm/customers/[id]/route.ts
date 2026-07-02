import { getCrmRecord } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getCrmRecord(req, "customers", "customers", id);
}
