import { createRepositories } from "@saltyfactory/db";
import { ApprovalBadge, BusinessDocumentCard, DataTable, EmptyState, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessDocumentsPage() {
  const documents = await createRepositories().business.documents.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Documents" description="Owner-review documents generated from structured business profile data. Sensitive documents create authority requests first." />
    <section className="surface-card">
      <h2>Generate Document</h2>
      <form className="form-grid" action="/api/studio/business/documents/generate" method="post">
        <label>Document type<select name="documentType"><option value="one_page_business_summary">Business Profile One-Pager</option><option value="brand_guidelines">Brand Guidelines Lite</option><option value="capability_statement">Capability Statement</option><option value="vendor_application_packet">Vendor Application Packet (authority required)</option><option value="w9_packet">W9 Packet Shell (authority required)</option></select></label>
        <label>Title<input name="title" defaultValue="Salty Cowhide Business Summary" /></label>
        <button className="btn btn-primary" type="submit">Generate Owner Review Draft</button>
      </form>
    </section>
    <section style={{ marginTop: 18 }}>{documents.length ? <div className="layout-grid">{documents.map((document: any) => <BusinessDocumentCard key={document.id} title={document.title} status={String(document.status)}>
      <DataTable columns={["Type", "Sensitive", "Open"]} rows={[[document.document_type ?? document.documentType, document.requires_sensitive_data ? "authority required" : "no", <a key="open" className="btn btn-secondary" href={`/studio/business/documents/${document.id}`}>Review</a>]]} />
      <ApprovalBadge status={String(document.status)} />
    </BusinessDocumentCard>)}</div> : <EmptyState title="No business documents" description="Generate an owner-review document or Make Me Look Legit bundle." />}</section>
  </>;
}
