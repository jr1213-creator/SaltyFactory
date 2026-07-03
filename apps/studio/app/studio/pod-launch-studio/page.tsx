import { parseEnv } from "@saltyfactory/config";
import { BlockerCard, DataTable, MetricCard, NextActionCard, PageHeader, ProductPipelineCard, ProviderReadinessCard, StatusBadge, WorkflowProgress } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

function providerStatus(enabled: boolean, reason?: string) {
  return enabled ? "configured" : reason === "missing_required_config" ? "missing config" : "disabled";
}

function tone(enabled: boolean) {
  return enabled ? "success" as const : "warning" as const;
}

function draftStage(draft: any) {
  return [
    { label: "Idea", status: "draft saved", complete: true },
    { label: "Prompt", status: "approval required", complete: Boolean(draft.prompt_approved ?? draft.promptApproved ?? draft.approval_status === "approved") },
    { label: "Image", status: draft.design_asset_id ?? draft.designAssetId ? "asset linked" : "generation required", complete: Boolean(draft.design_asset_id ?? draft.designAssetId) },
    { label: "QA", status: "print QA required", complete: false },
    { label: "Mockup", status: (draft.mockup_ids ?? draft.mockupIds ?? []).length ? "mockup linked" : "mockup required", complete: Boolean((draft.mockup_ids ?? draft.mockupIds ?? []).length) },
    { label: "Printify", status: draft.printify_status ?? draft.printifyStatus ?? "not created", complete: (draft.printify_status ?? draft.printifyStatus) === "draft_created" },
    { label: "Shopify Draft", status: draft.shopify_status ?? draft.shopifyStatus ?? "not created", complete: (draft.shopify_status ?? draft.shopifyStatus) === "draft_created" },
    { label: "Publish Ready", status: draft.status ?? "draft", complete: draft.status === "ready_for_publish" }
  ];
}

