import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function ServiceCasesPage() {
  const data = await getCustomerCommandCenterData();
  const serviceCases = data.serviceCases;
  const openCases = serviceCases.filter((item: any) => String(item.status ?? "open") !== "closed");
  return <>
    <PageHeader eyebrow="Service workflow" title="Service Cases" description="Service case foundation for customer support, custom order issues, fulfillment questions, and resolution notes.">
      <LinkButton href="/studio/service-cases/new">Create Service Case</LinkButton>
      <LinkButton href="/studio/customer-inbox">Customer Inbox</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Cases" value={String(serviceCases.length)} delta="No fake support data; saved support records" />
      <MetricCard title="Conversations" value={String(data.conversations.length)} delta="Inbox foundation" />
      <MetricCard title="Open cases/tasks" value={String(openCases.length + data.tasks.length)} delta="Follow-up records" />
      <MetricCard title="Support channels" value="Not configured" delta="Website/email/social future" tone="warning" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Service Case Queue</h2>
      <DataTable columns={["Subject", "Customer", "Priority", "Status", "Channel", "Open"]} rows={serviceCases.length ? serviceCases.map((item: any) => [
        item.subject,
        item.customer_id ?? item.customerId ?? "-",
        <StatusBadge key={`${item.id}-priority`} status={String(item.priority ?? "normal").replace(/_/g, " ")} />,
        String(item.status ?? "open").replace(/_/g, " "),
        item.channel ?? "manual",
        <a key={item.id} href={`/studio/service-cases/${item.id}`}>Open</a>
      ]) : [["No service cases", "Support cases appear after manual entry or inbox integration.", <StatusBadge key="normal" status="normal" />, "empty", "not configured", "-"]]} />
    </section>
    <ProviderStatusCard title="Live support inbox" status="not configured" tone="warning" description="No live chat, email, or social inbox is connected in this pass." />
  </>;
}
