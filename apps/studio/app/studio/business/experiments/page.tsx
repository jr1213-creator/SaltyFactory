import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, ForecastScenarioCard, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessExperimentsPage() {
  const experiments = await createRepositories().business.experiments.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Experiments" description="Owner-approved hypotheses and manual test plans for products, campaigns, prices, offers, and channels." />
    <section className="sf-card">
      <h2>Create Experiment</h2>
      <form className="sf-form-grid" action="/api/studio/business/experiments" method="post">
        <label>Title<input name="title" defaultValue="Organic product angle test" /></label>
        <label>Hypothesis<textarea name="hypothesis" defaultValue="A clear margin-positive offer will outperform generic launch copy." /></label>
        <label>Entity type<input name="entityType" defaultValue="campaign" /></label>
        <label>Success metric<input name="successMetric" defaultValue="click_through_rate" /></label>
        <button className="sf-button sf-button-primary" type="submit">Save Experiment</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{experiments.length ? <div className="sf-grid">{experiments.map((experiment: any) => <ForecastScenarioCard key={experiment.id} title={experiment.title}>
      <DataTable columns={["Hypothesis", "Metric", "Status"]} rows={[[experiment.hypothesis, experiment.success_metric ?? experiment.successMetric, experiment.status]]} />
    </ForecastScenarioCard>)}</div> : <EmptyState title="No experiments" description="Create owner-reviewed tests; no live ad or price change happens automatically." />}</section>
  </>;
}
