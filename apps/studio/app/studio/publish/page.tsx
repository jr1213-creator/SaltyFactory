import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { ApprovalGateList, AuditTimeline, Card, DataTable, MetricCard, PageHeader, ProductArt, RecommendationCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { PublishWorkflowClient } from "./PublishWorkflowClient";

export default async function Page() {
  const { publishReviews, drafts, listingDraftsV1, marginChecks, setupMessage } = await getStudioLists();
  const review = publishReviews[0] as any ?? { id: "empty", product_draft_id: "", gates: {}, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false, notes: ["No saved publish review exists yet."] };
  const gateResult = evaluatePublishReviewGates(review);
  const gates = Object.entries(review.gates ?? {}).map(([label, passed]) => ({ label: label.replaceAll("_", " "), passed: Boolean(passed), detail: passed ? "Passed" : "Blocks provider sync and public projection" }));
  return <>
    <PageHeader title="Publish Review" description="Human-gated approval before products can move toward Shopify or Printify.">
      <StatusBadge status="Live publishing disabled by default" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={setupMessage} />
    <section className="sf-card" style={{ marginBottom: 18 }}>
      <h2>Create Publish Review</h2>
      <p className="sf-muted">Creates a server-computed review from a product draft. Client-provided gates are ignored; persisted pricing, mockup, QA, risk, and owner approval evidence controls readiness.</p>
      <form className="sf-form-grid" action="/api/studio/publish-reviews" method="post">
        <label>Product draft<select name="product_draft_id" required>{drafts.map((draft: any) => <option key={draft.id} value={draft.id}>{draft.title ?? draft.id}</option>)}</select></label>
        <button className="sf-button sf-button-primary" type="submit" disabled={!drafts.length}>Create / Recompute Review</button>
      </form>
    </section>
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Awaiting review" value={String(publishReviews.length || drafts.length)} icon="○" />
      <MetricCard title="Ready to publish" value={String(publishReviews.filter((r:any)=>r.all_gates_passed || r.allGatesPassed).length)} tone="success" icon="✓" />
      <MetricCard title="Needs changes" value={String(gateResult.blockedReasons.length)} tone="warning" icon="!" />
      <MetricCard title="Blocked by guardrails" value={gateResult.allowed ? "0" : "1"} tone="danger" icon="⛔" />
    </div>
    <div className="sf-split-pane" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <PublishWorkflowClient initialReviews={publishReviews as any[]} />
        <DataTable columns={["Product", "Type", "Risk score", "Margin", "AI readiness", "Status"]} rows={(drafts.length ? drafts : [{ title: "No draft selected", product_type: "Empty workspace", status: "awaiting_review" }]).slice(0, 8).map((draft: any) => [draft.title ?? draft.id, draft.product_type ?? "Product", <StatusBadge key="risk" status="Review" tone="warning" />, <StatusBadge key="margin" status="Pending" tone="warning" />, <StatusBadge key="ai" status="Disabled" tone="warning" />, draft.status ?? "draft"])} />
        <section className="sf-card">
          <h2>Listing Drafts Awaiting Review</h2>
          <DataTable columns={["Listing", "Source", "Validation", "Approval", "Publish readiness"]} rows={listingDraftsV1.length ? listingDraftsV1.map((draft: any) => [
            draft.title ?? draft.id,
            draft.source_type ?? draft.sourceType ?? "manual",
            <StatusBadge key={`${draft.id}-validation`} status={String(draft.validation_status ?? draft.validationStatus ?? "blocked").replace(/_/g, " ")} tone={(draft.validation_status ?? draft.validationStatus) === "ready_for_export" ? "success" : "warning"} />,
            draft.approval_status ?? draft.approvalStatus ?? "draft",
            "Needs product draft, approved mockup, pricing, and computed publish review before provider sync"
          ]) : [["No listing drafts", "-", "empty", "-", "Approve an AI listing output or create a listing draft"]]} />
        </section>
        <section className="sf-card">
          <h2>Margin Evidence</h2>
          <DataTable columns={["Draft", "Margin", "Status"]} rows={marginChecks.length ? marginChecks.map((margin: any) => [
            margin.product_draft_id ?? margin.productDraftId,
            `${Number(margin.margin_percent ?? margin.marginPercent ?? 0).toFixed(1)}%`,
            <StatusBadge key={margin.id} status={margin.status ?? (margin.blocked ? "blocked" : "passed")} tone={margin.blocked ? "danger" : "success"} />
          ]) : [["No margin evidence", "-", "Enter pricing on Pricing & Margins"]]} />
        </section>
      </div>
      <Card><h2>Review Detail</h2><ProductArt label="Product Summary" /><ApprovalGateList gates={gates} /><RecommendationCard title="Automation cannot publish without human approval" description={gateResult.allowed ? "Gates are ready for guarded internal approval." : `Blocked: ${gateResult.blockedReasons.join(", ")}`} /><div className="sf-action-bar"><button className="sf-button sf-button-primary" disabled title="Use the saved review workflow; public projection and provider sync remain separate guarded steps.">Use Review Workflow Below</button><button className="sf-button sf-button-secondary" disabled title="Request changes through the saved review workflow.">Request Changes</button><button className="sf-button sf-button-danger" disabled title="Reject through the saved review workflow.">Reject</button></div><h2>Audit trail</h2><AuditTimeline events={[{ title: "Review opened", detail: "Human review required before publish", time: "Current session" }, { title: "Gate evaluator", detail: gateResult.allowed ? "All gates pass" : "One or more gates failed", time: "Server-side" }]} /></Card>
    </div>
  </>;
}
