"use client";

import { useMemo, useState } from "react";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";

type Row = Record<string, any>;

const stylePresets = [
  ["coastal_cowgirl", "Coastal Cowgirl"],
  ["western_luxe", "Western Luxe"],
  ["retro_rodeo", "Retro Rodeo"],
  ["surf_ranch", "Surf Ranch"],
  ["minimal_boutique", "Minimal Boutique"],
  ["sticker_pack", "Sticker Pack"],
  ["kids_tee", "Kids Tee"],
  ["holiday_drop", "Holiday Drop"],
  ["monoline", "Monoline"],
  ["vintage_distressed", "Vintage Distressed"]
] as const;

const printTargets = [
  ["apparel_front_square", "Apparel front square"],
  ["apparel_front_vertical", "Apparel front vertical"],
  ["sticker_square", "Sticker square"],
  ["mug_wrap", "Mug wrap"],
  ["tote_front", "Tote front"],
  ["generic_square", "Generic square"]
] as const;

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}

function briefLabel(brief: Row) {
  return String(brief.style_direction?.title ?? brief.styleDirection?.title ?? brief.collection ?? brief.title ?? brief.id);
}

function approvedForGeneration(brief: Row) {
  return brief.status === "approved" && Boolean(brief.approved_for_generation ?? brief.approvedForGeneration);
}

function VariantCard({ asset }: { asset: Row }) {
  const metadata = asset.metadata && typeof asset.metadata === "object" ? asset.metadata as Row : {};
  const derivatives = Array.isArray(asset.derivatives) ? asset.derivatives as Row[] : [];
  return <article className="surface-card" style={{ display: "grid", gap: 12 }}>
    <PrivateImagePreview src={String(asset.previewUrl || `/api/studio/assets/${encodeURIComponent(String(asset.id))}/preview`)} alt="Generated artwork variant preview" maxHeight={360} />
    <div>
      <strong>Variant {Number(metadata.variantIndex ?? 0) + 1}</strong>
      <p className="text-muted" style={{ margin: "4px 0 0" }}>Artwork generated - needs review</p>
    </div>
    <dl className="result-detail-grid">
      <div><dt>Asset</dt><dd>{asset.id}</dd></div>
      <div><dt>Seed</dt><dd>{metadata.seed ?? "recorded on job"}</dd></div>
      <div><dt>Model</dt><dd>{asset.model ?? "selected provider model"}</dd></div>
      <div><dt>Size</dt><dd>{asset.width && asset.height ? `${asset.width} x ${asset.height}` : "stored"}</dd></div>
      <div><dt>QA</dt><dd>{ownerLabel(asset.qaStatus ?? asset.status)}</dd></div>
      <div><dt>Derivatives</dt><dd>{derivatives.length ? derivatives.map((item) => ownerLabel(item.kind)).join(", ") : "package pending"}</dd></div>
    </dl>
    <div className="action-bar">
      <a className="btn btn-primary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Review asset</a>
      {(asset.approvedForMockup || asset.qaStatus === "passed") ? <a className="btn btn-secondary" href={`/studio/mockups?asset_id=${encodeURIComponent(String(asset.id))}`}>Generate mockups</a> : <a className="btn btn-secondary" href={`/studio/assets?asset_id=${encodeURIComponent(String(asset.id))}`}>Run QA</a>}
    </div>
    <details className="setup-advanced-details">
      <summary>Proof details</summary>
      <dl className="result-detail-grid">
        <div><dt>Checksum</dt><dd>{asset.checksum ?? "recorded privately"}</dd></div>
        <div><dt>Print target</dt><dd>{ownerLabel(metadata.printTarget, "apparel front square")}</dd></div>
        <div><dt>Style preset</dt><dd>{ownerLabel(metadata.stylePreset, "coastal cowgirl")}</dd></div>
      </dl>
    </details>
  </article>;
}

