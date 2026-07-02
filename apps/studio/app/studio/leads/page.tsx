import { DataTable, LinkButton, MetricCard, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function LeadsPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader eyebrow="CRM depth" title="Leads" description="Lead intake foundation for wholesale, custom work, product interest, and high-intent follow-up.">
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
      <LinkButton href="/studio/leads/new" variant="secondary">Create Lead</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Leads" value={String(data.leads.length)} delta="Manual/imported only" />
      <MetricCard title="High intent" value={String(data.summary.highIntentLeadsCount)} delta="Status-based, no fake scoring" />
      <MetricCard title="Capture forms" value={String(data.defaultCaptureForms.length)} delta="Lead sources" />
      <MetricCard title="Follow-ups" value={String(data.summary.followUpsNeeded)} delta="Open tasks" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Lead Records</h2>
      <DataTable columns={["Name", "Email", "Company", "Interest", "Value", "Status", "Consent", "Open"]} rows={data.leads.length ? data.leads.map((lead: any) => [
        lead.name,
        lead.email ?? "-",
        lead.company ?? "-",
        lead.interest ?? "-",
        lead.estimated_value ?? lead.estimatedValue ?? "-",
        <StatusBadge key={lead.id} status={String(lead.status ?? "new").replace(/_/g, " ")} />,
        lead.consent_status ?? lead.consentStatus ?? "unknown",
        <a key={`${lead.id}-open`} href={`/studio/leads/${lead.id}`}>Open</a>
      ]) : [["No leads", "Use capture forms or imports to add leads.", "-", "-", "-", "empty", "unknown", "-"]]} />
    </section>
  </>;
}
