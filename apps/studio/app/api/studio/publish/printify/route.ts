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
    return NextResponse.json({ ok: true, route: "publish/printify", auditActor: { actor_type: "human", actor_id: user.id }, status: "ready_for_guarded_requests" });
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
    if (!gates.printifyAllowed) return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: gates.blockedReasons, gates }, { status: 409 });
    const config = parseEnv();
    if (!config.providers.printify.enabled) return NextResponse.json({ ok: false, status: "not_configured", setupRequired: ["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"] }, { status: 503 });
    const result = await createCommerceProviders(config).printify.createProduct({
      title: draft.title,
      description: draft.description,
      blueprintId: body.blueprintId,
      printProviderId: body.printProviderId,
      variants: body.variants ?? [],
      printAreas: body.printAreas ?? []
    });
    if (!result.ok) return NextResponse.json({ ok: false, status: "failed", message: result.error, retryable: result.retryable, rateLimited: result.rateLimited, setupRequired: result.setupRequired }, { status: result.rateLimited ? 429 : 502 });
    const saved = await repos.printify.create({
      id: `ptyref_${Date.now()}`,
      workspace_id: workspaceId,
      product_draft_id: productDraftId,
      printify_product_id: String((result.data as any).id ?? ""),
      printify_shop_id: config.PRINTIFY_SHOP_ID,
      printify_blueprint_id: String(body.blueprintId ?? ""),
      printify_print_provider_id: String(body.printProviderId ?? ""),
      printify_status: "draft",
      printify_published: false,
      synced_at: new Date().toISOString(),
      updated_by: user.id,
      created_by: user.id
    });
    return NextResponse.json({ ok: true, status: "draft_created", provider: "printify", reference: saved });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}

