import { handleProviderConnectionsList } from "./_shared";

export async function GET(req: Request) {
  return handleProviderConnectionsList(req);
}
