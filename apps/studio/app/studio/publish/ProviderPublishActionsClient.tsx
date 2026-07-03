"use client";

import { useMemo, useState } from "react";

type Row = Record<string, any>;
const providerEndpoints = {
  printify: "/api/studio/publish/printify",
  shopify: "/api/studio/publish/shopify"
} as const;

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({ ok: false, status: "invalid_json_response" }));
  return { response, data };
}

function draftIdOf(review: Row | undefined) {
  return String(review?.product_draft_id ?? review?.productDraftId ?? "");
}

export function ProviderPublishActionsClient({ reviews, drafts }: { reviews: Row[]; drafts: Row[] }) {
  const [selectedReviewId, setSelectedReviewId] = useState(reviews[0]?.id ?? "");
  const [blueprintId, setBlueprintId] = useState("");
  const [printProviderId, setPrintProviderId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState("");
  const selectedReview = useMemo(() => reviews.find((review) => review.id === selectedReviewId), [reviews, selectedReviewId]);
  const selectedDraftId = draftIdOf(selectedReview);
  const selectedDraft = useMemo(() => drafts.find((draft) => draft.id === selectedDraftId), [drafts, selectedDraftId]);
  const hasReview = Boolean(selectedReview && selectedDraftId);

  async function run(provider: "printify" | "shopify") {
    if (!selectedDraftId) return;
    setBusy(provider);
    try {
      const payload: Record<string, unknown> = { productDraftId: selectedDraftId };
      if (provider === "printify") {
        if (blueprintId) payload.blueprintId = blueprintId;
        if (printProviderId) payload.printProviderId = printProviderId;
      }
      if (provider === "shopify" && collectionId) payload.collectionId = collectionId;
      const { response, data } = await postJson(providerEndpoints[provider], payload);
      setResult({ httpStatus: response.status, ...data });
    } catch {
      setResult({ ok: false, status: "request_failed", message: `Unable to call ${provider} route.` });
    } finally {
      setBusy("");
    }
  }

  return <section className="sf-card" style={{ display: "grid", gap: 14 }}>
    <div className="sf-workflow-step-header">
      <span>7</span>
      <div>
        <h2>Provider Actions</h2>
        <p>These buttons call the real guarded provider routes. They create drafts only; they do not publish live.</p>
      </div>
      <a className="sf-button sf-button-secondary" href="/studio/integrations">View Provider Status</a>
    </div>
    <label>Publish review<select value={selectedReviewId} onChange={(event) => setSelectedReviewId(event.target.value)}>{reviews.map((review) => <option key={review.id} value={review.id}>{draftIdOf(review) || review.id}</option>)}</select></label>
    {selectedDraft ? <p className="sf-muted">Selected draft: {selectedDraft.title ?? selectedDraft.id}. Provider failures show setupRequired/blockingReasons from the API response below.</p> : <p className="sf-alert">Create and approve a publish review before provider actions are available.</p>}
    <div className="sf-form-grid">
      <label>Printify blueprint ID<input value={blueprintId} onChange={(event) => setBlueprintId(event.target.value)} placeholder="From Printify Catalog" /></label>
      <label>Printify print provider ID<input value={printProviderId} onChange={(event) => setPrintProviderId(event.target.value)} placeholder="From Printify Catalog" /></label>
      <label>Shopify collection ID<input value={collectionId} onChange={(event) => setCollectionId(event.target.value)} placeholder="Optional configured collection ID" /></label>
    </div>
    <div className="sf-action-bar">
      <button className="sf-button sf-button-primary" type="button" disabled={!hasReview || busy === "printify"} title={hasReview ? "Create a guarded Printify draft product from approved generated artwork and selected variants." : "Create and approve a publish review first."} onClick={() => run("printify")}>Send to Printify</button>
      <button className="sf-button sf-button-primary" type="button" disabled={!hasReview || busy === "shopify"} title={hasReview ? "Create a guarded Shopify draft product with approved mockup media and variants." : "Create and approve a publish review first."} onClick={() => run("shopify")}>Create Shopify Draft</button>
      <a className="sf-button sf-button-secondary" href={`/studio/launch-packet${selectedDraftId ? `?product_draft_id=${encodeURIComponent(selectedDraftId)}` : ""}`}>Create Launch Packet</a>
      <a className="sf-button sf-button-secondary" href="/studio/printify-catalog">Open Printify Catalog</a>
    </div>
    {result ? <pre className="sf-code sf-provider-result">{JSON.stringify(result, null, 2)}</pre> : null}
  </section>;
}
