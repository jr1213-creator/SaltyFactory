import { DataTable, LinkButton, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getCustomerCommandCenterData } from "../../customer-command-center/data";

export const runtime = "nodejs";

export default async function CustomerCaptureFormsPage() {
  const data = await getCustomerCommandCenterData();
  return <>
    <PageHeader
      eyebrow="Capture form templates"
      title="Customer Capture Forms"
      description="Default forms can be saved and activated later. Internal previews stay server-rendered; public embeds are not exposed in this pass."
    >
      <LinkButton href="/studio/customer-capture" variant="secondary">Capture Overview</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <DataTable
      columns={["Form", "Fields", "Target segment", "Follow-up task", "Status", "Embed"]}
      rows={data.defaultCaptureForms.map((form: any) => [
        form.title,
        form.fields.join(", "),
        form.key.replace(/_/g, " "),
        "Create follow-up task",
        <StatusBadge key={form.key} status={form.status} tone="info" />,
        form.embedReadinessStatus
      ])}
    />
  </>;
}
