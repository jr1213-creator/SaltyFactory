import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

function sanitizeVariant(variant: Record<string, unknown>) {
  const options = variant.options && typeof variant.options === "object" ? variant.options as Record<string, unknown> : {};
  return {
    id: String(variant.id ?? ""),
    title: String((variant.title ?? variant.name ?? [options.size, options.color].filter(Boolean).join(" ")) || "Variant"),
    size: String(options.size ?? variant.size ?? ""),
    color: String(options.color ?? variant.color ?? ""),
    cost: Number(variant.cost ?? variant.price ?? 0),
    isAvailable: variant.is_available ?? variant.isAvailable ?? variant.available ?? true
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; providerId: string }> }) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const { id, providerId } = await params;
    const config = parseEnv();
    if (!config.providers.printify.enabled) {
      return NextResponse.json({ ok: false, status: "not_configured", provider: "printify", setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"] }, { status: 503 });
    }
    const result = await createCommerceProviders(config).printify.getVariants(id, providerId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    }
    const variants = Array.isArray(result.data) ? result.data.map((variant) => sanitizeVariant(variant as Record<string, unknown>)).filter((variant) => variant.id) : [];
    return NextResponse.json({ ok: true, provider: "printify", blueprintId: id, printProviderId: providerId, variants, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
