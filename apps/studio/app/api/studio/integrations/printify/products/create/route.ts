import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../_auth";
import { createPrintifyProductForMockups } from "../../_mockup-workflow";
import { printifyWorkspaceId } from "../../_runtime";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, printifyWorkspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    if (!productDraftId) {
      return NextResponse.json({
        ok: false,
        status: "product_draft_missing",
        message: "Choose a product draft before creating a Printify product.",
        blockingReasons: ["product_draft_missing"]
      }, { status: 400 });
    }
    const placement = body.placement && typeof body.placement === "object" && !Array.isArray(body.placement)
      ? body.placement as Record<string, unknown>
      : undefined;
    const result = await createPrintifyProductForMockups({
      repos: createRepositories(),
      productDraftId,
      actorId: user.id,
      ...(placement ? { placement } : {})
    });
    if (!result.ok) {
      const failure = result as any;
      return NextResponse.json({
        ok: false,
        status: result.status,
        message: failure.message ?? sanitizeProviderError(result.status),
        retryable: failure.retryable === true,
        rateLimited: failure.rateLimited === true,
        setupRequired: failure.setupRequired,
        blockingReasons: failure.blockingReasons ?? [result.status]
      }, { status: result.status === "rate_limited" ? 429 : result.status === "printify_not_connected" ? 503 : 409 });
    }
    return NextResponse.json({
      ok: true,
      status: result.status,
      provider: "printify",
      reference: result.reference,
      uploadId: result.uploadId,
      variantIds: result.variantIds,
      printAreas: result.printAreas,
      importedMockupCount: result.imported?.ok ? result.imported.mockups.length : 0,
      mockups: result.imported?.ok ? result.imported.mockups : [],
      tokenExposed: false
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
