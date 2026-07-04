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

function ownerLabel(value: unknown, fallback = "pending") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function sanitizeDeveloperDetails(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
    if (/token|secret|authorization|credential|service_role/i.test(key)) return "[redacted]";
    return nestedValue;
  }));
}

function ResultPanel({ result, productDraftId }: { result: Row | null; productDraftId: string }) {
  if (!result) return null;
  const ok = Boolean(result.ok);
  const blockers = Array.isArray(result.blockingReasons) ? result.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
  const reference = result.reference && typeof result.reference === "object" ? result.reference as Row : null;
  return <section className={`provider-result-panel provider-result-panel-${ok ? "success" : "warning"}`} aria-live="polite">
    <div className="provider-result-header">
      <div>
        <p className="eyebrow-label">Provider action result</p>
        <h3>{ownerLabel(result.status ?? result.httpStatus)}</h3>
        <p className="text-muted">{String(result.safeMessage ?? result.message ?? (ok ? "Provider draft action completed." : "Provider draft action is blocked."))}</p>
      </div>
    </div>
    <dl className="result-detail-grid">
      <div><dt>Provider</dt><dd>{ownerLabel(result.provider, "not selected")}</dd></div>
      {reference ? <div><dt>Reference</dt><dd>{reference.id}</dd></div> : null}
      {result.uploadId ? <div><dt>Upload</dt><dd>{String(result.uploadId)}</dd></div> : null}
      {Array.isArray(result.variantIds) ? <div><dt>Variants</dt><dd>{String(result.variantIds.length)}</dd></div> : null}
      {result.adminUrl ? <div><dt>Shopify draft</dt><dd><a href={String(result.adminUrl)}>Open admin draft</a></dd></div> : null}
    </dl>
    {blockers.length ? <div><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    <div className="action-bar">
      {ok ? <a className="btn btn-primary" href="/studio/publish-review">Refresh publish review</a> : null}
      {productDraftId ? <a className="btn btn-secondary" href={`/studio/product-builder?draft_id=${encodeURIComponent(productDraftId)}`}>Open product draft</a> : null}
      {!ok ? <a className="btn btn-secondary" href="/studio/printify-catalog">Review catalog selection</a> : null}
    </div>
    <details className="setup-advanced-details">
      <summary>Developer details</summary>
      <pre className="code-block provider-result">{JSON.stringify(sanitizeDeveloperDetails(result), null, 2)}</pre>
    </details>
  </section>;
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

  return <section className="surface-card" style={{ display: "grid", gap: 14 }}>
    <div className="workflow-step-header">
      <span>7</span>
      <div>
        <h2>Provider Actions</h2>
        <p>These buttons call the real guarded provider routes. They create drafts only; they do not publish live.</p>
      </div>
      <a className="btn btn-secondary" href="/studio/integrations">View Provider Status</a>
    </div>
    <label>Publish review<select value={selectedReviewId} onChange={(event) => setSelectedReviewId(event.target.value)}>{reviews.map((review) => <option key={review.id} value={review.id}>{draftIdOf(review) || review.id}</option>)}</select></label>
    {selectedDraft ? <p className="text-muted">Selected draft: {selectedDraft.title ?? selectedDraft.id}. Provider failures show exact blockers from the route below.</p> : <p className="alert-panel">Create and approve a publish review before provider actions are available.</p>}
    <div className="form-grid">
      <label>Printify blueprint ID<input value={blueprintId} onChange={(event) => setBlueprintId(event.target.value)} placeholder="From Printify Catalog" /></label>
      <label>Printify print provider ID<input value={printProviderId} onChange={(event) => setPrintProviderId(event.target.value)} placeholder="From Printify Catalog" /></label>
      <label>Shopify collection ID<input value={collectionId} onChange={(event) => setCollectionId(event.target.value)} placeholder="Required Shopify collection ID" /></label>
    </div>
    <div className="action-bar">
      <button className="btn btn-primary" type="button" disabled={!hasReview || busy === "printify"} title={hasReview ? "Create a guarded Printify draft product from approved generated artwork and selected variants." : "Create and approve a publish review first."} onClick={() => run("printify")}>Send to Printify</button>
      <button className="btn btn-primary" type="button" disabled={!hasReview || busy === "shopify"} title={hasReview ? "Create a guarded Shopify draft product with approved mockup media and variants." : "Create and approve a publish review first."} onClick={() => run("shopify")}>Create Shopify Draft</button>
      <a className="btn btn-secondary" href={`/studio/launch-packet${selectedDraftId ? `?product_draft_id=${encodeURIComponent(selectedDraftId)}` : ""}`}>Create Launch Packet</a>
      <a className="btn btn-secondary" href="/studio/printify-catalog">Open Printify Catalog</a>
    </div>
    <ResultPanel result={result} productDraftId={selectedDraftId} />
  </section>;
}
