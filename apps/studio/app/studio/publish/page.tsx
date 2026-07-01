import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { ApprovalGateList, AuditTimeline, Card, DataTable, MetricCard, PageHeader, ProductArt, RecommendationCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { PublishWorkflowClient } from "./PublishWorkflowClient";

export default async function Page() {
  const { publishReviews, drafts, setupMessage } = await getStudioLists();
  const review = publishReviews[0] as any ?? { id: "empty", product_draft_id: "", gates: {}, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false, notes: ["No repository-backed publish review exists yet."] };
  const gateResult = evaluatePublishReviewGates(review);
  const gates = Object.entries(review.gates ?? {}).map(([label, passed]) => ({ label: label.replaceAll("_", " "), passed: Boolean(passed), detail: passed ? "Passed" : "Blocks provider sync and public projection" }));
  return <>
    <PageHeader title="Publish Review" description="Human-gated approval before products can move toward Shopify or Printify.">
      <StatusBadge status="Live publishing disabled by default" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={setupMessage} />
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
      </div>
      <Card><h2>Review Detail</h2><ProductArt label="Product Summary" /><ApprovalGateList gates={gates} /><RecommendationCard title="Automation cannot publish without human approval" description={gateResult.allowed ? "Gates are ready for guarded action readiness." : `Blocked: ${gateResult.blockedReasons.join(", ")}`} /><div className="sf-action-bar"><button className="sf-button sf-button-primary" disabled={!gateResult.allowed}>Approve & Publish</button><button className="sf-button sf-button-secondary">Request Changes</button><button className="sf-button sf-button-danger">Reject</button></div><h2>Audit trail</h2><AuditTimeline events={[{ title: "Review opened", detail: "Human review required before publish", time: "Current session" }, { title: "Gate evaluator", detail: gateResult.allowed ? "All gates pass" : "One or more gates failed", time: "Server-side" }]} /></Card>
    </div>
  </>;
}
