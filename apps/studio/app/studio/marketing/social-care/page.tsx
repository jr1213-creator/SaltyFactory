import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

const classifications = ["buying_intent", "support", "complaint", "review", "collab", "wholesale", "custom_order", "question", "other"];
const platforms = ["instagram", "facebook", "pinterest", "tiktok", "youtube", "threads", "linkedin", "google_business_profile", "bluesky", "manual"];

function payloadOf(record: any) {
  return (record.raw_payload ?? record.rawPayload ?? {}) as Record<string, unknown>;
}

export default async function SocialCareOpportunitiesPage() {
  const data = await getMarketingCommandCenterData();
  const opportunities = data.sourceRecords.filter((record: any) => String(record.source_name ?? record.sourceName ?? "") === "social_comment");
  const responseNotes = data.tasks.filter((task: any) => String(task.entity_type ?? task.entityType ?? "") === "social_care_opportunity");
  return <>
    <PageHeader eyebrow="Social Care Opportunity Foundation" title="Social Care Opportunities" description="Manual/imported comment opportunities with classification, response drafts, linked customer or lead context, and follow-up tasks. No live social inbox is connected.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
      <LinkButton href="/studio/marketing/research" variant="secondary">Research Board</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-3">
      <ProviderStatusCard title="Input mode" status="manual/import only" tone="warning" description="Paste or import owner-reviewed comments. No scraping or social provider inbox is called." />
      <ProviderStatusCard title="Response mode" status="draft only" tone="info" description="Response text is stored as a note for owner review; it is never sent from SaltyFactory." />
      <ProviderStatusCard title="Follow-up" status="task-backed" tone="info" description="Buying intent, complaints, wholesale, and custom-order comments can create high-priority tasks." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Record Comment Opportunity</h2>
      <form className="sf-grid sf-grid-2" action="/api/studio/marketing/social-care" method="post">
        <input type="hidden" name="next" value="/studio/marketing/social-care" />
        <label>Platform<select name="platform" defaultValue="manual">{platforms.map((platform) => <option key={platform} value={platform}>{platform.replace(/_/g, " ")}</option>)}</select></label>
        <label>Classification<select name="classification" defaultValue="question">{classifications.map((classification) => <option key={classification} value={classification}>{classification.replace(/_/g, " ")}</option>)}</select></label>
        <label>Linked entity<select name="linked_entity_type" defaultValue="none"><option value="none">None yet</option><option value="customer">Customer</option><option value="lead">Lead</option></select></label>
        <label>Linked customer/lead ID<input name="linked_entity_id" placeholder="optional persisted ID" /></label>
        <label>Source URL<input name="source_url" placeholder="optional internal reference URL" /></label>
        <label>Follow-up task<input name="follow_up_title" placeholder="Create task title, optional" /></label>
        <label>Comment text<textarea name="comment_text" defaultValue="Paste owner-reviewed comment or message here." required /></label>
        <label>Response draft<textarea name="response_draft" defaultValue="Draft response for owner review. Do not send automatically." /></label>
        <label><input type="checkbox" name="owner_verified" /> Owner verified source/context</label>
        <label><input type="checkbox" name="create_task" defaultChecked /> Create follow-up task</label>
        <button className="sf-button" type="submit">Save Opportunity</button>
      </form>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Saved Opportunities</h2>
      <DataTable columns={["Platform", "Classification", "Linked", "Response", "Status"]} rows={opportunities.length ? opportunities.map((record: any) => {
        const payload = payloadOf(record);
        const linkedEntityType = String(payload.linkedEntityType ?? "none");
        const linkedEntityId = String(payload.linkedEntityId ?? "");
        return [
          String(payload.platform ?? record.provider ?? "manual").replace(/_/g, " "),
          String(payload.classification ?? "other").replace(/_/g, " "),
          linkedEntityType === "none" ? "not linked" : `${linkedEntityType}:${linkedEntityId || "missing id"}`,
          payload.responseDraft ? "draft stored" : "draft needed",
          <StatusBadge key={record.id} status={String(record.origin ?? "manual").replace(/_/g, " ")} tone={record.owner_verified_at || record.ownerVerifiedAt ? "success" : "warning"} />
        ];
      }) : [["No comment opportunities", "Paste/import a comment above.", "not linked", "draft needed", "manual only"]]} />
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Follow-Up Tasks</h2>
      <DataTable columns={["Task", "Priority", "Status"]} rows={responseNotes.length ? responseNotes.map((task: any) => [
        task.title,
        task.priority ?? "normal",
        <StatusBadge key={task.id} status={String(task.status ?? "pending").replace(/_/g, " ")} tone={String(task.status ?? "pending") === "completed" ? "success" : "warning"} />
      ]) : [["No follow-up tasks", "Create a task while recording an opportunity.", "pending"]]} />
    </section>
  </>;
}
