import { createRepositories } from "@saltyfactory/db";
import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { listMarketingApprovalQueue, listMarketingLaunchPlans, listMarketingSources } from "@saltyfactory/ai-free";
import { SchemaSetupState, classifyStudioDataError, studioWorkspaceId } from "../data";

async function getMarketingLaunchStudioData() {
  try {
    const repos = createRepositories();
    const [sources, launchPlans, approvals] = await Promise.all([
      listMarketingSources({ repos, workspaceId: studioWorkspaceId }),
      listMarketingLaunchPlans({ repos, workspaceId: studioWorkspaceId }),
      listMarketingApprovalQueue({ repos, workspaceId: studioWorkspaceId })
    ]);
    return { ok: true as const, setupMessage: "", sources, launchPlans, approvals };
  } catch (error) {
    return { ok: false as const, setupMessage: classifyStudioDataError(error), sources: [], launchPlans: [], approvals: [] };
  }
}

export const runtime = "nodejs";

export default async function MarketingLaunchPlannerPage() {
  const data = await getMarketingLaunchStudioData();
  const noSpendCount = data.launchPlans.filter((plan: any) => String(plan.spendType ?? "") === "no_spend").length;
  const paidOrHybridCount = data.launchPlans.filter((plan: any) => ["paid", "hybrid"].includes(String(plan.campaignType ?? ""))).length;

  return <>
    <PageHeader
      eyebrow="Owner-Reviewable Marketing Launch Packages"
      title="Marketing Launch Planning"
      description="Generate organic, SEO, social, lifecycle, paid-draft, policy-review, and approval-queue artifacts without live posting, sending, storefront mutation, or ad spend."
    >
      <LinkButton href="/studio/marketing/approvals" variant="secondary">Approval Queue</LinkButton>
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Legacy Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.ok ? "" : data.setupMessage} />

    <section className="card-grid">
      <MetricCard title="Launch Plans" value={String(data.launchPlans.length)} delta="Persisted marketing packages" tone="info" />
      <MetricCard title="No-Spend Options" value={String(noSpendCount)} delta="$0 cash cost lane" tone="success" />
      <MetricCard title="Paid Draft Options" value={String(paidOrHybridCount)} delta="Manual build sheet only" tone="warning" />
      <MetricCard title="Pending Approvals" value={String(data.approvals.length)} delta="Owner action required" tone={data.approvals.length ? "warning" : "info"} />
    </section>

    <section className="surface-card">
      <h2>Seed Brand Voice</h2>
      <p>Create or refresh the Salty Cowhide Co. brand voice and claim guardrails before generating launch packages.</p>
      <form action="/api/studio/marketing/brand-voice/seed-salty-cowhide" method="post">
        <input type="hidden" name="next" value="/studio/marketing" />
        <button className="btn btn-secondary" type="submit">Seed Salty Cowhide Brand Voice</button>
      </form>
    </section>

    <section className="surface-card">
      <h2>Create Launch Plan</h2>
      <p>Provide an approved source entity. This stores the plan only; generation stays queued/manual-reviewable.</p>
      <form action="/api/studio/marketing/launch-plans/create" method="post" className="stack">
        <input type="hidden" name="next" value="/studio/marketing" />
        <label>Source entity type<select name="sourceEntityType" defaultValue="product_concept_candidate"><option value="product_concept_candidate">Approved product concept</option><option value="product_draft">Approved product draft</option><option value="listing_draft">Approved listing draft</option><option value="shopify_draft">Shopify draft-like record</option><option value="shopify_product">Shopify product record</option></select></label>
        <label>Source entity ID<input name="sourceEntityId" placeholder="concept_..., draft_..., listing_..." /></label>
        <label>Campaign type<select name="campaignType" defaultValue="hybrid"><option value="organic">Organic</option><option value="hybrid">Hybrid</option><option value="paid">Paid draft</option><option value="marketplace">Marketplace</option><option value="outreach">Outreach</option></select></label>
        <label>Spend type<select name="spendType" defaultValue="owner_time_only"><option value="no_spend">No spend</option><option value="owner_time_only">Owner time only</option><option value="paid_media">Paid media draft</option><option value="paid_tooling">Paid tooling draft</option></select></label>
        <label>Launch name<input name="launchName" placeholder="Summer charm launch package" /></label>
        <button className="btn btn-primary" type="submit">Create Launch Plan</button>
      </form>
    </section>

    <section className="surface-card">
      <h2>Launch Plans</h2>
      <DataTable
        columns={["Launch", "Lane", "Status", "Risk", "Generate"]}
        rows={data.launchPlans.length ? data.launchPlans.map((plan: any) => [
          <a key={`${plan.id}-open`} href={`/studio/marketing/launch-plans/${plan.id}`}>{plan.launchName ?? plan.id}</a>,
          `${plan.campaignType ?? "hybrid"} / ${plan.spendType ?? "owner_time_only"}`,
          <StatusBadge key={`${plan.id}-status`} status={String(plan.status ?? "draft").replace(/_/g, " ")} tone={String(plan.status ?? "") === "blocked" ? "warning" : "info"} />,
          plan.requiresAdBudget ? "Paid draft blocked from live spend" : "$0 cash cost lane available",
          <form key={`${plan.id}-generate`} action={`/api/studio/marketing/launch-plans/${plan.id}/generate`} method="post">
            <input type="hidden" name="next" value="/studio/marketing" />
            <button className="btn btn-secondary" type="submit">Queue Package</button>
          </form>
        ]) : [["No launch plans", "Create one from an approved concept/draft", "empty", "No live actions exist yet", "-"]]}
      />
    </section>

    <section className="surface-card">
      <h2>Approval Queue</h2>
      <DataTable
        columns={["Target", "Requested Action", "Decision", "Save"]}
        rows={data.approvals.length ? data.approvals.map((approval: any) => [
          `${approval.targetType ?? approval.target_type}:${approval.targetId ?? approval.target_id}`,
          String(approval.requestedAction ?? approval.requested_action ?? "owner_review_required").replace(/_/g, " "),
          <StatusBadge key={`${approval.id}-decision`} status={String(approval.ownerDecision ?? approval.owner_decision ?? "pending").replace(/_/g, " ")} tone={String(approval.ownerDecision ?? approval.owner_decision ?? "pending") === "approved" ? "success" : "warning"} />,
          <form key={`${approval.id}-save`} action={`/api/studio/marketing/approval-requests/${approval.id}/decide`} method="post">
            <input type="hidden" name="next" value="/studio/marketing" />
            <select name="ownerDecision" defaultValue="needs_changes"><option value="approved">Approve</option><option value="rejected">Reject</option><option value="needs_changes">Needs changes</option></select>
            <input name="notes" placeholder="Owner note" />
            <button className="btn btn-secondary" type="submit">Save</button>
          </form>
        ]) : [["No approval items", "Generate a launch package first.", "empty", "-"]]}
      />
    </section>

    <section className="surface-card">
      <h2>Source Registry</h2>
      <DataTable
        columns={["Source", "Mode", "Credential", "Enabled"]}
        rows={data.sources.map((source: any) => [
          source.displayName ?? source.display_name,
          String(source.accessMode ?? source.access_mode ?? "read_only").replace(/_/g, " "),
          String(source.credentialStatus ?? source.credential_status ?? "not_configured").replace(/_/g, " "),
          <StatusBadge key={String(source.id)} status={String(source.isEnabled ?? source.is_enabled ? "enabled" : "disabled")} tone={source.isEnabled ?? source.is_enabled ? "success" : "warning"} />
        ])}
      />
    </section>

    <ProviderStatusCard
      title="Launch guardrails"
      status="required"
      tone="warning"
      description="No live ad writes, no Shopify edits, no posts, no sends, and no image generation exist on this page. Every artifact still requires owner approval."
    />
  </>;
}
