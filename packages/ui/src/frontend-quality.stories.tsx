import React from "react";
import {
  AuthorityRequestPanel,
  BlockerCard,
  BusinessCardPreview,
  BusinessKpiCard,
  DecisionMemoPanel,
  HiringRequestCard,
  ImprovementSuggestionCard,
  MakeMeLookLegitPanel,
  MockupPreviewCard,
  NextActionCard,
  ProductPipelineCard,
  ProviderHealthCard,
  SetupRequiredPanel,
  ShopifyDraftCard,
  UnitEconomicsCard,
  VariantMarginMatrix
} from "./index";

export default {
  title: "SaltyFactory/Frontend Quality Harness"
};

const businessCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="600" viewBox="0 0 1050 600" role="img" aria-label="Business card preview"><rect width="1050" height="600" rx="28" fill="#fff7ed"/><text x="72" y="148" font-family="Inter, sans-serif" font-size="64" font-weight="800" fill="#0f172a">Salty Cowhide Co.</text><text x="72" y="232" font-family="Inter, sans-serif" font-size="34" fill="#0f766e">AI-run, owner-approved POD</text><text x="72" y="476" font-family="Inter, sans-serif" font-size="30" fill="#334155">saltycowhide.com</text></svg>`;

export function ProviderHealthDefault() {
  return <ProviderHealthCard title="Printify" status="not configured" description="Requires server-side token and shop ID." />;
}

export function ProviderHealthBlocked() {
  return <SetupRequiredPanel items={["PRINTIFY_ENABLED=true", "PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"]} />;
}

export function ProductPipelineDefault() {
  return <ProductPipelineCard title="Launch pipeline" stages={[
    { label: "Idea", status: "complete", complete: true },
    { label: "Prompt", status: "complete", complete: true },
    { label: "Image", status: "blocked" },
    { label: "QA", status: "waiting" },
    { label: "Mockup", status: "waiting" }
  ]} />;
}

export function VariantMarginMatrixDefault() {
  return <VariantMarginMatrix rows={[
    { variant: "S / Sand", cost: "$12.40", price: "$32.00", margin: "61%", status: "healthy" },
    { variant: "XL / Turquoise", cost: "$15.10", price: "$34.00", margin: "56%", status: "watch" }
  ]} />;
}

export function BlockerCardDefault() {
  return <BlockerCard title="Publish blockers" blockers={["Pricing inputs required", "Shopify collection ID required"]} />;
}

export function MockupPreviewDefault() {
  return <MockupPreviewCard title="Mockup preview"><p className="text-muted">Rendered mockups appear here after approved artwork and template QA pass.</p></MockupPreviewCard>;
}

export function GenerationEmptyState() {
  return <section className="surface-card" style={{ maxWidth: 960, display: "grid", gap: 16 }}>
    <div><p className="eyebrow-label">Creative production</p><h2>Generate artwork options</h2><p className="text-muted">Approve a brief before generating private source-art variants.</p></div>
    <button className="btn btn-primary" disabled title="Approve a brief before generating artwork.">Generate 4 options</button>
  </section>;
}

export function GenerationRunningState() {
  return <section className="provider-result-panel provider-result-panel-success" style={{ maxWidth: 960 }}>
    <p className="eyebrow-label">Generation result</p><h3>Generating artwork</h3><p className="text-muted">The provider is creating image bytes and SaltyFactory will store private previews before marking the job complete.</p>
  </section>;
}

export function GenerationCompletedVariants() {
  return <section className="layout-grid layout-grid-2" style={{ maxWidth: 1100 }}>
    {[1, 2, 3, 4].map((variant) => <article className="surface-card" key={variant} style={{ display: "grid", gap: 12 }}>
      <div style={{ aspectRatio: "1 / 1", borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", background: variant % 2 ? "#f6ede0" : "#cae8de", display: "grid", placeItems: "center" }}><strong>Variant {variant}</strong></div>
      <strong>Artwork generated</strong><p className="text-muted">Seed {202607040 + variant} - print PNG, thumbnail, and web preview created.</p>
      <div className="action-bar"><button className="btn btn-primary">Review asset</button><button className="btn btn-secondary">Run QA</button></div>
    </article>)}
  </section>;
}

export function GenerationPartialFailure() {
  return <section className="provider-result-panel provider-result-panel-warning" style={{ maxWidth: 960 }}>
    <p className="eyebrow-label">Generation result</p><h3>Artwork generated with partial failures</h3><p className="text-muted">Two variants were stored. Two variants failed safely because the provider was rate-limited.</p>
    <ul><li>Variant 3: Provider rate limited</li><li>Variant 4: Try again after a short wait</li></ul>
  </section>;
}

export function MockupTemplatePickerState() {
  return <section className="surface-card" style={{ maxWidth: 960, display: "grid", gap: 14 }}>
    <h2>Printify product shell</h2>
    <p className="text-muted">Choose a real Printify blueprint, print provider, and variants before provider mockups can exist.</p>
    <div className="form-grid"><label>Blueprint<select><option>Unisex Jersey Tee</option><option>Canvas Tote</option></select></label><label>Print provider<select><option>Printify Choice</option></select></label><button className="btn btn-primary">Open Printify Catalog</button></div>
  </section>;
}

export function MockupGalleryHeroSelected() {
  return <section className="layout-grid layout-grid-3" style={{ maxWidth: 1100 }}>
    {["Front view", "Back view", "Detail view"].map((label, index) => <article className="surface-card" key={label} style={{ display: "grid", gap: 10 }}>
      <div style={{ aspectRatio: "4 / 5", borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", background: index === 0 ? "#cae8de" : "#f6ede0", display: "grid", placeItems: "center" }}><strong>{label}</strong></div>
      <strong>{label}</strong><p className="text-muted">{index === 0 ? "Hero Printify mockup selected" : "Provider image imported"}</p>
      <div className="action-bar"><button className="btn btn-secondary">Set hero mockup</button></div>
    </article>)}
  </section>;
}

export function PrintifyMockupsUnavailable() {
  return <SetupRequiredPanel items={["Create a Printify product before importing provider-generated mockups."]} />;
}

export function PrintifyMockupAssetReadyNoProduct() {
  return <section className="mockup-studio" style={{ maxWidth: 1100 }}>
    <div className="mockup-empty-preview"><strong>Create a Printify product to generate real mockups</strong><p className="text-muted">Mockups shown here come from Printify after SaltyFactory uploads approved artwork to a selected product shell.</p><div className="action-bar"><button className="btn btn-primary">Open Printify Catalog</button><button className="btn btn-secondary">Open Product Builder</button></div></div>
  </section>;
}

export function PrintifyMockupUploadNeeded() {
  return <section className="mockup-action-panel" style={{ maxWidth: 760 }}>
    <div><strong>Upload print-ready file to Printify</strong><p className="text-muted">The generated asset has a print PNG derivative, but Printify does not have an upload ID yet.</p></div><button className="btn btn-primary">Upload to Printify</button>
  </section>;
}

export function PrintifyMockupUploadComplete() {
  return <section className="mockup-action-panel" style={{ maxWidth: 760 }}>
    <div><strong>Printify upload complete</strong><p className="text-muted">Upload proof upload_01 is ready for product creation.</p></div><button className="btn btn-primary">Create Printify Product</button>
  </section>;
}

export function PrintifyProductCreatedMockupsNotReady() {
  return <section className="provider-result-panel provider-result-panel-warning" style={{ maxWidth: 880 }}>
    <p className="eyebrow-label">Printify result</p><h3>Mockups not ready</h3><p className="text-muted">Printify has not returned mockup images yet. Try importing again in a minute.</p><button className="btn btn-secondary">Import again</button>
  </section>;
}

export function PrintifyMockupsImported() {
  return <section className="mockup-gallery-grid" style={{ maxWidth: 1180 }}>
    {["Front", "Back", "Detail"].map((label) => <article className="mockup-card" key={label}><StoryMockupPreview label={label} /><div className="mockup-card-copy"><strong>{label}</strong><p className="text-muted">Provider image from Printify</p><span className="mockup-status-chip tone-info">Printify Mockup</span></div><button className="btn btn-secondary">Set hero</button></article>)}
  </section>;
}

export function PrintifyHeroMockupSelected() {
  return <section className="surface-card mockup-hero-panel" style={{ maxWidth: 760 }}>
    <div className="mockup-panel-heading"><div><p className="eyebrow-label">Hero Printify mockup</p><h2>Provider mockup selected</h2><p className="text-muted">Real Printify image for asset_hf...e32d80.</p></div><span className="mockup-status-chip tone-success">Hero/default</span></div>
    <StoryMockupPreview label="Hero" /><button className="btn btn-primary">Open Product Draft</button>
  </section>;
}

export function PrintifyMockupRateLimited() {
  return <section className="provider-result-panel provider-result-panel-warning" style={{ maxWidth: 880 }}>
    <p className="eyebrow-label">Printify result</p><h3>Provider rate limited</h3><p className="text-muted">Printify is rate-limited. Wait a minute and retry the import.</p><button className="btn btn-secondary">Retry import</button>
  </section>;
}

export function PrintifyMockupNoInternalTemplates() {
  return <section className="surface-card" style={{ maxWidth: 760 }}>
    <h2>No internal templates in owner workflow</h2>
    <p className="text-muted">Production mockups are real Printify product images. Local proof rows stay hidden from owner actions.</p>
  </section>;
}

function StoryMockupPreview({ label = "Printify", tone = "ready" }: { label?: string; tone?: "ready" | "rendering" | "rejected" }) {
  const background = tone === "rejected" ? "#ffecec" : tone === "rendering" ? "#fff7e6" : "#e6f6f7";
  return <div style={{ aspectRatio: "4 / 5", borderRadius: 10, border: "1px solid #dbe7ea", background, display: "grid", placeItems: "center", overflow: "hidden" }}>
    <div style={{ width: "62%", aspectRatio: "0.78", borderRadius: 18, background: "#ffffff", border: "3px solid #0b1f33", display: "grid", placeItems: "center", color: "#007c89", fontWeight: 900 }}>{label}</div>
  </div>;
}

export function MockupStudioEmptyState() {
  return <section className="mockup-studio" style={{ maxWidth: 1120 }}>
    <div className="pod-empty-state"><strong>Select approved artwork first</strong><p className="text-muted">Generate artwork, run QA, and approve it before creating real Printify mockups.</p><button className="btn btn-primary">Open image generation</button></div>
  </section>;
}

export function MockupStudioAssetReadyNoMockups() {
  return <section className="mockup-studio" style={{ maxWidth: 1180 }}>
    <div className="mockup-studio-summary"><div><span>Selected asset</span><strong>asset_hf...e32d80</strong></div><div><span>Source</span><strong>Hugging Face</strong></div><div><span>QA status</span><strong>QA passed</strong></div><div><span>Derivative status</span><strong>print PNG ready</strong></div></div>
    <div className="mockup-studio-main-grid"><article className="surface-card mockup-asset-panel"><div className="mockup-panel-heading"><h2>Source asset proof</h2><span className="mockup-status-chip tone-success">Ready for Printify</span></div><StoryMockupPreview label="Artwork" /></article><article className="surface-card mockup-hero-panel"><div className="mockup-empty-preview"><strong>Create a Printify product to generate real mockups</strong><p className="text-muted">Choose a product, provider, and variants first.</p><button className="btn btn-primary">Open Printify Catalog</button></div></article></div>
  </section>;
}

export function MockupStudioRenderingState() {
  return <section className="mockup-result-panel is-warning" style={{ maxWidth: 880 }}>
    <p className="eyebrow-label">Printify result</p><h3>Creating Printify product</h3><p className="text-muted">SaltyFactory is uploading the print-ready file and asking Printify for provider mockup images.</p>
  </section>;
}

export function MockupStudioGalleryMultiple() {
  return <section className="mockup-gallery-grid" style={{ maxWidth: 1180 }}>
    {["Front view", "Back view", "Lifestyle crop"].map((label) => <article className="mockup-card" key={label}><StoryMockupPreview label={label} /><div className="mockup-card-copy"><strong>{label}</strong><p className="text-muted">Provider image from Printify</p><div className="mockup-chip-row"><span className="mockup-status-chip tone-info">Printify Mockup</span><span className="mockup-status-chip tone-warning">Needs approval</span></div></div><div className="mockup-card-actions"><button className="btn btn-secondary">Preview</button><button className="btn btn-secondary">Set hero</button></div></article>)}
  </section>;
}

export function MockupStudioHeroSelected() {
  return <section className="surface-card mockup-hero-panel" style={{ maxWidth: 760 }}>
    <div className="mockup-panel-heading"><div><p className="eyebrow-label">Hero mockup</p><h2>Printify front mockup</h2><p className="text-muted">Provider image from Printify - source asset_hf...e32d80</p></div><div className="mockup-chip-row"><span className="mockup-status-chip tone-success">Hero selected</span><span className="mockup-status-chip tone-success">Approved</span></div></div>
    <StoryMockupPreview label="Hero" /><button className="btn btn-primary" disabled>Hero selected</button>
  </section>;
}

export function MockupStudioRejectedMockup() {
  return <article className="mockup-card" style={{ maxWidth: 360 }}>
    <StoryMockupPreview label="Rejected" tone="rejected" /><div className="mockup-card-copy"><strong>Printify side view</strong><p className="text-muted">Rejected after owner review.</p><span className="mockup-status-chip tone-danger">Rejected</span></div><button className="btn btn-secondary">Import again</button>
  </article>;
}

export function MockupStudioMissingPrintPngBlocker() {
  return <section className="mockup-action-panel" style={{ maxWidth: 720 }}>
    <div><strong>Create Product Draft</strong><p className="text-muted">This asset needs a print-ready file.</p></div><button className="btn btn-primary" disabled>Create Product Draft</button>
  </section>;
}

export function MockupStudioPlacementControlsOpen() {
  return <section className="surface-card" style={{ maxWidth: 760 }}>
    <div className="mockup-panel-heading"><div><p className="eyebrow-label">Placement</p><h2>Printify placement proof</h2><p className="text-muted">Placement is stored in the Printify product payload and reflected in provider mockups.</p></div></div>
    <div className="mockup-placement-grid"><label>X<input value="0.5" readOnly /></label><label>Y<input value="0.5" readOnly /></label><label>Scale<input value="1" readOnly /></label><label>Position<select><option>Front</option></select></label></div>
    <div className="action-bar"><button className="btn btn-secondary">Open Catalog</button><button className="btn btn-primary">Create Printify Product</button></div>
  </section>;
}

export function MockupStudioProofDetailsExpanded() {
  return <details className="mockup-proof-details" open style={{ maxWidth: 880 }}>
    <summary>Proof details</summary>
    <dl className="mockup-proof-grid"><div><dt>Mockup ID</dt><dd>mockup_printify_1783179063831</dd></div><div><dt>Source asset ID</dt><dd>asset_hf_1783179053612</dd></div><div><dt>Derivative kind</dt><dd>print_png</dd></div><div><dt>Printify product</dt><dd>64f-printify-product</dd></div><div><dt>Source</dt><dd>Printify</dd></div><div><dt>Preview URL</dt><dd>Provider image URL stored</dd></div></dl>
  </details>;
}

export function ShopifyDraftDefault() {
  return <ShopifyDraftCard title="Shopify draft" status="not_created"><p className="text-muted">Draft creation is blocked until provider config and publish gates pass.</p></ShopifyDraftCard>;
}

export function HiringRequestDefault() {
  return <HiringRequestCard title="Provider Readiness Auditor" status="needs_review"><p>Owner approval required before employee definition is created.</p></HiringRequestCard>;
}

export function ImprovementSuggestionDefault() {
  return <ImprovementSuggestionCard title="Repeated blocker: pricing missing" status="submitted"><p>Suggestion cannot self-implement.</p></ImprovementSuggestionCard>;
}

export function BusinessKpiDefault() {
  return <BusinessKpiCard title="Contribution margin" value="Unknown" delta="Inputs required" tone="warning" />;
}

export function UnitEconomicsDefault() {
  return <UnitEconomicsCard title="Beach Rodeo Tee" status="blocked" margin="Unknown until cost and price inputs are saved." />;
}

export function DecisionMemoDefault() {
  return <DecisionMemoPanel title="Campaign launch memo"><p>Recommendation requires assumptions and owner decision.</p></DecisionMemoPanel>;
}

export function BusinessCardPreviewDefault() {
  return <BusinessCardPreview svg={businessCardSvg} />;
}

export function MakeMeLookLegitDefault() {
  return <MakeMeLookLegitPanel title="Make Me Look Legit" description="Create owner-review business profile, card, letterhead, and checklist drafts." />;
}

export function AuthorityRequestDefault() {
  return <AuthorityRequestPanel title="Use EIN in document" status="pending"><p>One-time authority approval required. Sensitive value is never shown.</p></AuthorityRequestPanel>;
}

export function EmptyStateDefault() {
  return <NextActionCard title="No model evals yet" description="Open a model detail page and record an owner-reviewed evaluation." />;
}
