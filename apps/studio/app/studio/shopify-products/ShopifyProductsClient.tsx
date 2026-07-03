"use client";

import { useState } from "react";

type Row = Record<string, any>;

export function ShopifyProductsClient({ refs }: { refs: Row[] }) {
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState("");

  async function uploadMedia(ref: Row) {
    setBusy(ref.id);
    try {
      const response = await fetch("/api/studio/integrations/shopify/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shopifyRefId: ref.id, productDraftId: ref.product_draft_id ?? ref.productDraftId })
      });
      const data = await response.json().catch(() => ({ ok: false, status: "invalid_json_response" }));
      setResult({ httpStatus: response.status, ...data });
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to call Shopify media route." });
    } finally {
      setBusy("");
    }
  }

  async function goLive(ref: Row) {
    const confirmationText = window.prompt(`Type PUBLISH LIVE to publish ${ref.shopify_handle ?? ref.shopify_product_id ?? ref.id} to the Shopify storefront.`);
    if (confirmationText !== "PUBLISH LIVE") {
      setResult({
        ok: false,
        status: "confirmation_cancelled",
        message: "Shopify go-live was not called because the confirmation phrase was not entered."
      });
      return;
    }
    setBusy(`go-live-${ref.id}`);
    try {
      const response = await fetch(`/api/studio/publish/shopify/${encodeURIComponent(ref.id)}/go-live`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerConfirmed: true, confirmationText })
      });
      const data = await response.json().catch(() => ({ ok: false, status: "invalid_json_response" }));
      setResult({ httpStatus: response.status, ...data });
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to call Shopify go-live route." });
    } finally {
      setBusy("");
    }
  }

  return <section className="surface-card" style={{ marginTop: 18 }}>
    <h2>Shopify Provider Actions</h2>
    <p className="text-muted">Media upload keeps the product in draft. Go-live calls the guarded publish route and fails closed unless server-side live flags, owner confirmation, provider config, and publish gates all pass.</p>
    <div className="action-bar">
      {refs.map((ref) => <span key={ref.id} className="action-bar">
        <button className="btn btn-secondary" type="button" disabled={busy === ref.id} onClick={() => uploadMedia(ref)}>Upload Media for {ref.shopify_handle ?? ref.id}</button>
        <button
          className="btn btn-danger"
          type="button"
          disabled={busy === `go-live-${ref.id}` || !ref.shopify_product_id}
          title={!ref.shopify_product_id ? "Shopify product ID is required before go-live." : "Requires PUBLISH LIVE confirmation and server-side live publish flags."}
          onClick={() => goLive(ref)}
        >
          Go Live on Shopify
        </button>
      </span>)}
    </div>
    {result ? <pre className="code-block provider-result">{JSON.stringify(result, null, 2)}</pre> : null}
  </section>;
}
