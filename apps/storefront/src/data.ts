import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";

const workspaceId = process.env.STOREFRONT_WORKSPACE_ID || "wks_default";

export async function getProducts() {
  const config = parseEnv();
  const providers = createCommerceProviders(config);
  const result = await providers.storefront.getProducts();
  if (result.ok && Array.isArray(result.data) && result.data.length) return result.data;
  if (!process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory") return [];
  try {
    return await createRepositories().draft.listApprovedForStorefront(workspaceId);
  } catch (error) {
    if (config.APP_ENV === "production") throw error;
    return [];
  }
}

export async function getProduct(handle: string) {
  return (await getProducts()).find((product: any) => product.handle === handle) ?? null;
}
