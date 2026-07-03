import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "variant";
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = String(body.productDraftId || body.product_draft_id || "");
    const blueprintId = String(body.blueprintId || body.blueprint_id || "");
    const printProviderId = String(body.printProviderId || body.print_provider_id || "");
    const variantsInput = Array.isArray(body.variants) ? body.variants : [];
    if (!productDraftId || !blueprintId || !printProviderId || !variantsInput.length) {
      return NextResponse.json({
        ok: false,
        status: "blocked_by_guardrail",
        blockingReasons: ["product_draft_id_blueprint_provider_and_variants_required"]
      }, { status: 400 });
    }
    const repos = createRepositories();
    const draft = await repos.draft.getById(productDraftId, workspaceId);
    if (!draft) {
      return NextResponse.json({ ok: false, status: "not_found", blockingReasons: ["product_draft_not_found"] }, { status: 404 });
    }
    const created = [];
    for (const [index, raw] of variantsInput.entries()) {
      const variant = raw as Record<string, unknown>;
      const printifyVariantId = String(variant.id ?? variant.printify_variant_id ?? "");
      const price = Number(variant.price ?? body.price ?? 0);
      const cost = Number(variant.cost ?? body.cost ?? 0);
      if (!printifyVariantId || price <= 0) continue;
      const size = String(variant.size ?? variant.title ?? `Variant ${index + 1}`);
      const color = String(variant.color ?? "default");
      const marginDollars = price - cost;
      const marginPercent = price > 0 ? (marginDollars / price) * 100 : 0;
      const saved = await repos.variant.create({
        id: `variant_${Date.now()}_${index}`,
        workspace_id: workspaceId,
        product_draft_id: productDraftId,
        sku: String(variant.sku ?? `SC-${slug(String(draft.title ?? productDraftId))}-${slug(size)}-${slug(color)}`).toUpperCase(),
        size,
        color,
        color_hex: String(variant.colorHex ?? variant.color_hex ?? ""),
        printify_variant_id: printifyVariantId,
        printify_blueprint_id: blueprintId,
        printify_print_provider_id: printProviderId,
        cost,
        price,
        compare_at_price: variant.compareAtPrice ?? variant.compare_at_price ?? null,
        margin_dollars: marginDollars,
        margin_percent: marginPercent,
        margin_ok: marginPercent >= Number(body.minimumMarginPercent ?? 35),
        weight_oz: variant.weightOz ?? variant.weight_oz ?? null,
        active: variant.active !== false,
        status: "active",
        metadata: { source: "printify_catalog_selection" },
        created_by: user.id,
        updated_by: user.id
      });
      created.push(saved);
    }
    if (!created.length) {
      return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["valid_printify_variant_with_price_required"] }, { status: 409 });
    }
    const existingIds = Array.isArray(draft.variant_ids ?? draft.variantIds) ? (draft.variant_ids ?? draft.variantIds) as unknown[] : [];
    await repos.draft.update(productDraftId, {
      variant_ids: [...new Set([...existingIds.map(String), ...created.map((variant) => variant.id)])],
      metadata: { ...(draft.metadata as Record<string, unknown> | undefined), provider_target: "printify_draft", printify_blueprint_id: blueprintId, printify_print_provider_id: printProviderId },
      updated_by: user.id
    } as any);
    await repos.shared.events.create({
      id: `event_printify_selection_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "product_draft",
      entity_id: productDraftId,
      event_type: "printify_variants_selected",
      title: "Printify variants selected",
      body: `${created.length} Printify variants were persisted for publish review.`,
      status: "completed",
      source_label: "provider_catalog",
      created_by: user.id,
      updated_by: user.id,
      metadata: { blueprintId, printProviderId, variantIds: created.map((variant) => variant.printify_variant_id) }
    });
    return NextResponse.json({ ok: true, status: "printify_selection_saved", variants: created });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
