import { DataTable, LinkButton, MetricCard, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerInboxPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Support inbox foundation"
      title="Customer Inbox"
      description="Support conversations, cases, notes, timeline context, and inbox channel readiness. Website chat, email inbox, and social channels are not live integrations in this pass."
    >
      <LinkButton href="/studio/customer-inbox/new">Create Conversation</LinkButton>
      <LinkButton href="/studio/customer-command-center">Customer Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Conversations" value={String(data.conversations.length)} delta="No fake chat data" />
      <MetricCard title="Open tasks" value={String(data.tasks.filter((task: any) => String(task.status ?? "open") !== "completed").length)} delta="Follow-up queue" />
      <MetricCard title="Notes" value={String(data.notes.length)} delta="Admin-created notes" />
      <MetricCard title="Channels" value="0" delta="Not configured" tone="warning" />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Conversations</h2>
      <DataTable columns={["Conversation", "Customer", "Channel", "Status", "Source", "Open"]} rows={data.conversations.length ? data.conversations.map((conversation: any) => [
        conversation.subject ?? conversation.id,
        conversation.customer_id ?? conversation.customerId ?? "-",
        conversation.channel ?? "manual",
        conversation.status ?? "open",
        data.sourceLabelFor(conversation.source_label ?? conversation.sourceLabel),
        <a key={conversation.id} href={`/studio/customer-inbox/${conversation.id}`}>Open</a>
      ]) : [["No conversations", "Support conversations appear after inbox channels are configured.", "not configured", "empty", "System-generated", "-"]]} />
    </section>
    <div className="sf-grid sf-grid-3" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Website chat" status="not configured" tone="warning" description="Live website chat is a future/support provider integration." />
      <ProviderStatusCard title="Email inbox" status="not configured" tone="warning" description="No live email inbox is connected and no messages are sent." />
      <ProviderStatusCard title="Social channels" status="future integration" tone="info" description="Social support channels are readiness placeholders only." />
    </div>
  </>;
}
