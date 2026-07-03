"use client";

import { useMemo, useState } from "react";

type Review = Record<string, any>;

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
    {selected ? <p className="text-muted">{selected.status ?? "pending"} · gates {(selected.all_gates_passed || selected.allGatesPassed) ? "passed" : "blocked"} · provider sync remains separate and disabled until connected.</p> : <p className="text-muted">Create a publish review from a validated draft first.</p>}
    <div className="action-bar">
      <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => run("evaluate")}>Evaluate Readiness</button>
      <button className="btn btn-primary" disabled={!selected || busy} onClick={() => run("approve")}>Approve Internally</button>
      <button className="btn btn-secondary" disabled={!selected || busy} onClick={() => run("changes")}>Request Changes</button>
      <button className="btn btn-danger" disabled={!selected || busy} onClick={() => run("reject")}>Reject</button>
    </div>
    {result && <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
