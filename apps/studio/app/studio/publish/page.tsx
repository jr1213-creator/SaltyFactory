import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { parseEnv } from "@saltyfactory/config";
import { ApprovalGateList, AuditTimeline, Card, DataTable, MetricCard, PageHeader, ProductArt, ProviderReadinessCard, RecommendationCard, StatusBadge, WorkflowProgress } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { PublishWorkflowClient } from "./PublishWorkflowClient";
import { ProviderPublishActionsClient } from "./ProviderPublishActionsClient";

export default async function Page() {
  const { publishReviews, drafts, listingDraftsV1, marginChecks, setupMessage } = await getStudioLists();
  const config = parseEnv();
  const review = publishReviews[0] as any ?? { id: "empty", product_draft_id: "", gates: {}, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false, notes: ["No saved publish review exists yet."] };
  const gateResult = evaluatePublishReviewGates(review);
  const gates = Object.entries(review.gates ?? {}).map(([label, passed]) => ({ label: label.replaceAll("_", " "), passed: Boolean(passed), detail: passed ? "Passed" : "Blocks provider sync and public projection" }));
  return <>
    <PageHeader title="Publish Review" description="Human-gated approval before products can move toward Shopify or Printify.">
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
      <MetricCard title="Awaiting review" value={String(publishReviews.length || drafts.length)} icon="○" />
      <MetricCard title="Ready to publish" value={String(publishReviews.filter((r:any)=>r.all_gates_passed || r.allGatesPassed).length)} tone="success" icon="✓" />
      <MetricCard title="Needs changes" value={String(gateResult.blockedReasons.length)} tone="warning" icon="!" />
      <MetricCard title="Blocked by guardrails" value={gateResult.allowed ? "0" : "1"} tone="danger" icon="⛔" />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Provider Readiness</h2>
      <div className="provider-health-bar">
        <ProviderReadinessCard title="Image Generation" status={config.providers.aiImage.enabled ? "configured" : "setup needed"} tone={config.providers.aiImage.enabled ? "success" : "warning"} description={config.providers.aiImage.enabled ? "Generated artwork can be created by the allowed image provider." : "Requires AI_IMAGE_ENABLED=true, HF_API_TOKEN, and HF_IMAGE_MODEL."} />
        <ProviderReadinessCard title="Printify" status={config.providers.printify.enabled ? "configured" : "setup needed"} tone={config.providers.printify.enabled ? "success" : "warning"} description={config.providers.printify.enabled ? "Printify draft creation can run after gates pass." : "Requires PRINTIFY_ENABLED=true, PRINTIFY_API_TOKEN, and PRINTIFY_SHOP_ID."} />
        <ProviderReadinessCard title="Shopify" status={config.providers.shopifyAdmin.enabled ? "configured" : "setup needed"} tone={config.providers.shopifyAdmin.enabled ? "success" : "warning"} description={config.providers.shopifyAdmin.enabled ? "Shopify draft creation can run after gates pass." : "Requires SHOPIFY_ADMIN_ENABLED=true, SHOPIFY_STORE_DOMAIN, and SHOPIFY_ADMIN_TOKEN."} />
        <ProviderReadinessCard title="Live Publish" status={config.LIVE_PUBLISHING_ENABLED ? "enabled" : "blocked by default"} tone={config.LIVE_PUBLISHING_ENABLED ? "warning" : "danger"} description="Draft creation never publishes live. Public storefront projection still requires explicit owner approval." />
      </div>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Product Pipeline</h2>
      <WorkflowProgress steps={[
        { label: "Idea", status: drafts.length ? "draft exists" : "needed", complete: drafts.length > 0 },
        { label: "Prompt", status: "owner approved only", complete: true },
        { label: "Image", status: config.providers.aiImage.enabled ? "provider configured" : "setup needed", complete: config.providers.aiImage.enabled },
        { label: "QA", status: "asset QA required", complete: false },
        { label: "Mockup", status: "approved composite required", complete: false },
        { label: "Printify", status: "draft action available", complete: false },
        { label: "Shopify Draft", status: "draft action available", complete: false },
        { label: "Publish Ready", status: gateResult.allowed ? "ready" : "blocked", complete: gateResult.allowed }
      ]} />
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
