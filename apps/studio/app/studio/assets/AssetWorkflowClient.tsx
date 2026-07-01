"use client";

import { useMemo, useState } from "react";

type Asset = Record<string, any>;

function ResultPanel({ result }: { result: any }) {
  if (!result) return null;
  return <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>;
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

export function AssetWorkflowClient({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssets[0]?.id ?? "");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => assets.find((asset) => asset.id === selectedAssetId), [assets, selectedAssetId]);
  const selectedApprovedForMockup = Boolean(selected?.approved_for_mockup || selected?.approvedForMockup);

  async function refreshAssets() {
    const data = await fetch("/api/studio/assets/upload").then((res) => res.json());
    if (Array.isArray(data.assets)) {
      setAssets(data.assets);
      if (!selectedAssetId && data.assets[0]) setSelectedAssetId(data.assets[0].id);
    }
  }

  async function upload(formData: FormData) {
    setBusy(true);
    const data = await fetch("/api/studio/assets/upload", { method: "POST", body: formData }).then((res) => res.json());
    setResult(data);
    await refreshAssets();
    if (data.asset?.id) setSelectedAssetId(data.asset.id);
    setBusy(false);
  }

  async function runAction(action: "qa" | "approve" | "reject") {
    if (!selectedAssetId) return;
    setBusy(true);
    const routes = {
      qa: `/api/studio/assets/${selectedAssetId}/run-qa`,
      approve: `/api/studio/assets/${selectedAssetId}/approve`,
      reject: `/api/studio/assets/${selectedAssetId}/reject`
    };
    const data = await postJson(routes[action]);
    setResult(data);
    await refreshAssets();
    setBusy(false);
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Manual POD Asset Workflow</h2>
    <form action={upload} className="sf-form-grid">
      <label>Private image file<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required /></label>
      <label>Asset type<select name="asset_type" defaultValue="source_art"><option value="source_art">Source art</option><option value="transparent_png">Transparent PNG</option><option value="print_file">Print file</option><option value="mockup">Mockup</option><option value="product_photo">Product photo</option></select></label>
      <button className="sf-button sf-button-primary" disabled={busy}>Upload Private Asset</button>
    </form>
    <div className="sf-form-grid">
      <label>Asset<select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename ?? asset.file_path ?? asset.id}</option>)}</select></label>
      <div className="sf-action-bar">
        <button className="sf-button sf-button-secondary" disabled={!selected || busy} onClick={() => runAction("qa")}>Run QA</button>
        <button className="sf-button sf-button-primary" disabled={!selected || busy || selected?.qa_status !== "passed"} onClick={() => runAction("approve")}>Approve Asset</button>
        <button className="sf-button sf-button-danger" disabled={!selected || busy} onClick={() => runAction("reject")}>Reject</button>
        {selectedApprovedForMockup
          ? <a className="sf-button sf-button-secondary" href="/studio/mockups">Go to Mockups</a>
          : <button className="sf-button sf-button-secondary" disabled>Go to Mockups</button>}
      </div>
    </div>
    {selected && !selectedApprovedForMockup ? <p className="sf-muted">Create an approved mockup before creating a draft.</p> : null}
    {selected && <div className="sf-muted">Selected asset: {selected.id} · QA {selected.qa_status ?? selected.qaStatus ?? "pending"} · Approval {selected.approval_status ?? selected.approvalStatus ?? "pending"} · Visibility {selected.visibility ?? "private"}</div>}
    <ResultPanel result={result} />
  </section>;
}
