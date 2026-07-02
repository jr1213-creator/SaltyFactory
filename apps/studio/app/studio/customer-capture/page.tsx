import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerCapturePage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Customer capture"
      title="Customer Capture"
      description="Lead forms, waitlists, product interest forms, wholesale intake, consultation requests, and consent-aware capture readiness."
    >
      <LinkButton href="/studio/customer-capture/forms">View Forms</LinkButton>
      <LinkButton href="/studio/customer-command-center" variant="secondary">Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Saved forms" value={String(data.forms.length)} delta="Workspace records" />
      <MetricCard title="Default templates" value={String(data.defaultCaptureForms.length)} delta="System-generated" />
      <MetricCard title="Active widgets" value={String(data.summary.captureWidgetsActive)} delta="No public embed yet" tone={data.summary.captureWidgetsActive ? "success" : "warning"} />
      <MetricCard title="Form submissions" value="0" delta="No fake submissions" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Capture Readiness</h2>
      <DataTable columns={["Template", "Description", "Status", "Consent", "Embed readiness"]} rows={data.defaultCaptureForms.map((form: any) => [
        form.title,
        form.description,
        form.status,
        "Consent language placeholder required before public activation.",
        form.embedReadinessStatus
      ])} />
    </section>
    <ProviderStatusCard title="Embed code generation" status="future integration" tone="warning" description="Embed code generation is a future integration. No public embeddable script is exposed in this pass." />
  </>;
}
