import { AiEmployeeCard, DataTable, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { AiEmployeeWorkflowClient } from "./AiEmployeeWorkflowClient";

const employees = [
  ["Trend Analyst", "Market & trend intelligence", "Disabled"],
  ["Copywriter", "Product copy and SEO drafts", "Disabled"],
  ["Design Creator", "Provider-gated image generation", "Disabled"],
  ["Mockup Artist", "Mockup composition queue", "Review gated"],
  ["SEO Strategist", "Structured content checks", "Disabled"],
  ["Support Agent", "Customer support drafts", "Disabled"]
] as const;

export default function Page() {
  return <>
    <PageHeader title="AI Employees" description="Operational assistants with explicit permissions, provider gating, and human review requirements." />
    <div className="sf-grid sf-grid-3">{employees.map(([name, role, status]) => <AiEmployeeCard key={name} name={name} role={role} status={status} tasks="0" description="No autonomous publish permissions." />)}</div>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Human review requirement" status="Always required" tone="success" description="AI employee outputs cannot publish without review gates." />
      <ProviderStatusCard title="Provider execution" status="Disabled by default" tone="warning" description="No AI provider calls run until credentials and feature flags are configured." />
    </div>
    <AiEmployeeWorkflowClient />
    <section className="sf-card" style={{ marginTop: 18 }}><h2>Permissions</h2><DataTable columns={["Employee", "Can create drafts", "Can approve", "Can publish"]} rows={employees.map(([name]) => [name, "Draft only after review", "No", "No"])} /></section>
  </>;
}
