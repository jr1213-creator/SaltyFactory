import { notFound } from "next/navigation";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeModel, sanitizeModelProvider } from "@saltyfactory/ai-free";
import { DataTable, PageHeader, ProviderHealthBadge, StatusBadge } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repos = createRepositories();
  const rawModel = await repos.aiModelRuntime.models.getById(id);
  if (!rawModel) notFound();
  const rawProvider = await repos.aiModelRuntime.providers.getById(String(rawModel.provider_id ?? rawModel.providerId), workspaceId);
  if (!rawProvider) notFound();
  const model = sanitizeModel(rawModel);
  const provider = sanitizeModelProvider(rawProvider);
  const evaluations = (await repos.aiModelRuntime.evaluations.listByWorkspace(workspaceId)).filter((evaluation) =>
    String(evaluation.model_id ?? evaluation.modelId) === id
  );
  const usageEvents = (await repos.aiModelRuntime.usageEvents.listByWorkspace(workspaceId)).filter((event) =>
    String(event.model_id ?? event.modelId) === id
  );

  return <>
    <PageHeader
      title={String(model.display_name)}
      eyebrow="Model review"
      description="Models must be evaluated and approved before assignment. Dangerous actions remain deterministic owner-gated operations."
    >
      <a className="sf-button sf-button-secondary" href="/studio/ai-employees/models">Back to registry</a>
    </PageHeader>

    <section className="sf-grid sf-grid-3">
      <div className="sf-card">
        <h2>Provider</h2>
        <p>{provider.display_name}</p>
        <ProviderHealthBadge status={String(provider.configured_status)} />
      </div>
      <div className="sf-card">
        <h2>Model Status</h2>
        <StatusBadge status={String(model.status)} tone={model.status === "approved" ? "success" : "warning"} />
        <p className="sf-muted">Cost tier: {provider.cost_tier}</p>
      </div>
      <div className="sf-card">
        <h2>Data Policy</h2>
        <p>{provider.data_sensitivity_allowed}</p>
        <p className="sf-muted">Sensitive/high-authority data requires explicit authority approval.</p>
      </div>
    </section>

    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Task Policy</h2>
      <DataTable
        columns={["Recommended for", "Forbidden for", "Weaknesses"]}
        rows={[[model.recommended_for.join(", ") || "None yet", model.forbidden_for.join(", "), model.weaknesses.join(", ") || "Not evaluated"]]}
      />
    </section>

    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Record Evaluation</h2>
      <form className="sf-form-grid" action="/api/studio/ai-employees/model-evals" method="post">
        <input type="hidden" name="modelId" value={String(model.id)} />
        <label>Eval name<input name="evalName" defaultValue="Draft task guardrail eval" /></label>
        <label>Task type<input name="taskType" defaultValue="draft_task" /></label>
        <label>Input reference<input name="testInputRef" defaultValue="internal_fixture" /></label>
        <label>Expected behavior<textarea name="expectedBehavior" defaultValue="Draft concise owner-reviewable output without requesting forbidden actions or exposing sensitive data." /></label>
        <label>Result summary<textarea name="resultSummary" defaultValue="Owner manually reviewed result." /></label>
        <label>Score<input name="score" type="number" min="0" max="100" defaultValue="0" /></label>
        <label>Passed
          <select name="passed" defaultValue="false">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <button className="sf-button sf-button-primary" type="submit">Record Evaluation</button>
      </form>
    </section>

    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Evaluations</h2>
      <DataTable
        columns={["Eval", "Task", "Passed", "Score", "Summary"]}
        rows={evaluations.map((evaluation) => [
          String(evaluation.eval_name ?? evaluation.evalName ?? ""),
          String(evaluation.task_type ?? evaluation.taskType ?? ""),
          String(evaluation.passed),
          String(evaluation.score ?? ""),
          String(evaluation.result_summary ?? evaluation.resultSummary ?? "")
        ])}
      />
    </section>

    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Usage</h2>
      <DataTable
        columns={["Task", "Risk", "Sensitivity", "Status", "Cost"]}
        rows={usageEvents.map((event) => [
          String(event.task_type ?? event.taskType ?? ""),
          String(event.risk_level ?? event.riskLevel ?? ""),
          String(event.input_sensitivity ?? event.inputSensitivity ?? ""),
          String(event.status ?? ""),
          String(event.estimated_cost ?? event.estimatedCost ?? "not estimated")
        ])}
      />
    </section>
  </>;
}
