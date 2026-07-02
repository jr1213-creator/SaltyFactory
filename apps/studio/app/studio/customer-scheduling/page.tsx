import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerSchedulingPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Scheduling foundation"
      title="Customer Scheduling"
      description="Appointment types, consultation request queue, availability readiness, booking form readiness, and customer profile linking. Calendar sync is not configured in this pass."
    >
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Appointment types" value={String(data.defaultAppointmentTypes.length)} delta="Default definitions" />
      <MetricCard title="Booking requests" value={String(data.consultations.length)} delta="Manual/imported only" />
      <MetricCard title="Calendar sync" value="Not configured" delta="No fake availability" tone="warning" />
      <MetricCard title="Customer links" value={String(data.consultations.filter((item: any) => item.customer_id || item.customerId).length)} delta="Consultations linked to profiles" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Appointment Types</h2>
      <DataTable columns={["Type", "Duration", "Booking readiness", "Status"]} rows={data.defaultAppointmentTypes.map((type: any) => [
        type.name,
        `${type.durationMinutes} minutes`,
        type.bookingReadiness.replace(/_/g, " "),
        <StatusBadge key={type.key} status="manual setup required" tone="warning" />
      ])} />
    </section>
    <ProviderStatusCard title="Calendar integration" status="not configured" tone="warning" description="Google Calendar or other scheduling sync is not connected. Appointment requests can be tracked manually." />
  </>;
}
