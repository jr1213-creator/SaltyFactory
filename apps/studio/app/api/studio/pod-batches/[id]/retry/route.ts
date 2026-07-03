import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const itemId = String(body.itemId || body.item_id || "");
    const stage = String(body.stage || "idea");
    const repos = createRepositories();
    const batch = await repos.productBatch.getById(id, workspaceId);
    const item = itemId ? await repos.productBatchItem.getById(itemId, workspaceId) : null;
    if (!batch || !item) return notFoundApiResponse();
    if (String(item.batch_id ?? item.batchId) !== id) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["batch_item_mismatch"] }, { status: 409 });
    }
    const retryCount = Number(item.retry_count ?? item.retryCount ?? 0) + 1;
    const history = Array.isArray(item.stage_history ?? item.stageHistory) ? (item.stage_history ?? item.stageHistory) as unknown[] : [];
    const updated = await repos.productBatchItem.update(item.id, {
      stage,
      status: stage,
      blockers: [],
      retry_count: retryCount,
      last_error: null,
      stage_history: [...history, { stage, retry: retryCount, at: new Date().toISOString(), actor: user.id }],
      updated_by: user.id
    });
    await repos.shared.events.create({
      id: `event_batch_retry_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "product_batch_item",
      entity_id: item.id,
      event_type: "batch_item_retry_requested",
      title: "Batch item retry requested",
      body: `Retry requested for ${stage}. No provider action was executed by this retry marker.`,
      status: "completed",
      source_label: "owner_action",
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "retry_marked", item: updated, noProviderAction: true });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
