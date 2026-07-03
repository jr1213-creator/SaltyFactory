import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, DataTable, OwnerDecisionPanel, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await createRepositories().business.documents.getById(id, workspaceId) as any;
  if (!document) return <PageHeader title="Document not found" description="This document is not in the active workspace." />;
  return <>
    <PageHeader title={document.title} eyebrow="Business document" description="Review, approve, and create internal export manifests. No external sending is performed."><ApprovalBadge status={String(document.status)} /></PageHeader>
    <div className="sf-layout-rail">
      <section className="sf-card">
        <DataTable columns={["Field", "Value"]} rows={[
          ["Type", document.document_type ?? document.documentType],
          ["Sensitive", document.requires_sensitive_data ? "Requires authority" : "No"],
          ["Fields used", Array.isArray(document.sensitive_fields_used) ? document.sensitive_fields_used.join(", ") : ""],
          ["File refs", JSON.stringify(document.generated_file_refs ?? [])]
        ]} />
      </section>
      <OwnerDecisionPanel title="Document Actions" description="Export creates an internal manifest only. External submission remains future and owner-gated.">
        <form action={`/api/studio/business/documents/${id}/approve`} method="post"><button className="sf-button sf-button-primary">Approve Document</button></form>
        <form action={`/api/studio/business/documents/${id}/export`} method="post"><input type="hidden" name="exportType" value="pdf" /><button className="sf-button sf-button-secondary">Create PDF Export Manifest</button></form>
      </OwnerDecisionPanel>
    </div>
  </>;
}
