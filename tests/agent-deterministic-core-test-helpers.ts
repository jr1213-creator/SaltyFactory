import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";

export const deterministicWorkspaceId = "wks_default";
export const deterministicActorId = "agent_core_test_owner";

const text = (input: unknown, fallback = "") =>
  typeof input === "string" && input.trim() ? input.trim() : fallback;

export function createDeterministicCoreRepos() {
  return createMemoryRepositories(createRepositoryStore()) as RepositoryBundle;
}

export async function seedDeterministicDraft(input: {
  repos: RepositoryBundle;
  suffix?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  productType?: string | undefined;
  tags?: string[] | undefined;
  price?: string | number | null | undefined;
  cost?: string | number | null | undefined;
  shippingCost?: string | number | null | undefined;
  paymentFee?: string | number | null | undefined;
  platformFee?: string | number | null | undefined;
  approved?: boolean | undefined;
  includeMockup?: boolean | undefined;
  includeAsset?: boolean | undefined;
}) {
  const suffix = input.suffix ?? `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const draftId = `draft_core_${suffix}`;
  const assetId = `asset_core_${suffix}`;
  const mockupId = `mockup_core_${suffix}`;
  const variantId = `variant_core_${suffix}`;
  const marginId = `margin_core_fixture_${suffix}`;
  const includeAsset = input.includeAsset ?? true;
  const includeMockup = input.includeMockup ?? true;

  if (includeAsset) {
    await input.repos.asset.create({
      id: assetId,
      workspace_id: deterministicWorkspaceId,
      status: "approved",
      qa_status: "passed",
      mime_type: "image/png",
      width: 2400,
      height: 2400,
      transparent_background: true,
      created_by: deterministicActorId,
      updated_by: deterministicActorId
    } as WorkspaceRow);
  }

  await input.repos.draft.create({
    id: draftId,
    workspace_id: deterministicWorkspaceId,
    title: input.title ?? "Coastal Cowgirl Pearl Charm Keychain",
    description: input.description ?? "Giftable coastal western pearl charm keychain with boutique styling and owner-reviewed product facts.",
    product_type: input.productType ?? "accessories",
    category: input.productType ?? "accessories",
    tags: input.tags ?? ["coastal cowgirl", "pearl charm"],
    price: input.price == null ? undefined : String(input.price),
    asset_id: includeAsset ? assetId : null,
    mockup_ids: includeMockup ? [mockupId] : [],
    approval_status: input.approved === false ? "draft" : "approved",
    status: input.approved === false ? "draft" : "approved",
    created_by: deterministicActorId,
    updated_by: deterministicActorId
  } as WorkspaceRow);

  if (includeMockup) {
    await input.repos.mockup.create({
      id: mockupId,
      workspace_id: deterministicWorkspaceId,
      product_draft_id: draftId,
      asset_id: includeAsset ? assetId : null,
      status: "approved",
      approved_for_product: true,
      quality_status: "passed",
      created_by: deterministicActorId,
      updated_by: deterministicActorId
    } as WorkspaceRow);
  }

  await input.repos.variant.create({
    id: variantId,
    workspace_id: deterministicWorkspaceId,
    product_draft_id: draftId,
    price: input.price == null ? undefined : String(input.price),
    cost: input.cost == null ? undefined : String(input.cost),
    status: "active",
    created_by: deterministicActorId,
    updated_by: deterministicActorId
  } as WorkspaceRow);

  if (input.shippingCost != null || input.paymentFee != null || input.platformFee != null || input.cost != null) {
    await input.repos.margin.create({
      id: marginId,
      workspace_id: deterministicWorkspaceId,
      product_draft_id: draftId,
      price: input.price == null ? undefined : String(input.price),
      cost: input.cost == null ? undefined : String(input.cost),
      printify_shipping_estimate: input.shippingCost == null ? undefined : String(input.shippingCost),
      shopify_fee_estimate: input.paymentFee == null ? undefined : String(input.paymentFee),
      platform_fee_estimate: input.platformFee == null ? undefined : String(input.platformFee),
      status: "passed",
      blocked: false,
      created_by: deterministicActorId,
      updated_by: deterministicActorId
    } as WorkspaceRow);
  }

  return {
    workspaceId: deterministicWorkspaceId,
    actorId: deterministicActorId,
    sourceEntityType: "product_draft",
    sourceEntityId: draftId,
    draftId,
    assetId: includeAsset ? assetId : "",
    mockupId: includeMockup ? mockupId : ""
  };
}

export function coreInput(repos: RepositoryBundle, fixture: Awaited<ReturnType<typeof seedDeterministicDraft>>, patch: Record<string, unknown> = {}) {
  return {
    repos,
    workspaceId: deterministicWorkspaceId,
    actorId: deterministicActorId,
    sourceEntityType: text(patch.sourceEntityType, fixture.sourceEntityType),
    sourceEntityId: text(patch.sourceEntityId, fixture.sourceEntityId),
    ...patch
  };
}
