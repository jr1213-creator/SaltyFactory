import { handleProviderConnectionGet } from "../_shared";

export async function GET(req: Request, { params }: { params: Promise<{ providerKey: string }> }) {
  const { providerKey } = await params;
  return handleProviderConnectionGet(req, providerKey);
}
