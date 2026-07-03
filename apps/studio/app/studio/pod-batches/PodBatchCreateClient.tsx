"use client";

import { useState } from "react";

function parseProductMix(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function PodBatchCreateClient() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("Creating owner-gated batch records...");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/studio/pod-batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        targetCount: Number(form.get("targetCount") || 15),
        trendSource: form.get("trendSource"),
        collection: form.get("collection"),
        productMix: parseProductMix(String(form.get("productMix") || "tee"))
      })
    }).catch((err) => {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Unable to create batch.");
      return null;
    });
    if (!response) return;
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok || payload.ok === false) {
      setStatus("");
      setError((payload.blockingReasons || payload.setupRequired || payload.error || ["Batch creation failed"]).join?.(", ") ?? "Batch creation failed");
      return;
    }
    setStatus(`Created ${payload.items?.length ?? 0} batch items. Opening the batch workspace...`);
    window.location.href = `/studio/pod-batches/${payload.batch.id}`;
  }

  return <section className="surface-card">
    <h2>Create 15-Product Batch</h2>
    <form className="layout-grid layout-grid-2" onSubmit={onSubmit}>
      <label>Batch name<input name="name" required placeholder="July coastal cowhide drop" /></label>
      <label>Target count<input name="targetCount" type="number" min="1" max="50" defaultValue={15} required /></label>
      <label>Trend source<input name="trendSource" defaultValue="owner_batch_input" /></label>
      <label>Collection<input name="collection" defaultValue="Batch Drafts" /></label>
      <label>Product mix<input name="productMix" defaultValue="tee,sweatshirt,tote" aria-describedby="product-mix-help" /></label>
      <p id="product-mix-help" className="text-muted">Comma-separated product types. The API creates drafts only; image generation, Printify, Shopify, and publish remain separate owner-gated actions.</p>
      <button className="btn btn-primary" type="submit" disabled={submitting} title={submitting ? "Batch creation is in progress." : "Create persisted batch and product draft records."}>
        {submitting ? "Creating batch" : "Create batch"}
      </button>
    </form>
    {status && <p className="provider-result" role="status">{status}</p>}
    {error && <p className="provider-result tone-danger" role="alert">{error}</p>}
  </section>;
}
