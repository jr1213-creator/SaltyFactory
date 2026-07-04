"use client";

import { useEffect, useMemo, useState } from "react";
import { PrintifyCatalogCard, StatusBadge } from "@saltyfactory/ui";

type Row = Record<string, any>;

async function getJson(url: string) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({ ok: false, status: "invalid_json_response" }));
  return { response, data };
}

async function postJson(url: string, body: Row) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({ ok: false, status: "invalid_json_response" }));
  return { response, data };
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

function resultMessage(result: Row | null) {
  if (!result) return "";
  if (result.safeMessage || result.message) return String(result.safeMessage ?? result.message);
  if (result.ok) return "Printify action completed.";
  return "Printify action could not be completed.";
}

function blueprintImage(blueprint: Row) {
  const images = Array.isArray(blueprint.images) ? blueprint.images : [];
  const first = images.find((item) => typeof item === "string" || (item && typeof item === "object"));
  if (typeof first === "string") return first;
  if (first && typeof first === "object") return String(first.src ?? first.url ?? first.preview_url ?? "");
  return "";
}

function shippingRows(shipping: Row[] | Row | null) {
  if (!shipping) return [];
  if (Array.isArray(shipping)) return shipping;
  if (Array.isArray(shipping.profiles)) return shipping.profiles as Row[];
  if (Array.isArray(shipping.handling_time)) return shipping.handling_time as Row[];
  return [shipping];
}

