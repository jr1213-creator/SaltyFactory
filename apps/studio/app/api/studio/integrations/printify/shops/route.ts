import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { printifySetupRequiredResponse, printifyWorkspaceId, resolvePrintifyRuntime } from "../_runtime";

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
    await requireReviewerOrAbove(req, printifyWorkspaceId);
    const runtime = await resolvePrintifyRuntime();
    if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
    const result = await runtime.printify.getShops();
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    }
    const shops = Array.isArray(result.data) ? result.data.map((shop) => sanitizeShop(shop as Record<string, unknown>)).filter((shop) => shop.id) : [];
    return NextResponse.json({ ok: true, provider: "printify", shops, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, printifyWorkspaceId);
    const body = await req.json().catch(() => ({}));
    const shopId = String(body.shopId || body.shop_id || "");
    const title = String(body.title || body.name || "Printify shop");
    if (!shopId) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["printify_shop_id_required"] }, { status: 400 });
    }
    const repos = createRepositories();
    const existing = await repos.integration.getProviderConnectionForWorkspace(printifyWorkspaceId, "printify");
    const credentialRef = String(existing?.secret_ref ?? existing?.secretRef ?? "");
    if (!credentialRef) {
      return NextResponse.json({
        ok: false,
        status: "setup_required",
        provider: "printify",
        safeMessage: "Connect Printify in Launch Setup Concierge before selecting a shop.",
        setupRequired: ["Connect Printify", "Validate Printify token"],
        setupAction: "/studio/onboarding/providers/printify"
      }, { status: 409 });
    }
    const connection = await repos.integration.updateProviderConnectionStatus(printifyWorkspaceId, "printify", {
      id: existing?.id ? String(existing.id) : "printify",
      workspace_id: printifyWorkspaceId,
      status: "connected",
      provider_key: "printify",
      provider_type: "printify",
      provider_name: "Printify",
      secret_ref: credentialRef,
      enabled: true,
      configuration: { ...((existing?.configuration ?? {}) as Record<string, unknown>), selectedShopId: shopId, selectedShopName: title, maskedDisplayValue: "Saved securely" },
      setup_required: [],
      updated_by: user.id
    }, {
      id: `audit_printify_shop_${Date.now()}`,
      workspace_id: printifyWorkspaceId,
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
      status: "connected",
      provider: "printify",
      selectedShopId: shopId,
      connection,
      setupRequired: ["Live publish still requires owner gates"]
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
