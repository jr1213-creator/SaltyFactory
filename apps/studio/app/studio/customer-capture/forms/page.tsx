import { DataTable, LinkButton, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

function fieldsFor(form: any) {
  const fields = form.fields ?? form.fields_json ?? form.fieldsJson ?? [];
  if (Array.isArray(fields)) {
    return fields.map((field) => typeof field === "string" ? field : String(field.name ?? field.key ?? field.label ?? "field")).join(", ");
  }
  return String(fields || "name, email, phone, interest, consent");
}

export default async function CustomerCaptureFormsPage() {
  const data = await getCustomerCommandCenterData();
  const forms = data.forms.length ? data.forms : data.defaultCaptureForms;
  return <>
    <PageHeader
      eyebrow="Capture form templates"
      title="Customer Capture Forms"
      description="Default forms can be saved and activated later. Internal previews stay server-rendered; public embeds are not exposed in this pass."
    >
      <LinkButton href="/studio/customer-capture/forms/new">Create Form</LinkButton>
      <LinkButton href="/studio/customer-capture" variant="secondary">Capture Overview</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <DataTable
      columns={["Form", "Fields", "Target segment", "Follow-up task", "Status", "Embed", "Open"]}
      rows={forms.map((form: any) => [
        form.title,
        fieldsFor(form),
        String(form.target_segment_key ?? form.targetSegmentKey ?? form.key ?? "manual").replace(/_/g, " "),
        form.suggested_follow_up_task ?? form.suggestedFollowUpTask ?? "Create follow-up task",
        <StatusBadge key={form.key ?? form.id} status={form.status ?? "draft"} tone="info" />,
        form.embed_readiness_status ?? form.embedReadinessStatus ?? "future_integration",
        <a key={`${form.key ?? form.id}-open`} href={`/studio/customer-capture/forms/${form.id ?? form.key}`}>Open</a>
      ])}
    />
  </>;
}
