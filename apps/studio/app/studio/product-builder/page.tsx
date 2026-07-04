import { DataTable, EmptyState, MetricCard, PageHeader, ProviderReadinessCard, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { getWorkspaceProviderReadiness, isProviderReady, providerCredentialSourceLabel } from "../_provider-readiness";
import { ProductBuilderClient } from "./ProductBuilderClient";

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function Page({ searchParams }: { searchParams?: Promise<{ draft_id?: string }> } = {}) {
  const params = await searchParams;
  const lists = await getStudioLists();
  const readiness = await getWorkspaceProviderReadiness();
  const approvedAssets = lists.assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup);
  const approvedMockups = lists.mockups.filter((mockup: any) => mockup.approved_for_product || mockup.approvedForProduct);
  const printify = readiness.providers.printify;
  const shopify = readiness.providers.shopify;
  const shopifyCollectionId = typeof shopify.providerMetadata?.selectedCollectionId === "string" ? shopify.providerMetadata.selectedCollectionId : "";

  return <>
    <PageHeader title="One-product build flow" description="Create one launch-ready product draft from approved generated artwork, a composed mockup, and guarded provider targets.">
      <StatusBadge status="owner gated" tone="warning" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Approved assets" value={String(approvedAssets.length)} tone={approvedAssets.length ? "success" : "warning"} />
      <MetricCard title="Approved mockups" value={String(approvedMockups.length)} tone={approvedMockups.length ? "success" : "warning"} />
      <MetricCard title="Product drafts" value={String(lists.drafts.length)} />
      <MetricCard title="Printify variants" value={String(lists.drafts.reduce((count: number, draft: any) => count + asArray(draft.variant_ids ?? draft.variantIds).length, 0))} tone="info" />
    </div>
    <div className="layout-grid layout-grid-3" style={{ marginTop: 18 }}>
      <ProviderReadinessCard title="Printify catalog" status={isProviderReady(printify) ? "connected" : "setup needed"} tone={isProviderReady(printify) ? "success" : "warning"} description={isProviderReady(printify) ? `Catalog selection can use ${providerCredentialSourceLabel(printify.credentialSource)}.` : printify.safeMessage} />
      <ProviderReadinessCard title="Shopify draft target" status={isProviderReady(shopify) ? "connected" : "setup needed"} tone={isProviderReady(shopify) ? "success" : "warning"} description={isProviderReady(shopify) ? `Default collection ${shopifyCollectionId || "not selected"}. Draft creation remains gated.` : shopify.safeMessage} />
      <ProviderReadinessCard title="Live publish" status="owner gated" tone="warning" description="Live publishing stays disabled until publish review gates and explicit owner confirmation pass." />
    </div>
    <div style={{ marginTop: 18 }}>
      <ProductBuilderClient
        assets={lists.assets as any[]}
        mockups={lists.mockups as any[]}
        drafts={lists.drafts as any[]}
        defaultCollectionId={shopifyCollectionId}
        initialDraftId={params?.draft_id}
      />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Product drafts</h2>
      {lists.drafts.length ? <DataTable columns={["Draft", "Asset", "Mockups", "Variants", "Provider target", "Next action"]} rows={lists.drafts.map((draft: any) => {
        const metadata = draft.metadata && typeof draft.metadata === "object" ? draft.metadata as Record<string, unknown> : {};
        const variantCount = asArray(draft.variant_ids ?? draft.variantIds).length;
        const mockupCount = asArray(draft.mockup_ids ?? draft.mockupIds).length;
        return [
          draft.title ?? draft.id,
          draft.asset_id ?? draft.assetId ?? "asset needed",
          String(mockupCount),
          String(variantCount),
          ownerLabel(metadata.provider_target, "internal only"),
          variantCount ? "Open publish review" : "Browse Printify catalog"
        ];
      })} /> : <EmptyState title="No product drafts yet" description="Create a draft after generated artwork passes QA and an internal mockup is approved." action={<a className="btn btn-primary" href="/studio/mockups">Open mockups</a>} />}
    </section>
  </>;
}
