import React from "react";
import {
  AuthorityRequestPanel,
  ArtifactCard,
  BentoActionPanel,
  BentoCard,
  BentoGrid,
  BentoMetric,
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
  ProductDraftCard,
  ProviderCard,
  ProviderHealthCard,
  PublishGateCard,
  SetupRequiredPanel,
  SetupConciergeCard,
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
  return <SetupRequiredPanel items={["Connect Printify through Guided Setup", "Choose a shop", "Keep product creation owner-gated"]} />;
}

export function StudioGlobalNavStory() {
  return <div className="surface-card"><strong>StudioGlobalNav</strong><p className="text-muted">The app shell renders the keyboard-accessible mega menu from the Studio route map.</p></div>;
}

export function StudioMegaMenuStory() {
  return <BentoCard title="StudioMegaMenu" description="Top-level command areas open structured route groups with descriptions, compact status badges, and no API links." tone="sand" />;
}

export function StudioWorkflowSidebarStory() {
  return <BentoCard title="StudioWorkflowSidebar" description="The contextual left rail shows the active workflow, purpose, next action, help link, and section routes." tone="seafoam" />;
}

export function BentoDashboardSystem() {
  return <BentoGrid>
    <BentoCard span="wide" tone="ink" eyebrow="POD Factory" title="Launch packet control" description="Generated art, mockup, catalog selection, draft product, and publish gates in one visible path." />
    <BentoMetric label="Generated art" value="1" detail="Private asset preview ready" tone="seafoam" />
    <ProviderCard title="Hugging Face" status="connected" source="secure workspace credential" description="Approved briefs can send real image generation jobs when storage is ready." />
    <ArtifactCard title="Generated asset" status="QA ready" description="Protected preview route serves private source art." />
    <ProductDraftCard title="Product draft" status="owner gated" description="Draft captures artwork, mockup, Printify selection, pricing, and Shopify collection." />
    <PublishGateCard title="Publish gate" status="blocked by owner gate" description="Live publish never runs without explicit owner approval." tone="warning" />
    <SetupConciergeCard title="Setup Concierge" status="ready" description="Provider records are the normal runtime path; env vars are advanced fallback only." tone="success" />
  </BentoGrid>;
}

export function BentoActionPanelDefault() {
  return <BentoActionPanel title="Try the golden path" description="Open an approved brief, generate private artwork, create a mockup, then review the launch packet." primaryAction={<a className="btn btn-primary" href="/studio/briefs">Open briefs</a>} secondaryAction={<a className="btn btn-secondary" href="/studio/publish-review">Review gates</a>} />;
}

export const StudioGlobalNav = StudioGlobalNavStory;
export const StudioMegaMenu = StudioMegaMenuStory;
export const StudioWorkflowSidebar = StudioWorkflowSidebarStory;
export const BentoGridDefault = BentoDashboardSystem;
export const BentoCardDefault = BentoDashboardSystem;
export const ProviderCardDefault = BentoDashboardSystem;
export const ArtifactCardDefault = BentoDashboardSystem;
export const ProductDraftCardDefault = BentoDashboardSystem;
export const PublishGateCardDefault = BentoDashboardSystem;
export const SetupConciergeCardDefault = BentoDashboardSystem;

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
