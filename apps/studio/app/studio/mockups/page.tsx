import { DataTable, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { MockupWorkflowClient } from "./MockupWorkflowClient";

export default async function Page({ searchParams }: { searchParams?: Promise<{ asset_id?: string }> } = {}) {
  const params = await searchParams;
  const { assets, mockups } = await getStudioLists();
  const approvedAssets = assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup);
  return <>
    <PageHeader title="Mockups" description="Create private internal previews from approved art before product draft and publish review.">
      <StatusBadge status={`${approvedAssets.length} approved assets`} tone={approvedAssets.length ? "success" : "warning"} />
    </PageHeader>
    <MockupWorkflowClient initialAssets={assets as any[]} initialMockups={mockups as any[]} initialAssetId={params?.asset_id} />
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Mockup Records</h2>
      {mockups.length ? <DataTable columns={["Mockup", "Status", "Approved", "Asset"]} rows={mockups.map((mockup: any) => [
        mockup.file_path ?? mockup.id,
        <StatusBadge key="status" status={mockup.status ?? "generated"} />,
        String(Boolean(mockup.approved_for_product ?? mockup.approvedForProduct)),
        mockup.asset_id ?? mockup.assetId
      ])} /> : <EmptyState title="No mockups yet" description="Run QA and approve an asset, then generate an internal preview." />}
    </section>
  </>;
}
