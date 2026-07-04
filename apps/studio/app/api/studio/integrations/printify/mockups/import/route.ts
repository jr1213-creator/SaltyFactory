import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../_auth";
import { importPrintifyMockupsForReference } from "../../_mockup-workflow";
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
        message: "Choose a product draft before importing Printify mockups.",
        blockingReasons: ["product_draft_missing"]
      }, { status: 400 });
    }
    const result = await importPrintifyMockupsForReference({
      repos: createRepositories(),
      actorId: user.id,
      productDraftId
    });
    if (!result.ok) {
      const failure = result as any;
      return NextResponse.json({
        ok: false,
        status: result.status,
        message: failure.message ?? sanitizeProviderError(result.status),
        retryable: failure.retryable === true,
        rateLimited: failure.rateLimited === true,
        blockingReasons: failure.blockingReasons ?? [result.status],
        reference: failure.reference
      }, { status: result.status === "rate_limited" ? 429 : result.status === "printify_not_connected" ? 503 : 409 });
    }
    return NextResponse.json({
      ok: true,
      status: result.status,
      provider: "printify",
      importedCount: result.mockups.length,
      images: result.images.map((image) => ({
        src: image.src,
        variantIds: image.variantIds,
        position: image.position,
        isDefault: image.isDefault
      })),
      mockups: result.mockups,
      reference: result.reference,
      tokenExposed: false
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
