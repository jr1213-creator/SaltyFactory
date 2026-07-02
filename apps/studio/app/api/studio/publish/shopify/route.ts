import { NextResponse } from "next/server";
import { requirePublishPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";

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
    if (!config.providers.shopifyAdmin.enabled) return NextResponse.json({ ok: false, status: "not_configured", setupRequired: ["SHOPIFY_ADMIN_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"] }, { status: 503 });
    const result = await createCommerceProviders(config).admin.createProductDraft({
      title: draft.title,
      description: draft.description,
      productType: draft.product_type ?? draft.productType,
      brand: draft.brand,
      tags: draft.tags,
      price: body.price
    });
    if (!result.ok) return NextResponse.json({ ok: false, status: "failed", message: result.error, retryable: result.retryable, rateLimited: result.rateLimited }, { status: result.rateLimited ? 429 : 502 });
    const saved = await repos.shopify.create({
      id: `shopref_${Date.now()}`,
      workspace_id: workspaceId,
      product_draft_id: productDraftId,
      shopify_product_id: String((result.data as any).product?.id ?? ""),
      shopify_handle: String((result.data as any).product?.handle ?? ""),
      shopify_status: "draft",
      shopify_collection_ids: [],
      shopify_variant_ids: {},
      synced_at: new Date().toISOString(),
      updated_by: user.id,
      created_by: user.id
    });
    return NextResponse.json({ ok: true, status: "draft_created", provider: "shopify", reference: saved });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}