export default async function PodLaunchStudioPage() {
  const config = parseEnv();
  const lists = await getStudioLists();
  const drafts = lists.drafts as any[];
  const batches = lists.productBatches as any[];
  const batchItems = lists.productBatchItems as any[];
  const blockedDrafts = drafts.filter((draft) => !["draft_created", "created"].includes(String(draft.shopify_status ?? draft.shopifyStatus ?? "")) || !["draft_created", "created"].includes(String(draft.printify_status ?? draft.printifyStatus ?? "")));
  const blockers = [
    ...(!config.providers.aiImage.enabled ? ["AI_IMAGE_ENABLED=true, HF_API_TOKEN, and HF_IMAGE_MODEL are required before generated artwork can be created."] : []),
    ...(!config.providers.printify.enabled ? ["PRINTIFY_ENABLED=true, PRINTIFY_API_TOKEN, and PRINTIFY_SHOP_ID are required before Printify products can be created."] : []),
    ...(!config.providers.shopifyAdmin.enabled ? ["SHOPIFY_ADMIN_ENABLED=true, SHOPIFY_STORE_DOMAIN, and SHOPIFY_ADMIN_TOKEN are required before Shopify drafts can be created."] : []),
    ...(!config.LIVE_PUBLISHING_ENABLED ? ["LIVE_PUBLISHING_ENABLED is false, so storefront publish remains blocked by default."] : [])
  ];
  return <>
    <PageHeader
      eyebrow="Salty Cowhide production cockpit"
      title="POD Launch Studio"
      description="Provider-backed launch workflow for generated artwork, Printify draft products, Shopify draft products, launch packets, and owner-approved storefront readiness."
    >
      <a className="sf-button sf-button-primary" href="/studio/publish-review">Publish review</a>
      <a className="sf-button sf-button-secondary" href="/studio/pod-batches/new">New batch</a>
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <section className="sf-card">
      <h2>Provider Health</h2>
      <div className="sf-provider-health-bar">
        <ProviderReadinessCard title="Image" status={providerStatus(config.providers.aiImage.enabled, config.providers.aiImage.reason)} tone={tone(config.providers.aiImage.enabled)} description={config.providers.aiImage.enabled ? "Allowed image provider is configured." : "Requires AI_IMAGE_ENABLED=true, HF_API_TOKEN, HF_IMAGE_MODEL."} />
        <ProviderReadinessCard title="Printify" status={providerStatus(config.providers.printify.enabled, config.providers.printify.reason)} tone={tone(config.providers.printify.enabled)} description={config.providers.printify.enabled ? "Catalog, upload, and draft product routes can run after gates pass." : "Requires PRINTIFY_ENABLED=true, PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID."} />
        <ProviderReadinessCard title="Shopify" status={providerStatus(config.providers.shopifyAdmin.enabled, config.providers.shopifyAdmin.reason)} tone={tone(config.providers.shopifyAdmin.enabled)} description={config.providers.shopifyAdmin.enabled ? "Shopify Admin draft product route can run after gates pass." : "Requires SHOPIFY_ADMIN_ENABLED=true, SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN."} />
        <ProviderReadinessCard title="Publish" status={config.LIVE_PUBLISHING_ENABLED ? "enabled" : "blocked"} tone={config.LIVE_PUBLISHING_ENABLED ? "warning" : "danger"} description="Draft creation does not publish. Public visibility requires explicit owner-confirmed publish gates." />
      </div>
    </section>
    <div className="sf-grid sf-grid-4" style={{ marginTop: 18 }}>
      <MetricCard title="Product drafts" value={String(drafts.length)} delta="Internal source of truth" />
      <MetricCard title="Generated assets" value={String(lists.assets.length)} delta="Persisted design assets" />
      <MetricCard title="Mockups" value={String(lists.mockups.length)} delta="Composited previews only" />
      <MetricCard title="Batch items" value={String(batchItems.length)} delta={`${batches.length} batches`} />
    </div>
    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <ProductPipelineCard title="Core Product Pipeline" stages={[
          { label: "Idea", status: drafts.length ? "drafts saved" : "needed", complete: drafts.length > 0 },
          { label: "Prompt", status: "owner approval required", complete: lists.briefs.length > 0 },
          { label: "Image", status: config.providers.aiImage.enabled ? "provider ready" : "blocked", complete: config.providers.aiImage.enabled },
          { label: "QA", status: lists.assets.length ? "review assets" : "waiting", complete: false },
          { label: "Mockup", status: lists.mockups.length ? "review mockups" : "waiting", complete: lists.mockups.length > 0 },
          { label: "Printify", status: lists.printifyProducts.length ? "refs saved" : "draft action required", complete: lists.printifyProducts.length > 0 },
          { label: "Shopify Draft", status: lists.products.length ? "refs saved" : "draft action required", complete: lists.products.length > 0 },
          { label: "Publish Ready", status: "owner confirmed only", complete: false }
        ]} />
        <section className="sf-card">
          <h2>Product Pipeline Board</h2>
          <DataTable columns={["Product", "Current status", "Printify", "Shopify", "Next action"]} rows={drafts.length ? drafts.slice(0, 12).map((draft: any) => [
            draft.title ?? draft.id,
            <StatusBadge key={`${draft.id}-status`} status={String(draft.status ?? "draft").replace(/_/g, " ")} />,
            String(draft.printify_status ?? draft.printifyStatus ?? "not_created").replace(/_/g, " "),
            String(draft.shopify_status ?? draft.shopifyStatus ?? "not_created").replace(/_/g, " "),
            <a key={`${draft.id}-publish`} href="/studio/publish-review">Review</a>
          ]) : [["No product drafts", "empty", "-", "-", <a key="builder" href="/studio/product-builder">Product Builder</a>]]} />
        </section>
        <section className="sf-card">
          <h2>Batch Progress</h2>
          {batches.length ? <DataTable columns={["Batch", "Status", "Items", "Open"]} rows={batches.slice(0, 8).map((batch: any) => [
            batch.name ?? batch.id,
            <StatusBadge key={batch.id} status={String(batch.status ?? "idea").replace(/_/g, " ")} />,
            String(batchItems.filter((item: any) => String(item.batch_id ?? item.batchId) === String(batch.id)).length),
            <a key={`${batch.id}-open`} href={`/studio/pod-batches/${batch.id}`}>Open</a>
          ])} /> : <WorkflowProgress steps={[{ label: "Create batch", status: "available" }, { label: "Approve prompts", status: "owner gated" }, { label: "Generate artwork", status: "provider gated" }, { label: "Draft providers", status: "approval gated" }]} />}
        </section>
      </div>
      <div className="sf-grid">
        <NextActionCard title="Next action" description={blockedDrafts.length ? "Resolve provider and readiness blockers, then use Publish Review to send approved products to Printify and Shopify draft creation." : "Create or review product drafts before provider actions."} action={<a className="sf-button sf-button-primary" href="/studio/publish-review">Open Publish Review</a>} />
        <BlockerCard title="Provider Setup Blockers" blockers={blockers} />
        <ProviderReadinessCard title="Launch packet" status="available" tone="info" description="Launch packets read current product, provider, approval, and blocker state without claiming live publish success." />
        <a className="sf-button sf-button-secondary" href="/studio/launch-packet">View Launch Packet</a>
      </div>
    </div>
  </>;
}
