import { evaluatePublishReviewGates, type PublishReview } from "@saltyfactory/domain";
import { resolvePrintifyProvider } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";

export const computedGateDefaults = {
  human_approved: false,
  risk_checks_passed: false,
  print_file_qa_passed: false,
  margin_checks_passed: false,
  mockups_complete: false,
  title_reviewed: false,
  description_reviewed: false,
  tags_reviewed: false,
  printify_variants_valid: false,
  shopify_collection_assigned: false
};

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const asArray = (value: unknown) => Array.isArray(value) ? value : [];
const rowStatus = (row: WorkspaceRow) => String(row.status ?? row.approval_status ?? row.approvalStatus ?? "");
const isPassed = (row: WorkspaceRow) => ["passed", "approved", "cleared"].includes(rowStatus(row));
const connected = (row: WorkspaceRow | null) => ["connected"].includes(String(row?.status ?? row?.connection_status ?? row?.connectionStatus ?? ""));
const metadataOf = (row: WorkspaceRow) => row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};

export async function evaluatePublishReadiness(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  draftId: string;
  reviewId?: string;
  humanApproved?: boolean;
}) {
  const notes: string[] = [];
  const gates = { ...computedGateDefaults, human_approved: input.humanApproved === true };
  const draft = await input.repos.draft.getById(input.draftId, input.workspaceId);

  if (!draft) {
    notes.push("missing_product_draft");
  } else {
    const metadata = metadataOf(draft);
    const providerTarget = String(metadata.provider_target ?? metadata.providerTarget ?? "internal_only");
    const isInternalOnly = providerTarget === "internal_only";
    gates.title_reviewed = hasText(draft.title);
    gates.description_reviewed = hasText(draft.description);
    gates.tags_reviewed = asArray(draft.tags).length > 0;
    if (!gates.title_reviewed) notes.push("missing_title");
    if (!gates.description_reviewed) notes.push("missing_description");
    if (!gates.tags_reviewed) notes.push("missing_tags");

    const assetId = String(draft.asset_id ?? draft.assetId ?? "");
    const asset = assetId ? await input.repos.asset.getById(assetId, input.workspaceId) : null;
    if (!asset) {
      notes.push("missing_approved_asset");
    } else {
      const assetApproved = Boolean(asset.approved_for_mockup ?? asset.approvedForMockup);
      const assetQaPassed = String(asset.qa_status ?? asset.qaStatus) === "passed";
      const qaRows = (await input.repos.qa.listByWorkspace(input.workspaceId)).filter((row) => row.asset_id === assetId || row.assetId === assetId);
      const qaEvidencePassed = qaRows.some((row) => row.status === "passed" && (row.approved_for_product_draft === true || row.approvedForProductDraft === true));
      gates.print_file_qa_passed = assetApproved && assetQaPassed && qaEvidencePassed;
      if (!gates.print_file_qa_passed) notes.push("asset_qa_or_approval_missing");
    }

    const mockupIds = asArray(draft.mockup_ids ?? draft.mockupIds).map(String);
    if (isInternalOnly && metadata.mockups_required === false) {
      gates.mockups_complete = true;
    } else if (mockupIds.length) {
      const mockups = await Promise.all(mockupIds.map((id) => input.repos.mockup.getById(id, input.workspaceId)));
      gates.mockups_complete = mockups.every((mockup) => Boolean(mockup?.approved_for_product ?? mockup?.approvedForProduct) || (mockup ? rowStatus(mockup) === "approved" : false));
    }
    if (!gates.mockups_complete) notes.push("approved_mockup_missing");

    const marginRows = (await input.repos.margin.listByWorkspace(input.workspaceId)).filter((row) => row.product_draft_id === input.draftId || row.productDraftId === input.draftId);
    gates.margin_checks_passed = marginRows.length > 0 && marginRows.every((row) => (row.margin_ok === true || row.marginOk === true) && row.blocked !== true);
    if (!gates.margin_checks_passed) notes.push("margin_evidence_missing_or_failed");

    const riskRows = await input.repos.risk.listForEntity(input.workspaceId, "product_draft", input.draftId);
    gates.risk_checks_passed = riskRows.length > 0 && riskRows.every(isPassed);
    if (!gates.risk_checks_passed) notes.push("risk_evidence_missing_or_failed");

    if (isInternalOnly) {
      gates.printify_variants_valid = true;
      gates.shopify_collection_assigned = true;
    } else {
      const variants = await input.repos.variant.listByDraft(input.workspaceId, input.draftId);
      const printifyConnection = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "printify");
      const shopifyConnection = await input.repos.integration.getProviderConnectionForWorkspace(input.workspaceId, "shopify");
      let printifyReady = connected(printifyConnection);
      if (!printifyReady) {
        try {
          printifyReady = (await resolvePrintifyProvider({ workspaceId: input.workspaceId, repos: input.repos, config: parseEnv() })).status === "ready";
        } catch {
          printifyReady = false;
        }
      }
      gates.printify_variants_valid = providerTarget !== "printify_draft" || (variants.length > 0 && variants.every((row) => hasText(row.printify_variant_id ?? row.printifyVariantId)) && printifyReady);
      const shopifyCollectionId = String(metadata.shopify_collection_id ?? metadata.shopifyCollectionId ?? "");
      gates.shopify_collection_assigned = providerTarget !== "shopify_draft" || (hasText(shopifyCollectionId) && connected(shopifyConnection));
      if (!gates.printify_variants_valid) notes.push("printify_variant_or_connection_missing");
      if (!gates.shopify_collection_assigned) notes.push("shopify_collection_id_or_connection_missing");
    }
  }

  if (!gates.human_approved) notes.push("human_approval_required");
  const allGatesPassed = Object.values(gates).every(Boolean);
  const review: PublishReview = {
    id: (input.reviewId && input.reviewId.startsWith("pubrev_")) ? input.reviewId : "pubrev_pending",
    product_draft_id: input.draftId || "draft_missing",
    gates,
    all_gates_passed: allGatesPassed,
    shopify_publish_allowed: false,
    printify_sync_allowed: false,
    reviewed_by: null,
    reviewed_at: null,
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const evaluation = evaluatePublishReviewGates(review);
  return {
    review,
    gates,
    evaluation,
    blockingReasons: [...new Set([...evaluation.blockedReasons, ...notes])]
  };
}
