import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getMarketingCommandCenterData } from "../../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function EditMarketingCampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const data = await getMarketingCommandCenterData();
  const campaign = data.campaigns.find((item: any) => String(item.id) === campaignId) as any;
  if (!campaign && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Campaign planner" title={`Edit ${campaign?.name ?? "Campaign"}`} description="Edit campaign planning fields. Live publishing, ad launch, and email sending remain disabled.">
      <LinkButton href={`/studio/marketing-campaigns/${campaignId}`} variant="secondary">View Campaign</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action={`/api/studio/shared/campaigns/${campaignId}`} method="post">
        <input type="hidden" name="next" value={`/studio/marketing-campaigns/${campaignId}`} />
        <label>Name<input name="name" defaultValue={campaign?.name ?? ""} required /></label>
        <label>Status<select name="status" defaultValue={campaign?.status ?? "draft"}><option value="draft">Draft</option><option value="planning">Planning</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="exported">Exported</option><option value="manually_published">Manually published</option><option value="archived">Archived</option></select></label>
        <label>Campaign type<input name="campaign_type" defaultValue={campaign?.campaign_type ?? campaign?.campaignType ?? ""} /></label>
        <label>Goal<input name="goal" defaultValue={campaign?.goal ?? ""} /></label>
        <label>Audience<input name="audience" defaultValue={campaign?.audience ?? ""} /></label>
        <label>Offer<input name="offer" defaultValue={campaign?.offer ?? ""} /></label>
        <label>Landing URL<input name="landing_url" defaultValue={campaign?.landing_url ?? campaign?.landingUrl ?? ""} /></label>
        <label>Manual offer JSON<textarea name="manual_offer" defaultValue={JSON.stringify(campaign?.manual_offer ?? campaign?.manualOffer ?? {}, null, 2)} /></label>
        <button className="btn" type="submit">Save Campaign</button>
      </form>
    </section>
  </>;
}
