"use client";

import { useMemo, useState } from "react";

type Asset = Record<string, any>;

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function assetPreviewHref(asset: Asset | undefined | null) {
  return asset?.id ? `/api/studio/assets/${encodeURIComponent(String(asset.id))}/preview` : "";
}

function sanitizeDeveloperDetails(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
    if (/token|secret|authorization|credential|service_role/i.test(key)) return "[redacted]";
    return nestedValue;
  }));
}

function ResultPanel({ result }: { result: any }) {
  if (!result) return null;
  const ok = Boolean(result.ok);
  const status = ownerLabel(result.status ?? (ok ? "completed" : "blocked"));
  const message = String(result.message ?? (ok ? "Asset workflow action completed." : "Asset workflow action could not be completed."));
  const blockers = Array.isArray(result.blockingReasons) ? result.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
  const asset = result.asset && typeof result.asset === "object" ? result.asset as Asset : null;
  const qa = result.qa && typeof result.qa === "object" ? result.qa as Record<string, any> : null;

  return <section className={`provider-result-panel provider-result-panel-${ok ? "success" : "warning"}`} aria-live="polite">
    <div className="provider-result-header">
      <div>
        <p className="eyebrow-label">Asset result</p>
        <h3>{status}</h3>
        <p className="text-muted">{message}</p>
      </div>
    </div>
    <dl className="result-detail-grid">
      {asset ? <div><dt>Asset</dt><dd>{asset.id}</dd></div> : null}
      {asset ? <div><dt>QA status</dt><dd>{ownerLabel(asset.qa_status ?? asset.qaStatus)}</dd></div> : null}
      {qa ? <div><dt>QA evidence</dt><dd>{ownerLabel(qa.status)}</dd></div> : null}
      {asset ? <div><dt>Visibility</dt><dd>{ownerLabel(asset.visibility, "private")}</dd></div> : null}
    </dl>
    {blockers.length ? <div><strong>Blockers</strong><ul>{blockers.map((blocker: string) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    {asset ? <div className="action-bar">
      <a className="btn btn-primary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Open asset</a>
      {(asset.approved_for_mockup || asset.approvedForMockup) ? <a className="btn btn-secondary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(asset.id))}`}>Create mockup</a> : null}
    </div> : null}
    <details className="setup-advanced-details">
      <summary>Developer details</summary>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(sanitizeDeveloperDetails(result), null, 2)}</pre>
    </details>
  </section>;
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

export function AssetWorkflowClient({ initialAssets, initialAssetId }: { initialAssets: Asset[]; initialAssetId?: string | undefined }) {
  const [assets, setAssets] = useState(initialAssets);
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssets.some((asset) => asset.id === initialAssetId) ? String(initialAssetId) : initialAssets[0]?.id ?? "");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => assets.find((asset) => asset.id === selectedAssetId), [assets, selectedAssetId]);
  const selectedApprovedForMockup = Boolean(selected?.approved_for_mockup || selected?.approvedForMockup);
  const selectedPreview = assetPreviewHref(selected);

  async function refreshAssets() {
    const data = await fetch("/api/studio/assets/upload").then((res) => res.json());
    if (Array.isArray(data.assets)) {
      setAssets(data.assets);
      if (!selectedAssetId && data.assets[0]) setSelectedAssetId(data.assets[0].id);
    }
  }

  async function upload(formData: FormData) {
    setBusy(true);
    try {
      const data = await fetch("/api/studio/assets/upload", { method: "POST", body: formData }).then((res) => res.json());
      setResult(data);
      await refreshAssets();
      if (data.asset?.id) setSelectedAssetId(data.asset.id);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to upload private asset." });
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "qa" | "approve" | "reject") {
    if (!selectedAssetId) return;
    setBusy(true);
    try {
      const routes = {
        qa: `/api/studio/assets/${selectedAssetId}/run-qa`,
        approve: `/api/studio/assets/${selectedAssetId}/approve`,
        reject: `/api/studio/assets/${selectedAssetId}/reject`
      };
      const data = await postJson(routes[action]);
      setResult(data);
      await refreshAssets();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update asset." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Manual POD Asset Workflow</h2>
    <form action={upload} className="form-grid">
      <label>Private image file<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required /></label>
      <label>Asset type<select name="asset_type" defaultValue="source_art"><option value="source_art">Source art</option><option value="transparent_png">Transparent PNG</option><option value="print_file">Print file</option><option value="mockup">Mockup</option><option value="product_photo">Product photo</option></select></label>
      <button className="btn btn-primary" disabled={busy}>Upload Private Asset</button>
    </form>
    <div className="form-grid">
      <label>Asset<select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename ?? asset.file_path ?? asset.id}</option>)}</select></label>
      <div className="action-bar">
        <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => runAction("qa")}>Run QA</button>
        <button className="btn btn-primary" disabled={!selected || busy || selected?.qa_status !== "passed"} onClick={() => runAction("approve")}>Approve Asset</button>
        <button className="btn btn-danger" disabled={!selected || busy} onClick={() => runAction("reject")}>Reject</button>
        {selected && selectedApprovedForMockup
          ? <a className="btn btn-secondary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(selected.id))}`}>Go to Mockups</a>
          : <button className="btn btn-secondary" disabled>Go to Mockups</button>}
      </div>
    </div>
    {selected ? <div className="surface-card" style={{ display: "grid", gap: 12 }}>
      {selectedPreview ? <img src={selectedPreview} alt="Selected private asset preview" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }} /> : null}
      <dl className="result-detail-grid">
        <div><dt>Asset ID</dt><dd>{selected.id}</dd></div>
        <div><dt>QA</dt><dd>{ownerLabel(selected.qa_status ?? selected.qaStatus)}</dd></div>
        <div><dt>Approval</dt><dd>{ownerLabel(selected.approval_status ?? selected.approvalStatus)}</dd></div>
        <div><dt>Visibility</dt><dd>{ownerLabel(selected.visibility, "private")}</dd></div>
      </dl>
    </div> : null}
    {selected && !selectedApprovedForMockup ? <p className="text-muted">Run QA and approve this asset before creating a mockup.</p> : null}
    <ResultPanel result={result} />
  </section>;
}
