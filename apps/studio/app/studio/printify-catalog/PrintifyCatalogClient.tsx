"use client";

import { useState } from "react";
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

export function PrintifyCatalogClient({ drafts }: { drafts: Row[] }) {
  const [shops, setShops] = useState<Row[]>([]);
  const [blueprints, setBlueprints] = useState<Row[]>([]);
  const [providers, setProviders] = useState<Row[]>([]);
  const [variants, setVariants] = useState<Row[]>([]);
  const [shipping, setShipping] = useState<Row[] | Row | null>(null);
  const [productDraftId, setProductDraftId] = useState(drafts[0]?.id ?? "");
  const [shopId, setShopId] = useState("");
  const [blueprintId, setBlueprintId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [salePrice, setSalePrice] = useState("32.00");
  const [baseCost, setBaseCost] = useState("0");
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState("");

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    try {
      await action();
    } finally {
      setBusy("");
    }
  }

  return <div className="layout-grid" style={{ marginTop: 18 }}>
    <PrintifyCatalogCard title="Printify Connection" description="Discover real Printify shops and save the selected shop as setup evidence. Product creation still requires PRINTIFY_SHOP_ID in protected server config.">
      <div className="action-bar">
        <button className="btn btn-secondary" type="button" disabled={busy === "shops"} onClick={() => run("shops", async () => {
          const { data, response } = await getJson("/api/studio/integrations/printify/shops");
          setResult({ httpStatus: response.status, ...data });
          if (Array.isArray(data.shops)) setShops(data.shops);
        })}>Discover Shops</button>
        <button className="btn btn-primary" type="button" disabled={!shopId || busy === "select-shop"} title={shopId ? "Persist selected shop metadata. Server env still controls live provider readiness." : "Discover and choose a Printify shop first."} onClick={() => run("select-shop", async () => {
          const selected = shops.find((shop) => shop.id === shopId);
          const { data, response } = await postJson("/api/studio/integrations/printify/shops/select", { shopId, title: selected?.title });
          setResult({ httpStatus: response.status, ...data });
        })}>Save Selected Shop</button>
      </div>
      <label>Selected shop<select value={shopId} onChange={(event) => setShopId(event.target.value)}><option value="">Choose a discovered shop</option>{shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.title ?? shop.id}</option>)}</select></label>
    </PrintifyCatalogCard>

    <PrintifyCatalogCard title="Catalog Browser" description="Fetch real blueprints, print providers, and variants from Printify. No IDs are invented.">
      <div className="action-bar">
        <button className="btn btn-secondary" type="button" disabled={busy === "blueprints"} onClick={() => run("blueprints", async () => {
          const { data, response } = await getJson("/api/studio/integrations/printify/catalog/blueprints");
          setResult({ httpStatus: response.status, ...data });
          if (Array.isArray(data.blueprints)) setBlueprints(data.blueprints);
        })}>Load Blueprints</button>
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
        <label>Blueprint<select value={blueprintId} onChange={(event) => setBlueprintId(event.target.value)}><option value="">Choose blueprint</option>{blueprints.map((blueprint) => <option key={blueprint.id} value={blueprint.id}>{blueprint.title ?? blueprint.id}</option>)}</select></label>
        <label>Print provider<select value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Choose provider</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.title ?? provider.id}</option>)}</select></label>
      </div>
      {shipping ? <pre className="code-block provider-result">{JSON.stringify(shipping, null, 2)}</pre> : <p className="text-muted">Shipping/cost snapshot appears here after provider and blueprint selection.</p>}
    </PrintifyCatalogCard>

    <PrintifyCatalogCard title="Variant Matrix" description="Persist selected Printify variants and owner-entered pricing to the product draft. These records feed publish review readiness.">
      <div className="form-grid">
        <label>Product draft<select value={productDraftId} onChange={(event) => setProductDraftId(event.target.value)}>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title ?? draft.id}</option>)}</select></label>
        <label>Sale price<input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} inputMode="decimal" /></label>
        <label>Base cost<input value={baseCost} onChange={(event) => setBaseCost(event.target.value)} inputMode="decimal" /></label>
      </div>
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
    {result ? <pre className="code-block provider-result">{JSON.stringify(result, null, 2)}</pre> : null}
  </div>;
}
