import { handleProviderConnectionSave } from "../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ providerKey: string }> }) {
  const { providerKey } = await params;
  return handleProviderConnectionSave(req, providerKey);
}
