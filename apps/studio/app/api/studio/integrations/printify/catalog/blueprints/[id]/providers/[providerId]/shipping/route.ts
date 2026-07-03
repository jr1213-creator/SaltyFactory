import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

function sanitizeShipping(row: Record<string, unknown>) {
  return {
    handlingTime: row.handling_time ?? row.handlingTime ?? null,
    country: row.country ?? null,
    region: row.region ?? null,
    price: row.price ?? null,
    currency: row.currency ?? null
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; providerId: string }> }) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const config = parseEnv();
    if (!config.providers.printify.enabled) {
      return NextResponse.json({
        ok: false,
        status: "not_configured",
        provider: "printify",
        setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
        message: "Printify shipping discovery requires a configured server-side Printify connection."
      }, { status: 503 });
    }
    const { id, providerId } = await params;
    const result = await createCommerceProviders(config).printify.getShipping(id, providerId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    }
    const shipping = Array.isArray(result.data) ? result.data.map((row) => sanitizeShipping(row as Record<string, unknown>)) : result.data;
    return NextResponse.json({ ok: true, provider: "printify", shipping, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
