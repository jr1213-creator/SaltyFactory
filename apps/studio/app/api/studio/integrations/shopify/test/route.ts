import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    const result = await createCommerceProviders(config).admin.testConnection();
    const status = result.ok ? "connected" : config.providers.shopifyAdmin.enabled ? "configured_not_verified" : "not_configured";
    const repos = createRepositories();
    await repos.integration.updateProviderConnectionStatus(workspaceId, "shopify", {
      id: `conn_shopify_${Date.now()}`,
      workspace_id: workspaceId,
      provider_type: "shopify",
      provider_name: "Shopify Admin",
      enabled: result.ok,
      status,
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: status,
      configuration: { storeDomain: config.SHOPIFY_STORE_DOMAIN || null },
      updated_by: user.id
    });
    return NextResponse.json({ ok: result.ok, status, provider: "shopify", data: result.ok ? result.data : null, message: result.ok ? "Shopify Admin API verified." : result.error, setupRequired: result.ok ? [] : result.setupRequired ?? ["SHOPIFY_ADMIN_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"] });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}

