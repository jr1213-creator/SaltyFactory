import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiModelEvaluationsPage() {
  const repos = createRepositories();
  const evaluations = await repos.aiModelRuntime.evaluations.listByWorkspace(workspaceId);
  return <>
    <PageHeader
      title="AI Model Evaluations"
      eyebrow="Model QA"
      description="Evaluation records prove a model was reviewed for a task before it is trusted for AI employee work."
    />
    <section className="sf-card">
      {evaluations.length ? <DataTable
        columns={["Eval", "Model", "Task", "Passed", "Score", "Failure notes"]}
        rows={evaluations.map((evaluation) => [
          String(evaluation.eval_name ?? evaluation.evalName ?? ""),
          String(evaluation.model_id ?? evaluation.modelId ?? ""),
          String(evaluation.task_type ?? evaluation.taskType ?? ""),
          <StatusBadge key={evaluation.id} status={evaluation.passed ? "passed" : "failed/review"} tone={evaluation.passed ? "success" : "warning"} />,
          String(evaluation.score ?? ""),
          String(evaluation.failure_notes ?? evaluation.failureNotes ?? "")
        ])}
      /> : <EmptyState title="No model evaluations" description="Open a model detail page and record an owner-reviewed eval before approving assignments." />}
    </section>
  </>;
}