export function GenerationStudioClient({ initialBriefs }: { initialBriefs: Row[] }) {
  const approvedBriefs = useMemo(() => initialBriefs.filter(approvedForGeneration), [initialBriefs]);
  const [briefId, setBriefId] = useState(approvedBriefs[0]?.id ?? "");
  const [stylePreset, setStylePreset] = useState("coastal_cowgirl");
  const [printTarget, setPrintTarget] = useState("apparel_front_square");
  const [variantCount, setVariantCount] = useState(4);
  const [seed, setSeed] = useState("");
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedBrief = approvedBriefs.find((brief) => brief.id === briefId);
  const assets = Array.isArray(result?.assets) ? result.assets as Row[] : result?.asset ? [result.asset as Row] : [];
  const blockers = Array.isArray(result?.blockingReasons) ? result.blockingReasons.map(String) : [];

  async function generate() {
    if (!briefId) return;
    setBusy(true);
    setResult({ ok: true, status: "running", safeMessage: "Generating artwork variants..." });
    try {
      const body: Record<string, unknown> = {
        stylePreset,
        printTarget,
        variantCount
      };
      const numericSeed = Number(seed);
      if (Number.isFinite(numericSeed)) body.seed = Math.trunc(numericSeed);
      const data = await postJson(`/api/studio/design-briefs/${briefId}/send-to-generation`, body);
      setResult(data);
    } catch {
      setResult({ ok: false, status: "request_failed", safeMessage: "Generation request could not be completed." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="surface-card" style={{ display: "grid", gap: 16, marginTop: 18 }}>
    <div>
      <p className="eyebrow-label">Creative production</p>
      <h2>Generate artwork options</h2>
      <p className="text-muted">Turn an approved brief into stored private source art, preview derivatives, and a print-ready PNG package.</p>
    </div>
    <div className="layout-grid layout-grid-3">
      <label>Approved brief<select value={briefId} onChange={(event) => setBriefId(event.target.value)}>
        {approvedBriefs.map((brief) => <option key={brief.id} value={brief.id}>{briefLabel(brief)}</option>)}
      </select></label>
      <label>Style preset<select value={stylePreset} onChange={(event) => setStylePreset(event.target.value)}>
        {stylePresets.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Print target<select value={printTarget} onChange={(event) => setPrintTarget(event.target.value)}>
        {printTargets.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Variant count<input type="number" min={1} max={4} value={variantCount} onChange={(event) => setVariantCount(Math.min(4, Math.max(1, Number(event.target.value) || 1)))} /></label>
      <label>Seed<input value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="Optional deterministic seed" /></label>
      <div style={{ alignSelf: "end" }}>
        <button className="btn btn-primary" type="button" disabled={busy || !briefId} title={!briefId ? "Approve a brief before generating artwork." : undefined} onClick={generate}>
          {busy ? "Generating artwork" : `Generate ${variantCount} options`}
        </button>
      </div>
    </div>
    {selectedBrief ? <section className="surface-card">
      <strong>{briefLabel(selectedBrief)}</strong>
      <p className="text-muted" style={{ margin: "4px 0 0" }}>{String(selectedBrief.generation_prompt ?? selectedBrief.generationPrompt ?? "Owner-approved prompt recipe will be built server-side.")}</p>
    </section> : <p className="text-muted">Approve a design brief before generating artwork.</p>}
    {result ? <section className={`provider-result-panel provider-result-panel-${result.ok ? "success" : "warning"}`} aria-live="polite">
      <div className="provider-result-header">
        <div>
          <p className="eyebrow-label">Generation result</p>
          <h3>{ownerLabel(result.status, busy ? "running" : "pending")}</h3>
          <p className="text-muted">{String(result.safeMessage ?? result.message ?? "Generation workflow updated.")}</p>
        </div>
      </div>
      {blockers.length ? <div><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{ownerLabel(blocker)}</li>)}</ul></div> : null}
      {assets.length ? <div className="layout-grid layout-grid-2">{assets.map((asset) => <VariantCard key={String(asset.id)} asset={asset} />)}</div> : null}
      {!assets.length && busy ? <div className="surface-card"><strong>Generating artwork</strong><p className="text-muted">The provider is creating image bytes and SaltyFactory will store private previews before marking the job complete.</p></div> : null}
      {!result.ok && String(result.setupAction || "").startsWith("/studio") ? <div className="action-bar"><a className="btn btn-primary" href={String(result.setupAction)}>Open setup</a></div> : null}
    </section> : null}
  </section>;
}
