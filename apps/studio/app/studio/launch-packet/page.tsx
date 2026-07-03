import { LaunchPacketSection, DataTable, PageHeader, ProviderReadinessCard, StatusBadge, WorkflowProgress } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getStudioLists, SchemaSetupState } from "../data";

function refForDraft(refs: any[], draftId: string, key = "product_draft_id") {
  return refs.filter((ref) => String(ref[key] ?? ref.productDraftId ?? "") === draftId);
}

export default async function LaunchPacketPage({ searchParams }: { searchParams?: Promise<{ product_draft_id?: string }> } = {}) {
  const params = await searchParams;
  const config = parseEnv();
  const lists = await getStudioLists();
  const drafts = lists.drafts as any[];
  const draft = drafts.find((row) => row.id === params?.product_draft_id) ?? drafts[0];
  const draftId = String(draft?.id ?? "");
  const shopifyRefs = refForDraft(lists.products as any[], draftId);
  const printifyRefs = refForDraft(lists.printifyProducts as any[], draftId);
  const reviews = refForDraft(lists.publishReviews as any[], draftId);
  const launchBlockers = [
    ...(!draft ? ["No product draft selected."] : []),
    ...(reviews.length ? [] : ["Create or recompute publish review."]),
    ...(printifyRefs.length ? [] : ["Create Printify draft product after artwork, pricing, variants, and gates pass."]),
    ...(shopifyRefs.length ? [] : ["Create Shopify draft product after mockups, variants, pricing, and gates pass."]),
    ...(!config.LIVE_PUBLISHING_ENABLED ? ["Live publish flag is disabled; storefront visibility remains blocked."] : [])
  ];
  return <>
    <PageHeader
      eyebrow="Owner review artifact"
      title="Launch Packet"
      description="Current internal launch state for a POD product. This page summarizes evidence and blockers; it does not publish, sync, send, or spend."
    >
      <a className="sf-button sf-button-secondary" href="/studio/publish-review">Publish review</a>
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-3">
      <ProviderReadinessCard title="Selected product" status={draft ? "loaded" : "missing"} tone={draft ? "success" : "warning"} description={draft?.title ?? "Select a product draft from Publish Review."} />
      <ProviderReadinessCard title="Printify" status={printifyRefs.length ? "draft ref saved" : "not created"} tone={printifyRefs.length ? "success" : "warning"} description="Printify product refs map to the internal product draft." />
      <ProviderReadinessCard title="Shopify" status={shopifyRefs.length ? "draft ref saved" : "not created"} tone={shopifyRefs.length ? "success" : "warning"} description="Shopify draft refs map to the internal product draft." />
    </div>
    <LaunchPacketSection title="Pipeline Readiness">
      <WorkflowProgress steps={[
        { label: "Product draft", status: draft ? "saved" : "missing", complete: Boolean(draft) },
        { label: "Publish review", status: reviews.length ? "computed" : "needed", complete: reviews.length > 0 },
        { label: "Printify draft", status: printifyRefs.length ? "saved" : "needed", complete: printifyRefs.length > 0 },
        { label: "Shopify draft", status: shopifyRefs.length ? "saved" : "needed", complete: shopifyRefs.length > 0 },
        { label: "Storefront publish", status: config.LIVE_PUBLISHING_ENABLED ? "owner confirmation still required" : "blocked by default", complete: false }
      ]} />
    </LaunchPacketSection>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <LaunchPacketSection title="Product Summary">
        <DataTable columns={["Field", "Value"]} rows={[
          ["Draft ID", draftId || "-"],
          ["Title", draft?.title ?? "-"],
          ["Product type", draft?.product_type ?? draft?.productType ?? "-"],
          ["Tags", (draft?.tags ?? []).join?.(", ") ?? "-"],
          ["Approval", draft?.approval_status ?? draft?.approvalStatus ?? "pending"],
          ["Public handle", draft?.public_handle ?? draft?.publicHandle ?? "-"]
        ]} />
      </LaunchPacketSection>
      <LaunchPacketSection title="Launch Blockers">
        <DataTable columns={["Blocker", "Status"]} rows={launchBlockers.length ? launchBlockers.map((blocker) => [blocker, <StatusBadge key={blocker} status="blocked" tone="warning" />]) : [["No recorded launch blockers", <StatusBadge key="ready" status="manual/export-ready" tone="success" />]]} />
      </LaunchPacketSection>
      <LaunchPacketSection title="Printify Mapping">
        <DataTable columns={["Product ID", "Upload", "Variants", "Sync"]} rows={printifyRefs.length ? printifyRefs.map((ref: any) => [
          ref.printify_product_id ?? ref.printifyProductId ?? "-",
          ref.printify_upload_id ?? ref.printifyUploadId ?? "-",
          (ref.printify_variant_ids ?? ref.printifyVariantIds ?? []).join?.(", ") ?? "-",
          ref.sync_status ?? ref.syncStatus ?? ref.status ?? "-"
        ]) : [["No Printify ref", "-", "-", "not_created"]]} />
      </LaunchPacketSection>
      <LaunchPacketSection title="Shopify Mapping">
        <DataTable columns={["Product ID", "Handle", "Admin", "Sync"]} rows={shopifyRefs.length ? shopifyRefs.map((ref: any) => [
          ref.shopify_product_id ?? ref.shopifyProductId ?? "-",
          ref.handle ?? "-",
          (ref.admin_url ?? ref.adminUrl) ? <a key={ref.id} href={ref.admin_url ?? ref.adminUrl}>Open admin</a> : "-",
          ref.sync_status ?? ref.syncStatus ?? ref.status ?? "-"
        ]) : [["No Shopify ref", "-", "-", "not_created"]]} />
      </LaunchPacketSection>
    </div>
  </>;
}
