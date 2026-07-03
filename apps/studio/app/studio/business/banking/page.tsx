import { createRepositories } from "@saltyfactory/db";
import { BankingConnectionCard, EmptyState, PageHeader, ProviderStatusCard, TransactionClassifierTable } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessBankingPage() {
  const repos = createRepositories();
  const connections = await repos.business.bankConnections.listByWorkspace(workspaceId);
  const transactions = await repos.business.bankTransactions.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Banking" description="Novo is selected as the business bank. v1 is read-only through Plaid/open-banking if configured or manual import. No credentials, transfers, payments, ACH, wires, checks, or money movement." />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Novo direct API" status="Not verified" tone="warning" description="SaltyFactory does not scrape Novo or store bank login credentials." />
      <ProviderStatusCard title="Plaid boundary" status="Config-blocked" tone="warning" description="Requires PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, and owner consent." />
      <ProviderStatusCard title="Money movement" status="Not implemented" tone="success" description="No route exists for transfers, payments, wires, checks, or card creation." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Manual Transaction Import</h2>
      <form className="sf-form-grid" action="/api/studio/business/banking/transactions/import" method="post">
        <label>Institution name<input name="institutionName" defaultValue="Novo manual import" /></label>
        <label>Masked account<input name="maskedAccount" placeholder="****1234" /></label>
        <p className="sf-muted">API import accepts JSON transaction arrays. Browser form creates the manual connection only; upload parsing is future.</p>
        <button className="sf-button sf-button-primary" type="submit">Create Manual Banking Record</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>
      {connections.length ? <div className="sf-grid">{connections.map((connection: any) => <BankingConnectionCard key={connection.id} title={connection.institution_name ?? connection.institutionName} status={String(connection.status)} description={`${connection.provider} / ${connection.connection_method ?? connection.connectionMethod}`} />)}</div> : <EmptyState title="No bank connection records" description="Use Plaid when configured or manual import. Bank data remains read-only." />}
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Transactions</h2>
      {transactions.length ? <TransactionClassifierTable columns={["Date", "Description", "Amount", "Status"]} rows={transactions.map((tx: any) => [tx.transaction_date ?? tx.transactionDate, tx.description, tx.amount, tx.classification_status ?? tx.classificationStatus])} /> : <EmptyState title="No transactions" description="Manual/imported transactions appear here. No fake bank data is shown." />}
    </section>
  </>;
}
