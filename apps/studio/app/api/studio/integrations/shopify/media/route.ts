import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { createShopifyAdminProviderForWorkspace } from "../../../_shopify-admin";
import { getApprovedMockupMedia, metadataOf } from "../../../publish/_provider-workflow";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    const shopifyRefId = String(body.shopifyRefId || body.shopify_ref_id || "");
    const config = parseEnv();
    const repos = createRepositories();
    const shopify = await createShopifyAdminProviderForWorkspace({ repos, config, workspaceId });
    if (!shopify.ok) {
      return NextResponse.json({ ok: false, status: shopify.status, setupRequired: shopify.setupRequired, message: shopify.message }, { status: 503 });
    }
    const ref = shopifyRefId
      ? await repos.shopify.getById(shopifyRefId, workspaceId)
      : (await repos.shopify.listByWorkspace(workspaceId)).find((row) => row.product_draft_id === productDraftId || row.productDraftId === productDraftId) ?? null;
    if (!ref) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["shopify_draft_ref_required_before_media_upload"] }, { status: 409 });
    }
    const draftId = String(ref.product_draft_id ?? ref.productDraftId ?? productDraftId);
    const draft = await repos.draft.getById(draftId, workspaceId);
    if (!draft) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["product_draft_not_found"] }, { status: 409 });
    }
    const media = await getApprovedMockupMedia({ repos, workspaceId, draft, config });
    if (!media.ok) {
      return NextResponse.json({ ok: false, status: media.status, blockingReasons: media.blockingReasons, setupRequired: media.setupRequired }, { status: media.setupRequired?.length ? 503 : 409 });
    }
    const productId = String(ref.shopify_product_id ?? ref.shopifyProductId ?? "");
    const uploaded = [];
    const commerce = createCommerceProviders(config, undefined, { admin: shopify.admin });
    for (const item of media.media) {
      const result = await commerce.admin.uploadProductImage(productId, item.url ?? "", `${draft.title} product mockup`);
      if (!result.ok) {
        return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(result.error), retryable: result.retryable, rateLimited: result.rateLimited, setupRequired: result.setupRequired }, { status: result.rateLimited ? 429 : 502 });
      }
      uploaded.push(result.data);
    }
    const refMetadata = metadataOf(ref);
    const updated = await repos.shopify.update(ref.id, {
      media: [...(Array.isArray(ref.media) ? ref.media : []), ...uploaded],
      sync_status: "media_uploaded",
      metadata: { ...refMetadata, media_uploaded_at: new Date().toISOString() },
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "shopify_media_uploaded", provider: "shopify", uploadedCount: uploaded.length, reference: updated, tokenExposed: false });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
