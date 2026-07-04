"use client";

import { useMemo, useState } from "react";

type Review = Record<string, any>;

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function sanitizeDeveloperDetails(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
    if (/token|secret|authorization|credential|service_role/i.test(key)) return "[redacted]";
    return nestedValue;
  }));
}

function ResultPanel({ result }: { result: unknown }) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const record = result as Review;
  const ok = Boolean(record.ok);
  const review = record.review && typeof record.review === "object" ? record.review as Review : null;
  const blockers = Array.isArray(record.blockingReasons) ? record.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
  return <section className={`provider-result-panel provider-result-panel-${ok ? "success" : "warning"}`} aria-live="polite">
    <div className="provider-result-header">
      <div>
        <p className="eyebrow-label">Publish review result</p>
        <h3>{ownerLabel(record.status ?? (ok ? "review updated" : "blocked"))}</h3>
        <p className="text-muted">{String(record.message ?? (ok ? "Saved review action completed." : "Saved review action could not be completed."))}</p>
      </div>
    </div>
    <dl className="result-detail-grid">
      {review ? <div><dt>Review</dt><dd>{review.id}</dd></div> : null}
      {review ? <div><dt>Draft</dt><dd>{review.product_draft_id ?? review.productDraftId}</dd></div> : null}
      {review ? <div><dt>Gates</dt><dd>{review.all_gates_passed || review.allGatesPassed ? "passed" : "blocked"}</dd></div> : null}
    </dl>
    {blockers.length ? <div><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    <details className="setup-advanced-details">
      <summary>Developer details</summary>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(sanitizeDeveloperDetails(record), null, 2)}</pre>
    </details>
  </section>;
}

export function PublishWorkflowClient({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [selectedReviewId, setSelectedReviewId] = useState(initialReviews[0]?.id ?? "");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => reviews.find((review) => review.id === selectedReviewId), [reviews, selectedReviewId]);

  async function refresh() {
    const data = await fetch("/api/studio/publish-reviews").then((res) => res.json());
    if (Array.isArray(data.reviews)) {
      setReviews(data.reviews);
      if (!selectedReviewId && data.reviews[0]) setSelectedReviewId(data.reviews[0].id);
    }
  }

  async function run(action: "evaluate" | "approve" | "changes" | "reject") {
    if (!selectedReviewId) return;
    setBusy(true);
    try {
      const suffix = action === "changes" ? "request-changes" : action;
      const response = await fetch(`/api/studio/publish-reviews/${selectedReviewId}/${suffix}`, { method: "POST" });
      const data = await response.json();
      setResult(data);
      await refresh();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update publish review." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ display: "grid", gap: 14 }}>
    <h2>Saved Review Actions</h2>
    <label>Review<select value={selectedReviewId} onChange={(event) => setSelectedReviewId(event.target.value)}>{reviews.map((review) => <option key={review.id} value={review.id}>{review.product_draft_id ?? review.productDraftId ?? review.id}</option>)}</select></label>
    {selected ? <p className="text-muted">{ownerLabel(selected.status)} - gates {(selected.all_gates_passed || selected.allGatesPassed) ? "passed" : "blocked"} - provider sync remains separate and disabled until connected.</p> : <p className="text-muted">Create a publish review from a validated draft first.</p>}
    <div className="action-bar">
      <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => run("evaluate")}>Evaluate Readiness</button>
      <button className="btn btn-primary" disabled={!selected || busy} onClick={() => run("approve")}>Approve Internally</button>
      <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => run("changes")}>Request Changes</button>
      <button className="btn btn-danger" disabled={!selected || busy} onClick={() => run("reject")}>Reject</button>
    </div>
    <ResultPanel result={result} />
  </section>;
}
