import { DataTable, EmptyState, LinkButton, MetricCard, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getCustomerCommandCenterData } from "./data";

export const runtime = "nodejs";

function tone(status: string) {
  if (["ready", "connected", "complete", "active", "detected"].includes(status)) return "success" as const;
  if (["failed", "blocked", "blocked_by_guardrail"].includes(status)) return "danger" as const;
  if (["not_configured", "setup_needed", "needs_owner_action", "manual_setup_required"].includes(status)) return "warning" as const;
  return "info" as const;
}

function fmt(value: string) {
  return value.replace(/_/g, " ");
}

export default async function CustomerCommandCenterPage() {
  const data = await getCustomerCommandCenterData();
  const summary = data.summary;

  return <>
    <PageHeader
      eyebrow="Customer success operating system"
      title="Customer Command Center"
      description="Customers, leads, follow-ups, segments, capture readiness, support, campaigns, intelligence, scheduling, and AI next actions for Salty Cowhide. Live provider data appears only after real syncs."
    >
      <LinkButton href="/studio/customers">Open Customers</LinkButton>
      <LinkButton href="/studio/customer-capture" variant="secondary">Customer Capture</LinkButton>
      <LinkButton href="/studio/customer-command-center/setup" variant="secondary">Setup Customer Defaults</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    {summary.emptyState && <EmptyState
      title="Activate your Customer Command Center"
      description="Connect Shopify, import customers, or turn on capture widgets to activate your Customer Command Center."
      action={<LinkButton href="/studio/account-center">Open Launch Command Center</LinkButton>}
    />}

    <div className="sf-grid sf-grid-4" style={{ marginTop: 18 }}>
      <MetricCard title="Customers" value={String(summary.customerCount)} delta="Saved workspace records" />
      <MetricCard title="Leads" value={String(summary.leadCount)} delta="Manual or imported" />
      <MetricCard title="Tasks due" value={String(summary.tasksDue)} delta="Owner follow-ups" tone={summary.tasksDue ? "warning" : "success"} />
      <MetricCard title="Follow-ups needed" value={String(summary.followUpsNeeded)} delta="Open customer actions" tone={summary.followUpsNeeded ? "warning" : "success"} />
      <MetricCard title="High-intent leads" value={String(summary.highIntentLeadsCount)} delta="No fake intent scoring" />
      <MetricCard title="VIP/repeat customers" value={String(summary.vipRepeatCustomersCount)} delta="Requires real order data" />
      <MetricCard title="Active segments" value={String(summary.segmentsActive)} delta="Definitions ready" />
      <MetricCard title="Capture widgets active" value={String(summary.captureWidgetsActive)} delta="Embed future integration" tone={summary.captureWidgetsActive ? "success" : "warning"} />
      <MetricCard title="Campaign drafts" value={String(summary.campaignsDraft)} delta="No email sends in this pass" />
      <MetricCard title="Support conversations" value={String(summary.supportConversationsPlaceholder)} delta="Inbox channels not configured" />
      <MetricCard title="Consultations" value={String(summary.scheduledConsultationsPlaceholder)} delta="Calendar sync not configured" />
      <MetricCard title="Setup progress" value={`${summary.setupProgress}%`} delta="Customer infrastructure readiness" tone={summary.setupProgress >= 70 ? "success" : "warning"} />
    </div>

    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <section className="sf-card">
          <h2>Today's Customer Actions</h2>
          <DataTable
            columns={["Customer", "Action", "Priority", "Source"]}
            rows={data.nextActions.length ? data.nextActions.slice(0, 8).map((action: any) => [
              action.customerName,
              action.title,
              <StatusBadge key={action.id} status={action.priority} tone={action.priority === "high" ? "warning" : "info"} />,
              "Rule-based AI suggestion"
            ]) : [["No customer actions yet", "Add customers, leads, tasks, or capture forms.", "-", "System-generated"]]}
          />
        </section>

        <section className="sf-card">
          <h2>Customer Capture Readiness</h2>
          <DataTable
            columns={["Form", "Status", "Embed", "Source"]}
            rows={(data.forms.length ? data.forms : data.defaultCaptureForms).slice(0, 8).map((form: any) => [
              form.title,
              <StatusBadge key={form.key ?? form.id} status={fmt(String(form.status ?? "draft"))} tone={tone(String(form.status ?? "draft"))} />,
              fmt(String(form.embed_readiness_status ?? form.embedReadinessStatus ?? "future_integration")),
              form.sourceLabel ?? "System-generated"
            ])}
          />
          <p className="sf-muted">Embed code generation is a future integration. Internal forms stay draft/ready until explicitly activated.</p>
        </section>

        <section className="sf-card">
          <h2>Segments & Audiences</h2>
          <DataTable
            columns={["Segment", "Members", "Readiness", "Suggested action"]}
            rows={data.segments.slice(0, 8).map((segment: any) => [
              segment.name,
              String(segment.memberCount ?? segment.member_count ?? 0),
              segment.readiness ?? "No matching customers yet.",
              segment.suggestedAction ?? "Review segment rules."
            ])}
          />
        </section>

        <section className="sf-card">
          <h2>Recent Customers / Leads</h2>
          <DataTable
            columns={["Name", "Email", "Stage", "Source", "Next action"]}
            rows={data.customers.length ? data.customers.slice(0, 6).map((customer: any) => [
              customer.name,
              customer.email ?? "-",
              fmt(String(customer.lifecycle_stage ?? customer.lifecycleStage ?? customer.status ?? "unknown")),
              data.sourceLabelFor(customer.source_label ?? customer.sourceLabel),
              customer.next_action ?? customer.nextAction ?? "Run next-action rules"
            ]) : [["No customers yet", "Connect Shopify, import CSV, or use capture forms.", "-", "System-generated", "Set up customer capture"]]}
          />
        </section>
      </div>

      <div className="sf-grid">
        <ProviderStatusCard title="Shopify customer/order data" status={fmt(data.providerStatuses.shopify)} tone={data.providerStatuses.shopify === "connected" ? "success" : "warning"} description="Order history appears after Shopify customer/order sync is configured." />
        <ProviderStatusCard title="Support & Conversations" status={data.conversations.length ? "detected" : "not configured"} tone={data.conversations.length ? "success" : "warning"} description="Support conversations appear after inbox channels are configured." />
        <ProviderStatusCard title="Marketing Automation" status="draft foundation" tone="info" description="Campaigns are drafts only. No live email sending is implemented in this pass." />
        <ProviderStatusCard title="Customer Intelligence" status={fmt(summary.customerIntelligenceReadiness)} tone={tone(summary.customerIntelligenceReadiness)} description="Website/customer behavior tracking is not configured yet unless real events are imported." />
        <ProviderStatusCard title="Scheduling / Consultations" status={data.consultations.length ? "detected" : "manual setup required"} tone={data.consultations.length ? "success" : "warning"} description="Calendar sync is not configured. Appointment requests can be tracked manually." />
        <ProviderStatusCard title="Source-of-truth labels" status="visible" tone="success" description="Manual, provider-imported, system-generated, and rule-based suggestions are labeled in customer views." />
        <section className="sf-card">
          <h2>Setup Wizard Progress</h2>
          <DataTable columns={["Step", "State"]} rows={[
            ["Connect Shopify", data.providerStatuses.shopify === "connected" ? "complete" : "needs_owner_action"],
            ["Import customers/orders", data.customers.length ? "ready" : "not_started"],
            ["Create default customer segments", data.segments.length ? "ready" : "not_started"],
            ["Create follow-up task templates", data.defaultTaskTemplates.length ? "ready" : "not_started"],
            ["Create default message templates", data.defaultMessageTemplates.length ? "ready" : "not_started"],
            ["Turn on capture forms", summary.captureWidgetsActive ? "complete" : "needs_owner_action"],
            ["Review AI-generated customer success plan", data.nextActions.length ? "ready" : "not_started"]
          ]} />
        </section>
        <section className="sf-card">
          <h2>Blockers</h2>
          <DataTable
            columns={["Blocker", "Status", "Detail"]}
            rows={summary.blockerCards.length ? summary.blockerCards.map((blocker) => [
              blocker.title,
              <StatusBadge key={blocker.title} status={fmt(blocker.status)} tone={tone(blocker.status)} />,
              blocker.detail
            ]) : [["No blockers", <StatusBadge key="ready" status="ready" tone="success" />, "Customer Command Center foundation is ready for real data."]]}
          />
        </section>
      </div>
    </div>
  </>;
}
