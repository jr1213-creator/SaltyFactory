import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../_auth";
import { getApprovedGeneratedArtwork } from "../../../publish/_provider-workflow";
import { uploadPrintReadyAssetToPrintify } from "../_mockup-workflow";
import { printifyWorkspaceId } from "../_runtime";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, printifyWorkspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    const repos = createRepositories();
    const draft = productDraftId ? await repos.draft.getById(productDraftId, printifyWorkspaceId) : null;
    if (!draft) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["product_draft_with_approved_generated_artwork_required"] }, { status: 409 });
    const artwork = await getApprovedGeneratedArtwork({ repos, workspaceId: printifyWorkspaceId, draft });
    if (!artwork.ok) return NextResponse.json({ ok: false, status: artwork.status, blockingReasons: artwork.blockingReasons }, { status: 409 });
    const uploaded = await uploadPrintReadyAssetToPrintify({ repos, draft, actorId: user.id });
    if (!uploaded.ok) {
      const failure = uploaded as any;
      const httpStatus = uploaded.status === "rate_limited" ? 429 : uploaded.status === "printify_not_connected" || uploaded.status === "not_configured" ? 503 : 409;
      return NextResponse.json({
        ok: false,
        status: uploaded.status,
        message: failure.message ?? "Printify upload could not be completed.",
        retryable: failure.retryable === true,
        rateLimited: failure.rateLimited === true,
        setupRequired: failure.setupRequired,
        blockingReasons: failure.blockingReasons
      }, { status: httpStatus });
    }
    return NextResponse.json({
      ok: true,
      status: "printify_image_uploaded",
      provider: "printify",
      uploadId: uploaded.uploadId,
      asset: {
        id: uploaded.asset.id,
        qaStatus: uploaded.asset.qa_status ?? uploaded.asset.qaStatus ?? null,
        approvedForMockup: Boolean(uploaded.asset.approved_for_mockup ?? uploaded.asset.approvedForMockup),
        mimeType: uploaded.asset.mime_type ?? uploaded.asset.mimeType ?? null,
        printifyUploadId: uploaded.uploadId,
        derivativeKind: "print_png"
      },
      tokenExposed: false
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
