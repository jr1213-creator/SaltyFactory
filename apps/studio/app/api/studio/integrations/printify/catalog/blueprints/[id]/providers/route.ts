import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../../../_auth";
import { printifySetupRequiredResponse, printifyWorkspaceId, resolvePrintifyRuntime } from "../../../../_runtime";

export const runtime = "nodejs";

function sanitizeProvider(provider: Record<string, unknown>) {
  return {
    id: String(provider.id ?? ""),
    title: String(provider.title ?? provider.name ?? "Print provider"),
    location: typeof provider.location === "string" ? provider.location : null
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReviewerOrAbove(req, printifyWorkspaceId);
    const { id } = await params;
    const runtime = await resolvePrintifyRuntime();
    if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
    const result = await runtime.printify.getPrintProviders(id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, status: "failed", provider: "printify", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    }
    const providers = Array.isArray(result.data) ? result.data.map((provider) => sanitizeProvider(provider as Record<string, unknown>)).filter((provider) => provider.id) : [];
    return NextResponse.json({ ok: true, provider: "printify", blueprintId: id, printProviders: providers, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
