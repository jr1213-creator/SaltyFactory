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

  return <section className="sf-card" style={{ marginTop: 18 }}>
    <h2>Shopify Media Actions</h2>
    <p className="sf-muted">Re-upload approved mockup media to an existing Shopify draft. This calls the real media route and never publishes live.</p>
    <div className="sf-action-bar">
      {refs.map((ref) => <button key={ref.id} className="sf-button sf-button-secondary" type="button" disabled={busy === ref.id} onClick={() => uploadMedia(ref)}>Upload Media for {ref.shopify_handle ?? ref.id}</button>)}
    </div>
    {result ? <pre className="sf-code sf-provider-result">{JSON.stringify(result, null, 2)}</pre> : null}
  </section>;
}
