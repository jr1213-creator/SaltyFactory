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
    <h2>Internal Mockup Workflow</h2>
    <div className="form-grid"><label>Internal template<select><option>Apparel Front - Light Tee</option><option>Tote Front - Natural Canvas</option><option>Mug Front - White Mug</option></select></label><label>Scale<input type="number" value="1" readOnly /></label><button className="btn btn-primary">Render selected template</button></div>
  </section>;
}

export function MockupGalleryHeroSelected() {
  return <section className="layout-grid layout-grid-3" style={{ maxWidth: 1100 }}>
    {["Light Tee", "Sand Tee", "Tote"].map((label, index) => <article className="surface-card" key={label} style={{ display: "grid", gap: 10 }}>
      <div style={{ aspectRatio: "4 / 5", borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", background: index === 0 ? "#cae8de" : "#f6ede0", display: "grid", placeItems: "center" }}><strong>{label}</strong></div>
      <strong>{label}</strong><p className="text-muted">{index === 0 ? "Hero mockup selected" : "Internal renderer proof stored"}</p>
      <div className="action-bar"><button className="btn btn-secondary">Set hero mockup</button></div>
    </article>)}
  </section>;
}

export function PrintifyMockupsUnavailable() {
  return <SetupRequiredPanel items={["Create a Printify product before importing provider-generated mockups."]} />;
}

function StoryMockupPreview({ label = "Light Tee", tone = "ready" }: { label?: string; tone?: "ready" | "rendering" | "rejected" }) {
  const background = tone === "rejected" ? "#ffecec" : tone === "rendering" ? "#fff7e6" : "#e6f6f7";
  return <div style={{ aspectRatio: "4 / 5", borderRadius: 10, border: "1px solid #dbe7ea", background, display: "grid", placeItems: "center", overflow: "hidden" }}>
    <div style={{ width: "62%", aspectRatio: "0.78", borderRadius: 18, background: "#ffffff", border: "3px solid #0b1f33", display: "grid", placeItems: "center", color: "#007c89", fontWeight: 900 }}>{label}</div>
  </div>;
}

export function MockupStudioEmptyState() {
  return <section className="mockup-studio" style={{ maxWidth: 1120 }}>
    <div className="pod-empty-state"><strong>No generated artwork yet</strong><p className="text-muted">Generate artwork, run QA, and approve it before rendering internal mockups.</p><button className="btn btn-primary">Open image generation</button></div>
  </section>;
}

export function MockupStudioAssetReadyNoMockups() {
  return <section className="mockup-studio" style={{ maxWidth: 1180 }}>
    <div className="mockup-studio-summary"><div><span>Selected asset</span><strong>asset_hf...e32d80</strong></div><div><span>Source</span><strong>Hugging Face</strong></div><div><span>QA status</span><strong>QA passed</strong></div><div><span>Derivative status</span><strong>print PNG ready</strong></div></div>
    <div className="mockup-studio-main-grid"><article className="surface-card mockup-asset-panel"><div className="mockup-panel-heading"><h2>Source asset proof</h2><span className="mockup-status-chip tone-success">Ready for mockups</span></div><StoryMockupPreview label="Artwork" /></article><article className="surface-card mockup-hero-panel"><div className="mockup-empty-preview"><strong>No mockup rendered for this asset yet</strong><p className="text-muted">Use recommended mockups for a full preview set.</p><button className="btn btn-primary">Generate recommended mockups</button></div></article></div>
  </section>;
}

export function MockupStudioRenderingState() {
  return <section className="mockup-result-panel is-warning" style={{ maxWidth: 880 }}>
    <p className="eyebrow-label">Mockup result</p><h3>Rendering mockups</h3><p className="text-muted">Internal Sharp is compositing the print-ready file into recommended product templates.</p>
  </section>;
}

export function MockupStudioGalleryMultiple() {
  return <section className="mockup-gallery-grid" style={{ maxWidth: 1180 }}>
    {["Light Tee", "Dark Tee", "Sand Tee", "Tote"].map((label) => <article className="mockup-card" key={label}><StoryMockupPreview label={label} /><div className="mockup-card-copy"><strong>{label}</strong><p className="text-muted">Internal Sharp renderer</p><div className="mockup-chip-row"><span className="mockup-status-chip tone-info">Internal Sharp</span><span className="mockup-status-chip tone-warning">Needs approval</span></div></div><div className="mockup-card-actions"><button className="btn btn-secondary">Preview</button><button className="btn btn-secondary">Set hero</button></div></article>)}
  </section>;
}

export function MockupStudioHeroSelected() {
  return <section className="surface-card mockup-hero-panel" style={{ maxWidth: 760 }}>
    <div className="mockup-panel-heading"><div><p className="eyebrow-label">Hero mockup</p><h2>Apparel Front - Light Tee</h2><p className="text-muted">Internal Sharp renderer - source asset_hf...e32d80</p></div><div className="mockup-chip-row"><span className="mockup-status-chip tone-success">Hero selected</span><span className="mockup-status-chip tone-success">Approved</span></div></div>
    <StoryMockupPreview label="Hero" /><button className="btn btn-primary" disabled>Hero selected</button>
  </section>;
}

export function MockupStudioRejectedMockup() {
  return <article className="mockup-card" style={{ maxWidth: 360 }}>
    <StoryMockupPreview label="Rejected" tone="rejected" /><div className="mockup-card-copy"><strong>Dark Tee</strong><p className="text-muted">Rejected after owner review.</p><span className="mockup-status-chip tone-danger">Rejected</span></div><button className="btn btn-secondary">Re-render</button>
  </article>;
}

export function MockupStudioMissingPrintPngBlocker() {
  return <section className="mockup-action-panel" style={{ maxWidth: 720 }}>
    <div><strong>Create Product Draft</strong><p className="text-muted">This asset needs a print-ready file.</p></div><button className="btn btn-primary" disabled>Create Product Draft</button>
  </section>;
}

export function MockupStudioPlacementControlsOpen() {
  return <section className="surface-card" style={{ maxWidth: 760 }}>
    <div className="mockup-panel-heading"><div><p className="eyebrow-label">Placement</p><h2>Light Tee controls</h2><p className="text-muted">Placement changes are rendered server-side with the internal compositor.</p></div></div>
    <div className="mockup-placement-grid"><label>X<input value="450" readOnly /></label><label>Y<input value="520" readOnly /></label><label>Scale<input value="1" readOnly /></label><label>Rotation<input value="0" readOnly /></label><label>Fit<select><option>Contain</option></select></label><label>Opacity<input value="0.96" readOnly /></label></div>
    <div className="action-bar"><button className="btn btn-secondary">Reset placement</button><button className="btn btn-primary">Render with placement</button></div>
  </section>;
}

export function MockupStudioProofDetailsExpanded() {
  return <details className="mockup-proof-details" open style={{ maxWidth: 880 }}>
    <summary>Proof details</summary>
    <dl className="mockup-proof-grid"><div><dt>Mockup ID</dt><dd>mockup_1783179063831</dd></div><div><dt>Source asset ID</dt><dd>asset_hf_1783179053612</dd></div><div><dt>Derivative kind</dt><dd>print_png</dd></div><div><dt>Template ID</dt><dd>tmpl_internal_apparel_light_tee</dd></div><div><dt>Renderer version</dt><dd>internal-sharp-v1</dd></div><div><dt>Checksum</dt><dd>73d3f8...</dd></div><div><dt>Preview route</dt><dd>/api/studio/mockups/mockup_1783179063831/preview</dd></div></dl>
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
