import { providerFromParam, handleManualCredentialConnect } from "../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handleManualCredentialConnect(req, providerFromParam(provider));
}
