import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getCustomerCommandCenterData } from "../../../customer-command-center/data";

export const runtime = "nodejs";

export default async function EditCustomerCampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const data = await getCustomerCommandCenterData();
  const campaign = data.campaigns.find((item: any) => String(item.id) === campaignId) as any;
  if (!campaign && data.ok) notFound();
  const campaignJson = JSON.stringify(campaign?.campaign_json ?? campaign?.campaignJson ?? {}, null, 2);
  return <>
    <PageHeader eyebrow="Campaign draft" title={`Edit ${campaign?.name ?? "Campaign"}`} description="Edit draft campaign planning data. No provider sending is triggered.">
      <LinkButton href={`/studio/customer-campaigns/${campaignId}`} variant="secondary">View Campaign</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action={`/api/studio/crm/campaigns/${campaignId}`} method="post">
        <input type="hidden" name="next" value={`/studio/customer-campaigns/${campaignId}`} />
        <label>Name<input name="name" defaultValue={campaign?.name ?? ""} required /></label>
        <label>Status<select name="status" defaultValue={campaign?.status ?? "draft"}><option value="draft">Draft</option><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="archived">Archived</option></select></label>
        <label>Goal<input name="goal" defaultValue={campaign?.goal ?? ""} /></label>
        <label>Target segment ID<input name="target_segment_id" defaultValue={campaign?.target_segment_id ?? campaign?.targetSegmentId ?? ""} /></label>
        <label>Consent required<select name="consent_required" defaultValue={campaign?.consent_required === false || campaign?.consentRequired === false ? "false" : "true"}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label>Campaign JSON<textarea name="campaign_json" defaultValue={campaignJson} /></label>
        <button className="sf-button" type="submit">Save Campaign</button>
      </form>
    </section>
  </>;
}
