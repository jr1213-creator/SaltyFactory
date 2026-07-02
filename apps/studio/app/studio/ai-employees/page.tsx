import { employeeDefinitions } from "@saltyfactory/domain";
import { AiEmployeeCard, DataTable, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { AiEmployeeWorkflowClient } from "./AiEmployeeWorkflowClient";

export default async function Page() {
  const lists = await getStudioLists();
  const configured = new Map(lists.aiEmployees.map((row: any) => [row.employee_key ?? row.employeeKey, row]));
  return <>
    <PageHeader title="AI Employees" description="Operational assistants with explicit permissions, setup blockers, activity logs, and human review requirements." />
    <div className="sf-grid sf-grid-3">{employeeDefinitions.map(([key, name, requiredSources, allowedActions]) => {
      const row = configured.get(key) as any;
      return <AiEmployeeCard key={key} name={name} role={requiredSources.join(", ")} status={row?.status ?? "setup_needed"} tasks={String(allowedActions.length)} description="Drafts and recommendations only." />;
    })}</div>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Human review requirement" status="Always required" tone="success" description="AI employee outputs cannot publish, send, spend, or sync without owner gates." />
      <ProviderStatusCard title="Provider execution" status="Rules fallback available" tone="warning" description="Model output is labeled model_generated only when a configured provider is used." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Configure Employee</h2>
      <form className="sf-grid sf-grid-3" action="/api/studio/ai-employees/configure" method="post">
        <label>Employee<select name="employeeKey">{employeeDefinitions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <label>Monthly goal<input name="monthlyGoal" /></label>
        <label><input name="supportsRulesOnly" type="checkbox" defaultChecked /> Allow rules-only setup mode</label>
        <button className="sf-button" type="submit">Configure Employee</button>
      </form>
    </section>
    <AiEmployeeWorkflowClient />
    <section className="sf-card" style={{ marginTop: 18 }}><h2>Permissions</h2><DataTable columns={["Employee", "Allowed actions", "Forbidden actions", "Status"]} rows={employeeDefinitions.map(([key, name,, allowed]) => [name, allowed.join(", "), "publish/send/spend/sync/delete/expose secrets", (configured.get(key) as any)?.status ?? "setup_needed"])} /></section>
  </>;
}
