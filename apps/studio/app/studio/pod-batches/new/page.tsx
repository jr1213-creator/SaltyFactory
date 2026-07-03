import { PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { PodBatchCreateClient } from "../PodBatchCreateClient";

export default function NewPodBatchPage() {
  return <>
    <PageHeader
      eyebrow="Owner-gated batch workflow"
      title="New POD Batch"
      description="Create a persisted batch of product drafts. Provider actions are not automatic; each downstream stage still requires readiness, approval, and configured providers."
    >
      <StatusBadge status="15 default items" tone="primary" />
    </PageHeader>
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Batch create" status="draft records only" tone="info" description="The initial action creates internal product drafts and batch items." />
      <ProviderStatusCard title="Image generation" status="separate gated step" tone="warning" description="Generation requires an enabled image provider and approved prompts." />
      <ProviderStatusCard title="Publish" status="blocked by default" tone="warning" description="No bulk publish runs from this workflow." />
    </div>
    <div style={{ marginTop: 18 }}>
      <PodBatchCreateClient />
    </div>
  </>;
}
