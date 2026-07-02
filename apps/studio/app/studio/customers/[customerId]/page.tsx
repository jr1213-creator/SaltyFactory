import { notFound } from "next/navigation";
import { AuditTimeline, DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return `$${parsed.toFixed(2)}`;
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const data = await getCustomerCommandCenterData();
  const customer = data.customers.find((row: any) => String(row.id) === customerId) as any;
  if (!customer && data.ok) notFound();
  const timeline = data.timelineEvents.filter((event: any) => String(event.customer_id ?? event.customerId ?? "") === customerId);
  const notes = data.notes.filter((note: any) => String(note.customer_id ?? note.customerId ?? "") === customerId);
  const tasks = data.tasks.filter((task: any) => String(task.customer_id ?? task.customerId ?? "") === customerId);
  const nextActions = data.nextActions.filter((action: any) => action.customerId === customerId);
  const interests = data.productInterests.filter((interest: any) => String(interest.customer_id ?? interest.customerId ?? "") === customerId);
  const externalRefs = data.externalRefs.filter((ref: any) => String(ref.customer_id ?? ref.customerId ?? "") === customerId);
  const consents = data.consents.filter((consent: any) => String(consent.customer_id ?? consent.customerId ?? "") === customerId);

  return <>
    <PageHeader
      eyebrow="Customer 360"
      title={customer?.name ?? "Customer profile"}
      description="Customer source, consent, timeline, notes, tasks, product interests, and rule-based next actions. Provider-backed sections stay honest until real integrations sync."
    >
      <LinkButton href="/studio/customers" variant="secondary">All Customers</LinkButton>
      <LinkButton href="/studio/customer-command-center">Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    {customer && <div className="sf-grid sf-grid-4">
      <MetricCard title="Lifetime value" value={money(customer.lifetime_value ?? customer.lifetimeValue)} delta="Provider/imported or manual" />
      <MetricCard title="Average order value" value={money(customer.average_order_value ?? customer.averageOrderValue)} delta="Requires real order data" />
      <MetricCard title="Order count" value={String(customer.order_count ?? customer.orderCount ?? 0)} delta="No fake orders" />
      <MetricCard title="Consent" value={String(customer.marketing_consent_status ?? customer.marketingConsentStatus ?? "unknown").replace(/_/g, " ")} delta="Campaign gate" tone={String(customer.marketing_consent_status ?? customer.marketingConsentStatus) === "granted" ? "success" : "warning"} />
    </div>}

    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <section className="sf-card">
          <h2>Profile</h2>
          <DataTable columns={["Field", "Value"]} rows={[
            ["Name", customer?.name ?? "-"],
            ["Email", customer?.email ?? "-"],
            ["Phone", customer?.phone ?? "-"],
            ["Location", customer?.location ?? "-"],
            ["Source", data.sourceLabelFor(customer?.source_label ?? customer?.sourceLabel)],
            ["Lifecycle stage", String(customer?.lifecycle_stage ?? customer?.lifecycleStage ?? customer?.status ?? "unknown").replace(/_/g, " ")],
            ["Customer type", String(customer?.customer_type ?? customer?.customerType ?? "unknown").replace(/_/g, " ")],
            ["Next action", customer?.next_action ?? customer?.nextAction ?? "Run rule-based next actions"],
            ["Shopify/external refs", externalRefs.length ? externalRefs.map((ref: any) => `${ref.provider_key ?? ref.providerKey}: ${ref.external_id ?? ref.externalId}`).join(", ") : "Appear after provider/customer sync is configured."]
          ]} />
        </section>

        <section className="sf-card">
          <h2>AI Customer Summary</h2>
          <p className="sf-muted">Rule-based AI suggestion. No external model call is required, and no customer data leaves the server in this fallback.</p>
          <DataTable columns={["Recommendation", "Reason", "Priority"]} rows={nextActions.length ? nextActions.map((action: any) => [
            action.title,
            action.reason,
            <StatusBadge key={action.id} status={action.priority} tone={action.priority === "high" ? "warning" : "info"} />
          ]) : [["No recommendations yet", "Add contact details, orders, notes, tasks, or product interests.", "normal"]]} />
        </section>

        <section className="sf-card">
          <h2>Timeline</h2>
          {timeline.length ? <AuditTimeline events={timeline.map((event: any) => ({
            title: event.title ?? event.event_type ?? event.eventType,
            detail: `${event.body ?? ""} Source: ${data.sourceLabelFor(event.source_label ?? event.sourceLabel)}${event.ai_suggested || event.aiSuggested ? " (AI-suggested)" : ""}`,
            time: String(event.event_at ?? event.eventAt ?? "")
          }))} /> : <p className="sf-muted">No timeline events exist yet. Real events appear after manual notes/tasks, provider imports, forms, support, scheduling, or tracking are configured.</p>}
        </section>

        <section className="sf-card">
          <h2>Notes & Follow-up Tasks</h2>
          <DataTable columns={["Type", "Title", "Status", "Source"]} rows={[
            ...notes.map((note: any) => ["Note", note.title, note.status ?? "active", data.sourceLabelFor(note.source_label ?? note.sourceLabel)]),
            ...tasks.map((task: any) => ["Task", task.title, task.status ?? "open", data.sourceLabelFor(task.source_label ?? task.sourceLabel)])
          ].length ? [
            ...notes.map((note: any) => ["Note", note.title, note.status ?? "active", data.sourceLabelFor(note.source_label ?? note.sourceLabel)]),
            ...tasks.map((task: any) => ["Task", task.title, task.status ?? "open", data.sourceLabelFor(task.source_label ?? task.sourceLabel)])
          ] : [["None yet", "Create a note or follow-up task from the API/UI foundation.", "-", "System-generated"]]} />
        </section>
      </div>

      <div className="sf-grid">
        <ProviderStatusCard title="Order history" status={data.providerStatuses.shopify === "connected" ? "sync available" : "setup needed"} tone={data.providerStatuses.shopify === "connected" ? "info" : "warning"} description="Order history appears after Shopify customer/order sync is configured." />
        <ProviderStatusCard title="Abandoned carts" status="future integration" tone="warning" description="Abandoned cart candidates require Shopify/cart event integration." />
        <ProviderStatusCard title="Support conversations" status={data.conversations.length ? "detected" : "not configured"} tone={data.conversations.length ? "success" : "warning"} description="Support conversations appear after inbox channels are configured." />
        <ProviderStatusCard title="Website behavior" status={data.events.length ? "detected" : "not configured"} tone={data.events.length ? "success" : "warning"} description="Website behavior appears after tracking is configured." />
        <section className="sf-card">
          <h2>Product Interests</h2>
          <DataTable columns={["Product type", "Score", "Status", "Source"]} rows={interests.length ? interests.map((interest: any) => [
            interest.product_type ?? interest.productType,
            String(interest.interest_score ?? interest.interestScore ?? 0),
            interest.status ?? "active",
            data.sourceLabelFor(interest.source_label ?? interest.sourceLabel)
          ]) : [["No product interests", "0", "none", "System-generated"]]} />
        </section>
        <section className="sf-card">
          <h2>Marketing Consent</h2>
          <DataTable columns={["Type", "Status", "Source"]} rows={consents.length ? consents.map((consent: any) => [
            consent.consent_type ?? consent.consentType ?? "marketing",
            consent.status ?? "unknown",
            data.sourceLabelFor(consent.source_label ?? consent.sourceLabel)
          ]) : [["Marketing", customer?.marketing_consent_status ?? customer?.marketingConsentStatus ?? "unknown", "Customer profile"]]} />
        </section>
      </div>
    </div>
  </>;
}
