import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getMarketingCommandCenterData, marketingChannelLabels } from "../../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function MarketingDraftDetailPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const data = await getMarketingCommandCenterData();
  const draft = data.channels.find((item: any) => String(item.id) === draftId) as any;
  if (!draft && data.ok) notFound();
  const channelType = String(draft?.channel_type ?? draft?.channelType ?? "other");
  return <>
    <PageHeader eyebrow="Marketing draft" title={marketingChannelLabels[channelType] ?? channelType.replace(/_/g, " ")} description="Persisted draft record for manual/export-ready marketing. No provider execution happens from this detail view.">
      <LinkButton href={`/studio/marketing/drafts/${draftId}/edit`} variant="secondary">Edit Draft</LinkButton>
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Campaign", draft?.campaign_id ?? draft?.campaignId ?? "-"],
        ["Channel", marketingChannelLabels[channelType] ?? channelType.replace(/_/g, " ")],
        ["Status", <StatusBadge key="status" status={String(draft?.status ?? "draft").replace(/_/g, " ")} />],
        ["Provider connection", draft?.provider_connection_id ?? draft?.providerConnectionId ?? "not configured"],
        ["Approval", draft?.approval_id ?? draft?.approvalId ?? "owner approval required"],
        ["Draft content", JSON.stringify(draft?.draft_content ?? draft?.draftContent ?? {}, null, 2)]
      ]} />
    </section>
    <ProviderStatusCard title="Live execution" status="disabled" tone="warning" description="Use copy/export/manual publishing after owner review. This route does not publish, send, submit, launch, or spend." />
  </>;
}
