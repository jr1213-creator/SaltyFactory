"use client";

import { useMemo, useState } from "react";

type Row = Record<string, any>;

async function postJson(url: string, body?: Record<string, unknown>) {
  const init: RequestInit = { method: "POST" };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  return response.json();
}

export function MockupWorkflowClient({ initialAssets, initialMockups }: { initialAssets: Row[]; initialMockups: Row[] }) {
  const approvedAssets = initialAssets.filter((asset) => asset.approved_for_mockup || asset.approvedForMockup);
  const [assetId, setAssetId] = useState(approvedAssets[0]?.id ?? "");
  const [productType, setProductType] = useState("tee_front");
  const [mockups, setMockups] = useState(initialMockups);
  const [selectedMockupId, setSelectedMockupId] = useState(initialMockups[0]?.id ?? "");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => mockups.find((mockup) => mockup.id === selectedMockupId), [mockups, selectedMockupId]);

  async function refresh() {
    const data = await fetch("/api/studio/mockups/generate").then((res) => res.json());
    if (Array.isArray(data.mockups)) {
      setMockups(data.mockups);
      if (!selectedMockupId && data.mockups[0]) setSelectedMockupId(data.mockups[0].id);
    }
  }

  async function generate() {
    setBusy(true);
    const data = await postJson("/api/studio/mockups/generate", { asset_id: assetId, product_type: productType });
    setResult(data);
    await refresh();
    if (data.mockup?.id) setSelectedMockupId(data.mockup.id);
    setBusy(false);
  }

  async function review(action: "approve" | "reject") {
    if (!selectedMockupId) return;
    setBusy(true);
    const data = await postJson(`/api/studio/mockups/${selectedMockupId}/${action}`);
    setResult(data);
    await refresh();
    setBusy(false);
  }

  async function createDraft() {
    if (!selected) return;
    setBusy(true);
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
    setBusy(false);
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Internal Mockup Workflow</h2>
    <div className="sf-form-grid">
      <label>Approved art<select value={assetId} onChange={(event) => setAssetId(event.target.value)}>{approvedAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename ?? asset.file_path ?? asset.id}</option>)}</select></label>
      <label>Template<select value={productType} onChange={(event) => setProductType(event.target.value)}><option value="tee_front">Tee front</option><option value="sweatshirt_front">Sweatshirt front</option><option value="tote">Tote</option><option value="mug">Mug</option><option value="sticker">Sticker</option></select></label>
      <button className="sf-button sf-button-primary" disabled={busy || !assetId} onClick={generate}>Generate Internal Mockup</button>
    </div>
    <label>Mockup<select value={selectedMockupId} onChange={(event) => setSelectedMockupId(event.target.value)}>{mockups.map((mockup) => <option key={mockup.id} value={mockup.id}>{mockup.file_path ?? mockup.id}</option>)}</select></label>
    {selected ? <p className="sf-muted">{selected.status} · approved for product {String(Boolean(selected.approved_for_product ?? selected.approvedForProduct))} · internal preview only</p> : <p className="sf-muted">Generate a mockup from an approved asset first.</p>}
    <div className="sf-action-bar">
      <button className="sf-button sf-button-primary" disabled={!selected || busy || selected?.approved_for_product} onClick={() => review("approve")}>Approve Mockup</button>
      <button className="sf-button sf-button-secondary" disabled={!selected || busy} onClick={() => review("reject")}>Reject Mockup</button>
      <button className="sf-button sf-button-primary" disabled={!selected || busy || !(selected?.approved_for_product || selected?.approvedForProduct)} onClick={createDraft}>Create Draft</button>
    </div>
    {result ? <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre> : null}
  </section>;
}
