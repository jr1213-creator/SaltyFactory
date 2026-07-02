import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../data";
import { getAccountCenterReadiness } from "./readiness";

export const runtime = "nodejs";

type AccountCenterReadiness = Awaited<ReturnType<typeof getAccountCenterReadiness>>;
type AccountCenterCard = AccountCenterReadiness["cards"][number];

function toneForStatus(status: string) {
  if (["connected", "ready", "approved", "verified", "generated"].includes(status)) return "success" as const;
  if (["failed", "blocked_by_guardrail", "rejected"].includes(status)) return "danger" as const;
  if (["optional_for_online_only", "detected", "prompt_draft", "draft_created"].includes(status)) return "info" as const;
  return "warning" as const;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function CardGrid({ title, cards }: { title: string; cards: AccountCenterCard[] }) {
  return <section className="sf-card">
    <h2>{title}</h2>
    <div className="sf-stack">
      {cards.map((card) => <ProviderStatusCard
        key={`${card.section}-${card.title}`}
        title={card.title}
        status={`${formatStatus(card.status)} - ${card.importance}`}
        tone={toneForStatus(card.status)}
        description={`${card.whyItMatters} Next: ${card.nextOwnerAction}`}
      />)}
    </div>
  </section>;
}

function ChecklistTable({ rows }: { rows: Array<{ label: string; status: string; ownerAction: string }> }) {
  return <DataTable
    columns={["Step", "Status", "Owner action"]}
    rows={rows.map((row) => [
      row.label,
      <StatusBadge key={row.label} status={formatStatus(row.status)} tone={toneForStatus(row.status)} />,
      row.ownerAction
    ])}
  />;
}

export default async function Page() {
  const readiness = await getAccountCenterReadiness();
  const cardsBySection = readiness.cards.reduce<Record<string, typeof readiness.cards>>((groups, card) => {
    groups[card.section] = [...(groups[card.section] ?? []), card];
    return groups;
  }, {});
  const productBlockers = readiness.cards.filter((card) => card.blocksPodProductCreation);
  const launchBlockers = readiness.cards.filter((card) => card.blocksLaunchPublish);

  return <>
    <PageHeader
      eyebrow="Production go-live"
      title="Salty Cowhide Launch Command Center"
      description="Connect accounts, prepare provider setup, run AI employees, and review launch blockers for the SaltyCowhide.com POD operating system. Provider writes remain approval-gated."
    >
      <LinkButton href="/studio/ai-employees">Run AI Employees</LinkButton>
      <LinkButton href="/studio/integrations" variant="secondary">Open Integrations</LinkButton>
    </PageHeader>
    <SchemaSetupState message={readiness.lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <ProviderStatusCard title="Product creation blockers" status={String(productBlockers.length)} tone={productBlockers.length ? "warning" : "success"} description={productBlockers.length ? productBlockers.map((card) => card.title).join(", ") : "Manual and AI-assisted POD product creation can proceed."} />
      <ProviderStatusCard title="Launch/publish blockers" status={String(launchBlockers.length)} tone={launchBlockers.length ? "warning" : "success"} description="Provider sync, public launch, feeds, DNS, and publishing still require owner approval gates." />
      <ProviderStatusCard title="Approval queue" status={String(readiness.approvalQueue.length)} tone={readiness.approvalQueue.length ? "warning" : "success"} description="AI employee outputs and provider actions waiting for owner review." />
      <ProviderStatusCard title="AI work mode" status={readiness.workflowPreview.sourceLabel.replace(/_/g, " ")} tone="info" description="Rules-based fallback is labeled honestly when no model provider is configured." />
    </div>

    <div className="sf-layout-rail" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        {["Business Foundation", "Commerce", "Product Workflow", "Google / Discovery"].map((section) => <CardGrid key={section} title={section} cards={cardsBySection[section] ?? []} />)}

        <section className="sf-card" id="printify">
          <h2>Printify Fulfillment</h2>
          <p className="sf-muted">Create or open Printify outside SaltyFactory, then keep the API token server-side. SaltyFactory can discover real shops and catalog data after credentials are configured.</p>
          <div className="sf-toolbar">
            <LinkButton href="https://printify.com/app/auth/login" variant="secondary">Create or open Printify account</LinkButton>
            <form method="post" action="/api/studio/integrations/printify/setup"><button className="sf-button sf-button-primary" type="submit" name="action" value="discover_shops">Discover Printify shops</button></form>
            <form method="post" action="/api/studio/integrations/printify/test"><button className="sf-button sf-button-secondary" type="submit">Test Printify connection</button></form>
          </div>
          <ChecklistTable rows={readiness.printifySetup.checklist} />
          <p className="sf-muted">Token exposed: {readiness.printifySetup.tokenExposed ? "blocked" : "no"}. Product creation stays blocked until approval gates pass.</p>
        </section>

        <section className="sf-card" id="shopify">
          <h2>Shopify Store</h2>
          <p className="sf-muted">Create or open Shopify outside SaltyFactory, connect SaltyCowhide.com, and configure a server-side Admin API token before testing draft product sync.</p>
          <div className="sf-toolbar">
            <LinkButton href="https://admin.shopify.com/" variant="secondary">Create or open Shopify store</LinkButton>
            <form method="post" action="/api/studio/integrations/shopify/setup"><button className="sf-button sf-button-primary" type="submit" name="action" value="status">Review Shopify setup</button></form>
            <form method="post" action="/api/studio/integrations/shopify/test"><button className="sf-button sf-button-secondary" type="submit">Test Shopify connection</button></form>
          </div>
          <ChecklistTable rows={readiness.shopifySetup.checklist} />
          <p className="sf-muted">Token exposed: {readiness.shopifySetup.tokenExposed ? "blocked" : "no"}. Shopify products are created as drafts only after owner approval and publish gates.</p>
        </section>

        <section className="sf-card">
          <h2>Approval Queue</h2>
          <DataTable
            columns={["Item", "Type", "Source", "Status", "Next action"]}
            rows={readiness.approvalQueue.length ? readiness.approvalQueue.slice(0, 8).map((item) => [
              item.title,
              item.type.replace(/_/g, " "),
              item.sourceLabel.replace(/_/g, " "),
              <StatusBadge key={item.id} status={formatStatus(item.status)} tone={toneForStatus(item.status)} />,
              item.nextAction
            ]) : [["No approval items", "queue", "saved workspace data", <StatusBadge key="clear" status="clear" tone="success" />, "Run AI employees or create product workflow drafts."]]}
          />
        </section>
      </div>

      <div className="sf-grid">
        {["Launch Infrastructure", "AI Employees", "Operations", "Analytics"].map((section) => <CardGrid key={section} title={section} cards={cardsBySection[section] ?? []} />)}

        <section className="sf-card" id="dns">
          <h2>Domain & DNS</h2>
          <p className="sf-muted">Manual DNS mode is active. Records are generated for owner copy/paste; SaltyFactory will not overwrite DNS records without an explicit provider adapter and owner approval.</p>
          <DataTable
            columns={["Purpose", "Type", "Host", "Value", "Status", "Owner action"]}
            rows={readiness.dnsRecords.map((record) => [
              record.purpose,
              record.type,
              record.host,
              <code key={`${record.purpose}-value`}>{record.value}</code>,
              <StatusBadge key={record.purpose} status={formatStatus(record.status)} tone={toneForStatus(record.status)} />,
              record.ownerActionRequired
            ])}
          />
        </section>

        <section className="sf-card" id="email">
          <h2>Email Domain Readiness</h2>
          <DataTable
            columns={["Control", "Status"]}
            rows={[
              ["Support email", readiness.latestBusinessProfile.supportEmail ?? readiness.latestBusinessProfile.support_email ?? "setup needed"],
              ["Sending domain", "saltycowhide.com"],
              ["Readiness", <StatusBadge key="email" status={formatStatus(readiness.emailReadiness.status)} tone={toneForStatus(readiness.emailReadiness.status)} />],
              ["Blockers", readiness.emailReadiness.blockers.length ? readiness.emailReadiness.blockers.join(", ") : "none"],
              ["Customer email sends", "Disabled until provider configuration and owner action"]
            ]}
          />
        </section>

        <section className="sf-card">
          <h2>Merchant Product Feed</h2>
          <DataTable
            columns={["Control", "Status"]}
            rows={[
              ["Feed readiness", <StatusBadge key="feed" status={formatStatus(readiness.productFeedReadiness.status)} tone={toneForStatus(readiness.productFeedReadiness.status)} />],
              ["Submission enabled", readiness.productFeedReadiness.feedSubmissionEnabled ? "yes" : "no"],
              ["Blockers", readiness.productFeedReadiness.blockers.length ? readiness.productFeedReadiness.blockers.join(", ") : "none"],
              ["Owner action", readiness.productFeedReadiness.nextOwnerAction]
            ]}
          />
        </section>
      </div>
    </div>
  </>;
}
