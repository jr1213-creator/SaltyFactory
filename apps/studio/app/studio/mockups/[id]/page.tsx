import { Card, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { createRepositories } from "@saltyfactory/db";
import { PrivateImagePreview } from "../../_components/PrivateImagePreview";
import { mockupPreviewPath } from "../../_private-preview-paths";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function metadataOf(row: any): Record<string, unknown> {
  const metadata = row?.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function isPrintifyMockup(row: any) {
  const metadata = metadataOf(row);
  return metadata.provider_source === "printify"
    || metadata.providerSource === "printify"
    || metadata.source === "printify"
    || Boolean(metadata.provider_mockup_url ?? metadata.providerMockupUrl);
}

function printifyMockupUrl(row: any) {
  const metadata = metadataOf(row);
  return String(metadata.provider_mockup_url ?? metadata.providerMockupUrl ?? metadata.public_url ?? metadata.publicUrl ?? row?.file_path ?? row?.filePath ?? "");
}

export default async function Page({ params }: { params: Promise<Record<string, string>> }) {
  const id = String((await params).id ?? "");
  const repos = createRepositories();
  const mockup = await repos.mockup.getById(id, workspaceId) as any;
  const providerUrl = isPrintifyMockup(mockup) ? printifyMockupUrl(mockup) : "";

  return <>
    <PageHeader title="Mockup Detail" description="Review the selected product mockup and its production status.">
      <a className="btn btn-secondary" href="/studio/mockups">Back to Mockup Studio</a>
    </PageHeader>
    {!mockup ? <Card>
      <h2>Mockup not found</h2>
      <p className="text-muted">Open Mockup Studio and select a persisted Printify mockup.</p>
      <a className="btn btn-primary" href="/studio/mockups">Open Mockup Studio</a>
    </Card> : <div className="layout-grid layout-grid-2">
      <Card>
        {providerUrl
          ? <img className="mockup-provider-preview" src={providerUrl} alt="Printify product mockup preview" />
          : <PrivateImagePreview src={mockupPreviewPath(mockup)} alt="Product mockup preview" aspectRatio="4 / 5" />}
      </Card>
      <Card>
        <p className="eyebrow-label">{providerUrl ? "Printify Mockup" : "Internal proof"}</p>
        <h2>{String(mockup.id)}</h2>
        <div className="mockup-chip-row">
          <StatusBadge status={ownerLabel(mockup.status, "pending")} tone={mockup.approved_for_product || mockup.approvedForProduct ? "success" : "warning"} />
          {providerUrl ? <StatusBadge status="provider image" tone="info" /> : <StatusBadge status="dev proof" tone="warning" />}
        </div>
        <dl className="proof-list" style={{ marginTop: 12 }}>
          <div><dt>Source asset</dt><dd>{String(mockup.asset_id ?? mockup.assetId ?? "Not linked")}</dd></div>
          <div><dt>Product draft</dt><dd>{String(mockup.product_draft_id ?? mockup.productDraftId ?? "Not linked")}</dd></div>
          <div><dt>Template</dt><dd>{String(mockup.template_id ?? mockup.templateId ?? "Provider image")}</dd></div>
          <div><dt>Approved</dt><dd>{mockup.approved_for_product || mockup.approvedForProduct ? "Approved for product" : "Needs owner approval"}</dd></div>
        </dl>
      </Card>
    </div>}
  </>;
}
