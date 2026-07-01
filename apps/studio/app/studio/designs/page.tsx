"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";

type Suggestion = Record<string, any>;

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
  if (!result) return null;
  return <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>;
}

function SuggestionCard({ suggestion, onAction, busy }: { suggestion: Suggestion; onAction: (id: string, action: "approve" | "reject" | "brief") => void; busy: boolean }) {
  const scores = suggestion.scores ?? {};
  const riskNotes = Array.isArray(suggestion.risk_notes) ? suggestion.risk_notes : [];
  const converted = suggestion.status === "converted_to_brief";
  return <Card>
    <div className="sf-card-header">
      <div>
        <h2>{suggestion.title}</h2>
        <p className="sf-muted">{suggestion.concept_summary}</p>
      </div>
      <StatusBadge status={suggestion.status ?? "suggested"} tone={suggestion.approved_for_design ? "success" : suggestion.status === "rejected" ? "danger" : "warning"} />
    </div>
    <div className="sf-grid sf-grid-2">
      <p><strong>Phrase</strong><br />{suggestion.suggested_phrase}</p>
      <p><strong>Product</strong><br />{suggestion.product_type}</p>
      <p><strong>Audience</strong><br />{suggestion.target_audience}</p>
      <p><strong>Scores</strong><br />Trend {scores.trend ?? "-"} · Brand {scores.brandFit ?? "-"} · Print {scores.printability ?? "-"}</p>
    </div>
    <p className="sf-muted">Style: {(suggestion.style_keywords ?? []).join(", ") || "Review required"}</p>
    <p className="sf-muted">Palette: {(suggestion.color_palette ?? []).join(", ") || "Review required"}</p>
    {suggestion.prompt_injection_flagged ? <p className="sf-alert">Prompt-injection-like text was flagged and treated as evidence only.</p> : null}
    {riskNotes.length ? <ul className="sf-muted">{riskNotes.slice(0, 3).map((note: string) => <li key={note}>{note}</li>)}</ul> : null}
    <div className="sf-action-bar">
      <button className="sf-button sf-button-primary" disabled={busy || suggestion.approved_for_design} onClick={() => onAction(suggestion.id, "approve")}>Approve</button>
      <button className="sf-button sf-button-secondary" disabled={busy || suggestion.status === "rejected"} onClick={() => onAction(suggestion.id, "reject")}>Reject</button>
      <button className="sf-button sf-button-secondary" disabled={busy || !suggestion.approved_for_design || converted} onClick={() => onAction(suggestion.id, "brief")}>{converted ? "Brief Created" : "Convert to Brief"}</button>
    </div>
  </Card>;
}

export default function DesignsPage() {
  const [topic, setTopic] = useState("coastal cowgirl western beach boutique");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const approvedCount = useMemo(() => suggestions.filter((item) => item.approved_for_design).length, [suggestions]);

  async function refresh() {
    const data = await fetch("/api/studio/design-suggestions").then((res) => res.json());
    if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function createSuggestions() {
    setBusy(true);
    const data = await postJson("/api/studio/design-suggestions/create", { topic });
    setResult(data);
    await refresh();
    setBusy(false);
  }

  async function runAction(id: string, action: "approve" | "reject" | "brief") {
    setBusy(true);
    const suffix = action === "brief" ? "create-brief" : action;
    const data = await postJson(`/api/studio/design-suggestions/${id}/${suffix}`);
    setResult(data);
    await refresh();
    setBusy(false);
  }

  return <>
    <PageHeader title="Design Suggestions" description="Create deterministic, reviewable POD concepts from a manual topic before briefs, image generation, and product drafts.">
      <StatusBadge status={`${approvedCount} approved`} tone={approvedCount ? "success" : "warning"} />
    </PageHeader>
    <section className="card" style={{ display: "grid", gap: 14 }}>
      <h2>Manual Topic</h2>
      <div className="sf-form-grid">
        <label>Topic or niche<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="coastal cowgirl western beach boutique" /></label>
        <button className="sf-button sf-button-primary" disabled={busy || topic.trim().length < 3} onClick={createSuggestions}>Create Suggestions</button>
      </div>
      <p className="sf-muted">Suggestions are persisted workspace records. No asset, draft, projection, or provider call is created at this step.</p>
      <ResultPanel result={result} />
    </section>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      {suggestions.length ? suggestions.map((suggestion) => <SuggestionCard key={suggestion.id} suggestion={suggestion} onAction={runAction} busy={busy} />) : <EmptyState title="No design suggestions yet" description="Create suggestions from a manual topic to start the POD product workflow." />}
    </div>
  </>;
}
