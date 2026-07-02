import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../../data";
import { getMarketingCommandCenterData, marketingChannelLabels } from "../../../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function EditMarketingDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const data = await getMarketingCommandCenterData();
  const draft = data.channels.find((item: any) => String(item.id) === draftId) as any;
  if (!draft && data.ok) notFound();
  const channelType = String(draft?.channel_type ?? draft?.channelType ?? "other");
  return <>
    <PageHeader eyebrow="Marketing draft" title={`Edit ${marketingChannelLabels[channelType] ?? channelType.replace(/_/g, " ")}`} description="Edit manual/export-ready draft content. No live provider action is triggered.">
      <LinkButton href={`/studio/marketing/drafts/${draftId}`} variant="secondary">View Draft</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <form className="sf-grid sf-grid-2" action={`/api/studio/shared/campaign-channels/${draftId}`} method="post">
        <input type="hidden" name="next" value={`/studio/marketing/drafts/${draftId}`} />
        <label>Campaign ID<input name="campaign_id" defaultValue={draft?.campaign_id ?? draft?.campaignId ?? ""} /></label>
        <label>Channel type<input name="channel_type" defaultValue={channelType} required /></label>
        <label>Status<select name="status" defaultValue={draft?.status ?? "draft"}><option value="draft">Draft</option><option value="needs_asset">Needs asset</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="export_ready">Export ready</option><option value="exported">Exported</option><option value="manually_published">Manually published</option><option value="blocked">Blocked</option><option value="archived">Archived</option></select></label>
        <label>Draft content JSON<textarea name="draft_content" defaultValue={JSON.stringify(draft?.draft_content ?? draft?.draftContent ?? {}, null, 2)} /></label>
        <button className="sf-button" type="submit">Save Draft</button>
      </form>
    </section>
  </>;
}
