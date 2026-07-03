import { createRepositories } from "@saltyfactory/db";
import { BusinessCardPreview, DataTable, EmptyState, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessPrintStudioPage() {
  const repos = createRepositories();
  const documents = await repos.business.documents.listByWorkspace(workspaceId);
  const businessCards = documents.filter((row) => row.document_type === "business_card" || row.documentType === "business_card") as any[];
  const orders = await repos.business.printOrders.listByWorkspace(workspaceId);
  const latestSvg = businessCards[0]?.source_data_snapshot?.frontSvg ?? businessCards[0]?.sourceDataSnapshot?.frontSvg ?? "";
  return <>
    <PageHeader title="Business Print Studio" description="Generate print-ready business card packet manifests and Staples handoff instructions. No external order is placed." />
    <div className="sf-grid sf-grid-2">
      <section className="sf-card">
        <h2>Business Card Generator</h2>
        <form className="sf-form-grid" action="/api/studio/business/print-studio/business-card/generate" method="post">
          <label>Style<select name="style"><option value="polished_coastal_western">Polished coastal western</option><option value="minimalist_tech_founder">Minimalist tech founder</option><option value="boutique_luxe">Boutique luxe</option><option value="bold_turquoise_coral">Bold turquoise/coral</option></select></label>
          <button className="sf-button sf-button-primary" type="submit">Generate Business Card</button>
        </form>
        <ProviderStatusCard title="Staples behavior" status="Owner handoff required" tone="warning" description="Upload the generated packet manually. No Staples API order is claimed." />
      </section>
      <section className="sf-card">
        <h2>Preview</h2>
        {latestSvg ? <BusinessCardPreview svg={latestSvg} /> : <EmptyState title="No card preview" description="Generate a business card to see the persisted SVG preview." />}
      </section>
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Print Orders</h2>
      {orders.length ? <DataTable columns={["Vendor", "Status", "Instructions"]} rows={orders.map((order: any) => [order.vendor, order.status, order.handoff_instructions ?? order.handoffInstructions])} /> : <EmptyState title="No print packets" description="Create a business card, then create a Staples handoff packet from the document detail/API." />}
    </section>
  </>;
}
