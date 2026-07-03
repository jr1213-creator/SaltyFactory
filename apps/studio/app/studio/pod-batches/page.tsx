import { DataTable, EmptyState, MetricCard, PageHeader, ProgressBar, ProviderStatusCard, StatusBadge, WorkflowProgress } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

const stages = ["idea", "prompt_approved", "generation_queued", "image_generated", "qa_passed", "mockup_ready", "printify_created", "shopify_draft_created", "ready_for_publish"];

function pct(batch: any, items: any[]) {
  const batchItems = items.filter((item) => String(item.batch_id ?? item.batchId) === String(batch.id));
  if (!batchItems.length) return 0;
  const total = stages.length * batchItems.length;
  const done = batchItems.reduce((sum, item) => sum + Math.max(0, stages.indexOf(String(item.stage ?? "idea")) + 1), 0);
  return Math.round((done / total) * 100);
}

export default async function PodBatchesPage() {
  const lists = await getStudioLists();
  const batches = lists.productBatches as any[];
  const items = lists.productBatchItems as any[];
  const blocked = items.filter((item) => (item.blockers ?? []).length || item.status === "blocked" || item.status === "failed").length;
  const ready = items.filter((item) => item.stage === "ready_for_publish" || item.status === "ready_for_publish").length;
  return <>
    <PageHeader
      eyebrow="Provider-backed POD production"
      title="POD Batches"
      description="Track 15-product batch progress from idea through image, QA, mockup, Printify, Shopify draft, and publish readiness. Provider work is never auto-published."
    >
      <a className="sf-button sf-button-primary" href="/studio/pod-batches/new">New batch</a>
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Batches" value={String(batches.length)} delta="Persisted workspace records" />
      <MetricCard title="Batch items" value={String(items.length)} delta="Product draft work items" />
      <MetricCard title="Ready items" value={String(ready)} delta="Manual publish review required" tone={ready ? "success" : "warning"} />
      <MetricCard title="Blocked or failed" value={String(blocked)} delta="Exact blockers shown per item" tone={blocked ? "warning" : "success"} />
    </div>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Bulk publish" status="disabled" tone="warning" description="Batch workflows can create provider drafts per item, but no bulk publish happens without explicit final confirmation." />
      <section className="sf-card">
        <h2>Standard Batch Stages</h2>
        <WorkflowProgress steps={stages.map((stage) => ({ label: stage.replace(/_/g, " "), status: "owner-gated" }))} />
      </section>
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Batch Workspace</h2>
      {batches.length ? <DataTable columns={["Batch", "Status", "Items", "Progress", "Open"]} rows={batches.map((batch: any) => {
        const batchItems = items.filter((item) => String(item.batch_id ?? item.batchId) === String(batch.id));
        const progress = pct(batch, items);
        return [
          batch.name ?? batch.id,
          <StatusBadge key={`${batch.id}-status`} status={String(batch.status ?? "idea").replace(/_/g, " ")} />,
          String(batchItems.length),
          <ProgressBar key={`${batch.id}-progress`} value={progress} label={`${progress}%`} />,
          <a key={`${batch.id}-open`} className="sf-button sf-button-secondary" href={`/studio/pod-batches/${batch.id}`}>Open</a>
        ];
      })} /> : <EmptyState title="No batches yet" description="Create a batch to persist product draft work items for a provider-gated drop." action={<a className="sf-button sf-button-primary" href="/studio/pod-batches/new">Create batch</a>} />}
    </section>
  </>;
}
