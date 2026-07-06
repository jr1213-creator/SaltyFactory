import { createRepositories } from "@saltyfactory/db";
import {
  commerceAgentRoleCatalog,
  listCommerceAgentRoles,
  listShopManagerBriefData
} from "@saltyfactory/ai-free";
import { DataTable, MetricCard, PageHeader, ScoreBadge, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState, classifyStudioDataError, studioWorkspaceId } from "../data";

export const runtime = "nodejs";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

async function getShopManagerData() {
  try {
    const repos = createRepositories();
    const [roles, data, campaignDrafts, organicDrafts, policyReviews] = await Promise.all([
      listCommerceAgentRoles({ repos, workspaceId: studioWorkspaceId }),
      listShopManagerBriefData({ repos, workspaceId: studioWorkspaceId }),
      repos.marketing.campaignDrafts.listByWorkspace(studioWorkspaceId),
      repos.marketing.organicContentDrafts.listByWorkspace(studioWorkspaceId),
      repos.marketing.policyReviewResults.listByWorkspace(studioWorkspaceId)
    ]);
    return { ok: true as const, setupMessage: "", roles, data, campaignDrafts, organicDrafts, policyReviews };
  } catch (error) {
    return {
      ok: false as const,
      setupMessage: classifyStudioDataError(error),
      roles: commerceAgentRoleCatalog,
      data: {
        latestBrief: null,
        approvalQueueItems: [],
        approvalPredictions: [],
        recommendations: [],
        qualityChecks: [],
        behavioralConsultations: [],
        processImprovementFindings: [],
        recentAgentRuns: []
      },
      campaignDrafts: [],
      organicDrafts: [],
      policyReviews: []
    };
  }
}

