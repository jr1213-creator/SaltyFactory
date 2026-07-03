import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const batchStages = ["idea", "prompt_approved", "generation_queued", "image_generated", "qa_passed", "mockup_ready", "printify_created", "shopify_draft_created", "ready_for_publish"];

function safeCount(value: unknown) {
  const count = Number(value ?? 15);
  return Number.isFinite(count) ? Math.max(1, Math.min(50, Math.round(count))) : 15;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "batch-product";
}

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    const repos = createRepositories();
    return NextResponse.json({
      ok: true,
      batches: await repos.productBatch.listByWorkspace(workspaceId),
      items: await repos.productBatchItem.listByWorkspace(workspaceId),
      stages: batchStages
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const targetCount = safeCount(body.targetCount ?? body.target_count);
    const name = String(body.name || `POD batch ${new Date().toISOString().slice(0, 10)}`);
    const productMix = Array.isArray(body.productMix ?? body.product_mix) ? body.productMix ?? body.product_mix : ["tee"];
    const repos = createRepositories();
    const batch = await repos.productBatch.create({
      id: `batch_${Date.now()}`,
      workspace_id: workspaceId,
      name,
      target_count: targetCount,
      trend_source: String(body.trendSource || body.trend_source || "owner_batch_input"),
      product_mix: productMix,
      status: "idea",
      progress: { total: targetCount, completed: 0 },
      blocked_reasons: [],
      created_by: user.id,
      updated_by: user.id,
      metadata: { noAutomaticPublish: true }
    });
    const items = [];
    for (let index = 0; index < targetCount; index++) {
      const productType = String(productMix[index % productMix.length] ?? "tee");
      const draftId = `draft_${batch.id}_${index + 1}`;
      const title = String((body.titles as string[] | undefined)?.[index] || `${name} product ${index + 1}`);
      const draft = await repos.draft.create({
        id: draftId,
        workspace_id: workspaceId,
        brand: "Salty Cowhide Co.",
        title,
        description: "Batch-created internal product idea. Artwork, QA, mockup, pricing, and provider drafts require owner-gated downstream actions.",
        product_type: productType,
        collection: String(body.collection || "Batch Drafts"),
        tags: ["batch", productType, "owner-review"],
        mockup_ids: [],
        variant_ids: [],
        shopify_status: "not_created",
        printify_status: "not_created",
        approval_status: "pending",
        public_handle: slug(title),
        status: "draft",
        metadata: { batch_id: batch.id, provider_target: "printify_draft", batch_sequence: index + 1 },
        created_by: user.id,
        updated_by: user.id
      });
      const item = await repos.productBatchItem.create({
        id: `batchitem_${Date.now()}_${index + 1}`,
        workspace_id: workspaceId,
        batch_id: batch.id,
        product_draft_id: draft.id,
        sequence: index + 1,
        stage: "idea",
        status: "idea",
        blockers: ["prompt_approval_required", "image_generation_required", "qa_required", "mockup_required", "provider_drafts_required"],
        retry_count: 0,
        stage_history: [{ stage: "idea", at: new Date().toISOString(), actor: user.id }],
        created_by: user.id,
        updated_by: user.id,
        metadata: { noAutomaticPublish: true }
      });
      items.push(item);
    }
    await repos.shared.events.create({
      id: `event_batch_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "product_batch",
      entity_id: batch.id,
      event_type: "product_batch_created",
      title: "POD product batch created",
      body: `${items.length} product draft items were created for owner-gated workflow execution.`,
      status: "completed",
      source_label: "owner_action",
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "batch_created", batch, items, noAutomaticPublish: true });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
