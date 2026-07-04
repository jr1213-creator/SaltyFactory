import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../../../../../_auth";
import { printifySetupRequiredResponse, printifyWorkspaceId, resolvePrintifyRuntime } from "../../../../../../_runtime";

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
    await requireReviewerOrAbove(req, printifyWorkspaceId);
    const runtime = await resolvePrintifyRuntime();
    if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
    const { id, providerId } = await params;
    const result = await runtime.printify.getShipping(id, providerId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    }
    const shipping = Array.isArray(result.data) ? result.data.map((row) => sanitizeShipping(row as Record<string, unknown>)) : result.data;
    return NextResponse.json({ ok: true, provider: "printify", shipping, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
