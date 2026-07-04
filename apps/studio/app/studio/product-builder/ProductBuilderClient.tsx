"use client";

import { useMemo, useState } from "react";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { assetPreviewPath, mockupPreviewPath } from "../_private-preview-paths";

type Row = Record<string, any>;

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function sanitizeDeveloperDetails(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
    if (/token|secret|authorization|credential|service_role/i.test(key)) return "[redacted]";
    return nestedValue;
  }));
}

function metadataOf(row: Row | null | undefined): Row {
  const metadata = row?.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

function isPrintifyMockup(row: Row | null | undefined) {
  const metadata = metadataOf(row);
  return metadata.provider_source === "printify" || metadata.providerSource === "printify" || Boolean(metadata.provider_mockup_url ?? metadata.providerMockupUrl);
}

function printifyMockupUrl(row: Row | null | undefined) {
  const metadata = metadataOf(row);
  return String(metadata.provider_mockup_url ?? metadata.providerMockupUrl ?? metadata.public_url ?? metadata.publicUrl ?? row?.file_path ?? row?.filePath ?? "");
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}

function ResultPanel({ result }: { result: unknown }) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const record = result as Row;
  const ok = Boolean(record.ok);
  const draft = record.draft && typeof record.draft === "object" ? record.draft as Row : null;
  const blockers = Array.isArray(record.blockingReasons) ? record.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
  return <section className={`provider-result-panel provider-result-panel-${ok ? "success" : "warning"}`} aria-live="polite">
    <div className="provider-result-header">
      <div>
        <p className="eyebrow-label">Product draft result</p>
        <h3>{ownerLabel(record.status ?? (ok ? "draft created" : "blocked"))}</h3>
        <p className="text-muted">{String(record.message ?? (ok ? "Product draft created from the approved asset and mockup." : "Product draft could not be created."))}</p>
      </div>
    </div>
    <dl className="result-detail-grid">
      {draft ? <div><dt>Draft</dt><dd>{draft.id}</dd></div> : null}
      {draft ? <div><dt>Status</dt><dd>{ownerLabel(draft.status)}</dd></div> : null}
      {draft ? <div><dt>Printify</dt><dd>{ownerLabel(draft.printify_status ?? draft.printifyStatus, "not synced")}</dd></div> : null}
      {draft ? <div><dt>Shopify</dt><dd>{ownerLabel(draft.shopify_status ?? draft.shopifyStatus, "not published")}</dd></div> : null}
    </dl>
    {blockers.length ? <div><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    {draft ? <div className="action-bar">
      <a className="btn btn-primary" href={`/studio/product-builder?draft_id=${encodeURIComponent(String(draft.id))}`}>Open product draft</a>
      <a className="btn btn-secondary" href="/studio/printify-catalog">Browse Printify catalog</a>
      <a className="btn btn-secondary" href="/studio/publish-review">Open publish review</a>
    </div> : null}
    <details className="setup-advanced-details">
      <summary>Developer details</summary>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(sanitizeDeveloperDetails(record), null, 2)}</pre>
    </details>
  </section>;
}

