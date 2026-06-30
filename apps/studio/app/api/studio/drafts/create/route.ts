import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    const user = await requireWorkspaceMember(req, workspaceId);
    const drafts = await createRepositories().draft.listByWorkspace(workspaceId);
    return NextResponse.json({
      ok: true,
      route: "drafts/create",
      auditActor: { actor_type: "human", actor_id: user.id },
      drafts
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const draftId = String(body.id || `draft_${Date.now()}`);
    const row = await createRepositories().draft.create(
      {
        id: draftId,
        workspace_id: workspaceId,
        status: "draft",
        approval_status: "pending",
        brand: String(body.brand || "Salty Cowhide Co."),
        title: String(body.title || ""),
        description: String(body.description || ""),
        product_type: String(body.product_type || "tee"),
        collection: String(body.collection || ""),
        tags: Array.isArray(body.tags) ? body.tags : [],
        mockup_ids: Array.isArray(body.mockup_ids) ? body.mockup_ids : [],
        variant_ids: Array.isArray(body.variant_ids) ? body.variant_ids : [],
        shopify_status: "not_published",
        printify_status: "not_synced"
      },
      {
        id: `audit_${Date.now()}`,
        workspace_id: workspaceId,
        entity_type: "product_draft",
        entity_id: draftId,
        action: "created",
        actor_type: "human",
        actor_id: user.id,
        created_at: new Date().toISOString()
      }
    );
    return NextResponse.json({ ok: true, draft: row });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