export function PrintifyCatalogClient({ drafts, initialShopId = "", initialShopName = "", connected = false }: { drafts: Row[]; initialShopId?: string; initialShopName?: string; connected?: boolean }) {
  const [shops, setShops] = useState<Row[]>([]);
  const [blueprints, setBlueprints] = useState<Row[]>([]);
  const [providers, setProviders] = useState<Row[]>([]);
  const [variants, setVariants] = useState<Row[]>([]);
  const [shipping, setShipping] = useState<Row[] | Row | null>(null);
  const [productDraftId, setProductDraftId] = useState(drafts[0]?.id ?? "");
  const [shopId, setShopId] = useState(initialShopId);
  const [blueprintId, setBlueprintId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [salePrice, setSalePrice] = useState("32.00");
  const [baseCost, setBaseCost] = useState("0");
  const [query, setQuery] = useState("");
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState("");

  const filteredBlueprints = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return blueprints;
    return blueprints.filter((blueprint) => `${blueprint.title ?? ""} ${blueprint.brand ?? ""} ${blueprint.id ?? ""}`.toLowerCase().includes(term));
  }, [blueprints, query]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    try {
      await action();
    } finally {
      setBusy("");
    }
  }

  async function loadBlueprints() {
    const { data, response } = await getJson("/api/studio/integrations/printify/catalog/blueprints");
    setResult({ httpStatus: response.status, ...data });
    if (Array.isArray(data.blueprints)) setBlueprints(data.blueprints);
  }

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    async function loadInitialBlueprints() {
      setBusy("blueprints");
      try {
        const { data, response } = await getJson("/api/studio/integrations/printify/catalog/blueprints");
        if (cancelled) return;
        setResult({ httpStatus: response.status, ...data });
        if (Array.isArray(data.blueprints)) setBlueprints(data.blueprints);
      } finally {
        if (!cancelled) setBusy("");
      }
    }
    void loadInitialBlueprints();
    return () => {
      cancelled = true;
    };
  }, [connected]);

  return <div className="layout-grid" style={{ marginTop: 18 }}>
    <PrintifyCatalogCard title="Printify Connection" description={connected ? "Printify is connected through Launch Setup Concierge. Catalog browsing uses the secure workspace credential." : "Discover real Printify shops and save the selected shop through Launch Setup Concierge."}>
      <div className="action-bar">
        <button className="btn btn-secondary" type="button" disabled={busy === "shops"} onClick={() => run("shops", async () => {
          const { data, response } = await getJson("/api/studio/integrations/printify/shops");
          setResult({ httpStatus: response.status, ...data });
          if (Array.isArray(data.shops)) setShops(data.shops);
        })}>Discover Shops</button>
        <button className="btn btn-primary" type="button" disabled={!shopId || busy === "select-shop"} title={shopId ? "Persist selected shop metadata for the secure workspace provider connection." : "Discover and choose a Printify shop first."} onClick={() => run("select-shop", async () => {
          const selected = shops.find((shop) => shop.id === shopId);
          const { data, response } = await postJson("/api/studio/integrations/printify/shops/select", { shopId, title: selected?.title });
          setResult({ httpStatus: response.status, ...data });
        })}>Save Selected Shop</button>
      </div>
      <label>Selected shop<select value={shopId} onChange={(event) => setShopId(event.target.value)}><option value={initialShopId}>{initialShopName || initialShopId || "Choose a discovered shop"}</option>{shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.title ?? shop.id}</option>)}</select></label>
    </PrintifyCatalogCard>

    <PrintifyCatalogCard title="Catalog Browser" description="Browse real Printify blueprints, then load providers and variants for the selected item. No catalog IDs are invented.">
      <div className="action-bar">
        <button className="btn btn-secondary" type="button" disabled={busy === "blueprints"} onClick={() => run("blueprints", loadBlueprints)}>Refresh Blueprints</button>
        <button className="btn btn-secondary" type="button" disabled={!blueprintId || busy === "providers"} title={blueprintId ? "Load real print providers for the selected blueprint." : "Select a blueprint first."} onClick={() => run("providers", async () => {
          const { data, response } = await getJson(`/api/studio/integrations/printify/catalog/blueprints/${encodeURIComponent(blueprintId)}/providers`);
          setResult({ httpStatus: response.status, ...data });
          if (Array.isArray(data.printProviders)) setProviders(data.printProviders);
        })}>Load Providers</button>
        <button className="btn btn-secondary" type="button" disabled={!blueprintId || !providerId || busy === "variants"} title={blueprintId && providerId ? "Load real variants for the selected blueprint/provider pair." : "Select a blueprint and print provider first."} onClick={() => run("variants", async () => {
          const { data, response } = await getJson(`/api/studio/integrations/printify/catalog/blueprints/${encodeURIComponent(blueprintId)}/providers/${encodeURIComponent(providerId)}/variants`);
          setResult({ httpStatus: response.status, ...data });
          if (Array.isArray(data.variants)) setVariants(data.variants);
        })}>Load Variants</button>
        <button className="btn btn-secondary" type="button" disabled={!blueprintId || !providerId || busy === "shipping"} title={blueprintId && providerId ? "Load real shipping and handling data for the selected blueprint/provider pair." : "Select a blueprint and print provider first."} onClick={() => run("shipping", async () => {
          const { data, response } = await getJson(`/api/studio/integrations/printify/catalog/blueprints/${encodeURIComponent(blueprintId)}/providers/${encodeURIComponent(providerId)}/shipping`);
          setResult({ httpStatus: response.status, ...data });
          setShipping(data.shipping ?? null);
        })}>Load Shipping Snapshot</button>
      </div>
      <div className="form-grid">
        <label>Search blueprints<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="tee, hoodie, tote" /></label>
        <label>Blueprint<select value={blueprintId} onChange={(event) => setBlueprintId(event.target.value)}><option value="">Choose blueprint</option>{blueprints.map((blueprint) => <option key={blueprint.id} value={blueprint.id}>{blueprint.title ?? blueprint.id}</option>)}</select></label>
        <label>Print provider<select value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Choose provider</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.title ?? provider.id}</option>)}</select></label>
      </div>
      {filteredBlueprints.length ? <div className="layout-grid layout-grid-3" style={{ marginTop: 12 }}>{filteredBlueprints.slice(0, 18).map((blueprint) => {
        const image = blueprintImage(blueprint);
        const selected = String(blueprint.id) === blueprintId;
        return <button key={blueprint.id} type="button" className="surface-card" style={{ display: "grid", gap: 8, textAlign: "left", borderColor: selected ? "#0f766e" : undefined }} onClick={() => setBlueprintId(String(blueprint.id))}>
          {image ? <img src={image} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "contain", borderRadius: 8, background: "#f8fafc" }} /> : null}
          <strong>{blueprint.title ?? `Blueprint ${blueprint.id}`}</strong>
          <span className="text-muted">Blueprint ID {blueprint.id}</span>
          {blueprint.brand ? <span className="text-muted">{blueprint.brand}</span> : null}
        </button>;
      })}</div> : <p className="text-muted">{busy === "blueprints" ? "Loading Printify blueprints..." : "No blueprints loaded yet. Refresh blueprints to browse the real catalog."}</p>}
      {shippingRows(shipping).length ? <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="data-table"><thead><tr><th>Shipping profile</th><th>Region</th><th>Cost</th><th>Handling</th></tr></thead><tbody>{shippingRows(shipping).slice(0, 8).map((row, index) => <tr key={`${row.id ?? index}`}><td>{row.title ?? row.name ?? row.id ?? `Profile ${index + 1}`}</td><td>{row.country ?? row.region ?? row.zone ?? "provider default"}</td><td>{row.price ?? row.cost ?? row.first_item ?? "from provider"}</td><td>{row.handling_time ?? row.production_time ?? "-"}</td></tr>)}</tbody></table>
      </div> : <p className="text-muted">Shipping and cost snapshot appears here after provider and blueprint selection.</p>}
      {shipping ? <details className="setup-advanced-details"><summary>Developer shipping payload</summary><pre className="code-block provider-result">{JSON.stringify(sanitizeDeveloperDetails(shipping), null, 2)}</pre></details> : null}
    </PrintifyCatalogCard>

    <PrintifyCatalogCard title="Variant Matrix" description={drafts.length ? "Persist selected Printify variants and owner-entered pricing to the product draft. These records feed publish review readiness." : "Catalog browsing works before a draft exists. Create a product draft when approved artwork and a mockup are ready, then save variants here."}>
      <div className="form-grid">
        <label>Product draft<select value={productDraftId} onChange={(event) => setProductDraftId(event.target.value)}><option value="">Choose product draft</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title ?? draft.id}</option>)}</select></label>
        <label>Sale price<input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} inputMode="decimal" /></label>
        <label>Base cost<input value={baseCost} onChange={(event) => setBaseCost(event.target.value)} inputMode="decimal" /></label>
      </div>
      {!drafts.length ? <div className="surface-card" style={{ marginTop: 12 }}>
        <h3>Product draft required to save variants</h3>
        <p className="text-muted">You can still browse the live Printify catalog. Saving a blueprint/provider/variant selection requires a draft created from approved artwork and an approved mockup.</p>
        <a className="btn btn-primary" href="/studio/product-builder">Open Product Builder</a>
      </div> : null}
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="data-table"><thead><tr><th>Use</th><th>Variant</th><th>Size</th><th>Color</th><th>Cost snapshot</th><th>Status</th></tr></thead><tbody>{variants.length ? variants.slice(0, 24).map((variant) => {
          const id = String(variant.id);
          const checked = selectedVariantIds.includes(id);
          return <tr key={id}><td><input aria-label={`Select variant ${variant.title ?? id}`} type="checkbox" checked={checked} onChange={(event) => setSelectedVariantIds((current) => event.target.checked ? [...current, id] : current.filter((item) => item !== id))} /></td><td>{variant.title ?? id}</td><td>{variant.size || "-"}</td><td>{variant.color || "-"}</td><td>{variant.cost || "Provider cost unavailable"}</td><td><StatusBadge status={variant.isAvailable === false ? "unavailable" : "available"} tone={variant.isAvailable === false ? "warning" : "success"} /></td></tr>;
        }) : <tr><td colSpan={6}>Load variants from a real Printify blueprint/provider pair.</td></tr>}</tbody></table>
      </div>
      <div className="action-bar" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" type="button" disabled={!productDraftId || !blueprintId || !providerId || selectedVariantIds.length === 0 || busy === "selection"} title={selectedVariantIds.length ? "Persist selected variants to the product draft." : "Select one or more variants first."} onClick={() => run("selection", async () => {
          const selectedVariants = variants.filter((variant) => selectedVariantIds.includes(String(variant.id))).map((variant) => ({ ...variant, price: Number(salePrice), cost: Number(baseCost) || Number(variant.cost || 0) }));
          const { data, response } = await postJson("/api/studio/integrations/printify/catalog/selection", { productDraftId, blueprintId, printProviderId: providerId, variants: selectedVariants, price: Number(salePrice), cost: Number(baseCost) });
          setResult({ httpStatus: response.status, ...data });
        })}>Save Printify Variant Selection</button>
        <button className="btn btn-secondary" type="button" disabled={!productDraftId || busy === "upload"} title={productDraftId ? "Upload the draft's approved generated artwork to Printify media library." : "Select a product draft first."} onClick={() => run("upload", async () => {
          const { data, response } = await postJson("/api/studio/integrations/printify/uploads", { productDraftId });
          setResult({ httpStatus: response.status, ...data });
        })}>Upload Artwork to Printify</button>
      </div>
    </PrintifyCatalogCard>
    {result ? <section className={`provider-result-panel provider-result-panel-${result.ok ? "success" : "warning"}`} aria-live="polite">
      <div className="provider-result-header"><div><p className="eyebrow-label">Printify result</p><h3>{ownerLabel(result.status ?? result.httpStatus)}</h3><p className="text-muted">{resultMessage(result)}</p></div></div>
      {Array.isArray(result.blockingReasons) ? <div><strong>Blockers</strong><ul>{result.blockingReasons.map((blocker: unknown) => <li key={String(blocker)}>{ownerLabel(blocker)}</li>)}</ul></div> : null}
      <div className="action-bar">
        {result.ok && productDraftId ? <a className="btn btn-primary" href="/studio/publish-review">Open publish review</a> : null}
        {!result.ok ? <button className="btn btn-secondary" type="button" onClick={() => setResult(null)}>Dismiss</button> : null}
      </div>
      <details className="setup-advanced-details"><summary>Developer details</summary><pre className="code-block provider-result">{JSON.stringify(sanitizeDeveloperDetails(result), null, 2)}</pre></details>
    </section> : null}
  </div>;
}
