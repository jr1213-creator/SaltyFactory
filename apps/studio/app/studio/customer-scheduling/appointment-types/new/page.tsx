import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewAppointmentTypePage() {
  return <>
    <PageHeader eyebrow="Scheduling foundation" title="Create Appointment Type" description="Create a manual appointment type for consultation tracking. This does not connect calendar availability or booking sync.">
      <LinkButton href="/studio/customer-scheduling" variant="secondary">Customer Scheduling</LinkButton>
    </PageHeader>
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/scheduling" method="post">
        <input type="hidden" name="next" value="/studio/customer-scheduling" />
        <label>Name<input name="name" required /></label>
        <label>Duration minutes<input name="duration_minutes" type="number" min="5" step="5" defaultValue="30" /></label>
        <label>Booking readiness<select name="booking_readiness" defaultValue="manual_setup_required"><option value="manual_setup_required">Manual setup required</option><option value="ready">Ready</option><option value="not_configured">Not configured</option></select></label>
        <label>Status<select name="status" defaultValue="active"><option value="active">Active</option><option value="draft">Draft</option><option value="disabled">Disabled</option></select></label>
        <button className="btn" type="submit">Save Appointment Type</button>
      </form>
    </section>
  </>;
}
