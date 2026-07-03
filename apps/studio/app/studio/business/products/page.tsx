import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, ProductPipelineBoard } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessProductsPage() {
  const repos = createRepositories();
  const drafts = await repos.draft.listByWorkspace(workspaceId);
  const unitEconomics = await repos.business.unitEconomics.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Products" description="Product portfolio view connected to drafts and unit economics." />
    <ProductPipelineBoard stages={[
      { label: "Idea", status: "owner gated" },
      { label: "Image", status: "provider gated" },
      { label: "Mockup", status: "QA gated" },
      { label: "Margins", status: unitEconomics.length ? "calculated" : "missing" },
      { label: "Launch", status: "owner approved" }
    ]} />
    <section className="surface-card" style={{ marginTop: 18 }}>{drafts.length ? <DataTable columns={["Draft", "Product type", "Approval", "Unit economics"]} rows={drafts.map((draft: any) => {
      const unit = unitEconomics.find((row) => row.entity_id === draft.id || row.entityId === draft.id);
      return [draft.title, draft.product_type ?? draft.productType, draft.approval_status ?? draft.approvalStatus, unit?.status ?? "missing"];
    })} /> : <EmptyState title="No product drafts" description="Approved POD workflow drafts appear here with margin readiness." />}</section>
  </>;
}
