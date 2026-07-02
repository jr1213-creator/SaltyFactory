import { notFound } from "next/navigation";
import { DataTable, LinkButton, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../../data";
import { getCustomerCommandCenterData } from "../../../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerCaptureFormDetailPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const data = await getCustomerCommandCenterData();
  const form = [...data.defaultCaptureForms, ...data.forms].find((item: any) => String(item.key ?? item.id) === formId) as any;
  if (!form && data.ok) notFound();
  return <>
    <PageHeader
      eyebrow="Capture form"
      title={form?.title ?? "Capture Form"}
      description="Form configuration foundation. Public embed scripts are not exposed; submissions require explicit form activation and validation."
    >
      <LinkButton href="/studio/customer-capture/forms" variant="secondary">All Forms</LinkButton>
      {form?.id && <LinkButton href={`/studio/customer-capture/forms/${form.id}/edit`} variant="secondary">Edit Form</LinkButton>}
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Form Definition</h2>
      <DataTable columns={["Field", "Value"]} rows={[
        ["Description", form?.description ?? "-"],
        ["Fields", Array.isArray(form?.fields) ? form.fields.join(", ") : JSON.stringify(form?.fields_json ?? form?.fieldsJson ?? [])],
        ["Target segment", String(form?.target_segment_key ?? form?.targetSegmentKey ?? form?.key ?? "-").replace(/_/g, " ")],
        ["Suggested follow-up task", form?.suggested_follow_up_task ?? form?.suggestedFollowUpTask ?? "Create follow-up task"],
        ["Consent language", form?.consent_language ?? form?.consentLanguage ?? "Consent language placeholder required before public activation."],
        ["Status", form?.status ?? "draft"],
        ["Source", form?.sourceLabel ?? form?.source_label ?? "System-generated"]
      ]} />
    </section>
    <ProviderStatusCard title="Public embed" status="future integration" tone="warning" description="Embed code generation is a future integration. No public script is created by this page." />
  </>;
}
