import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

function sanitizeShop(shop: Record<string, unknown>) {
  return {
    id: String(shop.id ?? ""),
    title: String(shop.title ?? shop.name ?? "Printify shop"),
    salesChannel: typeof shop.sales_channel === "string" ? shop.sales_channel : typeof shop.salesChannel === "string" ? shop.salesChannel : null
  };
}

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const config = parseEnv();
    if (!config.PRINTIFY_ENABLED || !config.PRINTIFY_API_TOKEN) {
      return NextResponse.json({
        ok: false,
        status: "not_configured",
        provider: "printify",
        setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN"],
        message: "Printify shop discovery requires a server-side API token and explicit feature flag."
      }, { status: 503 });
    }
    const response = await fetch("https://api.printify.com/v1/shops.json", {
      headers: { authorization: `Bearer ${config.PRINTIFY_API_TOKEN}` }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(data?.message ?? data?.error ?? response.statusText), retryable: response.status >= 500, rateLimited: response.status === 429 }, { status: response.status === 429 ? 429 : 502 });
    }
    const shops = Array.isArray(data) ? data.map((shop) => sanitizeShop(shop as Record<string, unknown>)).filter((shop) => shop.id) : [];
    return NextResponse.json({ ok: true, provider: "printify", shops, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const shopId = String(body.shopId || body.shop_id || "");
    const title = String(body.title || body.name || "Printify shop");
    if (!shopId) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["printify_shop_id_required"] }, { status: 400 });
    }
    const repos = createRepositories();
    const connection = await repos.integration.updateProviderConnectionStatus(workspaceId, "printify", {
      id: "printify",
      workspace_id: workspaceId,
      status: "configured_not_verified",
      provider_key: "printify",
      provider_type: "printify",
      provider_name: "Printify",
      enabled: false,
      configuration: { selectedShopId: shopId, selectedShopTitle: title },
      setup_required: ["Set PRINTIFY_SHOP_ID in protected server config, then test the connection."],
      updated_by: user.id
    }, {
      id: `audit_printify_shop_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "provider_connection",
      entity_id: "printify",
      action: "printify_shop_selected",
      actor_type: "human",
      actor_id: user.id,
      after_state: "configured_not_verified",
      created_at: new Date().toISOString()
    });
    return NextResponse.json({
      ok: true,
      status: "configured_not_verified",
      provider: "printify",
      selectedShopId: shopId,
      connection,
      setupRequired: ["Set PRINTIFY_SHOP_ID in protected server config, then test the connection."]
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
