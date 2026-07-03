import { notFound } from "next/navigation";
import { createRepositories } from "@saltyfactory/db";
import { BlockerCard, DataTable, PageHeader, ProductPipelineCard, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { studioWorkspaceId } from "../../data";
import { PodBatchRetryClient } from "../PodBatchRetryClient";

const stages = ["idea", "prompt_approved", "generation_queued", "image_generated", "qa_passed", "mockup_ready", "printify_created", "shopify_draft_created", "ready_for_publish"];

function stageSteps(item: any) {
  const current = stages.indexOf(String(item.stage ?? "idea"));
  return stages.map((stage, index) => ({ label: stage.replace(/_/g, " "), status: index <= current ? "complete" : "blocked", complete: index <= current }));
}

export default async function PodBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repos = createRepositories();
  const batch = await repos.productBatch.getById(id, studioWorkspaceId);
  if (!batch) notFound();
  const items = (await repos.productBatchItem.listByWorkspace(studioWorkspaceId)).filter((item: any) => String(item.batch_id ?? item.batchId) === id);
  const drafts = await Promise.all(items.map((item: any) => repos.draft.getById(String(item.product_draft_id ?? item.productDraftId), studioWorkspaceId)));
  const draftMap = new Map(drafts.filter(Boolean).map((draft: any) => [String(draft.id), draft]));
  const blockers = items.flatMap((item: any) => item.blockers ?? []);
  return <>
    <PageHeader
      eyebrow="Batch detail"
      title={String(batch.name ?? batch.id)}
      description="Per-item workflow status for image generation, QA, mockups, Printify product creation, Shopify draft creation, and publish readiness."
    >
      <a className="sf-button sf-button-secondary" href="/studio/pod-batches">All batches</a>
      <a className="sf-button sf-button-primary" href="/studio/publish-review">Publish review</a>
    </PageHeader>
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Items" status={String(items.length)} tone="info" description="Persisted product draft records in this batch." />
      <ProviderStatusCard title="Provider actions" status="per item only" tone="warning" description="Retry markers do not execute Printify, Shopify, image, or publish actions." />
      <BlockerCard title="Current Batch Blockers" blockers={blockers.slice(0, 8)} />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Batch Items</h2>
      <DataTable columns={["#", "Product", "Stage", "Blockers", "Provider state", "Retry"]} rows={items.map((item: any) => {
        const draft = draftMap.get(String(item.product_draft_id ?? item.productDraftId));
        return [
          String(item.sequence ?? "-"),
          draft?.title ?? item.product_draft_id ?? item.id,
          <StatusBadge key={`${item.id}-stage`} status={String(item.stage ?? "idea").replace(/_/g, " ")} />,
          (item.blockers ?? []).join(", ") || "-",
          `Printify ${draft?.printify_status ?? draft?.printifyStatus ?? "not_created"} / Shopify ${draft?.shopify_status ?? draft?.shopifyStatus ?? "not_created"}`,
          <PodBatchRetryClient key={`${item.id}-retry`} batchId={id} itemId={item.id} stage={String(item.stage ?? "idea")} />
        ];
      })} />
    </section>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      {items.slice(0, 4).map((item: any) => {
        const draft = draftMap.get(String(item.product_draft_id ?? item.productDraftId));
        return <ProductPipelineCard key={item.id} title={draft?.title ?? `Item ${item.sequence ?? ""}`} stages={stageSteps(item)} />;
      })}
    </div>
  </>;
}