export function ProductBuilderClient({
  assets,
  mockups,
  drafts,
  defaultCollectionId,
  initialDraftId
}: {
  assets: Row[];
  mockups: Row[];
  drafts: Row[];
  defaultCollectionId?: string | undefined;
  initialDraftId?: string | undefined;
}) {
  const approvedAssets = assets.filter((asset) => asset.approved_for_mockup || asset.approvedForMockup);
  const approvedMockups = mockups.filter((mockup) => isPrintifyMockup(mockup) && (mockup.approved_for_product || mockup.approvedForProduct || metadataOf(mockup).printify_is_default === true || metadataOf(mockup).is_hero === true));
  const initialDraft = drafts.find((draft) => draft.id === initialDraftId) ?? drafts[0];
  const [assetId, setAssetId] = useState(String(initialDraft?.asset_id ?? initialDraft?.assetId ?? approvedAssets[0]?.id ?? ""));
  const mockupsForAsset = useMemo(() => approvedMockups.filter((mockup) => String(mockup.asset_id ?? mockup.assetId ?? "") === assetId), [approvedMockups, assetId]);
  const [mockupId, setMockupId] = useState(String((initialDraft?.mockup_ids ?? initialDraft?.mockupIds ?? [])[0] ?? mockupsForAsset[0]?.id ?? ""));
  const [title, setTitle] = useState(String(initialDraft?.title ?? "Coastal Rodeo Social Club Tee"));
  const [productIdea, setProductIdea] = useState(String((initialDraft?.metadata as Row | undefined)?.product_idea ?? "One generated artwork, one Printify provider mockup, and a guarded POD draft for catalog selection."));
  const [productType, setProductType] = useState(String(initialDraft?.product_type ?? initialDraft?.productType ?? "tee"));
  const [collection, setCollection] = useState(String(initialDraft?.collection ?? "Studio Drafts"));
  const [price, setPrice] = useState(String((initialDraft?.metadata as Row | undefined)?.price ?? "32"));
  const [cogs, setCogs] = useState(String((initialDraft?.metadata as Row | undefined)?.estimated_cogs ?? "12"));
  const [shipping, setShipping] = useState(String((initialDraft?.metadata as Row | undefined)?.estimated_shipping ?? "5"));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const selectedAsset = approvedAssets.find((asset) => asset.id === assetId);
  const selectedMockup = approvedMockups.find((mockup) => mockup.id === mockupId);

  async function createDraft() {
    setBusy(true);
    try {
      const data = await postJson("/api/studio/drafts/create-from-assets", {
        asset_id: assetId,
        mockup_ids: mockupId ? [mockupId] : [],
        title,
        product_idea: productIdea,
        description: productIdea,
        tags: ["coastal", "western", "pod"],
        product_type: productType,
        collection,
        price: Number(price),
        estimated_cogs: Number(cogs),
        estimated_shipping: Number(shipping),
        provider_target: "printify_draft",
        shopify_collection_id: defaultCollectionId || undefined
      });
      setResult(data);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to create product draft." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Golden Path Product Draft</h2>
    <div className="form-grid">
      <label>Approved asset<select value={assetId} onChange={(event) => {
        const nextAssetId = event.target.value;
        setAssetId(nextAssetId);
        const nextMockup = approvedMockups.find((mockup) => String(mockup.asset_id ?? mockup.assetId ?? "") === nextAssetId);
        setMockupId(nextMockup?.id ?? "");
      }}>{approvedAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename ?? asset.id}</option>)}</select></label>
      <label>Approved mockup<select value={mockupId} onChange={(event) => setMockupId(event.target.value)}>{mockupsForAsset.map((mockup) => <option key={mockup.id} value={mockup.id}>{mockup.id}</option>)}</select></label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Product type<select value={productType} onChange={(event) => setProductType(event.target.value)}><option value="tee">Tee</option><option value="sweatshirt">Sweatshirt</option><option value="tote">Tote</option><option value="mug">Mug</option><option value="sticker">Sticker</option></select></label>
      <label>Collection<input value={collection} onChange={(event) => setCollection(event.target.value)} /></label>
      <label>Sale price<input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" /></label>
      <label>Estimated COGS<input value={cogs} onChange={(event) => setCogs(event.target.value)} inputMode="decimal" /></label>
      <label>Estimated shipping<input value={shipping} onChange={(event) => setShipping(event.target.value)} inputMode="decimal" /></label>
      <label style={{ gridColumn: "1 / -1" }}>Product idea<textarea value={productIdea} onChange={(event) => setProductIdea(event.target.value)} /></label>
    </div>
    <div className="layout-grid layout-grid-2">
      {selectedAsset ? <article className="surface-card" style={{ display: "grid", gap: 10 }}>
        <PrivateImagePreview src={assetPreviewPath(selectedAsset)} alt="Selected generated source artwork" />
        <strong>Source asset {selectedAsset.id}</strong>
        <p className="text-muted" style={{ margin: 0 }}>QA {ownerLabel(selectedAsset.qa_status ?? selectedAsset.qaStatus)} - approved for mockup</p>
      </article> : <article className="surface-card"><h3>Approved artwork required</h3><p className="text-muted">Generate artwork, run QA, and approve the asset before creating a product draft.</p><a className="btn btn-primary" href="/studio/assets">Open assets</a></article>}
      {selectedMockup ? <article className="surface-card" style={{ display: "grid", gap: 10 }}>
        {isPrintifyMockup(selectedMockup)
          ? <img src={printifyMockupUrl(selectedMockup)} alt="Selected Printify product mockup" style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)" }} />
          : <PrivateImagePreview src={mockupPreviewPath(selectedMockup)} alt="Selected product mockup" aspectRatio="4 / 5" />}
        <strong>Mockup {selectedMockup.id}</strong>
        <p className="text-muted" style={{ margin: 0 }}>Printify mockup evidence for product draft</p>
      </article> : <article className="surface-card"><h3>Printify mockup required</h3><p className="text-muted">Create a real Printify product and import provider mockups from the generated asset.</p><a className="btn btn-primary" href={assetId ? `/studio/mockups?asset_id=${encodeURIComponent(assetId)}` : "/studio/mockups"}>Open mockups</a></article>}
    </div>
    <div className="action-bar">
      <button className="btn btn-primary" type="button" disabled={busy || !assetId || !mockupId || !title.trim()} onClick={createDraft}>Create Product Draft</button>
      <a className="btn btn-secondary" href="/studio/printify-catalog">Browse Printify catalog</a>
      <a className="btn btn-secondary" href="/studio/publish-review">Open publish review</a>
    </div>
    <ResultPanel result={result} />
  </section>;
}
