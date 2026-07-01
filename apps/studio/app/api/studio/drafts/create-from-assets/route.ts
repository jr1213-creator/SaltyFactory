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
    const draftId = String(body.id || `draft_${Date.now()}`);
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
      mockup_ids: Array.isArray(body.mockup_ids) ? body.mockup_ids : [],
      variant_ids: Array.isArray(body.variant_ids) ? body.variant_ids : [],
      shopify_status: "not_published",
      printify_status: "not_synced",
      approval_status: "pending",
      status: "draft",
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "draft_created_requires_review", draft });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
