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
    const providers = createCommerceProviders(config);
    const result = await providers.printify.testConnection();
    const status = result.ok ? "connected" : config.providers.printify.enabled ? "configured_not_verified" : "not_configured";
    const repos = createRepositories();
    await repos.integration.updateProviderConnectionStatus(workspaceId, "printify", {
      id: `conn_printify_${Date.now()}`,
      workspace_id: workspaceId,
      provider_type: "printify",
      provider_name: "Printify",
      enabled: result.ok,
      status,
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: status,
      configuration: { shopId: config.PRINTIFY_SHOP_ID || null },
      updated_by: user.id
    });
    return NextResponse.json({ ok: result.ok, status, provider: "printify", data: result.ok ? result.data : null, message: result.ok ? "Printify API verified." : result.error, setupRequired: result.ok ? [] : result.setupRequired ?? ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"] });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}

