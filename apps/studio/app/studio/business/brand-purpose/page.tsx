import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { getBusinessProfile } from "../../../api/studio/business/_shared";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessBrandPurposePage() {
  const repos = createRepositories();
  const profile: any = await getBusinessProfile(repos);
  const mantras = await repos.business.mantras.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Brand Purpose" description="Mission, mantra, operating principles, brand voice, target customers, and founder-grade clarity." />
    <div className="layout-grid layout-grid-2">
      <ProviderStatusCard title="Mission statement" status={profile?.mission_statement ? "Saved" : "Missing"} tone={profile?.mission_statement ? "success" : "warning"} description={profile?.mission_statement ?? "Add mission statement in Business Profile."} />
      <ProviderStatusCard title="Brand mantra" status={profile?.brand_mantra ? "Saved" : "Missing"} tone={profile?.brand_mantra ? "success" : "warning"} description={profile?.brand_mantra ?? "Create a mantra below or in Business Profile."} />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Add Mantra</h2>
      <form className="form-grid" action="/api/studio/business/mantras" method="post">
        <label>Mantra<input name="mantra" defaultValue="Build the real thing." /></label>
        <label>Category<select name="category"><option value="brand">Brand</option><option value="operations">Operations</option><option value="money">Money</option><option value="founder">Founder</option></select></label>
        <button className="btn btn-primary" type="submit">Save Mantra</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>{mantras.length ? <DataTable columns={["Mantra", "Category", "Active"]} rows={mantras.map((row: any) => [row.mantra, row.category, row.active === false ? "No" : "Yes"])} /> : <EmptyState title="No mantras yet" description="Saved mantras appear on the Business Command Center." />}</section>
  </>;
}
