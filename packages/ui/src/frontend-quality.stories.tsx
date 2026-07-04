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
