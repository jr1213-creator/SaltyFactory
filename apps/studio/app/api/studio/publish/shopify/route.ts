import { NextResponse } from "next/server";
import { requirePublishPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createCommerceProviders, normalizeShopifyCollectionType } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { createShopifyAdminProviderForWorkspace } from "../../_shopify-admin";
import {
  getApprovedMockupMedia,
  getDraftVariants,
  metadataOf,
  shopifyVariantPayload,
  writeProviderEvent
} from "../_provider-workflow";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireReviewerOrAbove(req, workspaceId);
    return NextResponse.json({ ok: true, route: "publish/shopify", auditActor: { actor_type: "human", actor_id: user.id }, status: "ready_for_guarded_requests" });
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
    if (!gates.shopifyAllowed) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: gates.blockedReasons, gates }, { status: 409 });
    const config = parseEnv();
    const shopify = await createShopifyAdminProviderForWorkspace({ repos, config, workspaceId });
    if (!shopify.ok) return NextResponse.json({ ok: false, status: shopify.status, setupRequired: shopify.setupRequired, message: shopify.message }, { status: shopify.status === "config_blocked" ? 503 : 503 });
    const variantsResult = await getDraftVariants({ repos, workspaceId, draftId: productDraftId });
    if (!variantsResult.ok) return NextResponse.json({ ok: false, status: variantsResult.status, blockingReasons: variantsResult.blockingReasons }, { status: 409 });
    const variants = shopifyVariantPayload(variantsResult.variants);
    if (!variants.length || variants.some((variant) => Number(variant.price) <= 0)) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["shopify_variants_and_pricing_required"] }, { status: 409 });
    }
    const mediaResult = await getApprovedMockupMedia({ repos, workspaceId, draft, config });
    if (!mediaResult.ok) {
      return NextResponse.json({ ok: false, status: mediaResult.status, blockingReasons: mediaResult.blockingReasons, setupRequired: mediaResult.setupRequired }, { status: mediaResult.setupRequired?.length ? 503 : 409 });
    }
    const metadata = metadataOf(draft);
    const collectionId = String(body.collectionId || body.collection_id || metadata.shopify_collection_id || metadata.shopifyCollectionId || shopify.selectedCollectionId || config.SHOPIFY_DEFAULT_COLLECTION_ID || "");
    const collectionType = normalizeShopifyCollectionType(
      body.collectionType
        || body.collection_type
        || metadata.shopify_collection_type
        || metadata.shopifyCollectionType
        || shopify.selectedCollectionType
    );
    const collectionAssignmentMode = String(body.collectionAssignmentMode || body.collection_assignment_mode || metadata.shopify_collection_assignment_mode || metadata.shopifyCollectionAssignmentMode || shopify.selectedCollectionAssignmentMode || "");
    if (!collectionId) {
      return NextResponse.json({
        ok: false,
        status: "blocked_by_guardrail",
        blockingReasons: ["shopify_collection_id_required"],
        setupRequired: ["Select a real Shopify collection ID before draft creation."]
      }, { status: 409 });
    }
    if (collectionType === "smart" || collectionAssignmentMode === "rule_managed") {
      return NextResponse.json({
        ok: false,
        status: "blocked_by_guardrail",
        blockingReasons: ["shopify_smart_collection_rule_managed"],
        setupRequired: ["Select a custom Shopify collection for manual draft assignment."],
        message: "Smart Shopify collections are rule-managed and cannot be manually assigned during draft creation."
      }, { status: 409 });
    }
    const commerce = createCommerceProviders(config, undefined, { admin: shopify.admin });
    const result = await commerce.admin.createProductDraft({
      title: draft.title,
      description: draft.description,
      productType: draft.product_type ?? draft.productType,
      brand: draft.brand,
      tags: draft.tags,
      variants,
      images: mediaResult.media.map((media) => ({ src: media.url, alt: `${draft.title} product mockup`, approved: true })),
      seoTitle: metadata.seo_title ?? metadata.seoTitle ?? draft.title,
      seoDescription: metadata.seo_description ?? metadata.seoDescription ?? draft.description
    });
    if (!result.ok) return NextResponse.json({ ok: false, status: "failed", message: result.error, retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    const product = (result.data as any).product ?? {};
    const shopifyProductId = String(product.id ?? "");
    let collectionAssignment: Record<string, unknown> | null = null;
    if (shopifyProductId) {
      const assigned = await commerce.admin.assignCollection(shopifyProductId, collectionId, { collectionType });
      if (!assigned.ok) {
        return NextResponse.json({ ok: false, status: "failed", message: assigned.error, retryable: assigned.retryable, rateLimited: assigned.rateLimited, setupRequired: assigned.setupRequired }, { status: assigned.rateLimited ? 429 : 502 });
      }
      collectionAssignment = assigned.data as Record<string, unknown>;
    } else {
      return NextResponse.json({ ok: false, status: "failed", message: "Shopify draft response did not include a product id." }, { status: 502 });
    }
    const sourceRecord = await repos.shared.sourceRecords.create({
      id: `src_shopify_${Date.now()}`,
      workspace_id: workspaceId,
      provider_key: "shopify",
      entity_type: "product_draft",
      entity_id: productDraftId,
      source_label: "provider_api",
      status: "completed",
      raw_payload_ref: null,
      metadata: { mediaCount: mediaResult.media.length, variantCount: variants.length, collectionId: collectionId || null, collectionType },
      created_by: user.id,
      updated_by: user.id
    });
    const cleanDomain = shopify.storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const adminUrl = shopifyProductId ? `https://${cleanDomain}/admin/products/${shopifyProductId}` : null;
    const handle = String(product.handle ?? "");
    const saved = await repos.shopify.create({
      id: `shopref_${Date.now()}`,
      workspace_id: workspaceId,
      product_draft_id: productDraftId,
      shopify_product_id: shopifyProductId,
      shopify_product_gid: String(product.admin_graphql_api_id ?? product.adminGraphqlApiId ?? ""),
      shopify_handle: handle,
      shopify_status: "draft",
      shopify_collection_ids: collectionId ? [collectionId] : [],
      shopify_variant_ids: Object.fromEntries(((product.variants ?? []) as any[]).map((variant, index) => [String(variantsResult.variants[index]?.id ?? index), String(variant.id ?? "")])),
      admin_url: adminUrl,
      storefront_url: null,
      media: mediaResult.media.map((media) => ({ mockupId: media.mockupId, url: media.url })),
      seo: { title: metadata.seo_title ?? metadata.seoTitle ?? draft.title, description: metadata.seo_description ?? metadata.seoDescription ?? draft.description },
      sync_status: "draft_created",
      source_record_id: sourceRecord.id,
      metadata: { collectionAssignment, collectionType, livePublishingEnabled: config.LIVE_PUBLISHING_ENABLED === true },
      synced_at: new Date().toISOString(),
      updated_by: user.id,
      created_by: user.id
    });
    await repos.draft.update(productDraftId, { shopify_status: "draft_created", updated_by: user.id });
    await writeProviderEvent({ repos, workspaceId, actorId: user.id, provider: "shopify", entityId: saved.id, action: "draft_created", status: "draft_created", details: { productDraftId, mediaCount: mediaResult.media.length, variantCount: variants.length } });
    return NextResponse.json({ ok: true, status: "draft_created", provider: "shopify", reference: saved, adminUrl, mediaCount: mediaResult.media.length, collectionAssigned: Boolean(collectionAssignment) });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}
