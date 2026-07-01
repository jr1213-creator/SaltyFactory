"use client";

import { useMemo, useState } from "react";

type Brief = Record<string, any>;

async function postJson(url: string, body?: Record<string, unknown>) {
  const init: RequestInit = { method: "POST" };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  return response.json();
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
      const data = await postJson(`/api/studio/design-briefs/${selectedBriefId}/${suffix}`);
      setResult(data);
      await refresh();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update brief." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Repository-backed Brief Workflow</h2>
    <div className="sf-form-grid">
      <label>Manual brief title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Phrase or motif<input value={phrase} onChange={(event) => setPhrase(event.target.value)} /></label>
      <label>Art direction<textarea value={artDirection} onChange={(event) => setArtDirection(event.target.value)} /></label>
      <button className="sf-button sf-button-secondary" disabled={busy} onClick={createManualBrief}>Create Manual Brief</button>
    </div>
    <label>Brief<select value={selectedBriefId} onChange={(event) => setSelectedBriefId(event.target.value)}>{briefs.map((brief) => <option key={brief.id} value={brief.id}>{brief.style_direction?.title ?? brief.collection ?? brief.id}</option>)}</select></label>
    {selected ? <p className="sf-muted">{selected.status ?? "draft"} · approved for generation {String(Boolean(selected.approved_for_generation ?? selected.approvedForGeneration))}</p> : <p className="sf-muted">Create or convert a suggestion into a brief first.</p>}
    <div className="sf-action-bar">
      <button className="sf-button sf-button-primary" disabled={!selected || busy || selected?.approved_for_generation} onClick={() => run("approve")}>Approve Brief</button>
      <button className="sf-button sf-button-secondary" disabled={!selected || busy} onClick={() => run("reject")}>Reject Brief</button>
      <button className="sf-button sf-button-primary" disabled={!selected || busy || !selected?.approved_for_generation} onClick={() => run("generation")}>Send to Generation</button>
    </div>
    {result ? <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 260, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre> : null}
  </section>;
}
