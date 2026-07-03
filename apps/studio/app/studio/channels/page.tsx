import { channelCatalog, scoreChannelCompleteness } from "@saltyfactory/domain";
import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function ChannelsPage() {
  const lists = await getStudioLists();
  const score = scoreChannelCompleteness(lists.channels as any);
  return <>
    <PageHeader title="Channels" description="Manual social, marketplace, sales, link-in-bio, and reputation channel configuration.">
      <StatusBadge status={score.status} tone={score.status === "ready" ? "success" : "warning"} />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Completeness" value={`${score.score}%`} delta="Priority channels" tone={score.score >= 80 ? "success" : "warning"} />
      <MetricCard title="Configured" value={String(score.configuredCount)} delta="Manual records" />
      <MetricCard title="Missing priority" value={String(score.missingHighPriority.length)} delta="Next actions" tone={score.missingHighPriority.length ? "warning" : "success"} />
      <MetricCard title="API sync" value="Manual only" delta="No social API writes" tone="info" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Add Channel</h2>
      <form className="layout-grid layout-grid-3" action="/api/studio/channels" method="post">
        <label>Channel<select name="channelType">{channelCatalog.map(([key,, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Display name<input name="displayName" required /></label>
        <label>URL<input name="url" type="url" /></label>
        <label>Handle<input name="handle" /></label>
        <label>Status<select name="status"><option value="configured">configured</option><option value="needs_review">needs_review</option><option value="missing">missing</option><option value="disabled">disabled</option></select></label>
        <label>Owner priority<input name="ownerPriority" type="number" min="1" max="5" defaultValue="3" /></label>
        <button className="btn" type="submit">Add Channel</button>
      </form>
    </section>
    <DataTable columns={["Channel", "Category", "URL", "Status", "Priority"]} rows={lists.channels.length ? lists.channels.map((channel: any) => [channel.display_name ?? channel.displayName, channel.category, channel.url ?? "-", <StatusBadge key={channel.id} status={channel.status} />, String(channel.owner_priority ?? channel.ownerPriority ?? 3)]) : [["No channels", "Add a channel", "-", "missing", "-"]]} />
  </>;
}

