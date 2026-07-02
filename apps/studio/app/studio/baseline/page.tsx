import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { createBaselineMetrics, scoreChannelCompleteness } from "@saltyfactory/domain";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function BaselinePage() {
  const lists = await getStudioLists();
  const latest = [...lists.baselines].sort((a: any, b: any) => String(b.captured_at ?? b.capturedAt ?? "").localeCompare(String(a.captured_at ?? a.capturedAt ?? "")))[0] as any;
  const current = createBaselineMetrics({ workspaceMetrics: lists.workspaceMetrics as any, businessProfileScore: Number((lists.businessProfiles[0] as any)?.readiness_score ?? 0), channelScore: scoreChannelCompleteness(lists.channels as any).score, counts: { pod_migration_candidates: lists.podCandidates.length, listing_drafts: lists.listingDraftsV1.length, active_ai_employees: lists.aiEmployees.filter((row: any) => ["ready", "active"].includes(row.status)).length } });
  return <>
    <PageHeader title="Baseline + Impact" description="Provider-imported and manual operating metrics for before/after comparison.">
      <StatusBadge status={latest?.status ?? "no_baseline"} tone={latest ? "success" : "warning"} />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Baseline" value={latest ? "Captured" : "Missing"} delta={latest?.captured_at ?? "Create one"} tone={latest ? "success" : "warning"} />
      <MetricCard title="Current metrics" value={String(Object.keys(current.metrics).length)} delta={current.status} />
      <MetricCard title="Insufficient data" value={String(current.insufficientData.length)} delta="Honest gaps" tone={current.insufficientData.length ? "warning" : "success"} />
      <MetricCard title="History" value={String(lists.baselines.length)} delta="Snapshots" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <form action="/api/studio/baseline" method="post">
        <label>Snapshot name<input name="snapshotName" defaultValue={`Baseline ${new Date().toISOString().slice(0, 10)}`} /></label>
        <button className="sf-button" type="submit">Create Baseline Snapshot</button>
      </form>
    </section>
    <DataTable columns={["Metric", "Value"]} rows={Object.entries(current.metrics).slice(0, 20).map(([key, value]) => [key, String(value)])} />
    <DataTable columns={["Insufficient data"]} rows={current.insufficientData.length ? current.insufficientData.map((item) => [item]) : [["No provider gaps detected"]]} />
  </>;
}

