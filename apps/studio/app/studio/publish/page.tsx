import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { ApprovalGateList, AuditTimeline, Card, DataTable, MetricCard, PageHeader, ProductArt, ProviderReadinessCard, RecommendationCard, StatusBadge, WorkflowProgress } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { getWorkspaceProviderReadiness, isProviderReady } from "../_provider-readiness";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { assetPreviewPath, mockupPreviewPath } from "../_private-preview-paths";
import { PublishWorkflowClient } from "./PublishWorkflowClient";
import { ProviderPublishActionsClient } from "./ProviderPublishActionsClient";

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function Page() {
  const { publishReviews, drafts, assets, mockups, listingDraftsV1, marginChecks, setupMessage } = await getStudioLists();
  const readiness = await getWorkspaceProviderReadiness();
  const imageProvider = readiness.providers.image_generation;
  const printifyProvider = readiness.providers.printify;
  const shopifyProvider = readiness.providers.shopify;
  const livePublish = readiness.providers.live_publish;
  const imageReady = isProviderReady(imageProvider);
  const imageLocalDemo = imageProvider.credentialSource === "local_demo";
  const printifyReady = isProviderReady(printifyProvider);
  const shopifyReady = isProviderReady(shopifyProvider);
  const review = publishReviews[0] as any ?? { id: "empty", product_draft_id: "", gates: {}, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false, notes: ["No saved publish review exists yet."] };
  const gateResult = evaluatePublishReviewGates(review);
  const gates = Object.entries(review.gates ?? {}).map(([label, passed]) => ({ label: label.replaceAll("_", " "), passed: Boolean(passed), detail: passed ? "Passed" : "Blocks provider sync and public projection" }));
  const selectedDraft = drafts.find((draft: any) => draft.id === (review.product_draft_id ?? review.productDraftId)) as any ?? drafts[0] as any;
  const selectedMetadata = selectedDraft?.metadata && typeof selectedDraft.metadata === "object" ? selectedDraft.metadata as Record<string, unknown> : {};
  const selectedAssetId = String(selectedDraft?.asset_id ?? selectedDraft?.assetId ?? "");
  const selectedAsset = assets.find((asset: any) => asset.id === selectedAssetId);
  const selectedMockupIds = asArray(selectedDraft?.mockup_ids ?? selectedDraft?.mockupIds).map(String);
  const selectedMockups = mockups.filter((mockup: any) => selectedMockupIds.includes(String(mockup.id)));
  const selectedVariantIds = asArray(selectedDraft?.variant_ids ?? selectedDraft?.variantIds).map(String);
  const selectedCollectionId = String(selectedMetadata.shopify_collection_id ?? selectedMetadata.shopifyCollectionId ?? shopifyProvider.providerMetadata?.selectedCollectionId ?? "");
  const marginEvidence = selectedDraft ? marginChecks.some((margin: any) => margin.product_draft_id === selectedDraft.id || margin.productDraftId === selectedDraft.id) : false;
  const readinessRows = [
    ["Generated asset present", Boolean(selectedAsset), selectedAssetId || "Create or approve generated artwork"],
    ["Mockup present", selectedMockupIds.length > 0 && selectedMockups.length > 0, selectedMockupIds.length ? `${selectedMockupIds.length} attached` : "Create and approve a mockup"],
    ["Printify connected", printifyReady, printifyReady ? "Connected through provider readiness" : "Connect Printify"],
    ["Blueprint selected", Boolean(selectedMetadata.printify_blueprint_id ?? selectedMetadata.printifyBlueprintId), String(selectedMetadata.printify_blueprint_id ?? selectedMetadata.printifyBlueprintId ?? "Select in Printify Catalog")],
    ["Provider selected", Boolean(selectedMetadata.printify_print_provider_id ?? selectedMetadata.printifyPrintProviderId), String(selectedMetadata.printify_print_provider_id ?? selectedMetadata.printifyPrintProviderId ?? "Select in Printify Catalog")],
    ["Variants selected", selectedVariantIds.length > 0, selectedVariantIds.length ? `${selectedVariantIds.length} variant records` : "Save Printify variants"],
    ["Pricing reviewed", Boolean(selectedMetadata.price) || marginEvidence, selectedMetadata.price ? `$${selectedMetadata.price}` : "Review pricing and margins"],
    ["Shopify connected", shopifyReady, shopifyReady ? "Connected through provider readiness" : "Connect Shopify"],
    ["Shopify collection selected", Boolean(selectedCollectionId), selectedCollectionId || "Select default collection"],
    ["Owner approval", Boolean((review.gates ?? {}).human_approved), (review.gates ?? {}).human_approved ? "Approved" : "Owner approval required"]
  ] as const;

  return <>
    <PageHeader title="Launch gate control" description="Human-gated approval before products can move toward Shopify or Printify.">
      <StatusBadge status="Live publishing disabled by default" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={setupMessage} />
    <section className="surface-card" style={{ marginBottom: 18 }}>
      <h2>Create Publish Review</h2>
      <p className="text-muted">Creates a server-computed review from a product draft. Client-provided gates are ignored; persisted pricing, mockup, QA, risk, and owner approval evidence controls readiness.</p>
      <form className="form-grid" action="/api/studio/publish-reviews" method="post">
        <label>Product draft<select name="product_draft_id" required>{drafts.map((draft: any) => <option key={draft.id} value={draft.id}>{draft.title ?? draft.id}</option>)}</select></label>
        <button className="btn btn-primary" type="submit" disabled={!drafts.length}>Create / Recompute Review</button>
      </form>
    </section>
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Awaiting review" value={String(publishReviews.length || drafts.length)} />
      <MetricCard title="Ready to publish" value={String(publishReviews.filter((item: any) => item.all_gates_passed || item.allGatesPassed).length)} tone="success" />
      <MetricCard title="Needs changes" value={String(gateResult.blockedReasons.length)} tone="warning" icon="!" />
      <MetricCard title="Blocked by guardrails" value={gateResult.allowed ? "0" : "1"} tone="danger" />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Connected commerce stack</h2>
      <div className="provider-health-bar">
        <ProviderReadinessCard title="Image Generation" status={imageReady ? (imageLocalDemo ? "local demo" : "connected") : "setup needed"} tone={imageReady ? "success" : "warning"} description={imageReady ? imageProvider.safeMessage : imageProvider.businessFacingSetupRequired.join(", ") || imageProvider.safeMessage} />
        <ProviderReadinessCard title="Printify" status={printifyReady ? "connected" : "setup needed"} tone={printifyReady ? "success" : "warning"} description={printifyReady ? "Printify connected through Launch Setup Concierge. Draft creation still requires approved artwork, variants, pricing, and owner gates." : "Connect Printify in Launch Setup Concierge before draft product creation."} />
        <ProviderReadinessCard title="Shopify" status={shopifyReady ? "connected" : "setup needed"} tone={shopifyReady ? "success" : "warning"} description={shopifyReady ? shopifyProvider.safeMessage : shopifyProvider.businessFacingSetupRequired.join(", ") || shopifyProvider.safeMessage} />
        <ProviderReadinessCard title="Live Publish" status={livePublish.status === "owner_gated" ? "owner gated" : "blocked by default"} tone={livePublish.status === "owner_gated" ? "warning" : "danger"} description={livePublish.safeMessage} />
      </div>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Launch path</h2>
      <WorkflowProgress steps={[
        { label: "Idea", status: drafts.length ? "draft exists" : "needed", complete: drafts.length > 0 },
        { label: "Prompt", status: "owner approved only", complete: true },
        { label: "Image", status: selectedAsset ? "generated asset attached" : imageReady ? "provider connected" : "setup needed", complete: Boolean(selectedAsset) },
        { label: "QA", status: selectedAsset?.qa_status === "passed" || selectedAsset?.qaStatus === "passed" ? "passed" : "asset QA required", complete: selectedAsset?.qa_status === "passed" || selectedAsset?.qaStatus === "passed" },
        { label: "Mockup", status: selectedMockupIds.length ? "mockup attached" : "approved composite required", complete: selectedMockupIds.length > 0 },
        { label: "Printify", status: selectedVariantIds.length ? "variants selected" : "catalog selection required", complete: selectedVariantIds.length > 0 },
        { label: "Shopify Draft", status: selectedCollectionId ? "collection selected" : "collection required", complete: Boolean(selectedCollectionId) },
        { label: "Publish Ready", status: gateResult.allowed ? "ready" : "blocked", complete: gateResult.allowed }
      ]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Selected Product Readiness</h2>
      {selectedDraft ? <p className="text-muted">Draft: {selectedDraft.title ?? selectedDraft.id}. Actions stay disabled or blocked until the persisted gates below are true.</p> : <p className="text-muted">Create a product draft from approved generated artwork and a mockup first.</p>}
      {selectedAsset || selectedMockups.length ? <div className="layout-grid layout-grid-2" style={{ marginBottom: 14 }}>
        {selectedAsset ? <article className="surface-card" style={{ display: "grid", gap: 10 }}>
          <PrivateImagePreview src={assetPreviewPath(selectedAsset)} alt="Selected generated asset preview" />
          <strong>Generated asset {selectedAsset.id}</strong>
          <p className="text-muted" style={{ margin: 0 }}>QA {ownerLabel(selectedAsset.qa_status ?? selectedAsset.qaStatus)}</p>
        </article> : null}
        {selectedMockups[0] ? <article className="surface-card" style={{ display: "grid", gap: 10 }}>
          <PrivateImagePreview src={mockupPreviewPath(selectedMockups[0])} alt="Selected product mockup preview" aspectRatio="4 / 5" />
          <strong>Mockup {selectedMockups[0].id}</strong>
          <p className="text-muted" style={{ margin: 0 }}>Approved for product {String(Boolean(selectedMockups[0].approved_for_product ?? selectedMockups[0].approvedForProduct))}</p>
        </article> : null}
      </div> : null}
      <DataTable columns={["Requirement", "Ready", "Evidence / next action"]} rows={readinessRows.map(([label, ready, detail]) => [
        label,
        <StatusBadge key={label} status={ready ? "ready" : "blocked"} tone={ready ? "success" : "warning"} />,
        detail
      ])} />
      <div className="action-bar" style={{ marginTop: 12 }}>
        {!selectedAssetId ? <a className="btn btn-primary" href="/studio/briefs">Generate artwork</a> : null}
        {selectedAssetId && !selectedMockupIds.length ? <a className="btn btn-primary" href={`/studio/mockups?asset_id=${encodeURIComponent(selectedAssetId)}`}>Create mockup</a> : null}
        {selectedDraft && !selectedVariantIds.length ? <a className="btn btn-primary" href="/studio/printify-catalog">Browse Printify catalog</a> : null}
        {selectedDraft ? <a className="btn btn-secondary" href={`/studio/product-builder?draft_id=${encodeURIComponent(String(selectedDraft.id))}`}>Open product draft</a> : null}
      </div>
    </section>
    <div className="split-pane" style={{ marginTop: 18 }}>
      <div className="layout-grid">
        <PublishWorkflowClient initialReviews={publishReviews as any[]} />
        <ProviderPublishActionsClient reviews={publishReviews as any[]} drafts={drafts as any[]} />
        <DataTable columns={["Product", "Type", "Risk score", "Margin", "AI readiness", "Status"]} rows={(drafts.length ? drafts : [{ title: "No draft selected", product_type: "Empty workspace", status: "awaiting_review" }]).slice(0, 8).map((draft: any) => [draft.title ?? draft.id, draft.product_type ?? "Product", <StatusBadge key="risk" status="Review" tone="warning" />, <StatusBadge key="margin" status="Pending" tone="warning" />, <StatusBadge key="ai" status="Disabled" tone="warning" />, draft.status ?? "draft"])} />
        <section className="surface-card">
          <h2>Listing Drafts Awaiting Review</h2>
          <DataTable columns={["Listing", "Source", "Validation", "Approval", "Publish readiness"]} rows={listingDraftsV1.length ? listingDraftsV1.map((draft: any) => [
            draft.title ?? draft.id,
            draft.source_type ?? draft.sourceType ?? "manual",
            <StatusBadge key={`${draft.id}-validation`} status={String(draft.validation_status ?? draft.validationStatus ?? "blocked").replace(/_/g, " ")} tone={(draft.validation_status ?? draft.validationStatus) === "ready_for_export" ? "success" : "warning"} />,
            draft.approval_status ?? draft.approvalStatus ?? "draft",
            "Needs product draft, approved mockup, pricing, and computed publish review before provider sync"
          ]) : [["No listing drafts", "-", "empty", "-", "Approve an AI listing output or create a listing draft"]]} />
        </section>
        <section className="surface-card">
          <h2>Margin Evidence</h2>
          <DataTable columns={["Draft", "Margin", "Status"]} rows={marginChecks.length ? marginChecks.map((margin: any) => [
            margin.product_draft_id ?? margin.productDraftId,
            `${Number(margin.margin_percent ?? margin.marginPercent ?? 0).toFixed(1)}%`,
            <StatusBadge key={margin.id} status={margin.status ?? (margin.blocked ? "blocked" : "passed")} tone={margin.blocked ? "danger" : "success"} />
          ]) : [["No margin evidence", "-", "Enter pricing on Pricing & Margins"]]} />
        </section>
      </div>
      <Card><h2>Review Detail</h2><ProductArt label="Product Summary" /><ApprovalGateList gates={gates} /><RecommendationCard title="Automation cannot publish without human approval" description={gateResult.allowed ? "Gates are ready for guarded internal approval." : `Blocked: ${gateResult.blockedReasons.join(", ")}`} /><div className="action-bar"><button className="btn btn-primary" disabled title="Use the saved review workflow; public projection and provider sync remain separate guarded steps.">Use Review Workflow Below</button><button className="btn btn-secondary" disabled title="Request changes through the saved review workflow.">Request Changes</button><button className="btn btn-danger" disabled title="Reject through the saved review workflow.">Reject</button></div><h2>Audit trail</h2><AuditTimeline events={[{ title: "Review opened", detail: "Human review required before publish", time: "Current session" }, { title: "Gate evaluator", detail: gateResult.allowed ? "All gates pass" : "One or more gates failed", time: "Server-side" }]} /></Card>
    </div>
  </>;
}
