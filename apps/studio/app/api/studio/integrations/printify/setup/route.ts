import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createPrintifySetupState, redactLaunchError } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { printifySetupRequiredResponse, printifyWorkspaceId, resolvePrintifyRuntime } from "../_runtime";

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
    await requireProviderMutationPermission(req, printifyWorkspaceId);
    const body = await bodyFromRequest(req);
    const action = typeof body.action === "string" ? body.action : "status";
    const runtime = await resolvePrintifyRuntime();
    const setupState = createPrintifySetupState({
      enabled: runtime.resolution.status === "ready",
      hasApiToken: runtime.resolution.status === "ready" || runtime.resolution.credentialSource === "credential_store",
      shopId: runtime.resolution.shopId ?? null,
      persistedStatus: runtime.resolution.status === "ready" ? "connected" : runtime.resolution.status === "owner_gated" ? "needs_input" : "not_configured"
    });

    if (action === "status") {
      return NextResponse.json({ ok: true, status: runtime.resolution.status === "ready" ? "connected" : setupState.status, provider: "printify", setup: setupState, printify: runtime.resolution });
    }

    if (action === "discover_shops") {
      if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
      const result = await runtime.printify.getShops();
      if (!result.ok) {
        return NextResponse.json({
          ok: false,
          status: result.error.includes("401") || result.error.includes("403") ? "access_limited" : "failed",
          provider: "printify",
          message: sanitizeProviderError(result.error),
          setup: { ...setupState, sanitizedError: redactLaunchError(result.error) }
        }, { status: result.rateLimited ? 429 : 502 });
      }
      const shops = Array.isArray(result.data) ? result.data.map((shop) => sanitizeShop(shop as Record<string, unknown>)).filter((shop) => shop.id) : [];
      const status = shops.length === 1 ? "requires_owner_action" : shops.length > 1 ? "requires_owner_action" : "manual_setup_required";
      return NextResponse.json({
        ok: true,
        status,
        provider: "printify",
        shops,
        autoSaved: false,
        tokenExposed: false,
        message: shops.length ? "Select the real Salty Cowhide Printify shop in Launch Setup Concierge." : "No Printify shops were returned for this token."
      });
    }

    if (action === "discover_catalog") {
      if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
      const result = await runtime.printify.getCatalog();
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
