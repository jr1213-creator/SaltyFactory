import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function MarketingApprovalsPage() {
  const data = await getMarketingCommandCenterData();
  return <>
    <PageHeader eyebrow="Campaign Approval Queue" title="Campaign Approval Queue" description="Review campaign briefs, proof packs, drafts, asset specs, UTMs, and export packages. Approval does not publish, send, launch ads, or spend money.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <h2>Approval Items</h2>
      <DataTable columns={["Type", "Entity", "Status", "Decide"]} rows={data.approvals.length ? data.approvals.map((approval: any) => [
        String(approval.approval_type ?? approval.approvalType ?? "approval").replace(/_/g, " "),
        `${approval.entity_type ?? approval.entityType}:${approval.entity_id ?? approval.entityId}`,
        <StatusBadge key={approval.id} status={String(approval.status ?? "pending").replace(/_/g, " ")} tone={String(approval.status ?? "pending") === "approved" ? "success" : "warning"} />,
        <form key={`${approval.id}-decision`} action={`/api/studio/shared/approvals/${approval.id}`} method="post">
          <input type="hidden" name="next" value="/studio/marketing/approvals" />
          <select name="status" defaultValue={approval.status ?? "pending"}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs_edits">Needs edits</option><option value="dismissed">Dismissed</option></select>
          <button className="sf-button sf-button-secondary" type="submit">Save</button>
        </form>
      ]) : [["No approval items", "Run launch workflow to create approval queue.", "empty", "-"]]} />
    </section>
    <ProviderStatusCard title="Approval gate" status="required" tone="warning" description="Approvals unlock manual/export review state only; they do not trigger live provider actions." />
  </>;
}
