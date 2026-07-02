import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function SocialPlannerPage() {
  const lists = await getStudioLists();
  return <>
    <PageHeader title="Social Planner" description="Channel-aware draft ideas for owner review. No auto-posting is exposed.">
      <StatusBadge status="drafts only" tone="success" />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Content items" value={String(lists.socialContent.length)} delta="Draft calendar" />
      <MetricCard title="Approved" value={String(lists.socialContent.filter((row: any) => row.approval_status === "approved").length)} delta="Manual publish only" />
      <MetricCard title="Channels configured" value={String(lists.channels.length)} delta="Planning inputs" />
      <MetricCard title="Auto-posting" value="Disabled" delta="Guardrail enforced" tone="success" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Create Social Draft</h2>
      <form className="sf-grid sf-grid-3" action="/api/studio/social-planner" method="post">
        <label>Channel<select name="channelType"><option value="instagram">Instagram</option><option value="facebook_page">Facebook</option><option value="tiktok">TikTok</option><option value="pinterest">Pinterest</option><option value="youtube_shorts">YouTube Shorts</option><option value="x_twitter">X / Twitter</option><option value="threads">Threads</option><option value="linkedin">LinkedIn</option><option value="blog">Blog</option><option value="newsletter">Newsletter</option><option value="custom">Custom</option></select></label>
        <label>Idea<input name="idea" required /></label>
        <label>Product title<input name="productTitle" /></label>
        <button className="sf-button" type="submit">Create Draft</button>
      </form>
    </section>
    <DataTable columns={["Title", "Channel", "Source", "Status", "Approval"]} rows={lists.socialContent.length ? lists.socialContent.map((row: any) => [row.title, row.channel_type ?? row.channelType, row.source_label ?? row.sourceLabel, <StatusBadge key={row.id} status={row.status} />, row.approval_status ?? row.approvalStatus]) : [["No social drafts", "-", "rules_based", "idea", "draft"]]} />
  </>;
}

