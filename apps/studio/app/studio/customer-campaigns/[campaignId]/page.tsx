import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerCampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const data = await getCustomerCommandCenterData();
  const campaign = data.campaigns.find((item: any) => String(item.id) === campaignId) as any;
  if (!campaign && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Campaign draft" title={campaign?.name ?? "Customer campaign"} description="Draft customer campaign record with consent readiness and no live sending.">
      <LinkButton href="/studio/customer-campaigns" variant="secondary">All Campaigns</LinkButton>
      <LinkButton href={`/studio/customer-campaigns/${campaignId}/edit`} variant="secondary">Edit Campaign</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <DataTable columns={["Field", "Value"]} rows={[
        ["Name", campaign?.name ?? "-"],
        ["Goal", campaign?.goal ?? "-"],
        ["Target segment", campaign?.target_segment_id ?? campaign?.targetSegmentId ?? "manual selection required"],
        ["Status", <StatusBadge key="status" status={String(campaign?.status ?? "draft").replace(/_/g, " ")} />],
        ["Consent readiness", campaign?.consent_required === false || campaign?.consentRequired === false ? "Consent not required by record" : "Consent must be confirmed before enrollment."],
        ["Source", data.sourceLabelFor(campaign?.source_label ?? campaign?.sourceLabel)]
      ]} />
    </section>
    <ProviderStatusCard title="Email/SMS sending" status="not configured" tone="warning" description="This campaign can be planned and exported, but it does not send email/SMS or enroll contacts automatically." />
  </>;
}
