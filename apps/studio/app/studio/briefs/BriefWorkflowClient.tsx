"use client";

import { useMemo, useState } from "react";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { assetPreviewPath } from "../_private-preview-paths";

type Brief = Record<string, any>;
type ResultRecord = Record<string, any>;

async function postJson(url: string, body?: Record<string, unknown>) {
  const init: RequestInit = { method: "POST" };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  return response.json();
}

function asRecord(value: unknown): ResultRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ResultRecord : null;
}

function resultTone(status: string) {
  if (["succeeded", "approved", "brief_created", "created"].includes(status)) return "success";
  if (["setup_required", "blocked", "invalid", "failed", "request_failed"].includes(status)) return "warning";
  return "info";
}

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function sanitizeDeveloperDetails(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
    if (/token|secret|authorization|credential/i.test(key)) return "[redacted]";
    return nestedValue;
  }));
}

function ResultPanel({ result }: { result: unknown }) {
  const record = asRecord(result);
  if (!record) return null;
  const status = String(record.status ?? (record.ok ? "succeeded" : "blocked"));
  const message = String(record.safeMessage ?? record.message ?? (record.ok ? "Action completed." : "Action could not be completed."));
  const provider = asRecord(record.provider);
  const job = asRecord(record.job);
  const asset = asRecord(record.asset);
  const assets = Array.isArray(record.assets) ? record.assets.map(asRecord).filter(Boolean) as ResultRecord[] : asset ? [asset] : [];
  const qaStatus = String(asset?.qaStatus ?? asset?.status ?? "pending");
  const assetReadyForMockup = Boolean(asset?.approvedForMockup) || qaStatus === "passed";
  const blockers = Array.isArray(record.blockingReasons)
    ? record.blockingReasons.map(String)
    : Array.isArray(record.setupRequired)
      ? record.setupRequired.map(String)
      : [];
  const setupAction = String(record.setupAction ?? provider?.setupAction ?? "/studio/onboarding/providers/image-generation");
  const showSetupAction = !record.ok || status === "setup_required" || blockers.length > 0;
  return <section className={`provider-result-panel provider-result-panel-${resultTone(status)}`} aria-live="polite">
    <div className="provider-result-header">
      <div>
        <p className="eyebrow-label">Workflow result</p>
        <h3>{ownerLabel(status)}</h3>
        <p className="text-muted">{message}</p>
      </div>
    </div>
    {job ? <dl className="result-detail-grid">
      <div><dt>Job</dt><dd>{job.id ?? "pending"}</dd></div>
      <div><dt>Status</dt><dd>{job.status ?? status}</dd></div>
      <div><dt>Provider</dt><dd>{provider?.provider === "huggingface" ? "Hugging Face" : provider?.provider ?? job.provider ?? "not connected"}</dd></div>
      <div><dt>Model</dt><dd>{provider?.model ?? job.model ?? "not selected"}</dd></div>
    </dl> : null}
    {assets.length ? <div className="layout-grid layout-grid-2">
      {assets.map((item) => {
        const itemHref = assetPreviewPath(item);
        return <div key={String(item.id)} className="surface-card" style={{ display: "grid", gap: 12 }}>
      {itemHref ? <PrivateImagePreview src={itemHref} alt="Generated private source artwork preview" maxHeight={320} /> : null}
      <dl className="result-detail-grid">
        <div><dt>Asset ID</dt><dd>{item.id}</dd></div>
        <div><dt>Created</dt><dd>{item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : "just now"}</dd></div>
        <div><dt>QA status</dt><dd>{ownerLabel(item.qaStatus ?? item.status)}</dd></div>
        <div><dt>Visibility</dt><dd>{ownerLabel(item.visibility, "private")}</dd></div>
      </dl>
    </div>;
      })}
    </div> : null}
    {blockers.length ? <div>
      <strong>Blocker reasons</strong>
      <ul>{blockers.map((item) => <li key={item}>{ownerLabel(item)}</li>)}</ul>
    </div> : null}
    <div className="action-bar">
      {asset ? <a className="btn btn-primary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Open first asset</a> : null}
      {asset && assetReadyForMockup ? <a className="btn btn-secondary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(asset.id))}`}>Create mockup</a> : null}
      {asset && !assetReadyForMockup ? <a className="btn btn-secondary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Review QA</a> : null}
      {record.ok && !asset ? <a className="btn btn-primary" href="/studio/image-generation">Open image generation</a> : null}
      {showSetupAction ? <a className="btn btn-primary" href={setupAction}>Open image generation setup</a> : null}
      {showSetupAction ? <a className="btn btn-secondary" href="/studio/onboarding/help?provider=image_generation">Request setup help</a> : null}
      {!record.ok && setupAction.includes("image-generation") ? <a className="btn btn-secondary" href="/studio/onboarding/providers/image-generation#field-guides">Try a recommended model</a> : null}
    </div>
    <details className="setup-advanced-details">
      <summary>Developer details</summary>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(sanitizeDeveloperDetails(record), null, 2)}</pre>
    </details>
  </section>;
}

export function BriefWorkflowClient({ initialBriefs }: { initialBriefs: Brief[] }) {
  const [briefs, setBriefs] = useState(initialBriefs);
  const [selectedBriefId, setSelectedBriefId] = useState(initialBriefs[0]?.id ?? "");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Original Coastal Western Tee");
  const [phrase, setPhrase] = useState("Coastal Rodeo Social Club");
  const [artDirection, setArtDirection] = useState("Retro coastal western source art with readable lettering and transparent background.");
  const selected = useMemo(() => briefs.find((brief) => brief.id === selectedBriefId), [briefs, selectedBriefId]);

  async function refresh() {
    const data = await fetch("/api/studio/design-briefs").then((res) => res.json());
    if (Array.isArray(data.briefs)) {
      setBriefs(data.briefs);
      if (!selectedBriefId && data.briefs[0]) setSelectedBriefId(data.briefs[0].id);
    }
  }

  async function createManualBrief() {
    setBusy(true);
    try {
      const data = await postJson("/api/studio/design-briefs", {
        title,
        phrase_text: phrase,
        product_type: "tee",
        art_direction: artDirection,
        background_requirement: "transparent"
      });
      setResult(data);
      await refresh();
      if (data.brief?.id) setSelectedBriefId(data.brief.id);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to create brief." });
    } finally {
      setBusy(false);
    }
  }

  async function run(action: "approve" | "reject" | "generation") {
    if (!selectedBriefId) return;
    setBusy(true);
    try {
      const suffix = action === "generation" ? "send-to-generation" : action;
      const data = await postJson(`/api/studio/design-briefs/${selectedBriefId}/${suffix}`, action === "generation" ? { variantCount: 4 } : undefined);
      setResult(data);
      await refresh();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update brief." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Saved Brief Workflow</h2>
    <div className="form-grid">
      <label>Manual brief title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Phrase or motif<input value={phrase} onChange={(event) => setPhrase(event.target.value)} /></label>
      <label>Art direction<textarea value={artDirection} onChange={(event) => setArtDirection(event.target.value)} /></label>
      <button className="btn btn-secondary" disabled={busy} onClick={createManualBrief}>Create Manual Brief</button>
    </div>
    <label>Brief<select value={selectedBriefId} onChange={(event) => setSelectedBriefId(event.target.value)}>{briefs.map((brief) => <option key={brief.id} value={brief.id}>{brief.style_direction?.title ?? brief.collection ?? brief.id}</option>)}</select></label>
    {selected ? <p className="text-muted">{ownerLabel(selected.status ?? "draft")} - approved for generation {String(Boolean(selected.approved_for_generation ?? selected.approvedForGeneration))}</p> : <p className="text-muted">Create or convert a suggestion into a brief first.</p>}
    <div className="action-bar">
      <button className="btn btn-primary" disabled={!selected || busy || selected?.approved_for_generation} onClick={() => run("approve")}>Approve Brief</button>
      <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => run("reject")}>Reject Brief</button>
      <button className="btn btn-primary" disabled={!selected || busy || !selected?.approved_for_generation} onClick={() => run("generation")}>Generate 4 options</button>
    </div>
    {result ? <ResultPanel result={result} /> : null}
  </section>;
}
