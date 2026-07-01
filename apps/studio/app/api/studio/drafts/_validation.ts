import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";

const bannedClaimPattern = /\b(bestseller|5\s*stars?|five\s*stars?|guaranteed|free shipping|happiness guarantee|100k customers?|clinically proven)\b/i;

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const array = (value: unknown) => Array.isArray(value) ? value : [];
const metadataOf = (row: WorkspaceRow) => (row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {});

export async function validateProductDraft(input: { repos: RepositoryBundle; workspaceId: string; draftId: string; actorId?: string }) {
  const draft = await input.repos.draft.getById(input.draftId, input.workspaceId);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!draft) {
    return { draft: null, valid: false, blockers: ["draft_not_found"], warnings, checks: { draft_exists: false } };
  }

  const metadata = metadataOf(draft);
  const title = text(draft.title);
  const description = text(draft.description);
  const tags = array(draft.tags);
  const price = Number(metadata.price ?? draft.price ?? 0);
  const cogs = Number(metadata.estimated_cogs ?? metadata.estimatedCogs ?? draft.estimated_cogs ?? draft.estimatedCogs ?? 0);
  const shipping = Number(metadata.estimated_shipping ?? metadata.estimatedShipping ?? 0);
  const marginAmount = price - cogs - shipping;
  const marginPercent = price > 0 ? marginAmount / price : 0;
  const assetId = text(draft.asset_id ?? draft.assetId);
  const asset = assetId ? await input.repos.asset.getById(assetId, input.workspaceId) : null;
  const qaRows = assetId ? (await input.repos.qa.listByWorkspace(input.workspaceId)).filter((row) => row.asset_id === assetId || row.assetId === assetId) : [];
  const qaPassed = qaRows.some((row) => row.status === "passed" && (row.approved_for_product_draft === true || row.approvedForProductDraft === true));
  const assetApproved = Boolean(asset?.approved_for_mockup ?? asset?.approvedForMockup);

  if (!title) blockers.push("missing_title");
  if (!description) blockers.push("missing_description");
  if (!tags.length) blockers.push("missing_tags");
  if (!asset) blockers.push("missing_asset");
  if (asset && !assetApproved) blockers.push("asset_not_approved");
  if (asset && !qaPassed) blockers.push("asset_qa_not_passed");
  if (!price || price <= 0) blockers.push("missing_price");
  if (!cogs || cogs <= 0) warnings.push("estimated_cogs_missing");
  if (price > 0 && cogs > 0 && marginPercent < 0.35) blockers.push("margin_below_threshold");
  if (bannedClaimPattern.test(`${title} ${description}`)) blockers.push("unsupported_or_fake_claims");
  if (!text(metadata.seo_title ?? metadata.seoTitle)) warnings.push("seo_title_missing");
  if (!text(metadata.seo_description ?? metadata.seoDescription)) warnings.push("seo_description_missing");
  if (metadata.provider_target === "printify_draft" && !array(metadata.variant_ids ?? draft.variant_ids ?? draft.variantIds).length) blockers.push("printify_mapping_missing");
  if (metadata.provider_target === "shopify_draft" && !text(draft.collection)) blockers.push("shopify_collection_missing");

  const checks = {
    title_present: Boolean(title),
    description_present: Boolean(description),
    tags_present: tags.length > 0,
    approved_asset_present: Boolean(asset && assetApproved),
    qa_passed: qaPassed,
    price_present: price > 0,
    cogs_present: cogs > 0,
    margin_percent: marginPercent,
    banned_claims_absent: !bannedClaimPattern.test(`${title} ${description}`),
    provider_target_ready: !blockers.some((reason) => reason.includes("printify") || reason.includes("shopify"))
  };

  if (input.actorId) {
    await input.repos.margin.create({
      id: `margin_${Date.now()}`,
      workspace_id: input.workspaceId,
      product_draft_id: input.draftId,
      price,
      estimated_cogs: cogs,
      estimated_shipping: shipping,
      margin_amount: marginAmount,
      margin_percent: marginPercent,
      margin_ok: blockers.includes("margin_below_threshold") === false && price > 0,
      blocked: blockers.includes("margin_below_threshold") || price <= 0,
      status: blockers.includes("margin_below_threshold") || price <= 0 ? "blocked" : "passed",
      created_by: input.actorId,
      updated_by: input.actorId
    });
    await input.repos.risk.create({
      id: `risk_${Date.now()}`,
      workspace_id: input.workspaceId,
      entity_type: "product_draft",
      entity_id: input.draftId,
      status: blockers.includes("unsupported_or_fake_claims") ? "blocked" : "cleared",
      risk_score: blockers.includes("unsupported_or_fake_claims") ? 90 : 10,
      findings: blockers.includes("unsupported_or_fake_claims") ? ["unsupported_or_fake_claims"] : [],
      created_by: input.actorId,
      updated_by: input.actorId
    });
    await input.repos.draft.update(input.draftId, {
      validation_status: blockers.length ? "blocked" : "passed",
      blocking_reasons: blockers,
      warnings,
      metadata: { ...metadata, price, estimated_cogs: cogs, estimated_shipping: shipping, margin_amount: marginAmount, margin_percent: marginPercent },
      updated_by: input.actorId
    });
  }

  return { draft, valid: blockers.length === 0, blockers, warnings, checks };
}
