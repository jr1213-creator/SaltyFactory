import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

function sanitizeBlueprint(blueprint: Record<string, unknown>) {
  return {
    id: String(blueprint.id ?? ""),
    title: String(blueprint.title ?? blueprint.name ?? "Blueprint"),
    brand: typeof blueprint.brand === "string" ? blueprint.brand : null,
    model: typeof blueprint.model === "string" ? blueprint.model : null,
    images: Array.isArray(blueprint.images) ? blueprint.images.slice(0, 3) : []
  };
}

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const config = parseEnv();
    if (!config.providers.printify.enabled) {
      return NextResponse.json({
        ok: false,
        status: "not_configured",
        provider: "printify",
        setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
        message: "Printify catalog requires a verified server-side token and selected shop."
      }, { status: 503 });
    }
    const result = await createCommerceProviders(config).printify.getCatalog();
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    }
    const blueprints = Array.isArray(result.data) ? result.data.map((item) => sanitizeBlueprint(item as Record<string, unknown>)).filter((item) => item.id) : [];
    return NextResponse.json({ ok: true, provider: "printify", blueprints, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
