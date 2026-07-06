import { readStorefrontProducts } from "@saltyfactory/ai-free";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";

function storefrontWorkspaceId() {
  const configured = process.env.STOREFRONT_WORKSPACE_ID?.trim();
  if (configured) return configured;
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") return "";
  return "wks_default";
}

function repositoryUnavailableForStorefront(config: ReturnType<typeof parseEnv>) {
  return config.APP_ENV === "production" && !process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory";
}

export async function getProducts() {
  const config = parseEnv();
  const workspaceId = storefrontWorkspaceId();
  if (!workspaceId) return [];
  if (repositoryUnavailableForStorefront(config)) return [];
  const repos = createRepositories();
  const storefront = await readStorefrontProducts({ repos, workspaceId });
  if (storefront.products.length) return storefront.products;
  if (!process.env.DATABASE_URL && process.env.REPOSITORY_ADAPTER !== "memory") return [];
  try {
    return await repos.draft.listApprovedForStorefront(workspaceId);
  } catch (error) {
    if (config.APP_ENV === "production") throw error;
    return [];
  }
}

export async function getProduct(handle: string) {
  const config = parseEnv();
  const workspaceId = storefrontWorkspaceId();
  if (!workspaceId) return null;
  if (repositoryUnavailableForStorefront(config)) return null;
  const repos = createRepositories();
  const storefront = await readStorefrontProducts({ repos, workspaceId, handle });
  if (storefront.product) return storefront.product;
  return (await getProducts()).find((product: any) => product.handle === handle) ?? null;
}

export async function getCollectionProducts(handle: string) {
  const repos = createRepositories();
  const workspaceId = storefrontWorkspaceId();
  if (!workspaceId) return [];
  const storefront = await readStorefrontProducts({ repos, workspaceId, collectionHandle: handle });
  return storefront.products;
}
