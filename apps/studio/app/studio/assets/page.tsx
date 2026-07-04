import { ApprovalGateList, Card, EmptyState, FilterBar, MetricCard, PageHeader, ProductGrid, ProgressRing, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { assetPreviewPath } from "../_private-preview-paths";
import { AssetWorkflowClient } from "./AssetWorkflowClient";

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

export default async function Page({ searchParams }: { searchParams?: Promise<{ asset_id?: string }> } = {}) {
  const params = await searchParams;
  const { assets, jobs, mockups, setupMessage } = await getStudioLists();

  return <>
    <PageHeader title="Generated art gallery" description="Inspect private generated designs, QA status, mockups, and print-ready next actions from concept to production.">
      <StatusBadge status="Generated assets visible" tone="success" />
    </PageHeader>
    <SchemaSetupState message={setupMessage} />
    <FilterBar>
      <select disabled title="Asset filtering is disabled until persisted filter support is wired."><option>All statuses</option></select>
      <select disabled title="Asset filtering is disabled until persisted filter support is wired."><option>All products</option></select>
      <select disabled title="Asset filtering is disabled until persisted filter support is wired."><option>All quality scores</option></select>
      <select disabled title="Asset filtering is disabled until persisted filter support is wired."><option>All AI employees</option></select>
    </FilterBar>
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Jobs in queue" value={String(jobs.filter((job: any) => job.status === "queued").length)} />
      <MetricCard title="Assets approved" value={String(assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup).length)} tone="success" />
      <MetricCard title="QA issues" value={String(assets.filter((asset: any) => asset.qa_status === "failed" || asset.qaStatus === "failed").length)} tone="danger" icon="!" />
      <MetricCard title="Mockups ready" value={String(mockups.length)} tone="warning" />
    </div>
    <div className="split-pane" style={{ marginTop: 18 }}>
      <div className="layout-grid">
        <AssetWorkflowClient initialAssets={assets as any[]} initialAssetId={params?.asset_id} />
        <div className="tabs-list"><span>Generated Art</span><span>Mockups</span><span>Print Files</span></div>
        {assets.length ? <ProductGrid>{assets.slice(0, 9).map((asset: any) => {
          const approved = Boolean(asset.approved_for_mockup || asset.approvedForMockup);
          return <article key={asset.id} className="surface-card" style={{ display: "grid", gap: 10 }}>
            <PrivateImagePreview src={assetPreviewPath(asset)} alt="Generated private asset preview" />
            <div>
              <strong>{asset.original_filename ?? asset.id}</strong>
              <p className="text-muted" style={{ margin: "4px 0 0" }}>Asset {asset.id}</p>
            </div>
            <dl className="result-detail-grid">
              <div><dt>QA</dt><dd>{ownerLabel(asset.qa_status ?? asset.qaStatus)}</dd></div>
              <div><dt>Created</dt><dd>{asset.created_at || asset.createdAt ? new Date(String(asset.created_at ?? asset.createdAt)).toLocaleDateString() : "saved"}</dd></div>
            </dl>
            <div className="action-bar">
              <a className="btn btn-secondary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Open asset</a>
              {approved ? <a className="btn btn-primary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(asset.id))}`}>Create mockup</a> : <a className="btn btn-secondary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Review QA</a>}
            </div>
          </article>;
        })}</ProductGrid> : <EmptyState title="No generated assets" description="Generated artwork appears here after an approved brief is sent to the connected image provider." action={<a className="btn btn-primary" href="/studio/briefs">Open briefs</a>} />}
      </div>
      <Card>
        <h2>Asset QA & Quality Check</h2>
        <ProgressRing value={92} label="Quality" />
        <ApprovalGateList gates={[
          { label: "Resolution", passed: true, detail: "Print-size validation" },
          { label: "Safe zone", passed: true },
          { label: "Trademark scan", passed: false, detail: "Requires human review" },
          { label: "Transparency/rembg", passed: true },
          { label: "Upscale status", passed: true }
        ]} />
        <button className="btn btn-secondary" disabled title="Select an asset and run persisted QA in the workflow panel to view its report.">View Full Report</button>
        <button className="btn btn-primary" disabled title="Use the Manual POD Asset Workflow after persisted QA passes.">Approve Asset</button>
        <p className="text-muted">Approval remains manual and gate-backed in the workflow panel.</p>
      </Card>
    </div>
  </>;
}
