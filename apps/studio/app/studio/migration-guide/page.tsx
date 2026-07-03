import { DataTable, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { buildMigrationRecommendations, scoreChannelCompleteness } from "@saltyfactory/domain";
import { getStudioLists, SchemaSetupState } from "../data";

export default async function MigrationGuidePage() {
  const lists = await getStudioLists();
  const latest = lists.migrationGuides[0] as any;
  const channelScore = scoreChannelCompleteness(lists.channels as any);
  const profileReady = Number((lists.businessProfiles[0] as any)?.readiness_score ?? 0) >= 90;
  const googleConnected = lists.providerConnections.some((provider: any) => provider.provider_type === "google_oauth" && provider.status === "connected");
  const plan = buildMigrationRecommendations({ businessProfileReady: profileReady, channelScore: channelScore.score, googleConnected, baselineExists: lists.baselines.length > 0, podCandidates: lists.podCandidates.length, aiProviderConfigured: false });
  return <>
    <PageHeader title="Setup Guide" description="Save-and-resume setup workflow for preparing Salty Cowhide POD operations, data sources, channels, approval rules, and AI employee readiness.">
      <StatusBadge status={latest?.status ?? "not_started"} tone={latest ? "info" : "warning"} />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Setup readiness" value={`${plan.migrationReadinessScore}%`} delta={plan.sourceLabel} />
      <MetricCard title="Completed steps" value={String((latest?.completed_steps ?? latest?.completedSteps ?? []).length || 0)} delta="11 total" />
      <MetricCard title="Recommendations" value={String(plan.recommendations.length)} delta="Draft only" tone="info" />
      <MetricCard title="Approval rules" value="Strict" delta="No auto-publish" tone="success" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Save Progress</h2>
      <form className="layout-grid layout-grid-3" action="/api/studio/migration-guide" method="post">
        <label>Current step<input name="currentStep" type="number" min="1" max="11" defaultValue="1" /></label>
        <label><input name="googleConnected" type="checkbox" defaultChecked={googleConnected} /> Google connected</label>
        <label><input name="aiProviderConfigured" type="checkbox" /> AI provider configured</label>
        <button className="btn" type="submit">Save Setup Plan</button>
      </form>
    </section>
    <DataTable columns={["First 30-day action", "Phase", "Link"]} rows={plan.firstThirtyDayPlan.map((item) => [item.action, item.dayRange, <a key={item.href} href={item.href}>{item.href}</a>])} />
  </>;
}
