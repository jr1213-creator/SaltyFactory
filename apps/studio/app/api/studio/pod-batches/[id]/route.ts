import { NextResponse } from "next/server";
import { requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const batch = await repos.productBatch.getById(id, workspaceId);
    if (!batch) return notFoundApiResponse();
    const items = (await repos.productBatchItem.listByWorkspace(workspaceId)).filter((item) => item.batch_id === id || item.batchId === id);
    const drafts = await Promise.all(items.map((item) => repos.draft.getById(String(item.product_draft_id ?? item.productDraftId ?? ""), workspaceId)));
    return NextResponse.json({ ok: true, batch, items, drafts: drafts.filter(Boolean) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
