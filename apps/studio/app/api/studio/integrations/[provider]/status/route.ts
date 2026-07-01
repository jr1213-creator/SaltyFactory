import { providerFromParam, handleProviderStatus } from "../../_shared";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handleProviderStatus(req, providerFromParam(provider));
}
