import { NextResponse } from "next/server";
import { requirePublishPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import {
  defaultPrintAreas,
  getApprovedGeneratedArtwork,
  getDraftVariants,
  metadataOf,
  printifyVariantPayload,
  privateMediaSourceFor,
  writeProviderEvent
} from "../_provider-workflow";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req, workspaceId);
    return NextResponse.json({ ok: true, route: "publish/printify", auditActor: { actor_type: "human", actor_id: user.id }, status: "ready_for_guarded_requests" });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePublishPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || "");
    if (!productDraftId) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["productDraftId required."] }, { status: 400 });
    const repos = createRepositories();
    const draft = await repos.draft.getById(productDraftId, workspaceId);
    const review = await repos.publish.getByProductDraftId(workspaceId, productDraftId);
    if (!draft || !review) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["Persisted product draft and publish review are required."] }, { status: 409 });
    const gates = evaluatePublishReviewGates(review);
    if (!gates.printifyAllowed) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: gates.blockedReasons, gates }, { status: 409 });
    const config = parseEnv();
    if (!config.providers.printify.enabled) return NextResponse.json({ ok: false, status: "not_configured", setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"] }, { status: 503 });
    const artwork = await getApprovedGeneratedArtwork({ repos, workspaceId, draft });
    if (!artwork.ok) return NextResponse.json({ ok: false, status: artwork.status, blockingReasons: artwork.blockingReasons }, { status: 409 });
    const variantsResult = await getDraftVariants({ repos, workspaceId, draftId: productDraftId });
    if (!variantsResult.ok) return NextResponse.json({ ok: false, status: variantsResult.status, blockingReasons: variantsResult.blockingReasons }, { status: 409 });
    const variants = printifyVariantPayload(variantsResult.variants);
    if (!variants.length) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["printify_variant_ids_and_prices_required"] }, { status: 409 });
    }
    const blueprintId = String(body.blueprintId || body.blueprint_id || variantsResult.variants[0]?.printify_blueprint_id || variantsResult.variants[0]?.printifyBlueprintId || "");
    const printProviderId = String(body.printProviderId || body.print_provider_id || variantsResult.variants[0]?.printify_print_provider_id || variantsResult.variants[0]?.printifyPrintProviderId || "");
    if (!blueprintId || !printProviderId) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["printify_blueprint_and_provider_selection_required"] }, { status: 409 });
    }
    const commerce = createCommerceProviders(config);
    const assetMetadata = metadataOf(artwork.asset);
    let uploadId = String(assetMetadata.printify_upload_id ?? assetMetadata.printifyUploadId ?? "");
    if (!uploadId) {
      const source = await privateMediaSourceFor(artwork.asset, workspaceId, config);
      if ("ok" in source) {
        return NextResponse.json({ ok: false, status: source.status, blockingReasons: source.blockingReasons, setupRequired: source.setupRequired }, { status: source.status === "not_configured" ? 503 : 409 });
      }
      const upload = await commerce.printify.uploadImage({
        fileName: source.fileName,
        contents: source.contents,
        url: source.url
      });
      if (!upload.ok) {
        return NextResponse.json({ ok: false, status: "failed", message: upload.error, retryable: upload.retryable, rateLimited: upload.rateLimited, setupRequired: upload.setupRequired }, { status: upload.rateLimited ? 429 : 502 });
      }
      uploadId = String((upload.data as any).id ?? (upload.data as any).upload_id ?? "");
      if (!uploadId) {
        return NextResponse.json({ ok: false, status: "failed", message: "Printify upload response did not include an image id." }, { status: 502 });
      }
      await repos.asset.update(artwork.asset.id, {
        metadata: { ...assetMetadata, printify_upload_id: uploadId, printify_uploaded_at: new Date().toISOString() },
        updated_by: user.id
      });
    }
    const variantIds = variants.map((variant) => String(variant.id));
    const printAreas = Array.isArray(body.printAreas ?? body.print_areas) && (body.printAreas ?? body.print_areas).length
      ? body.printAreas ?? body.print_areas
      : defaultPrintAreas({ uploadId, variantIds, placement: body.placement });
    const result = await commerce.printify.createProduct({
      title: draft.title,
      description: draft.description,
      blueprintId,
      printProviderId,
      variants,
      printAreas
    });
    if (!result.ok) return NextResponse.json({ ok: false, status: "failed", message: result.error, retryable: result.retryable, rateLimited: result.rateLimited, setupRequired: result.setupRequired }, { status: result.rateLimited ? 429 : 502 });
    const sourceRecord = await repos.shared.sourceRecords.create({
      id: `src_printify_${Date.now()}`,
      workspace_id: workspaceId,
      provider_key: "printify",
      entity_type: "product_draft",
      entity_id: productDraftId,
      source_label: "provider_api",
      status: "completed",
      raw_payload_ref: null,
      metadata: { blueprintId, printProviderId, variantIds, uploadId },
      created_by: user.id,
      updated_by: user.id
    });
    const saved = await repos.printify.create({
      id: `ptyref_${Date.now()}`,
      workspace_id: workspaceId,
      product_draft_id: productDraftId,
      printify_product_id: String((result.data as any).id ?? ""),
      printify_shop_id: config.PRINTIFY_SHOP_ID,
      printify_blueprint_id: blueprintId,
      printify_print_provider_id: printProviderId,
      printify_upload_id: uploadId,
      printify_variant_ids: variantIds,
      print_areas: printAreas,
      printify_status: "draft",
      printify_published: false,
      sync_status: "draft_created",
      source_record_id: sourceRecord.id,
      metadata: { provider_response_id: String((result.data as any).id ?? ""), uploadId, variantIds, printAreas },
      synced_at: new Date().toISOString(),
      updated_by: user.id,
      created_by: user.id
    });
    await repos.draft.update(productDraftId, { printify_status: "draft_created", updated_by: user.id });
    await writeProviderEvent({ repos, workspaceId, actorId: user.id, provider: "printify", entityId: saved.id, action: "draft_created", status: "draft_created", details: { productDraftId, uploadId, variantIds } });
    return NextResponse.json({ ok: true, status: "draft_created", provider: "printify", reference: saved, uploadId, variantIds });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}
