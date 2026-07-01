"use client";

import { useMemo, useState } from "react";

type Draft = Record<string, any>;

export function DraftWorkflowClient({ initialDrafts, initialDraftId }: { initialDrafts: Draft[]; initialDraftId?: string | undefined }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const initialSelectedDraftId = initialDrafts.some((draft) => draft.id === initialDraftId) ? initialDraftId : initialDrafts[0]?.id;
  const [selectedDraftId, setSelectedDraftId] = useState(initialSelectedDraftId ?? "");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => drafts.find((draft) => draft.id === selectedDraftId), [drafts, selectedDraftId]);

  async function refresh() {
    const data = await fetch("/api/studio/drafts").then((res) => res.json());
    if (Array.isArray(data.drafts)) {
      setDrafts(data.drafts);
      if (!selectedDraftId && data.drafts[0]) setSelectedDraftId(data.drafts[0].id);
    }
  }

  async function run(action: "validate" | "review" | "projection") {
    if (!selectedDraftId) return;
    setBusy(true);
    try {
      const url = action === "validate"
        ? `/api/studio/drafts/${selectedDraftId}/validate`
        : action === "review"
          ? "/api/studio/publish-reviews"
          : `/api/studio/drafts/${selectedDraftId}/create-public-projection`;
      const init: RequestInit = { method: "POST" };
      if (action === "review") {
        init.headers = { "content-type": "application/json" };
        init.body = JSON.stringify({ product_draft_id: selectedDraftId });
      }
      const response = await fetch(url, init);
      const data = await response.json();
      setResult(data);
      await refresh();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update draft." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Draft Workflow</h2>
    <label>Draft<select value={selectedDraftId} onChange={(event) => setSelectedDraftId(event.target.value)}>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title ?? draft.id}</option>)}</select></label>
    {selected ? <p className="sf-muted">{selected.status ?? "draft"} · validation {selected.validation_status ?? selected.validationStatus ?? "pending"} · target {(selected.metadata as any)?.provider_target ?? "internal_only"}</p> : <p className="sf-muted">Create a draft from an approved asset first.</p>}
    <div className="sf-action-bar">
      <button className="sf-button sf-button-secondary" disabled={!selected || busy} onClick={() => run("validate")}>Run Validation</button>
      <button className="sf-button sf-button-primary" disabled={!selected || busy} onClick={() => run("review")}>Create Publish Review</button>
      <button className="sf-button sf-button-secondary" disabled={!selected || busy} onClick={() => run("projection")}>Create Public Projection</button>
    </div>
    {result && <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
