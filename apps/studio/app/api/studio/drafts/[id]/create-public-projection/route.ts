import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { evaluatePublishReadiness } from "../../../publish-reviews/_readiness";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

const safeArray = (value: unknown) => Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 24) : [];
const metadataOf = (row: Record<string, unknown>) => row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const draft = await repos.draft.getById(id, workspaceId);
    if (!draft) return notFoundApiResponse();
    const review = await repos.publish.getByProductDraftId(workspaceId, id);
    if (!review || (review.all_gates_passed !== true && review.allGatesPassed !== true)) {
      return NextResponse.json({ ok: false, status: "blocked", message: "A passed, human-approved publish review is required before a public storefront projection can be created.", blockingReasons: ["approved_publish_review_required"] }, { status: 409 });
    }
    const readiness = await evaluatePublishReadiness({ repos, workspaceId, draftId: id, reviewId: review.id, humanApproved: true });
    if (!readiness.evaluation.allowed) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Public projection is blocked because server-computed publish gates do not pass.", blockingReasons: readiness.blockingReasons, evaluation: readiness.evaluation }, { status: 409 });
    }
    const metadata = metadataOf(draft);
    const projection = {
      id: `projection_${Date.now()}`,
      status: "published",
      title: draft.title,
      handle: draft.public_handle ?? draft.publicHandle ?? String(draft.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: draft.description,
      product_type: draft.product_type ?? draft.productType,
      collection: draft.collection,
      tags: safeArray(draft.tags),
      price: metadata.price ?? null,
      images: [],
      variants: [],
      seo_title: metadata.seo_title ?? metadata.seoTitle ?? draft.title,
      seo_description: metadata.seo_description ?? metadata.seoDescription ?? draft.description,
      schema: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: draft.title,
        description: draft.description
      },
      created_from_draft_id: id,
      approved_review_id: review.id,
      created_at: new Date().toISOString(),
      created_by: user.id
    };
    const updated = await repos.draft.update(id, {
      public_projection: projection,
      public_handle: projection.handle,
      status: "approved_internal_ready",
      updated_by: user.id
    } as any);
    return NextResponse.json({ ok: true, status: "public_projection_created", projection, draft: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
