import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

export default async function ConversationDetailPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const data = await getCustomerCommandCenterData();
  const conversation = data.conversations.find((item: any) => String(item.id) === conversationId) as any;
  if (!conversation && data.ok) notFound();
  const messages = data.conversationMessages.filter((message: any) => String(message.conversation_id ?? message.conversationId ?? "") === conversationId);
  return <>
    <PageHeader eyebrow="Manual conversation" title={conversation?.subject ?? "Conversation"} description="Persisted conversation context and internal messages. No live inbox provider is connected by this page.">
      <LinkButton href="/studio/customer-inbox" variant="secondary">Customer Inbox</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Subject", conversation?.subject ?? "-"],
        ["Customer", conversation?.customer_id ?? conversation?.customerId ?? "-"],
        ["Channel", conversation?.channel ?? "manual"],
        ["Status", <StatusBadge key="status" status={String(conversation?.status ?? "open").replace(/_/g, " ")} />],
        ["Source", data.sourceLabelFor(conversation?.source_label ?? conversation?.sourceLabel)]
      ]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Messages</h2>
      <DataTable columns={["Direction", "Body", "Source"]} rows={messages.length ? messages.map((message: any) => [
        message.direction ?? "internal",
        message.body ?? "-",
        data.sourceLabelFor(message.source_label ?? message.sourceLabel)
      ]) : [["No messages", "Add internal notes or imported message excerpts manually.", "System-generated"]]} />
      <form className="layout-grid layout-grid-2" action="/api/studio/crm/inbox/messages" method="post">
        <input type="hidden" name="next" value={`/studio/customer-inbox/${conversationId}`} />
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input type="hidden" name="customer_id" value={conversation?.customer_id ?? conversation?.customerId ?? ""} />
        <label>Direction<select name="direction" defaultValue="internal"><option value="internal">Internal</option><option value="inbound">Inbound excerpt</option><option value="outbound_draft">Outbound draft</option></select></label>
        <label>Body<textarea name="body" required /></label>
        <button className="btn" type="submit">Save Message</button>
      </form>
    </section>
    <ProviderStatusCard title="Live inbox channels" status="not configured" tone="warning" description="This native inbox foundation stores manual/imported conversation records only. It does not send replies." />
  </>;
}
