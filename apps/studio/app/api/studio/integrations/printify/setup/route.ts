import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createPrintifySetupState, redactLaunchError } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

async function bodyFromRequest(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) return await req.json();
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      return Object.fromEntries((await req.formData()).entries());
    }
  } catch {
    return {};
  }
  return {};
}

function sanitizeShop(shop: Record<string, unknown>) {
  return {
    id: String(shop.id ?? ""),
    title: String(shop.title ?? shop.name ?? "Printify shop"),
    salesChannel: typeof shop.sales_channel === "string" ? shop.sales_channel : typeof shop.salesChannel === "string" ? shop.salesChannel : null
  };
}

function sanitizeBlueprint(blueprint: Record<string, unknown>) {
  return {
    id: String(blueprint.id ?? ""),
    title: String(blueprint.title ?? blueprint.name ?? "Blueprint"),
    brand: typeof blueprint.brand === "string" ? blueprint.brand : null,
    model: typeof blueprint.model === "string" ? blueprint.model : null
  };
}

export async function POST(req: Request) {
  try {
    await requireProviderMutationPermission(req, workspaceId);
    const body = await bodyFromRequest(req);
    const action = typeof body.action === "string" ? body.action : "status";
    const config = parseEnv();
    const setupState = createPrintifySetupState({
      enabled: config.PRINTIFY_ENABLED,
      hasApiToken: Boolean(config.PRINTIFY_API_TOKEN),
      shopId: config.PRINTIFY_SHOP_ID,
      persistedStatus: config.providers.printify.enabled ? "configured_not_verified" : "not_configured"
    });

    if (action === "status") {
      return NextResponse.json({ ok: true, status: setupState.status, provider: "printify", setup: setupState });
    }

    if (action === "discover_shops") {
      if (!config.PRINTIFY_ENABLED || !config.PRINTIFY_API_TOKEN) {
        return NextResponse.json({
          ok: false,
          status: setupState.status,
          provider: "printify",
          message: "Printify shop discovery requires PRINTIFY_ENABLED=true and PRINTIFY_API_TOKEN in protected server config.",
          setup: setupState
        }, { status: 503 });
      }
      const response = await fetch("https://api.printify.com/v1/shops.json", {
        method: "GET",
        headers: { authorization: `Bearer ${config.PRINTIFY_API_TOKEN}`, "content-type": "application/json" }
      });
      const raw = await response.json().catch(() => ([]));
      if (!response.ok) {
        return NextResponse.json({
          ok: false,
          status: response.status === 401 || response.status === 403 ? "access_limited" : "failed",
          provider: "printify",
          message: sanitizeProviderError((raw as any)?.error ?? (raw as any)?.message ?? `Printify HTTP ${response.status}`),
          setup: { ...setupState, sanitizedError: redactLaunchError(raw) }
        }, { status: response.status === 401 || response.status === 403 ? 403 : 502 });
      }
      const shops = Array.isArray(raw) ? raw.map((shop) => sanitizeShop(shop as Record<string, unknown>)).filter((shop) => shop.id) : [];
      const status = shops.length === 1 ? "requires_owner_action" : shops.length > 1 ? "requires_owner_action" : "manual_setup_required";
      return NextResponse.json({
        ok: true,
        status,
        provider: "printify",
        shops,
        autoSaved: false,
        tokenExposed: false,
        message: shops.length ? "Select the real Salty Cowhide Printify shop and set PRINTIFY_SHOP_ID in protected server config, then test the connection." : "No Printify shops were returned for this token."
      });
    }

    if (action === "discover_catalog") {
      if (!config.providers.printify.enabled) {
        return NextResponse.json({
          ok: false,
          status: setupState.status,
          provider: "printify",
          message: "Printify catalog discovery requires a verified token and shop ID in protected server config.",
          setup: setupState
        }, { status: 503 });
      }
      const result = await createCommerceProviders(config).printify.getCatalog();
      if (!result.ok) {
        return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), setupRequired: result.setupRequired ?? setupState.setupRequired }, { status: 502 });
      }
      const blueprints = Array.isArray(result.data) ? result.data.map((blueprint) => sanitizeBlueprint(blueprint)).filter((blueprint) => blueprint.id).slice(0, 25) : [];
      return NextResponse.json({
        ok: true,
        status: "detected",
        provider: "printify",
        catalog: { blueprintCount: Array.isArray(result.data) ? result.data.length : 0, blueprints },
        tokenExposed: false,
        message: "Printify catalog was discovered from a live API call. Product creation remains approval-gated."
      });
    }

    return NextResponse.json({ ok: false, status: "blocked_by_guardrail", provider: "printify", message: "Unsupported Printify setup action." }, { status: 400 });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
