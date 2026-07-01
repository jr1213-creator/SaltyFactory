"use client";

import { useState } from "react";

export function TrendSourcesClient() {
  const [result, setResult] = useState<any>(null);
  const [sourceId, setSourceId] = useState("");
  const [busy, setBusy] = useState(false);

  async function createSource(formData: FormData) {
    setBusy(true);
    try {
      const response = await fetch("/api/studio/trend-sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: formData.get("name"), source_url: formData.get("source_url"), source_type: "public_url" })
      });
      const data = await response.json();
      setResult(data);
      if (data.source?.id) setSourceId(data.source.id);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to create trend source." });
    } finally {
      setBusy(false);
    }
  }

  async function ingest() {
    if (!sourceId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/studio/trend-sources/${sourceId}/ingest`, { method: "POST" });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to ingest trend source." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="sf-card">
    <h2>Trend Source Setup</h2>
    <form action={createSource} className="sf-form-grid">
      <label>Name<input name="name" placeholder="Owned blog, supplier feed, public RSS" required /></label>
      <label>Allowed public URL<input name="source_url" type="url" placeholder="https://example.com/feed.xml" required /></label>
      <button className="sf-button sf-button-primary" disabled={busy}>Create Source</button>
    </form>
    <div className="sf-action-bar" style={{ marginTop: 12 }}>
      <label>Source ID<input value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder="tsrc_..." /></label>
      <button className="sf-button sf-button-secondary" disabled={busy || !sourceId} onClick={ingest}>Ingest Source</button>
    </div>
    {result && <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
