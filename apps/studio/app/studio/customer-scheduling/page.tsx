import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerSchedulingPage() {
  const data = await getCustomerCommandCenterData();
  const appointmentTypes = data.appointmentTypes.length ? data.appointmentTypes : data.defaultAppointmentTypes;
  return <>
    <PageHeader
      eyebrow="Scheduling foundation"
      title="Customer Scheduling"
      description="Appointment types, consultation request queue, availability readiness, booking form readiness, and customer profile linking. Calendar sync is not configured in this pass."
    >
      <LinkButton href="/studio/customer-scheduling/appointment-types/new">Create Appointment Type</LinkButton>
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="layout-grid layout-grid-4">
      <MetricCard title="Appointment types" value={String(appointmentTypes.length)} delta={data.appointmentTypes.length ? "Saved workspace records" : "Default definitions"} />
      <MetricCard title="Booking requests" value={String(data.bookingRequests.length)} delta="Manual/imported only" />
      <MetricCard title="Calendar sync" value="Not configured" delta="No fake availability" tone="warning" />
      <MetricCard title="Customer links" value={String(data.consultations.filter((item: any) => item.customer_id || item.customerId).length)} delta="Consultations linked to profiles" />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Appointment Types</h2>
      <DataTable columns={["Type", "Duration", "Booking readiness", "Status"]} rows={appointmentTypes.map((type: any) => [
        type.name,
        `${type.duration_minutes ?? type.durationMinutes ?? 30} minutes`,
        String(type.booking_readiness ?? type.bookingReadiness ?? "manual_setup_required").replace(/_/g, " "),
        <StatusBadge key={type.key ?? type.id} status={String(type.status ?? "manual setup required").replace(/_/g, " ")} tone="warning" />
      ])} />
    </section>
    <ProviderStatusCard title="Calendar integration" status="not configured" tone="warning" description="Google Calendar or other scheduling sync is not connected. Appointment requests can be tracked manually." />
  </>;
}
