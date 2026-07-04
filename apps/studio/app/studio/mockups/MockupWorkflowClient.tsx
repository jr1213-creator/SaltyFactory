"use client";

import { useMemo, useState } from "react";

type Row = Record<string, any>;

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function assetPreviewHref(asset: Row | undefined | null) {
  return asset?.id ? `/api/studio/assets/${encodeURIComponent(String(asset.id))}/preview` : "";
}

function mockupPreviewHref(mockup: Row | undefined | null) {
  return mockup?.id ? `/api/studio/mockups/${encodeURIComponent(String(mockup.id))}/preview` : "";
}

function sanitizeDeveloperDetails(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
    if (/token|secret|authorization|credential|service_role/i.test(key)) return "[redacted]";
    return nestedValue;
  }));
}

async function postJson(url: string, body?: Record<string, unknown>) {
  const init: RequestInit = { method: "POST" };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  return response.json();
}

function ResultPanel({ result }: { result: unknown }) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const record = result as Row;
  const ok = Boolean(record.ok);
  const status = ownerLabel(record.status ?? (ok ? "completed" : "blocked"));
  const message = String(record.message ?? (ok ? "Mockup workflow action completed." : "Mockup workflow action could not be completed."));
  const blockers = Array.isArray(record.blockingReasons) ? record.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
  const mockup = record.mockup && typeof record.mockup === "object" ? record.mockup as Row : null;
  const draft = record.draft && typeof record.draft === "object" ? record.draft as Row : null;

  return <section className={`provider-result-panel provider-result-panel-${ok ? "success" : "warning"}`} aria-live="polite">
    <div className="provider-result-header">
      <div>
        <p className="eyebrow-label">Mockup result</p>
        <h3>{status}</h3>
        <p className="text-muted">{message}</p>
      </div>
    </div>
    {mockup ? <img src={mockupPreviewHref(mockup)} alt="Composited mockup preview" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }} /> : null}
    <dl className="result-detail-grid">
      {mockup ? <div><dt>Mockup</dt><dd>{mockup.id}</dd></div> : null}
      {mockup ? <div><dt>Status</dt><dd>{ownerLabel(mockup.status)}</dd></div> : null}
      {draft ? <div><dt>Product draft</dt><dd>{draft.id}</dd></div> : null}
      {draft ? <div><dt>Draft status</dt><dd>{ownerLabel(draft.status)}</dd></div> : null}
    </dl>
    {blockers.length ? <div><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    <div className="action-bar">
      {mockup ? <a className="btn btn-secondary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(mockup.asset_id ?? mockup.assetId ?? ""))}`}>Open mockup</a> : null}
      {draft ? <a className="btn btn-primary" href={`/studio/product-builder?draft_id=${encodeURIComponent(String(draft.id))}`}>Open product draft</a> : null}
      {draft ? <a className="btn btn-secondary" href="/studio/printify-catalog">Browse Printify catalog</a> : null}
      {draft ? <a className="btn btn-secondary" href="/studio/publish-review">Open publish review</a> : null}
    </div>
    <details className="setup-advanced-details">
      <summary>Developer details</summary>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(sanitizeDeveloperDetails(record), null, 2)}</pre>
    </details>
  </section>;
}

