import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const assetId = String(body.asset_id || body.assetId || "");
    const repos = createRepositories();
    const asset = await repos.asset.getById(assetId, workspaceId);
    if (!asset) return notFoundApiResponse();
    if (!asset.approved_for_mockup && !asset.approvedForMockup) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Product drafts require an approved private asset.", blockingReasons: ["asset_not_approved"] }, { status: 409 });
    }
    const mockupIds = Array.isArray(body.mockup_ids) ? body.mockup_ids.filter((item: unknown): item is string => typeof item === "string") : [];
    if (!mockupIds.length) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Create and approve a mockup before creating a product draft.", blockingReasons: ["approved_mockup_required"] }, { status: 409 });
    }
    const approvedMockups = [];
    for (const mockupId of mockupIds) {
      const mockup = await repos.mockup.getById(mockupId, workspaceId);
      if (!mockup || (mockup.approved_for_product !== true && mockup.approvedForProduct !== true)) {
        return NextResponse.json({ ok: false, status: "blocked", message: "Product drafts can only use approved workspace mockups.", blockingReasons: ["mockup_not_approved"] }, { status: 409 });
      }
      const mockupAssetId = String(mockup.asset_id ?? mockup.assetId ?? mockup.source_asset_id ?? mockup.sourceAssetId ?? "");
      if (mockupAssetId !== assetId) {
        return NextResponse.json({ ok: false, status: "blocked", message: "Product draft mockups must belong to the selected approved asset.", blockingReasons: ["mockup_asset_mismatch"] }, { status: 409 });
      }
      approvedMockups.push(mockupId);
    }
    const draftId = String(body.id || `draft_${Date.now()}`);
    const providerTarget = ["internal_only", "shopify_draft", "printify_draft"].includes(String(body.provider_target || body.providerTarget))
      ? String(body.provider_target || body.providerTarget)
      : "internal_only";
    const price = Number(body.price || 0);
    const estimatedCogs = Number(body.estimated_cogs || body.estimatedCogs || 0);
    const estimatedShipping = Number(body.estimated_shipping || body.estimatedShipping || 0);
    const draft = await repos.draft.create({
      id: draftId,
      workspace_id: workspaceId,
      brand: String(body.brand || "Salty Cowhide Co."),
      title: String(body.title || "Untitled POD Draft"),
      description: String(body.description || "Human review required before publishing."),
      product_type: String(body.product_type || "tee"),
      collection: String(body.collection || "Drafts"),
      tags: Array.isArray(body.tags) ? body.tags : [],
      asset_id: assetId,
      mockup_ids: approvedMockups,
      variant_ids: Array.isArray(body.variant_ids) ? body.variant_ids : [],
      public_handle: String(body.handle || body.title || draftId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || draftId,
      shopify_status: "not_published",
      printify_status: "not_synced",
      approval_status: "pending",
      validation_status: "pending",
      status: "draft",
      blocking_reasons: [],
      warnings: [],
      metadata: {
        price,
        estimated_cogs: estimatedCogs,
        estimated_shipping: estimatedShipping,
        provider_target: providerTarget,
        seo_title: String(body.seo_title || body.seoTitle || body.title || ""),
        seo_description: String(body.seo_description || body.seoDescription || body.description || ""),
        aeo_answer_block: String(body.aeo_answer_block || body.aeoAnswerBlock || ""),
        geo_summary_block: String(body.geo_summary_block || body.geoSummaryBlock || ""),
        mockups_required: true
      },
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "draft_created_requires_review", draft });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
