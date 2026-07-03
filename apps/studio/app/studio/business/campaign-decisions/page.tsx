import { createRepositories } from "@saltyfactory/db";
import { ChannelReadinessCard, DataTable, EmptyState, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessCampaignDecisionsPage() {
  const repos = createRepositories();
  const campaigns = await repos.shared.campaigns.listByWorkspace(workspaceId);
  const readiness = await repos.business.channelReadiness.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Campaign Decisions" description="Campaign financial readiness reads unit economics and channel readiness before paid channel decisions. No ad spend is launched." />
    <section className="surface-card">
      <h2>Calculate Channel Readiness</h2>
      <form className="form-grid" action="/api/studio/business/channel-readiness/calculate" method="post">
        <label>Entity type<input name="entityType" defaultValue="product" /></label>
        <label>Entity ID<input name="entityId" /></label>
        <label>Channel<select name="channel"><option value="organic_social">Organic social</option><option value="pinterest">Pinterest</option><option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option><option value="email">Email</option></select></label>
        <button className="btn btn-primary" type="submit">Calculate Readiness</button>
      </form>
    </section>
    <div className="layout-grid layout-grid-3" style={{ marginTop: 18 }}>{readiness.map((row: any) => <ChannelReadinessCard key={row.id} channel={row.channel} readiness={row.readiness} />)}</div>
    <section className="surface-card" style={{ marginTop: 18 }}>{campaigns.length ? <DataTable columns={["Campaign", "Goal", "Status"]} rows={campaigns.map((campaign: any) => [campaign.name, campaign.goal, campaign.status])} /> : <EmptyState title="No campaign drafts" description="Draft campaigns created from opportunities appear here." />}</section>
  </>;
}
