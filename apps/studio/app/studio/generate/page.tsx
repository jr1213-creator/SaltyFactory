import { DataTable, EmptyState, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getStudioLists } from "../data";

export default async function Page() {
  const { jobs } = await getStudioLists();
  const cfg = parseEnv();
  return <>
    <PageHeader title="Generation Queue" description="Provider-gated job monitoring for image generation and downstream asset processing.">
      <button className="sf-button sf-button-primary" disabled={!cfg.providers.aiImage.enabled}>Submit Generation</button>
    </PageHeader>
    <div className="sf-grid sf-grid-3"><MetricCard title="Queued jobs" value={String(jobs.filter((j:any)=>j.status==="queued").length)} /><MetricCard title="Running" value={String(jobs.filter((j:any)=>j.status==="running").length)} tone="info" /><MetricCard title="Failed" value={String(jobs.filter((j:any)=>j.status==="failed").length)} tone="danger" /></div>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}><section className="sf-card"><h2>Active Jobs</h2>{jobs.length ? <DataTable columns={["Job", "Status", "Provider", "Retries"]} rows={jobs.map((job:any)=>[job.id, <StatusBadge key="s" status={job.status ?? "queued"} />, job.provider ?? "disabled", String(job.retry_count ?? 0)])} /> : <EmptyState title="No generation jobs" description="Jobs appear after an approved brief is sent to a configured provider." />}</section><ProviderStatusCard title="Image generation provider" status={cfg.providers.aiImage.enabled ? "Configured" : "Disabled"} tone={cfg.providers.aiImage.enabled ? "success" : "warning"} description="Disabled providers make no network calls." /></div>
  </>;
}
