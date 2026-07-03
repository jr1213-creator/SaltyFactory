import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getCustomerCommandCenterData } from "../../../customer-command-center/data";

export const runtime = "nodejs";

export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const data = await getCustomerCommandCenterData();
  const customer = data.customers.find((item: any) => String(item.id) === customerId) as any;
  if (!customer && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Customer 360" title={`Edit ${customer?.name ?? "Customer"}`} description="Update persisted customer profile data. Provider-imported order metrics still require real Shopify sync.">
      <LinkButton href={`/studio/customers/${customerId}`} variant="secondary">View Customer</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action={`/api/studio/crm/customers/${customerId}`} method="post">
        <input type="hidden" name="next" value={`/studio/customers/${customerId}`} />
        <label>Name<input name="name" defaultValue={customer?.name ?? ""} required /></label>
        <label>Email<input name="email" type="email" defaultValue={customer?.email ?? ""} /></label>
        <label>Phone<input name="phone" defaultValue={customer?.phone ?? ""} /></label>
        <label>Location<input name="location" defaultValue={customer?.location ?? ""} /></label>
        <label>Lifecycle stage<input name="lifecycle_stage" defaultValue={customer?.lifecycle_stage ?? customer?.lifecycleStage ?? ""} /></label>
        <label>Customer type<input name="customer_type" defaultValue={customer?.customer_type ?? customer?.customerType ?? ""} /></label>
        <label>Marketing consent<select name="marketing_consent_status" defaultValue={customer?.marketing_consent_status ?? customer?.marketingConsentStatus ?? "unknown"}><option value="unknown">Unknown</option><option value="granted">Granted</option><option value="denied">Denied</option></select></label>
        <label>Next action<input name="next_action" defaultValue={customer?.next_action ?? customer?.nextAction ?? ""} /></label>
        <button className="btn" type="submit">Save Customer</button>
      </form>
    </section>
  </>;
}
