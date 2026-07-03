import { handleProviderConnectionDisconnect } from "../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ providerKey: string }> }) {
  const { providerKey } = await params;
  return handleProviderConnectionDisconnect(req, providerKey);
}