const value = (row: Record<string, any> | null | undefined, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row ? row[snake] ?? row[camel] : undefined;
const text = (input: unknown, fallback = "") => typeof input === "string" && input.trim() ? input.trim() : fallback;
const asArray = (input: unknown): any[] => Array.isArray(input) ? input : [];
const toneForRisk = (risk: string): Tone =>
  risk === "critical" || risk === "blocked" ? "danger" : risk === "high" || risk === "warning" ? "warning" : "info";

function latestPredictionFor(itemId: string, predictions: Array<Record<string, any>>) {
  return predictions.find((prediction) => text(value(prediction, "approval_item_id", "approvalItemId")) === itemId) ?? null;
}

function OwnerDecisionButtons({ item }: { item: Record<string, any> }) {
  return <form action="/api/studio/shop-manager/learn-from-approval" method="post" className="stack">
    <input type="hidden" name="next" value="/studio/shop-manager" />
    <input type="hidden" name="approvalItemId" value={String(item.id)} />
    <textarea name="ownerNotes" placeholder="Owner note" rows={2} />
    <div className="action-bar">
      <button className="btn btn-secondary" name="ownerDecision" value="approve" type="submit">Approve</button>
      <button className="btn btn-secondary" name="ownerDecision" value="reject" type="submit">Reject</button>
      <button className="btn btn-primary" name="ownerDecision" value="request_changes" type="submit">Request changes</button>
      <button className="btn btn-ghost" name="ownerDecision" value="watch_longer" type="submit">Watch longer</button>
      <button className="btn btn-ghost" name="ownerDecision" value="watch_longer" type="submit">Add note</button>
    </div>
  </form>;
}

export default async function ShopManagerPage() {
  const data = await getShopManagerData();
  const brief = data.data.latestBrief as Record<string, any> | null;
  const queue = data.data.approvalQueueItems as Array<Record<string, any>>;
  const predictions = data.data.approvalPredictions as Array<Record<string, any>>;
  const qualityWarnings = (data.data.qualityChecks as Array<Record<string, any>>).filter((row) => text(value(row, "verdict")) !== "pass");
  const noSpendItems = data.organicDrafts.filter((row: any) => String(value(row, "estimated_cash_cost", "estimatedCashCost") ?? "0") === "0");
  const paidDraftItems = data.campaignDrafts.filter((row: any) => ["manual_build_sheet", "draft_export"].includes(text(value(row, "write_mode", "writeMode"))));
  const policyBlockers = data.policyReviews.filter((row: any) => value(row, "blocked") === true || text(value(row, "verdict")) === "hard_block");

  return <>
    <PageHeader
      eyebrow="Agent Operating System"
      title="Shop Manager"
      description="Owner-facing approvals, quality control, no-spend readiness, paid-draft review, behavioral consultation, and process improvement."
    >
      <form action="/api/studio/shop-manager/run" method="post">
        <input type="hidden" name="next" value="/studio/shop-manager" />
        <input type="hidden" name="runIntent" value="shop_manager_brief" />
        <button className="btn btn-primary" type="submit">Run Shop Manager</button>
      </form>
    </PageHeader>
    <SchemaSetupState message={data.ok ? "" : data.setupMessage} />

    <section className="card-grid">
      <MetricCard title="Agents Registered" value={String(data.roles.length)} delta="Shop-management roles" tone={data.roles.length >= 28 ? "success" : "warning"} />
      <MetricCard title="Approvals Needed" value={String(queue.length)} delta="Human decision required" tone={queue.length ? "warning" : "info"} />
      <MetricCard title="Quality Warnings" value={String(qualityWarnings.length)} delta="Blockers and warnings" tone={qualityWarnings.length ? "warning" : "success"} />
      <MetricCard title="Behavioral Notes" value={String(data.data.behavioralConsultations.length)} delta="Policy review required" tone="info" />
    </section>

    <section className="surface-card">
      <h2>Daily Brief</h2>
      <p>{text(value(brief, "summary"), "No shop-manager brief exists yet.")}</p>
      <DataTable
        columns={["Priority", "Reason", "Status"]}
        rows={asArray(value(brief, "top_priorities", "topPriorities")).length ? asArray(value(brief, "top_priorities", "topPriorities")).map((item: any) => [
          String(item.priority ?? "-"),
          item.reason ?? item.id,
          <StatusBadge key={String(item.id)} status="human decision required" tone="warning" />
        ]) : [["No priorities", "Run Shop Manager after reviewable outputs exist.", "-"]]}
      />
    </section>

    <section className="surface-card">
      <h2>Approval Cards</h2>
      <div className="stack">
        {queue.length ? queue.slice(0, 8).map((item) => {
          const prediction = latestPredictionFor(String(item.id), predictions);
          const riskSummary = value(item, "risk_summary", "riskSummary") as Record<string, unknown> | undefined;
          const risk = text(riskSummary?.severity ?? riskSummary?.verdict, "medium");
          return <article className="rounded-lg border border-border bg-card p-4 shadow-sm" key={String(item.id)}>
            <div className="split-row">
              <div>
                <h3>{text(value(item, "requested_action", "requestedAction"), "request_changes").replace(/_/g, " ")}</h3>
                <p>{text(value(item, "reason"), "Owner review required.")}</p>
              </div>
              <StatusBadge status="human decision required" tone="warning" />
            </div>
            <div className="card-grid">
              <MetricCard title="Shop Manager Rec" value={text(value(prediction, "predicted_decision", "predictedDecision"), "review")} delta={text(value(prediction, "confidence_reason", "confidenceReason"), "Advisory only")} tone="info" />
              <MetricCard title="Confidence" value={String(Math.round(Number(value(prediction, "confidence_score", "confidenceScore") ?? 0) * 100))} delta="advisory, never auto-approval" tone="primary" />
              <MetricCard title="Risk" value={risk} delta="owner-gated" tone={toneForRisk(risk)} />
            </div>
            <p><strong>What happens if approved:</strong> Internal draft can move to the next owner-reviewed stage; no publishing, sending, posting, spend, Shopify mutation, Printify call, HF call, or image generation occurs.</p>
            <p><strong>What happens if rejected:</strong> The item remains stopped for revision or archive.</p>
            <p><strong>Suggested edit:</strong> {text(value(prediction, "suggested_edit_to_get_approved", "suggestedEditToGetApproved"), "Resolve blocker evidence or rewrite with substantiated policy-safe language.")}</p>
            <OwnerDecisionButtons item={item} />
          </article>;
        }) : <p>No approval cards exist yet.</p>}
      </div>
    </section>

    <section className="card-grid">
      <section className="surface-card">
        <h2>No-Spend Marketing</h2>
        <DataTable columns={["Draft", "Type", "Review"]} rows={noSpendItems.length ? noSpendItems.slice(0, 6).map((row: any) => [
          row.id,
          text(value(row, "content_type", "contentType"), "organic"),
          <StatusBadge key={row.id} status={text(value(row, "review_status", "reviewStatus"), "pending review")} tone="warning" />
        ]) : [["No no-spend items", "Run an organic launch planner or marketing launch package.", "-"]]} />
      </section>
      <section className="surface-card">
        <h2>Paid Draft Items</h2>
        <DataTable columns={["Campaign", "Mode", "Review"]} rows={paidDraftItems.length ? paidDraftItems.slice(0, 6).map((row: any) => [
          text(value(row, "campaign_name", "campaignName"), row.id),
          text(value(row, "write_mode", "writeMode"), "manual_build_sheet").replace(/_/g, " "),
          <StatusBadge key={row.id} status="manual only" tone="warning" />
        ]) : [["No paid draft items", "Campaign build sheets appear here after owner-reviewed planning.", "-"]]} />
      </section>
    </section>

    <section className="surface-card">
      <h2>Quality Warnings & Policy Blockers</h2>
      <DataTable
        columns={["Type", "Verdict", "Score", "Fix"]}
        rows={qualityWarnings.length ? qualityWarnings.slice(0, 8).map((row) => [
          text(value(row, "check_type", "checkType"), "quality"),
          <StatusBadge key={`${row.id}-v`} status={text(value(row, "verdict"), "warning")} tone={toneForRisk(text(value(row, "verdict"), "warning"))} />,
          <ScoreBadge key={`${row.id}-s`} score={Number(value(row, "score") ?? 0)} />,
          asArray(value(row, "fix_suggestions", "fixSuggestions")).join("; ") || "Owner review required"
        ]) : policyBlockers.length ? policyBlockers.slice(0, 8).map((row: any) => [
          text(value(row, "target_type", "targetType"), "policy"),
          <StatusBadge key={`${row.id}-blocked`} status={text(value(row, "verdict"), "blocked")} tone="danger" />,
          "-",
          asArray(value(row, "fix_suggestions", "fixSuggestions")).join("; ") || "Policy fix required"
        ]) : [["No blockers", "No quality or policy blockers recorded.", "-", "-"]]}
      />
    </section>

    <section className="card-grid">
      <section className="surface-card">
        <h2>Behavioral Consultation Notes</h2>
        <DataTable columns={["Consultation", "Warnings", "Policy"]} rows={data.data.behavioralConsultations.length ? data.data.behavioralConsultations.slice(0, 6).map((row: any) => {
          const output = value(row, "output_json", "outputJson") as Record<string, any> | undefined;
          return [
            text(value(row, "consultation_type", "consultationType"), "consultation"),
            asArray(output?.sensitive_attribute_warnings).join(", ") || "none",
            <StatusBadge key={row.id} status="policy review required" tone="warning" />
          ];
        }) : [["No consultations", "Run Team Psychologist from a PDP, audience, or copy context.", "-"]]} />
      </section>
      <section className="surface-card">
        <h2>Process Improvement Findings</h2>
        <DataTable columns={["Finding", "Severity", "Change"]} rows={data.data.processImprovementFindings.length ? data.data.processImprovementFindings.slice(0, 6).map((row: any) => [
          text(value(row, "title"), row.id),
          <StatusBadge key={row.id} status={text(value(row, "severity"), "medium")} tone={toneForRisk(text(value(row, "severity"), "medium"))} />,
          text(value(row, "recommended_process_change", "recommendedProcessChange"), "Owner review required")
        ]) : [["No findings", "Quality Control has not found repeated issues yet.", "-", "-"]]} />
      </section>
    </section>

    <section className="surface-card">
      <h2>Run Agent</h2>
      <form action="/api/studio/commerce-agents/run" method="post" className="stack">
        <label>Agent<select name="roleKey" defaultValue="product_readiness_launch_gate">{data.roles.map((role: any) => <option key={role.role_key ?? role.roleKey} value={role.role_key ?? role.roleKey}>{role.display_name ?? role.displayName}</option>)}</select></label>
        <label>Launch plan ID<input name="launchPlanId" placeholder="mlaunch_..." /></label>
        <label>Source entity type<input name="sourceEntityType" placeholder="product_concept_candidate" /></label>
        <label>Source entity ID<input name="sourceEntityId" placeholder="concept_..." /></label>
        <label>Audience context<input name="audienceContext" placeholder="women 40+ in Texas as targeting context, not direct ad copy" /></label>
        <label>Copy to check<textarea name="content" rows={3} placeholder="Owner-reviewable copy or PDP/ad context" /></label>
        <button className="btn btn-primary" type="submit">Run Selected Agent</button>
      </form>
    </section>

    <section className="surface-card">
      <h2>Recent Agent Runs</h2>
      <DataTable columns={["Run", "Role", "Status"]} rows={data.data.recentAgentRuns.length ? data.data.recentAgentRuns.map((row: any) => [
        <a key={row.id} href={`/api/studio/commerce-agents/runs/${row.id}`}>{row.id}</a>,
        text(value(row, "employee_type", "employeeType"), "agent"),
        <StatusBadge key={`${row.id}-status`} status={text(value(row, "status"), "unknown")} tone={text(value(row, "status")) === "completed" ? "success" : "warning"} />
      ]) : [["No runs", "Run an agent to create transcript evidence.", "-"]]} />
    </section>
  </>;
}
