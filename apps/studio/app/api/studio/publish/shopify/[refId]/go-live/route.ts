import { NextResponse } from "next/server";
import { requirePublishPermission } from "@saltyfactory/auth";
import { createCommerceProviders } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../_auth";
import { writeProviderEvent } from "../../../_provider-workflow";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const confirmationPhrase = "PUBLISH LIVE";

function cleanStorefrontUrl(baseUrl: string, handle: string) {
  if (!handle) return null;
  return `${baseUrl.replace(/\/$/, "")}/products/${encodeURIComponent(handle)}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ refId: string }> }) {
  try {
    const user = await requirePublishPermission(req, workspaceId);
    const { refId } = await params;
    const body = await req.json().catch(() => ({}));
    const repos = createRepositories();
    const ref = await repos.shopify.getById(refId, workspaceId);
    if (!ref) {
      return NextResponse.json({ ok: false, status: "not_found", blockingReasons: ["shopify_product_ref_not_found"] }, { status: 404 });
    }

    const productDraftId = String(ref.product_draft_id ?? ref.productDraftId ?? "");
    const shopifyProductId = String(ref.shopify_product_id ?? ref.shopifyProductId ?? "");
    const review = productDraftId ? await repos.publish.getByProductDraftId(workspaceId, productDraftId) : null;
    if (!productDraftId || !shopifyProductId || !review) {
      return NextResponse.json({
        ok: false,
        status: "blocked_by_guardrail",
        blockingReasons: ["persisted_shopify_ref_product_draft_and_publish_review_required"]
      }, { status: 409 });
    }

    const gates = evaluatePublishReviewGates(review);
    if (!gates.shopifyAllowed) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: gates.blockedReasons, gates }, { status: 409 });
    }

    const config = parseEnv();
    const liveFlagsReady = config.LIVE_PUBLISHING_ENABLED === true && config.SHOPIFY_ALLOW_PRODUCT_PUBLISH === true;
    const missingLiveFlags = [
      config.LIVE_PUBLISHING_ENABLED ? null : "LIVE_PUBLISHING_ENABLED=true",
      config.SHOPIFY_ALLOW_PRODUCT_PUBLISH ? null : "SHOPIFY_ALLOW_PRODUCT_PUBLISH=true"
    ].filter((flag): flag is string => typeof flag === "string");
    if (!liveFlagsReady) {
      await writeProviderEvent({
        repos,
        workspaceId,
        actorId: user.id,
        provider: "shopify",
        entityId: ref.id,
        action: "go_live_blocked",
        status: "owner_gated",
        details: {
          productDraftId,
          missingFlags: missingLiveFlags
        }
      });
      return NextResponse.json({
        ok: false,
        status: "owner_gated",
        blockingReasons: ["live_shopify_publish_flags_disabled"],
        setupRequired: missingLiveFlags,
        message: "Shopify go-live is intentionally blocked until live publishing flags are enabled server-side."
      }, { status: 409 });
    }

    const ownerConfirmed = body.ownerConfirmed === true;
    const textConfirmed = String(body.confirmationText || "") === confirmationPhrase;
    if (!ownerConfirmed || !textConfirmed) {
      return NextResponse.json({
        ok: false,
        status: "confirmation_required",
        blockingReasons: ["explicit_owner_confirmation_required"],
        setupRequired: [`Type ${confirmationPhrase} and confirm this irreversible Shopify publish action.`]
      }, { status: 409 });
    }

    if (!config.providers.shopifyAdmin.enabled) {
      return NextResponse.json({
        ok: false,
        status: "not_configured",
        setupRequired: ["SHOPIFY_ADMIN_ENABLED=true", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"]
      }, { status: 503 });
    }

    const commerce = createCommerceProviders(config);
    const result = await commerce.admin.publishProductGuarded(shopifyProductId, review, user.id);
    if (!result.ok) {
      await repos.shopify.update(ref.id, {
        sync_status: "publish_failed",
        last_error: result.error,
        updated_by: user.id
      });
      await writeProviderEvent({
        repos,
        workspaceId,
        actorId: user.id,
        provider: "shopify",
        entityId: ref.id,
        action: "go_live_failed",
        status: "failed",
        details: { productDraftId, error: result.error, retryable: result.retryable === true }
      });
      return NextResponse.json({
        ok: false,
        status: "failed",
        message: result.error,
        retryable: result.retryable,
        rateLimited: result.rateLimited,
        setupRequired: result.setupRequired
      }, { status: result.rateLimited ? 429 : 502 });
    }

    const handle = String(ref.shopify_handle ?? ref.shopifyHandle ?? "");
    const storefrontUrl = cleanStorefrontUrl(config.NEXT_PUBLIC_STOREFRONT_BASE_URL, handle);
    const publishedAt = new Date().toISOString();
    const saved = await repos.shopify.update(ref.id, {
      shopify_status: "active",
      shopify_published_at: publishedAt,
      storefront_url: storefrontUrl,
      sync_status: "published_live",
      last_error: null,
      metadata: {
        ...(typeof ref.metadata === "object" && ref.metadata ? ref.metadata : {}),
        goLiveResult: result.data,
        ownerConfirmedAt: publishedAt
      },
      updated_by: user.id
    });
    await repos.draft.update(productDraftId, {
      shopify_status: "published_live",
      status: "published",
      updated_by: user.id
    });
    await writeProviderEvent({
      repos,
      workspaceId,
      actorId: user.id,
      provider: "shopify",
      entityId: ref.id,
      action: "go_live_published",
      status: "published_live",
      details: { productDraftId, shopifyProductId, storefrontUrl }
    });

    return NextResponse.json({
      ok: true,
      status: "published_live",
      provider: "shopify",
      reference: saved,
      storefrontUrl
    });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}
