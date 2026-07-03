import { LinkButton, PageHeader } from "@saltyfactory/ui";

export const runtime = "nodejs";

export default function NewCustomerPage() {
  return <>
    <PageHeader
      eyebrow="Customer 360"
      title="Create Customer"
      description="Create a workspace-owned customer profile. Shopify order history remains empty until real Shopify customer/order sync is configured."
    >
      <LinkButton href="/studio/customers" variant="secondary">All Customers</LinkButton>
    </PageHeader>
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/customers" method="post">
        <input type="hidden" name="next" value="/studio/customers/{id}" />
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" /></label>
        <label>Phone<input name="phone" /></label>
        <label>Location<input name="location" /></label>
        <label>Lifecycle stage<select name="lifecycle_stage" defaultValue="active"><option value="lead">Lead</option><option value="active">Active</option><option value="repeat">Repeat</option><option value="vip">VIP</option></select></label>
        <label>Customer type<select name="customer_type" defaultValue="retail"><option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="custom_order">Custom order</option><option value="consulting">Consulting</option></select></label>
        <label>Marketing consent<select name="marketing_consent_status" defaultValue="unknown"><option value="unknown">Unknown</option><option value="granted">Granted</option><option value="denied">Denied</option></select></label>
        <label>Source<select name="source_label" defaultValue="manual_entry"><option value="manual_entry">Manual entry</option><option value="contact_form">Contact form</option><option value="csv_import">CSV import</option><option value="shopify">Shopify</option></select></label>
        <label>Next action<input name="next_action" placeholder="Review first follow-up" /></label>
        <button className="btn" type="submit">Save Customer</button>
      </form>
    </section>
  </>;
}
