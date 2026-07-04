import { DataTable, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { mockupPreviewPath } from "../_private-preview-paths";
import { MockupWorkflowClient } from "./MockupWorkflowClient";

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

export default async function Page({ searchParams }: { searchParams?: Promise<{ asset_id?: string }> } = {}) {
  const params = await searchParams;
  const { assets, mockups } = await getStudioLists();
  const approvedAssets = assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup);
  return <>
    <PageHeader title="Mockup gallery" description="Create and inspect private internal previews from approved art before product draft and publish review.">
      <StatusBadge status={`${approvedAssets.length} approved assets`} tone={approvedAssets.length ? "success" : "warning"} />
    </PageHeader>
    <MockupWorkflowClient initialAssets={assets as any[]} initialMockups={mockups as any[]} initialAssetId={params?.asset_id} />
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Composed mockups</h2>
      {mockups.length ? <div className="layout-grid layout-grid-3" style={{ marginBottom: 18 }}>{mockups.slice(0, 9).map((mockup: any) => <article key={mockup.id} className="surface-card" style={{ display: "grid", gap: 10 }}>
        <PrivateImagePreview src={mockupPreviewPath(mockup)} alt="Composited mockup preview" aspectRatio="4 / 5" />
        <strong>{mockup.id}</strong>
        <p className="text-muted" style={{ margin: 0 }}>Source asset {mockup.asset_id ?? mockup.assetId}</p>
        <div className="action-bar">
          <a className="btn btn-secondary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(mockup.asset_id ?? mockup.assetId ?? ""))}`}>Open mockup</a>
          {(mockup.approved_for_product || mockup.approvedForProduct) ? <a className="btn btn-primary" href="/studio/product-builder">Use in product draft</a> : null}
        </div>
      </article>)}</div> : null}
      {mockups.length ? <DataTable columns={["Mockup", "Status", "Approved", "Asset"]} rows={mockups.map((mockup: any) => [
        mockup.file_path ?? mockup.id,
        <StatusBadge key="status" status={ownerLabel(mockup.status ?? "generated")} />,
        String(Boolean(mockup.approved_for_product ?? mockup.approvedForProduct)),
        mockup.asset_id ?? mockup.assetId
      ])} /> : <EmptyState title="No mockups yet" description="Run QA and approve an asset, then generate an internal preview." />}
    </section>
  </>;
}