export function MockupWorkflowClient({ initialAssets, initialMockups, initialAssetId }: { initialAssets: Row[]; initialMockups: Row[]; initialAssetId?: string | undefined }) {
  const approvedAssets = initialAssets.filter((asset) => asset.approved_for_mockup || asset.approvedForMockup);
  const initialApprovedAssetId = approvedAssets.some((asset) => asset.id === initialAssetId) ? initialAssetId : approvedAssets[0]?.id;
  const [assetId, setAssetId] = useState(initialApprovedAssetId ?? "");
  const [productType, setProductType] = useState("tee_front");
  const [mockups, setMockups] = useState(initialMockups);
  const [selectedMockupId, setSelectedMockupId] = useState(initialMockups[0]?.id ?? "");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => mockups.find((mockup) => mockup.id === selectedMockupId), [mockups, selectedMockupId]);
  const selectedAsset = useMemo(() => approvedAssets.find((asset) => asset.id === assetId), [approvedAssets, assetId]);
  const selectedApproved = Boolean(selected?.approved_for_product || selected?.approvedForProduct);

  async function refresh() {
    const data = await fetch("/api/studio/mockups/generate").then((res) => res.json());
    if (Array.isArray(data.mockups)) {
      setMockups(data.mockups);
      if (!selectedMockupId && data.mockups[0]) setSelectedMockupId(data.mockups[0].id);
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const data = await postJson("/api/studio/mockups/generate", { asset_id: assetId, product_type: productType });
      setResult(data);
      await refresh();
      if (data.mockup?.id) setSelectedMockupId(data.mockup.id);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to generate mockup." });
    } finally {
      setBusy(false);
    }
  }

  async function review(action: "approve" | "reject") {
    if (!selectedMockupId) return;
    setBusy(true);
    try {
      const data = await postJson(`/api/studio/mockups/${selectedMockupId}/${action}`);
      setResult(data);
      await refresh();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update mockup." });
    } finally {
      setBusy(false);
    }
  }

  async function createDraft() {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await postJson("/api/studio/drafts/create-from-assets", {
        asset_id: selected.asset_id ?? selected.assetId,
        mockup_ids: [selected.id],
        title: "Internal POD Product Draft",
        description: "Private product draft created from approved source art and internal mockup. Human review required before public projection.",
        tags: ["pod", "internal-review"],
        product_type: productType.replace("_front", ""),
        collection: "Studio Drafts",
        price: 32,
        estimated_cogs: 12,
        estimated_shipping: 5,
        provider_target: "internal_only"
      });
      setResult(data);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to create draft." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Internal Mockup Workflow</h2>
    <div className="form-grid">
      <label>Approved art<select value={assetId} onChange={(event) => setAssetId(event.target.value)}>{approvedAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename ?? asset.file_path ?? asset.id}</option>)}</select></label>
      <label>Template<select value={productType} onChange={(event) => setProductType(event.target.value)}><option value="tee_front">Tee front</option><option value="sweatshirt_front">Sweatshirt front</option><option value="tote">Tote</option><option value="mug">Mug</option><option value="sticker">Sticker</option></select></label>
      <button className="btn btn-primary" disabled={busy || !assetId} onClick={generate}>Generate Internal Mockup</button>
    </div>
    {selectedAsset ? <div className="surface-card" style={{ display: "grid", gap: 10 }}>
      <img src={assetPreviewHref(selectedAsset)} alt="Approved source artwork preview" style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }} />
      <p className="text-muted">Source asset {selectedAsset.id} - QA {ownerLabel(selectedAsset.qa_status ?? selectedAsset.qaStatus)} - approved for mockup</p>
    </div> : <p className="text-muted">Run QA and approve a generated asset before creating a mockup.</p>}
    <label>Mockup<select value={selectedMockupId} onChange={(event) => setSelectedMockupId(event.target.value)}>{mockups.map((mockup) => <option key={mockup.id} value={mockup.id}>{mockup.file_path ?? mockup.id}</option>)}</select></label>
    {selected ? <div className="surface-card" style={{ display: "grid", gap: 10 }}>
      <img src={mockupPreviewHref(selected)} alt="Selected composited mockup preview" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }} />
      <p className="text-muted">{ownerLabel(selected.status)} - approved for product {String(selectedApproved)} - internal preview only</p>
    </div> : <p className="text-muted">Generate a mockup from an approved asset first.</p>}
    <div className="action-bar">
      <button className="btn btn-primary" disabled={!selected || busy || selectedApproved} onClick={() => review("approve")}>Approve Mockup</button>
      <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => review("reject")}>Reject Mockup</button>
      <button className="btn btn-primary" disabled={!selected || busy || !selectedApproved} onClick={createDraft}>Create Product Draft</button>
      {selectedApproved ? <a className="btn btn-secondary" href="/studio/product-builder">Open Product Builder</a> : null}
    </div>
    <ResultPanel result={result} />
  </section>;
}
