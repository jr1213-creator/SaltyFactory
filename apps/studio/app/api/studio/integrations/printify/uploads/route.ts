import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { getApprovedGeneratedArtwork, metadataOf, privateMediaSourceFor } from "../../../publish/_provider-workflow";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    const config = parseEnv();
    if (!config.providers.printify.enabled) {
      return NextResponse.json({ ok: false, status: "not_configured", setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"] }, { status: 503 });
    }
    const repos = createRepositories();
    const draft = productDraftId ? await repos.draft.getById(productDraftId, workspaceId) : null;
    if (!draft) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["product_draft_with_approved_generated_artwork_required"] }, { status: 409 });
    const artwork = await getApprovedGeneratedArtwork({ repos, workspaceId, draft });
    if (!artwork.ok) return NextResponse.json({ ok: false, status: artwork.status, blockingReasons: artwork.blockingReasons }, { status: 409 });
    const source = await privateMediaSourceFor(artwork.asset, workspaceId, config);
    if ("ok" in source) {
      return NextResponse.json({ ok: false, status: source.status, blockingReasons: source.blockingReasons, setupRequired: source.setupRequired }, { status: source.status === "not_configured" ? 503 : 409 });
    }
    const uploaded = await createCommerceProviders(config).printify.uploadImage({ fileName: source.fileName, contents: source.contents, url: source.url });
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
      workspace_id: workspaceId,
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
    return NextResponse.json({ ok: true, status: "printify_image_uploaded", provider: "printify", uploadId, asset: updated, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
