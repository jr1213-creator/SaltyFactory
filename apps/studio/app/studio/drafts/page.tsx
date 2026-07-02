import { ApprovalGateList, Card, EmptyState, PageHeader, PriceMarginPanel, ProductImageGallery, ProgressRing, StructuredDataPreview, ValidationChecklist, VariantSelector } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { DraftWorkflowClient } from "./DraftWorkflowClient";

export default async function Page({ searchParams }: { searchParams?: Promise<{ draft_id?: string }> } = {}) {
  const params = await searchParams;
  const { drafts } = await getStudioLists();
  const draft: any = drafts[0] ?? {};
  return <>
    <PageHeader title="Product Draft Editor" description="Prepare product content, variants, pricing, SEO, and validation before publish review.">
      <button className="sf-button sf-button-secondary" disabled title="Draft duplication is not implemented.">Duplicate Draft</button><button className="sf-button sf-button-secondary" disabled title="Inline draft editing is disabled until the save route is wired.">Save Draft</button><button className="sf-button sf-button-primary" disabled title="Use the saved draft workflow to create a publish review.">Submit for Review</button>
    </PageHeader>
    <div className="sf-workspace-grid">
      <div className="sf-grid">
        <DraftWorkflowClient initialDrafts={drafts as any[]} initialDraftId={params?.draft_id} />
        <Card><h2>Product Information</h2><form className="sf-form-grid"><label>Product title<input defaultValue={draft.title ?? ""} placeholder="Untitled draft" readOnly title="Inline draft editing is disabled until the save route is wired." /></label><label>Collection<select disabled title="Inline draft editing is disabled until the save route is wired."><option>{draft.collection ?? "Choose collection"}</option></select></label><label>Tags<input defaultValue={(draft.tags ?? []).join(", ")} placeholder="western, coastal, original" readOnly title="Inline draft editing is disabled until the save route is wired." /></label></form><p className="sf-muted">Use the workflow panel for saved validation, review creation, and projection requests.</p></Card>
        <PriceMarginPanel />
        <Card><h2>Variants</h2><VariantSelector label="Sizes" options={["S","M","L","XL","2XL"]} /><VariantSelector label="Colors" options={["Sand","Ivory","Navy"]} /></Card>
        <Card><h2>Fulfillment & Publish Targets</h2><p className="sf-muted">Publishing is not available from the draft editor. Submit to review first.</p></Card>
      </div>
      <div className="sf-grid">
        <Card><h2>Product Description</h2><textarea className="sf-code" defaultValue={draft.description ?? "Draft copy awaits human review."} readOnly title="Inline draft editing is disabled until the save route is wired." /><h2>SEO</h2><StructuredDataPreview title={draft.title ?? "Product Draft"} /></Card>
        <Card><h2>AI Readiness Score</h2><ProgressRing value={76} label="Draft" /><p className="sf-muted">Suggestions are local UI only until providers are configured.</p></Card>
      </div>
      <div className="sf-grid">
        <Card><h2>Product Mockup</h2><ProductImageGallery title={draft.title ?? "Draft Product"} /></Card>
        <Card><h2>Validation Checks</h2><ValidationChecklist items={[{ label: "Copy completeness", status: "Required fields checked", passed: Boolean(draft.title) }, { label: "Brand voice match", status: "Human review required", passed: false }, { label: "Margin health", status: "Calculated before review", passed: true }, { label: "Image quality", status: "QA required", passed: false }]} /></Card>
      </div>
    </div>
    {!drafts.length && <EmptyState title="No product drafts" description="Approved assets can be assembled into drafts after QA." />}
  </>;
}
