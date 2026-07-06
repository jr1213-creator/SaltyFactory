import { notFound } from "next/navigation";
import { createRepositories } from "@saltyfactory/db";
import { getMarketingLaunchPlanDetail } from "@saltyfactory/ai-free";
import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState, classifyStudioDataError, studioWorkspaceId } from "../../../data";

export const runtime = "nodejs";

async function getLaunchPlanPageData(launchPlanId: string) {
  try {
    const detail = await getMarketingLaunchPlanDetail({
      repos: createRepositories(),
      workspaceId: studioWorkspaceId,
      launchPlanId
    });
    return { ok: true as const, setupMessage: "", detail };
  } catch (error) {
    return { ok: false as const, setupMessage: classifyStudioDataError(error), detail: null };
  }
}

function text(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function MarketingLaunchPlanDetailPage({ params }: { params: Promise<{ launchPlanId: string }> }) {
  const { launchPlanId } = await params;
  const data = await getLaunchPlanPageData(launchPlanId);
  if (!data.detail && data.ok) notFound();

  const detail = data.detail;
  const launchPlan = (detail?.launchPlan ?? {}) as any;
  const sourceEntity = (detail?.sourceEntity ?? {}) as any;
  const status = text(launchPlan.status, "draft");
  const reviewCount = detail?.approvalRequests.length ?? 0;
  const paidDraftCount = detail?.campaignDrafts.filter((draft) => String(draft.write_mode ?? draft.writeMode) === "manual_build_sheet").length ?? 0;
  const organicDraftCount = detail?.organicContentDrafts.length ?? 0;

  return <>
    <PageHeader
      eyebrow="Marketing launch package"
      title={text(launchPlan.launchName, launchPlanId)}
      description="Review the persisted launch package, queued agent artifacts, manual build sheets, policy results, and owner approval state. This page does not publish, send, launch ads, or spend money."
    >
      <LinkButton href="/studio/marketing" variant="secondary">Marketing Launch Planning</LinkButton>
      <LinkButton href="/studio/marketing/approvals" variant="secondary">Approval Queue</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />

    <section className="card-grid">
      <MetricCard title="Organic Drafts" value={String(organicDraftCount)} delta="Manual publish copy" tone="info" />
      <MetricCard title="Paid Build Sheets" value={String(paidDraftCount)} delta="No live spend" tone="warning" />
      <MetricCard title="Approval Items" value={String(reviewCount)} delta="Owner-gated artifacts" tone={reviewCount ? "warning" : "info"} />
      <MetricCard title="Policy Reviews" value={String(detail?.policyReviewResults.length ?? 0)} delta="Blocks unsafe copy" tone="success" />
    </section>

    <section className="surface-card">
      <h2>Package Controls</h2>
      <DataTable columns={["Field", "Value"]} rows={[
        ["Status", <StatusBadge key="status" status={status.replace(/_/g, " ")} tone={status === "blocked" ? "warning" : "info"} />],
        ["Source", `${text(launchPlan.sourceEntityType)}:${text(launchPlan.sourceEntityId)}`],
        ["Campaign lane", `${text(launchPlan.campaignType, "hybrid")} / ${text(launchPlan.spendType, "owner_time_only")}`],
        ["Summary", text(launchPlan.summary, "Generate the package to create reviewable artifacts.")]
      ]} />
      <form action={`/api/studio/marketing/launch-plans/${launchPlanId}/generate`} method="post">
        <input type="hidden" name="next" value={`/studio/marketing/launch-plans/${launchPlanId}`} />
        <button className="btn btn-primary" type="submit">Queue Package</button>
      </form>
    </section>

    <section className="surface-card">
      <h2>Source Entity</h2>
      <DataTable columns={["Field", "Value"]} rows={[
        ["Title", text(sourceEntity.title)],
        ["Review state", text(sourceEntity.reviewState)],
        ["Customer segment", text(sourceEntity.customerSegment)],
        ["Product category", text(sourceEntity.productCategory)],
        ["Phrases", Array.isArray(sourceEntity.phrases) ? sourceEntity.phrases.join(", ") : "-"],
        ["Evidence", text((sourceEntity.sourceEvidence as any)?.evidenceSummary ?? (sourceEntity.source_evidence as any)?.evidence_summary)]
      ]} />
    </section>

    <section className="surface-card">
      <h2>Campaign Drafts</h2>
      <DataTable
        columns={["Campaign", "Platform", "Mode", "Build Sheet"]}
        rows={detail?.campaignDrafts.length ? detail.campaignDrafts.map((draft) => [
          text(draft.campaign_name ?? draft.campaignName, String(draft.id)),
          text(draft.platform),
          text(draft.write_mode ?? draft.writeMode),
          <a key={`${draft.id}-build`} href={`/api/studio/marketing/campaign-drafts/${draft.id}/build-sheet`}>Open manual build sheet</a>
        ]) : [["No campaign drafts", "Run package generation first.", "empty", "-"]]}
      />
    </section>

    <section className="surface-card">
      <h2>Approval Requests</h2>
      <DataTable
        columns={["Target", "Requested Action", "Decision", "Save"]}
        rows={detail?.approvalRequests.length ? detail.approvalRequests.map((approval) => [
          `${text(approval.target_type ?? approval.targetType)}:${text(approval.target_id ?? approval.targetId)}`,
          text(approval.requested_action ?? approval.requestedAction).replace(/_/g, " "),
          <StatusBadge key={`${approval.id}-decision`} status={text(approval.owner_decision ?? approval.ownerDecision, "pending").replace(/_/g, " ")} tone={text(approval.owner_decision ?? approval.ownerDecision, "pending") === "approved" ? "success" : "warning"} />,
          <form key={`${approval.id}-save`} action={`/api/studio/marketing/approval-requests/${approval.id}/decide`} method="post">
            <input type="hidden" name="next" value={`/studio/marketing/launch-plans/${launchPlanId}`} />
            <select name="ownerDecision" defaultValue="needs_changes"><option value="approved">Approve</option><option value="rejected">Reject</option><option value="needs_changes">Needs changes</option></select>
            <input name="notes" placeholder="Owner note" />
            <button className="btn btn-secondary" type="submit">Save</button>
          </form>
        ]) : [["No approval requests", "Run package generation first.", "empty", "-"]]}
      />
    </section>

    <ProviderStatusCard
      title="Live execution"
      status="disabled"
      tone="warning"
      description="Build sheets are manual/export-ready only. This route never posts, sends, edits Shopify, creates live campaigns, or spends budget."
    />
  </>;
}
