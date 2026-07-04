import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { getApprovedGeneratedArtwork, metadataOf, privateMediaSourceFor } from "../../../publish/_provider-workflow";
import { printifySetupRequiredResponse, printifyWorkspaceId, resolvePrintifyRuntime } from "../_runtime";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, printifyWorkspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    const config = parseEnv();
    const repos = createRepositories();
    const runtime = await resolvePrintifyRuntime(repos);
    if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
    const draft = productDraftId ? await repos.draft.getById(productDraftId, printifyWorkspaceId) : null;
    if (!draft) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["product_draft_with_approved_generated_artwork_required"] }, { status: 409 });
    const artwork = await getApprovedGeneratedArtwork({ repos, workspaceId: printifyWorkspaceId, draft });
    if (!artwork.ok) return NextResponse.json({ ok: false, status: artwork.status, blockingReasons: artwork.blockingReasons }, { status: 409 });
    const source = await privateMediaSourceFor(artwork.asset, printifyWorkspaceId, config);
    if ("ok" in source) {
      return NextResponse.json({ ok: false, status: source.status, blockingReasons: source.blockingReasons, setupRequired: source.setupRequired }, { status: source.status === "not_configured" ? 503 : 409 });
    }
    const uploaded = await runtime.printify.uploadImage({ fileName: source.fileName, contents: source.contents, url: source.url });
    if (!uploaded.ok) {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(uploaded.error), retryable: uploaded.retryable, rateLimited: uploaded.rateLimited, setupRequired: uploaded.setupRequired }, { status: uploaded.rateLimited ? 429 : 502 });
    }
    const uploadId = String((uploaded.data as any).id ?? (uploaded.data as any).upload_id ?? "");
    if (!uploadId) return NextResponse.json({ ok: false, status: "failed", message: "Printify upload response did not include an image id." }, { status: 502 });
    const metadata = metadataOf(artwork.asset);
    const updated = await repos.asset.update(artwork.asset.id, {
      metadata: { ...metadata, printify_upload_id: uploadId, printify_uploaded_at: new Date().toISOString() },
      updated_by: user.id
    });
    await repos.shared.events.create({
      id: `event_printify_upload_${Date.now()}`,
      workspace_id: printifyWorkspaceId,
      entity_type: "design_asset",
      entity_id: artwork.asset.id,
      event_type: "printify_image_uploaded",
      title: "Artwork uploaded to Printify media library",
      body: "Printify returned a real upload id for approved generated artwork.",
      status: "completed",
      source_label: "provider_api",
      created_by: user.id,
      updated_by: user.id,
      metadata: { productDraftId, printifyUploadId: uploadId }
    });
    return NextResponse.json({
      ok: true,
      status: "printify_image_uploaded",
      provider: "printify",
      uploadId,
      asset: {
        id: updated.id,
        qaStatus: updated.qa_status ?? updated.qaStatus ?? null,
        approvedForMockup: Boolean(updated.approved_for_mockup ?? updated.approvedForMockup),
        mimeType: updated.mime_type ?? updated.mimeType ?? null,
        printifyUploadId: uploadId
      },
      tokenExposed: false
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
