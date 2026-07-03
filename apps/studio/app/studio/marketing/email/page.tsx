import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData, marketingRowsByChannel } from "../../marketing-command-center/data";

export const runtime = "nodejs";

const templates = ["Product drop announcement", "First purchase thank-you", "Review request", "VIP early access", "Jewelry stack promo", "Digital bundle upsell", "Wholesale follow-up", "Custom order nurture", "Holiday drop", "Reactivation campaign"];

export default async function EmailDraftStudioPage() {
  const data = await getMarketingCommandCenterData();
  const drafts = marketingRowsByChannel(data.channels, "email");
  return <>
    <PageHeader eyebrow="Email Draft Studio" title="Email Draft Studio" description="Create consent-aware email drafts for manual export. No email provider sending or fake open/click analytics.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <h2>Create Email Draft</h2>
      <form className="layout-grid layout-grid-2" action="/api/studio/shared/campaign-channels" method="post">
        <input type="hidden" name="next" value="/studio/marketing/email" />
        <input type="hidden" name="channel_type" value="email" />
        <label>Campaign ID<input name="campaign_id" /></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option><option value="approved">Approved</option><option value="export_ready">Export ready</option><option value="manually_published">Manually sent elsewhere</option></select></label>
        <label>Draft content JSON<textarea name="draft_content" defaultValue={JSON.stringify({ subject: "A note from Salty Cowhide", previewText: "Owner-reviewed campaign draft.", body: "Draft email body. Consent and unsubscribe compliance must be reviewed.", cta: "Shop the drop", consentRequired: true, noSending: true }, null, 2)} /></label>
        <button className="btn" type="submit">Save Email Draft</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Saved Email Drafts</h2>
      <DataTable columns={["Campaign", "Status", "Consent", "Export", "Open"]} rows={drafts.length ? drafts.map((draft: any) => [
        draft.campaign_id ?? draft.campaignId ?? "-",
        <StatusBadge key={draft.id} status={String(draft.status ?? "draft").replace(/_/g, " ")} />,
        "Consent must be confirmed before enrollment.",
        "manual export only",
        <a key={`${draft.id}-open`} href={`/studio/marketing/drafts/${draft.id}`}>Open</a>
      ]) : [["No email drafts", "Create one above or run launch workflow.", "consent required", "No sending", "-"]]} />
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Default Templates</h2>
      <DataTable columns={["Template", "Status"]} rows={templates.map((template) => [template, "draft template"])} />
    </section>
    <ProviderStatusCard title="Email provider" status={data.providerStatuses.email.replace(/_/g, " ")} tone={data.providerStatuses.email === "connected" ? "success" : "warning"} description="Email drafts can be copied/exported. No delivery engine is implemented." />
  </>;
}
