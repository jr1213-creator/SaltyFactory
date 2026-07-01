import { providerFromParam, handleProviderSync } from "../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handleProviderSync(req, providerFromParam(provider));
}
