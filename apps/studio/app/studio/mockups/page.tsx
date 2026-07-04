import { PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { MockupWorkflowClient } from "./MockupWorkflowClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams?: Promise<{ asset_id?: string }> } = {}) {
  const params = await searchParams;
  const { assets, assetDerivatives, mockups } = await getStudioLists();
  const approvedAssets = assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup);
  return <>
    <PageHeader title="Mockup Studio" description="Render product previews from approved generated artwork.">
      <StatusBadge status={`${approvedAssets.length} approved assets`} tone={approvedAssets.length ? "success" : "warning"} />
      <StatusBadge status={`${mockups.length} rendered mockups`} tone={mockups.length ? "success" : "warning"} />
    </PageHeader>
    <MockupWorkflowClient
      initialAssets={assets as any[]}
      initialDerivatives={assetDerivatives as any[]}
      initialMockups={mockups as any[]}
      initialAssetId={params?.asset_id}
    />
  </>;
}
