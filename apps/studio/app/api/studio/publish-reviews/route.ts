import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireReviewerOrAbove } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";
import { evaluatePublishReadiness } from "./_readiness";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

export async function GET(req: Request) {
  try {
    await requireReviewerOrAbove(req, workspaceId);
    return NextResponse.json({ ok: true, reviews: await createRepositories().publish.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await readBody(req);
    const productDraftId = String(body.product_draft_id || body.productDraftId || "");
    if (!productDraftId) {
      return NextResponse.json({ ok: false, status: "validation_failed", message: "product_draft_id is required." }, { status: 400 });
    }
    const repos = createRepositories();
    const existing = await repos.publish.getByProductDraftId(workspaceId, productDraftId);
    const id = String(body.id || existing?.id || `pubrev_${Date.now()}`);
    const readiness = await evaluatePublishReadiness({ repos, workspaceId, draftId: productDraftId, reviewId: id, humanApproved: false });
    const clientGateHintsIgnored = typeof body.gates === "object" && body.gates ? ["Client-provided gate booleans were ignored; gates are computed server-side from persisted evidence."] : [];
    const reviewInput = {
      id,
      workspace_id: workspaceId,
      product_draft_id: productDraftId,
      gates: readiness.gates,
      all_gates_passed: readiness.evaluation.allowed,
      shopify_publish_allowed: false,
      printify_sync_allowed: false,
      status: readiness.evaluation.allowed ? "pending_human_approval" : "blocked",
      notes: [...clientGateHintsIgnored, ...readiness.blockingReasons],
      metadata: { clientGateHintsIgnored: Boolean(clientGateHintsIgnored.length) },
      created_by: user.id,
      updated_by: user.id
    } as any;
    const review = existing ? await repos.publish.update(existing.id, reviewInput) : await repos.publish.create(reviewInput);
    if ((req.headers.get("content-type") ?? "").includes("form")) {
      return NextResponse.redirect(new URL("/studio/publish-review", req.url), { status: 303 });
    }
    return NextResponse.json({ ok: true, status: "review_created", review, evaluation: readiness.evaluation, blockingReasons: readiness.blockingReasons });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
