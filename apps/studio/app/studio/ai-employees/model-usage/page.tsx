import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiModelUsagePage() {
  const repos = createRepositories();
  const usageEvents = await repos.aiModelRuntime.usageEvents.listByWorkspace(workspaceId);
  const successCount = usageEvents.filter((event) => event.status === "success").length;
  const blockedCount = usageEvents.filter((event) => event.status === "blocked").length;
  const escalatedCount = usageEvents.filter((event) => event.status === "escalated").length;

  return <>
    <PageHeader
      title="AI Model Usage"
      eyebrow="Cost and policy audit"
      description="Every routed AI employee model task records the selected model, risk level, sensitivity, status, and estimated cost when known."
    />
    <section className="layout-grid layout-grid-3">
      <MetricCard title="Usage events" value={String(usageEvents.length)} />
      <MetricCard title="Successful" value={String(successCount)} tone="success" />
      <MetricCard title="Blocked / escalated" value={String(blockedCount + escalatedCount)} tone="warning" />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      {usageEvents.length ? <DataTable
        columns={["Employee", "Model", "Provider", "Task", "Risk", "Sensitivity", "Status", "Cost"]}
        rows={usageEvents.map((event) => [
          String(event.employee_id ?? event.employeeId ?? "system"),
          String(event.model_id ?? event.modelId ?? ""),
          String(event.provider_id ?? event.providerId ?? ""),
          String(event.task_type ?? event.taskType ?? ""),
          String(event.risk_level ?? event.riskLevel ?? ""),
          String(event.input_sensitivity ?? event.inputSensitivity ?? ""),
          <StatusBadge key={event.id} status={String(event.status)} tone={event.status === "success" ? "success" : "warning"} />,
          String(event.estimated_cost ?? event.estimatedCost ?? "not estimated")
        ])}
      /> : <EmptyState title="No model usage yet" description="Usage appears after an AI employee run is routed through an approved model assignment." />}
    </section>
  </>;
}
