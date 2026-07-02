import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../data";

export const runtime = "nodejs";

export default async function CustomerCommandCenterSetupPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Customer setup wizard"
      title="Customer Command Center Setup"
      description="Seed the native customer defaults that make the command center useful without fake Shopify, email, support, analytics, or calendar data."
    >
      <LinkButton href="/studio/customer-command-center" variant="secondary">Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Default segments" status={data.segments.length ? "ready" : "not started"} tone={data.segments.length ? "success" : "warning"} description="Saved/default segment definitions coexist with zero fake memberships." />
      <ProviderStatusCard title="Capture forms" status={data.forms.length ? "ready" : "not started"} tone={data.forms.length ? "success" : "warning"} description="Forms are persisted definitions. Public embeds remain future integration." />
      <ProviderStatusCard title="Messaging provider" status="not configured" tone="warning" description="Message templates are drafts only; no email/SMS sending is implemented." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Setup Steps</h2>
      <DataTable columns={["Step", "State", "What it does"]} rows={[
        ["Create default customer segments", data.segments.length ? <StatusBadge key="segments" status="ready" tone="success" /> : <StatusBadge key="segments-pending" status="not started" tone="warning" />, "Creates saved segment definitions without fake members."],
        ["Create follow-up task templates", data.defaultTaskTemplates.length ? <StatusBadge key="tasks" status="ready" tone="success" /> : <StatusBadge key="tasks-pending" status="not started" tone="warning" />, "Creates reusable owner follow-up templates."],
        ["Create default message templates", data.defaultMessageTemplates.length ? <StatusBadge key="messages" status="ready" tone="success" /> : <StatusBadge key="messages-pending" status="not started" tone="warning" />, "Creates draft copy templates only; no messages are sent."],
        ["Create capture form templates", data.forms.length ? <StatusBadge key="forms" status="ready" tone="success" /> : <StatusBadge key="forms-pending" status="not started" tone="warning" />, "Creates form definitions for lead/customer capture."],
        ["Create appointment types", data.appointmentTypes.length ? <StatusBadge key="appts" status="ready" tone="success" /> : <StatusBadge key="appts-pending" status="not started" tone="warning" />, "Creates manual scheduling categories; no calendar sync."],
        ["Create default recommendation rules", <StatusBadge key="rules" status="rule-based" tone="info" />, "The v1 next-action engine stays deterministic and source-labeled."]
      ]} />
      <form action="/api/studio/customer-command-center/setup" method="post" style={{ marginTop: 16 }}>
        <input type="hidden" name="next" value="/studio/customer-command-center/setup" />
        <button className="sf-button" type="submit">Seed Customer Defaults</button>
      </form>
    </section>
  </>;
}
