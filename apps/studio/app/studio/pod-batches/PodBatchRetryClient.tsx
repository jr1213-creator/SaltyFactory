"use client";

import { useState } from "react";

export function PodBatchRetryClient({ batchId, itemId, stage }: { batchId: string; itemId: string; stage: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    setMessage("Marking retry request...");
    const response = await fetch(`/api/studio/pod-batches/${batchId}/retry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, stage })
    }).catch((error) => {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Retry failed.");
      return null;
    });
    if (!response) return;
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || payload.ok === false) {
      setMessage((payload.blockingReasons || payload.error || ["Retry marker failed"]).join?.(", ") ?? "Retry marker failed");
      return;
    }
    setMessage("Retry marker saved. No provider action was executed by this control.");
    window.setTimeout(() => window.location.reload(), 700);
  }

  return <span className="sf-action-bar">
    <button className="sf-button sf-button-secondary" type="button" onClick={retry} disabled={busy} title={busy ? "Retry marker is being saved." : "Save a retry marker for this item without executing a provider call."}>
      {busy ? "Saving" : "Retry marker"}
    </button>
    {message && <small className="sf-muted" role="status">{message}</small>}
  </span>;
}
