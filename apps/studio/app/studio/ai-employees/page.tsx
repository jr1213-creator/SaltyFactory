import { createAgenticApprovalQueue, employeeDefinitions, runAgenticPodWorkflow } from "@saltyfactory/domain";
import { AiEmployeeCard, DataTable, NextActionCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { AiApprovalQueueClient } from "./AiApprovalQueueClient";
import { AiEmployeeWorkflowClient } from "./AiEmployeeWorkflowClient";

export default async function Page() {
  const lists = await getStudioLists();
  const configured = new Map(lists.aiEmployees.map((row: any) => [row.employee_key ?? row.employeeKey, row]));
  const latestBusinessProfile = (lists.businessProfiles[0] as any)?.profile_json ?? (lists.businessProfiles[0] as any)?.profileJson ?? lists.businessProfiles[0] ?? null;
  const workflowPreview = runAgenticPodWorkflow({
    trends: lists.trends,
    clusters: lists.clusters,
    businessProfile: latestBusinessProfile as any,
    channels: lists.channels,
    podCandidates: lists.podCandidates,
    listingDrafts: lists.listingDraftsV1,
    assets: lists.assets,
    mockups: lists.mockups,
    publishReviews: lists.publishReviews,
    aiOutputs: lists.aiEmployeeOutputs,
    aiProviderConfigured: false,
    imageProviderConfigured: false
  });
  const approvalQueue = createAgenticApprovalQueue({
    agentOutputs: workflowPreview.outputs,
    aiOutputs: lists.aiEmployeeOutputs,
    podCandidates: lists.podCandidates,
    listingDrafts: lists.listingDraftsV1,
    assets: lists.assets,
    mockups: lists.mockups,
    publishReviews: lists.publishReviews
  });
  const recentRuns = [...lists.aiEmployeeRuns].slice(-6).reverse();
  const primaryEmployees = employeeDefinitions.slice(0, 15);
  return <>
    <PageHeader title="AI Employees" description="AI employees run the Salty Cowhide POD workflow as safe drafts. Jennie approves, rejects, edits, or requests changes before anything goes public." />
    <div className="layout-grid layout-grid-3">
      <ProviderStatusCard title="AI Work Queue" status={`${approvalQueue.length} waiting`} tone={approvalQueue.length ? "warning" : "success"} description="Trend reports, product ideas, prompts, assets, mockups, listings, pricing, and launch actions awaiting owner review." />
      <ProviderStatusCard title="Run mode" status="Owner-triggered" tone="primary" description="No background loops. No public/provider effects. Runs create internal draft outputs only." />
      <ProviderStatusCard title="Image generation" status="Provider-gated" tone="warning" description="When no image provider is configured, employees create prompt drafts only. No fake images are created." />
    </div>
    <AiEmployeeWorkflowClient />
    <div className="layout-grid layout-grid-3" style={{ marginTop: 18 }}>
      <NextActionCard title="AI Hiring Desk" description="Review proposed AI employee roles, edit guardrails, approve, reject, or create a setup-needed employee definition." action={<a className="btn btn-primary" href="/studio/ai-employees/hiring">Open Hiring Desk</a>} />
      <NextActionCard title="Continuous Improvement Desk" description="Review workflow, capability, training, tool-access, and handoff suggestions. Nothing self-implements." action={<a className="btn btn-secondary" href="/studio/ai-employees/improvements">Open Improvement Desk</a>} />
      <NextActionCard title="Permission Requests" description="Capability and tool access requests remain owner-gated and provider actions stay blocked by default." action={<a className="btn btn-secondary" href="/studio/ai-employees/capability-requests">Review Requests</a>} />
    </div>
    <AiApprovalQueueClient initialItems={approvalQueue as any[]} />
    <section style={{ marginTop: 18 }}>
      <h2>AI Employee Team</h2>
      <div className="layout-grid layout-grid-3">{primaryEmployees.map(([key, name, requiredSources, allowedActions]) => {
      const row = configured.get(key) as any;
      return <AiEmployeeCard key={key} name={name} role={requiredSources.join(", ")} status={row?.status ?? "setup_needed"} tasks={String(allowedActions.length)} description="Drafts and recommendations only." />;
      })}</div>
    </section>
    <div className="layout-grid layout-grid-2" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Human review requirement" status="Always required" tone="success" description="AI employee outputs cannot publish, send, spend, or sync without owner gates." />
      <ProviderStatusCard title="Provider execution" status="Rules fallback available" tone="warning" description="Model output is labeled model_generated only when a configured provider is used." />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Configure Employee</h2>
      <form className="layout-grid layout-grid-3" action="/api/studio/ai-employees/configure" method="post">
        <label>Employee<select name="employeeKey">{employeeDefinitions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <label>Monthly goal<input name="monthlyGoal" /></label>
        <label><input name="supportsRulesOnly" type="checkbox" defaultChecked /> Allow rules-only setup mode</label>
        <button className="btn" type="submit">Configure Employee</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Run History</h2>
      <DataTable columns={["Run", "Mode", "Provider", "Status", "Review"]} rows={recentRuns.length ? recentRuns.map((run: any) => [
        run.id,
        run.task_type ?? run.taskType,
        run.provider_used ?? run.providerUsed ?? "deterministic_rules",
        <StatusBadge key={run.id} status={String(run.status ?? "completed")} tone={run.status === "failed" ? "danger" : "success"} />,
        run.requires_human_review ?? run.requiresHumanReview ? "Required" : "Not required"
      ]) : [["No AI runs yet", "Run AI Employees", "rules_based", <StatusBadge key="none" status="empty" />, "Required"]]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}><h2>Permissions</h2><DataTable columns={["Employee", "Allowed actions", "Forbidden actions", "Status"]} rows={employeeDefinitions.map(([key, name,, allowed]) => [name, allowed.join(", "), "publish/send/spend/sync/delete/expose secrets", (configured.get(key) as any)?.status ?? "setup_needed"])} /></section>
  </>;
}
