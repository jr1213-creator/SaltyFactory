import { DataTable, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { getWorkspaceProviderReadiness, isProviderReady, providerCredentialSourceLabel } from "../_provider-readiness";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

type ProviderHealthItem = {
  label: string;
  status: string;
  tone: Tone;
  detail: string;
  setup: string;
  href: string;
  ready: boolean;
};

function humanStatus(value: unknown, fallback = "not created") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function isCreated(value: unknown) {
  return ["created", "draft_created", "synced"].includes(String(value ?? ""));
}

function isApprovedAsset(asset: any) {
  return Boolean(asset.approved_for_mockup ?? asset.approvedForMockup ?? false) || asset.qa_status === "passed" || asset.qaStatus === "passed";
}

function PodStatCard({ label, value, badge, caption, tone = "primary" }: { label: string; value: number | string; badge: string; caption: string; tone?: Tone }) {
  return <article className="pod-stat-card">
    <div className="pod-stat-header">
      <span className={`pod-mini-badge tone-${tone}`}>{badge}</span>
      <span>{label}</span>
    </div>
    <strong className="pod-stat-value">{value}</strong>
    <p>{caption}</p>
  </article>;
}

function ProviderHealthCard({ item }: { item: ProviderHealthItem }) {
  return <article className={`pod-health-card tone-${item.tone}`}>
    <div className="pod-health-heading">
      <span className="pod-health-dot" aria-hidden="true" />
      <div>
        <h3>{item.label}</h3>
        <p>{item.detail}</p>
      </div>
    </div>
    <div className="pod-health-footer">
      <StatusBadge status={item.status} tone={item.tone} />
      <a href={item.href}>{item.ready ? "Open workflow" : "Open setup"}</a>
    </div>
    <p className="pod-health-setup">{item.ready ? "No setup blocker detected for this stage." : item.setup}</p>
  </article>;
}

function PipelineStageNode({ index, label, status, detail, tone = "warning", href }: { index: string; label: string; status: string; detail: string; tone?: Tone; href: string }) {
  return <a className={`pod-stage-node tone-${tone}`} href={href}>
    <span className="pod-stage-index">{index}</span>
    <span className="pod-stage-copy">
      <strong>{label}</strong>
      <small>{detail}</small>
    </span>
    <StatusBadge status={status} tone={tone} />
  </a>;
}

export default async function PodLaunchStudioPage() {
  const readiness = await getWorkspaceProviderReadiness();
  const imageProvider = readiness.providers.image_generation;
  const printifyProvider = readiness.providers.printify;
  const shopifyProvider = readiness.providers.shopify;
  const livePublish = readiness.providers.live_publish;
  const imageConnected = isProviderReady(imageProvider);
  const printifyConnected = isProviderReady(printifyProvider);
  const shopifyConnected = isProviderReady(shopifyProvider);
  const lists = await getStudioLists();
  const drafts = lists.drafts as any[];
  const batches = lists.productBatches as any[];
  const batchItems = lists.productBatchItems as any[];
  const assets = lists.assets as any[];
  const mockups = lists.mockups as any[];
  const printifyRefs = lists.printifyProducts as any[];
  const shopifyRefs = lists.products as any[];
  const approvedAssets = assets.filter(isApprovedAsset).length;
  const readyPrintify = printifyRefs.length > 0;
  const readyShopify = shopifyRefs.length > 0;
  const providerHealth: ProviderHealthItem[] = [
    {
      label: "Image Engine",
      status: imageConnected ? "Connected" : "Action required",
      tone: imageConnected ? "success" : "warning",
      detail: imageConnected ? `Approved prompts can queue generated artwork jobs through ${providerCredentialSourceLabel(imageProvider.credentialSource)}.` : "Connect the approved image provider before artwork generation can run.",
      setup: imageProvider.businessFacingSetupRequired.join(", ") || imageProvider.safeMessage,
      href: imageConnected ? "/studio/image-generation" : "/studio/onboarding/providers/image-generation",
      ready: imageConnected
    },
    {
      label: "Printify Sync",
      status: printifyConnected ? "Ready after gates" : "Action required",
      tone: printifyConnected ? "success" : "warning",
      detail: printifyConnected ? "Catalog, upload, and product creation routes can run after owner gates pass." : "Connect Printify before product drafts can be sent to fulfillment.",
      setup: printifyProvider.businessFacingSetupRequired.join(", ") || printifyProvider.safeMessage,
      href: "/studio/printify-catalog",
      ready: printifyConnected
    },
    {
      label: "Shopify Drafts",
      status: shopifyConnected ? "Draft mode ready" : "Action required",
      tone: shopifyConnected ? "success" : "warning",
      detail: shopifyConnected ? "Draft products can be created with approved media, pricing, SEO, and variants." : "Connect Shopify Admin before draft product creation is available.",
      setup: shopifyProvider.businessFacingSetupRequired.join(", ") || shopifyProvider.safeMessage,
      href: "/studio/shopify-products",
      ready: shopifyConnected
    },
    {
      label: "Storefront Publish",
      status: livePublish.status === "owner_gated" ? "Owner gated" : "Locked by default",
      tone: livePublish.status === "owner_gated" ? "warning" : "danger",
      detail: livePublish.safeMessage,
      setup: livePublish.businessFacingSetupRequired.join(", "),
      href: "/studio/publish-review",
      ready: false
    }
  ];
  const providerBlockers = providerHealth.filter((item) => !item.ready).map((item) => item.setup);
  const providerReadinessCount = providerHealth.filter((item) => item.ready).length;
  const blockedDrafts = drafts.filter((draft) => !isCreated(draft.printify_status ?? draft.printifyStatus) || !isCreated(draft.shopify_status ?? draft.shopifyStatus));
  const newestDraft = drafts[0];
  const stageData = [
    {
      index: "01",
      label: "Idea",
      status: drafts.length ? "drafts saved" : "needs idea",
      detail: drafts.length ? `${drafts.length} product draft${drafts.length === 1 ? "" : "s"} in workspace` : "Start in Product Builder",
      tone: drafts.length ? "success" as const : "warning" as const,
      href: "/studio/product-builder"
    },
    {
      index: "02",
      label: "Prompt",
      status: lists.briefs.length ? "briefs ready" : "owner gated",
      detail: lists.briefs.length ? `${lists.briefs.length} brief record${lists.briefs.length === 1 ? "" : "s"} available` : "Approve prompt or brief before generation",
      tone: lists.briefs.length ? "success" as const : "warning" as const,
      href: "/studio/briefs"
    },
    {
      index: "03",
      label: "Image",
      status: imageConnected ? "provider ready" : "blocked",
      detail: imageConnected ? "Queue artwork from approved prompts" : "Image provider setup required",
      tone: imageConnected ? "success" as const : "danger" as const,
      href: "/studio/image-generation"
    },
    {
      index: "04",
      label: "QA",
      status: approvedAssets ? "assets approved" : "needs review",
      detail: approvedAssets ? `${approvedAssets} asset${approvedAssets === 1 ? "" : "s"} approved for mockup` : "Generated files must pass print QA",
      tone: approvedAssets ? "success" as const : "warning" as const,
      href: "/studio/assets"
    },
    {
      index: "05",
      label: "Mockup",
      status: mockups.length ? "mockups ready" : "waiting",
      detail: mockups.length ? `${mockups.length} composited preview${mockups.length === 1 ? "" : "s"}` : "Create mockups from QA-passed artwork",
      tone: mockups.length ? "success" as const : "warning" as const,
      href: "/studio/mockups"
    },
    {
      index: "06",
      label: "Provider",
      status: readyPrintify || readyShopify ? "refs saved" : "not sent",
      detail: `${printifyRefs.length} Printify / ${shopifyRefs.length} Shopify draft ref${printifyRefs.length + shopifyRefs.length === 1 ? "" : "s"}`,
      tone: readyPrintify || readyShopify ? "success" as const : "warning" as const,
      href: "/studio/printify-catalog"
    },
    {
      index: "07",
      label: "Review",
      status: blockedDrafts.length ? "blocked" : "ready to inspect",
      detail: blockedDrafts.length ? `${blockedDrafts.length} draft${blockedDrafts.length === 1 ? "" : "s"} need gates resolved` : "Open launch readiness review",
      tone: blockedDrafts.length ? "danger" as const : "success" as const,
      href: "/studio/publish-review"
    }
  ];

  return <div className="pod-command-page">
    <PageHeader
      className="pod-page-header"
      eyebrow="Salty Cowhide production cockpit"
      title="POD Launch Studio"
      description="A secure command center for moving approved product ideas through generated artwork, print QA, real mockups, provider draft creation, and owner-reviewed launch readiness."
    >
      <a className="btn btn-primary" href="/studio/pod-batches/new">New 15-product batch</a>
      <a className="btn btn-secondary" href="/studio/setup">Open setup</a>
    </PageHeader>

    {lists.setupMessage ? <section className="pod-panel pod-storage-note" aria-label="Studio data storage readiness">
      <StatusBadge status="Storage setup needed" tone="warning" />
      <div>
        <h2>Studio data storage needs attention</h2>
        <p>Internal fixture views can load, but production workflow records need the protected database connection before Jennie relies on this command center for persistent launch operations.</p>
      </div>
      <a className="pod-table-link" href="/studio/setup">View setup guidance</a>
    </section> : null}

    <section className="pod-command-hero" aria-labelledby="pod-command-overview">
      <div className="pod-command-hero-copy">
        <span className="pod-secure-kicker">Human-approved factory mode</span>
        <h2 id="pod-command-overview">Build, verify, draft, then review before anything goes live.</h2>
        <p>Provider actions stay blocked until the right connection, owner gate, artwork, variant, pricing, and publish-review evidence exists. This view hides raw server configuration and shows Jennie the business-facing readiness state.</p>
      </div>
      <div className="pod-command-next">
        <span className="pod-mini-badge tone-primary">Priority pathway</span>
        <strong>{newestDraft ? humanStatus(newestDraft.title ?? newestDraft.id, "Review latest draft") : "Create the first product draft"}</strong>
        <p>{newestDraft ? "Inspect the current launch packet and provider blockers before sending to Printify or creating a Shopify draft." : "Start with Product Builder or create a 15-product batch to populate the launch factory."}</p>
        <div className="button-row">
          <a className="btn btn-primary" href={newestDraft ? "/studio/publish-review" : "/studio/product-builder"}>{newestDraft ? "Review launch readiness" : "Open Product Builder"}</a>
          <a className="btn btn-secondary" href="/studio/launch-packet">View launch packet</a>
        </div>
      </div>
    </section>

    <section className="pod-panel" aria-labelledby="provider-health-title">
      <div className="pod-section-header">
        <div>
          <p className="eyebrow-label">Provider health</p>
          <h2 id="provider-health-title">Commerce integrations</h2>
        </div>
        <StatusBadge status={`${providerReadinessCount} of ${providerHealth.length} ready`} tone={providerReadinessCount >= 3 ? "success" : "warning"} />
      </div>
      <div className="pod-health-grid">
        {providerHealth.map((item) => <ProviderHealthCard key={item.label} item={item} />)}
      </div>
    </section>

    <section className="pod-stat-grid" aria-label="POD launch metrics">
      <PodStatCard label="Product drafts" value={drafts.length} badge="Workspace" caption="Internal draft records available to the pipeline." />
      <PodStatCard label="Generated assets" value={assets.length} badge="Private media" caption="Persisted design assets, not placeholder artwork." tone="info" />
      <PodStatCard label="Mockups" value={mockups.length} badge="Composited" caption="Rendered previews that can support listing review." tone={mockups.length ? "success" : "warning"} />
      <PodStatCard label="Batch items" value={batchItems.length} badge={`${batches.length} batches`} caption="Independent batch rows with per-item status." tone="primary" />
      <PodStatCard label="Provider refs" value={printifyRefs.length + shopifyRefs.length} badge="Mapped" caption="Saved Printify and Shopify draft references." tone={readyPrintify || readyShopify ? "success" : "warning"} />
      <PodStatCard label="Blocked drafts" value={blockedDrafts.length} badge="Gate review" caption="Drafts missing one or more provider-readiness states." tone={blockedDrafts.length ? "danger" : "success"} />
    </section>

    <section className="pod-panel" aria-labelledby="pipeline-stage-title">
      <div className="pod-section-header">
        <div>
          <p className="eyebrow-label">Core product pipeline</p>
          <h2 id="pipeline-stage-title">Launch stages</h2>
        </div>
        <a className="btn btn-secondary" href="/studio/publish-review">Review gates</a>
      </div>
      <div className="pod-stage-map">
        {stageData.map((stage) => <PipelineStageNode key={stage.index} {...stage} />)}
      </div>
    </section>

    <div className="pod-command-grid">
      <section className="pod-panel" aria-labelledby="pipeline-board-title">
        <div className="pod-section-header">
          <div>
            <p className="eyebrow-label">Product pipeline board</p>
            <h2 id="pipeline-board-title">Drafts moving through provider gates</h2>
          </div>
          <a className="pod-table-link" href="/studio/listing-drafts">Open listing drafts</a>
        </div>
        {drafts.length ? <div className="pod-pipeline-list">
          {drafts.slice(0, 12).map((draft: any) => <article className="pod-pipeline-row" key={draft.id}>
            <div className="pod-table-title">{draft.title ?? draft.id}<small>{draft.product_type ?? draft.productType ?? "Product draft"}</small></div>
            <div className="pod-pipeline-status-grid">
              <div>
                <span>Launch state</span>
                <StatusBadge status={humanStatus(draft.status, "draft")} tone={String(draft.status ?? "").includes("ready") ? "success" : "warning"} />
              </div>
              <div>
                <span>Printify</span>
                <StatusBadge status={humanStatus(draft.printify_status ?? draft.printifyStatus, "not created")} tone={isCreated(draft.printify_status ?? draft.printifyStatus) ? "success" : "warning"} />
              </div>
              <div>
                <span>Shopify</span>
                <StatusBadge status={humanStatus(draft.shopify_status ?? draft.shopifyStatus, "not created")} tone={isCreated(draft.shopify_status ?? draft.shopifyStatus) ? "success" : "warning"} />
              </div>
            </div>
            <a className="btn btn-secondary" href="/studio/publish-review">Inspect gates</a>
          </article>)}
        </div> : <div className="pod-empty-state pod-pipeline-empty">
          <strong>No product drafts in the launch pipeline</strong>
          <p>This board fills after a product idea or batch item creates a real draft. Provider statuses stay blocked until product media, variants, pricing, and review gates exist.</p>
          <div className="button-row">
            <a className="btn btn-primary" href="/studio/product-builder">Open Product Builder</a>
            <a className="btn btn-secondary" href="/studio/pod-batches/new">Create 15-product batch</a>
          </div>
        </div>}
      </section>

      <aside className="pod-action-column" aria-label="Launch actions and blockers">
        <section className="pod-panel pod-action-panel">
          <span className="pod-mini-badge tone-coral">Launch control</span>
          <h2>Owner-gated next action</h2>
          <p>{blockedDrafts.length ? "Resolve the visible setup and readiness blockers, then inspect the product in Publish Review before provider draft creation." : "Create or select a product draft, then review readiness evidence before any provider action."}</p>
          <a className="btn btn-primary" href="/studio/publish-review">Open Publish Review</a>
        </section>

        <section className="pod-panel" aria-labelledby="blocker-title">
          <div className="pod-section-header">
            <div>
              <p className="eyebrow-label">Blocker intelligence</p>
              <h2 id="blocker-title">Setup and safety gates</h2>
            </div>
          </div>
          <ul className="pod-blocker-list">
            {providerBlockers.length ? providerBlockers.map((blocker) => <li key={blocker}><span aria-hidden="true" />{blocker}</li>) : <li><span aria-hidden="true" />No provider setup blockers detected. Product gates still require owner review.</li>}
          </ul>
        </section>

        <section className="pod-panel">
          <span className="pod-mini-badge tone-info">Launch packet</span>
          <h2>Evidence packet</h2>
          <p>Launch packets read the current product, provider, approval, pricing, mockup, and blocker state without claiming public publish success.</p>
          <a className="btn btn-secondary" href="/studio/launch-packet">View Launch Packet</a>
        </section>
      </aside>
    </div>

    <section className="pod-panel" aria-labelledby="batch-title">
      <div className="pod-section-header">
        <div>
          <p className="eyebrow-label">Batch progress</p>
          <h2 id="batch-title">15-product factory lane</h2>
        </div>
        <a className="pod-table-link" href="/studio/pod-batches">Open all batches</a>
      </div>
      {batches.length ? <DataTable columns={["Batch", "Status", "Items", "Open"]} rows={batches.slice(0, 8).map((batch: any) => [
        <span className="pod-table-title" key={`${batch.id}-name`}>{batch.name ?? batch.id}<small>Target count: {batch.target_count ?? batch.targetCount ?? 15}</small></span>,
        <StatusBadge key={batch.id} status={humanStatus(batch.status, "idea")} tone={String(batch.status ?? "").includes("ready") ? "success" : "warning"} />,
        String(batchItems.filter((item: any) => String(item.batch_id ?? item.batchId) === String(batch.id)).length),
        <a className="pod-table-link" key={`${batch.id}-open`} href={`/studio/pod-batches/${batch.id}`}>Open batch</a>
      ])} /> : <div className="pod-empty-state">
        <strong>No active product batch yet</strong>
        <p>Create a batch to manage 15 independent products through prompt approval, generated artwork, QA, mockups, provider draft creation, and final owner review.</p>
        <a className="btn btn-primary" href="/studio/pod-batches/new">Create Batch</a>
      </div>}
    </section>
  </div>;
}
