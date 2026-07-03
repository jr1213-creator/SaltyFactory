import { notFound } from "next/navigation";
import { LinkButton, PageHeader } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../../data";
import { getCustomerCommandCenterData } from "../../../../customer-command-center/data";

export const runtime = "nodejs";

function fieldsJson(form: any) {
  const fields = form?.fields_json ?? form?.fieldsJson ?? form?.fields ?? [];
  return JSON.stringify(Array.isArray(fields) ? fields : [], null, 2);
}

export default async function EditCaptureFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const data = await getCustomerCommandCenterData();
  const form = data.forms.find((item: any) => String(item.id) === formId) as any;
  if (!form && data.ok) notFound();
  return <>
    <PageHeader eyebrow="Capture form" title={`Edit ${form?.title ?? "Capture Form"}`} description="Edit persisted capture form setup, consent language, fields, and activation state.">
      <LinkButton href={`/studio/customer-capture/forms/${formId}`} variant="secondary">View Form</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="surface-card">
      <form className="layout-grid layout-grid-2" action={`/api/studio/crm/forms/${formId}`} method="post">
        <input type="hidden" name="next" value={`/studio/customer-capture/forms/${formId}`} />
        <label>Title<input name="title" defaultValue={form?.title ?? ""} required /></label>
        <label>Status<select name="status" defaultValue={form?.status ?? "draft"}><option value="draft">Draft</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
        <label>Description<textarea name="description" defaultValue={form?.description ?? ""} /></label>
        <label>Fields JSON<textarea name="fields_json" defaultValue={fieldsJson(form)} required /></label>
        <label>Target segment key<input name="target_segment_key" defaultValue={form?.target_segment_key ?? form?.targetSegmentKey ?? ""} /></label>
        <label>Suggested follow-up task<input name="suggested_follow_up_task" defaultValue={form?.suggested_follow_up_task ?? form?.suggestedFollowUpTask ?? ""} /></label>
        <label>Consent language<textarea name="consent_language" defaultValue={form?.consent_language ?? form?.consentLanguage ?? ""} /></label>
        <label>Embed readiness<select name="embed_readiness_status" defaultValue={form?.embed_readiness_status ?? form?.embedReadinessStatus ?? "future_integration"}><option value="future_integration">Future integration</option><option value="internal_preview_ready">Internal preview ready</option><option value="manual_action_required">Manual action required</option></select></label>
        <button className="btn" type="submit">Save Form</button>
      </form>
    </section>
  </>;
}
