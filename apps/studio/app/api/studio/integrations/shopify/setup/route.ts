import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createShopifySetupState } from "@saltyfactory/domain";
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

export async function POST(req: Request) {
  try {
    await requireProviderMutationPermission(req, workspaceId);
    const body = await bodyFromRequest(req);
    const action = typeof body.action === "string" ? body.action : "status";
    const config = parseEnv();
    const setup = createShopifySetupState({
      enabled: config.SHOPIFY_ADMIN_ENABLED,
      storeDomain: config.SHOPIFY_STORE_DOMAIN,
      hasAdminToken: Boolean(config.SHOPIFY_ADMIN_TOKEN),
      hasClientCredentials: Boolean(config.SHOPIFY_CLIENT_ID && config.SHOPIFY_CLIENT_SECRET),
      persistedStatus: config.providers.shopifyAdmin.enabled ? "configured_not_verified" : "not_configured"
    });

    if (action === "status") {
      return NextResponse.json({
        ok: true,
        status: setup.status,
        provider: "shopify",
        setup,
        metafieldKeys: [
          "saltyfactory_product_idea_id",
          "design_source",
          "ai_employee_source",
          "approval_status",
          "production_partner",
          "margin_score",
          "launch_batch",
          "product_readiness",
          "mockup_approval_status",
          "listing_validation_status"
        ]
      });
    }

    return NextResponse.json({ ok: false, status: "blocked_by_guardrail", provider: "shopify", message: "Unsupported Shopify setup action. Use the protected test route for live validation." }, { status: 400 });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", provider: "shopify", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
