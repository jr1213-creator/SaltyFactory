import { PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { MockupWorkflowClient } from "./MockupWorkflowClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams?: Promise<{ asset_id?: string }> } = {}) {
  const params = await searchParams;
  const { assets, assetDerivatives, mockups, drafts, printifyProducts } = await getStudioLists();
  const approvedAssets = assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup);
  const printifyMockups = mockups.filter((mockup: any) => {
    const metadata = mockup.metadata && typeof mockup.metadata === "object" ? mockup.metadata : {};
    return metadata.provider_source === "printify" || metadata.providerSource === "printify" || metadata.provider_mockup_url || metadata.providerMockupUrl;
  });
  return <>
    <PageHeader title="Mockup Studio" description="Create real Printify product mockups from approved generated artwork.">
      <StatusBadge status={`${approvedAssets.length} approved assets`} tone={approvedAssets.length ? "success" : "warning"} />
      <StatusBadge status={`${printifyMockups.length} Printify mockups`} tone={printifyMockups.length ? "success" : "warning"} />
    </PageHeader>
    <MockupWorkflowClient
      initialAssets={assets as any[]}
      initialDerivatives={assetDerivatives as any[]}
      initialMockups={mockups as any[]}
      initialDrafts={drafts as any[]}
      initialPrintifyProducts={printifyProducts as any[]}
      initialAssetId={params?.asset_id}
    />
  </>;
}
