"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { assetPreviewPath, mockupPreviewPath } from "../_private-preview-paths";

type Row = Record<string, any>;
type PlacementState = { x: number; y: number; scale: number; rotation: number; fit: "contain" | "cover"; opacity: number };

const derivativeKinds = ["thumbnail", "web_preview", "print_png"] as const;

const internalTemplates = [
  {
    id: "tmpl_internal_apparel_light_tee",
    label: "Light Tee",
    name: "Apparel Front - Light Tee",
    productType: "Tee front",
    productTypeValue: "tee_front",
    recommendedPrintTarget: "apparel_front_square",
    tone: "light"
  },
  {
    id: "tmpl_internal_apparel_dark_tee",
    label: "Dark Tee",
    name: "Apparel Front - Dark Tee",
    productType: "Tee front",
    productTypeValue: "tee_front",
    recommendedPrintTarget: "apparel_front_square",
    tone: "dark"
  },
  {
    id: "tmpl_internal_apparel_sand_tee",
    label: "Sand Tee",
    name: "Apparel Front - Sand Tee",
    productType: "Tee front",
    productTypeValue: "tee_front",
    recommendedPrintTarget: "apparel_front_square",
    tone: "sand"
  },
  {
    id: "tmpl_internal_tote_natural_canvas",
    label: "Tote",
    name: "Tote Front - Natural Canvas",
    productType: "Tote",
    productTypeValue: "tote",
    recommendedPrintTarget: "tote_front",
    tone: "canvas"
  },
  {
    id: "tmpl_internal_sticker_sheet_cream",
    label: "Sticker Sheet",
    name: "Sticker Sheet - Cream Background",
    productType: "Sticker",
    productTypeValue: "sticker",
    recommendedPrintTarget: "sticker_square",
    tone: "cream"
  },
  {
    id: "tmpl_internal_mug_white_front",
    label: "Mug",
    name: "Mug Front - White Mug",
    productType: "Mug",
    productTypeValue: "mug",
    recommendedPrintTarget: "mug_wrap",
    tone: "light"
  },
  {
    id: "tmpl_internal_square_product_card",
    label: "Square Product Card",
    name: "Square Product Card - Boutique Flatlay",
    productType: "Product card",
    productTypeValue: "product_card",
    recommendedPrintTarget: "generic_square",
    tone: "cream"
  }
] as const;

function metadataOf(row: Row | null | undefined): Row {
  const metadata = row?.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

function derivativeKindOf(row: Row | null | undefined) {
  const metadata = metadataOf(row);
  const kind = String(metadata.derivative_kind ?? metadata.derivativeKind ?? row?.asset_type ?? row?.assetType ?? "");
  return derivativeKinds.includes(kind as any) ? kind : "";
}

function derivativeParentId(row: Row | null | undefined) {
  const metadata = metadataOf(row);
  return String(metadata.source_asset_id ?? metadata.sourceAssetId ?? metadata.parent_asset_id ?? metadata.parentAssetId ?? "");
}

function isDerivativeRow(row: Row) {
  return Boolean(derivativeKindOf(row));
}

function shortId(value: unknown) {
  const id = String(value ?? "");
  if (!id) return "Not selected";
  if (id.length <= 24) return id;
  return `${id.slice(0, 14)}...${id.slice(-6)}`;
}

function ownerLabel(value: unknown, fallback = "Pending") {
  const raw = String(value ?? fallback);
  const mapped: Record<string, string> = {
    passed: "QA passed",
    failed: "Failed",
    pending: "Needs review",
    pending_review: "Needs review",
    owner_approved: "Owner approved",
    approved: "Approved",
    rejected: "Rejected",
    generated: "Rendered preview",
    generated_composited_preview: "Rendered preview",
    composited_mockup_created: "Mockup rendered",
    recommended_mockups_created: "Recommended mockups created",
    hero_mockup_selected: "Hero mockup selected",
    mockup_approved_for_product: "Mockup approved",
    mockup_rejected: "Mockup rejected",
    draft_created_requires_review: "Product draft created",
    request_failed: "Request failed",
    blocked: "Blocked"
  };
  return mapped[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function providerLabel(asset: Row | null | undefined) {
  const provider = String(asset?.generator ?? asset?.provider ?? metadataOf(asset).provider ?? "");
  if (/huggingface|hf/i.test(provider)) return "Hugging Face";
  if (/local|manual/i.test(provider)) return "Internal asset";
  return provider ? ownerLabel(provider) : "Internal asset";
}

function printTargetLabel(value: unknown) {
  const raw = String(value ?? "");
  const labels: Record<string, string> = {
    apparel_front_square: "Apparel front square",
    apparel_front_vertical: "Apparel front vertical",
    sticker_square: "Sticker square",
    mug_wrap: "Mug wrap",
    tote_front: "Tote front",
    generic_square: "Generic square"
  };
  return labels[raw] ?? ownerLabel(raw || "Artwork");
}

function templateInfo(templateId: unknown) {
  return internalTemplates.find((template) => template.id === templateId)
    ?? internalTemplates.find((template) => template.id === String(templateId))
    ?? {
      id: String(templateId || "template"),
      label: "Internal template",
      name: ownerLabel(templateId, "Internal template"),
      productType: "Internal preview",
      productTypeValue: "tee_front",
      recommendedPrintTarget: "apparel_front_square",
      tone: "light"
    };
}

function mockupAssetId(mockup: Row | null | undefined) {
  return String(mockup?.asset_id ?? mockup?.assetId ?? mockup?.source_asset_id ?? mockup?.sourceAssetId ?? metadataOf(mockup).source_asset_id ?? "");
}

function mockupTemplateId(mockup: Row | null | undefined) {
  return String(mockup?.template_id ?? mockup?.templateId ?? metadataOf(mockup).template_id ?? "");
}

function mockupChecksum(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return String(metadata.checksum_sha256 ?? metadata.checksumSha256 ?? mockup?.checksum ?? "");
}

function mockupRenderer(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  const version = String(metadata.renderer_version ?? metadata.rendererVersion ?? "");
  if (/internal-sharp-v1/i.test(version)) return "Internal Sharp";
  return version ? ownerLabel(version) : "Internal Sharp";
}

function rendererVersion(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return String(metadata.renderer_version ?? metadata.rendererVersion ?? "internal-sharp-v1");
}

function isHero(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return metadata.is_hero === true || metadata.isHero === true;
}

function isApprovedMockup(mockup: Row | null | undefined) {
  return Boolean(mockup?.approved_for_product ?? mockup?.approvedForProduct);
}

function isRejectedMockup(mockup: Row | null | undefined) {
  return String(mockup?.status ?? "").toLowerCase() === "rejected";
}

function assetApproved(asset: Row | null | undefined) {
  return Boolean(asset?.approved_for_mockup ?? asset?.approvedForMockup);
}

function assetQaStatus(asset: Row | null | undefined) {
  return String(asset?.qa_status ?? asset?.qaStatus ?? "pending");
}

function assetPrintTarget(asset: Row | null | undefined) {
  const metadata = metadataOf(asset);
  return String(metadata.print_target ?? metadata.printTarget ?? asset?.print_target ?? asset?.printTarget ?? "");
}

function templateBadgeLabel(mockup: Row | null | undefined) {
  return templateInfo(mockupTemplateId(mockup)).label;
}

function actionStatusMessage(result: Row) {
  return String(result.safeMessage ?? result.message ?? (result.ok ? "Mockup workflow action completed." : "Mockup workflow action could not be completed."));
}

function safeBlockingReasons(result: Row) {
  return Array.isArray(result.blockingReasons) ? result.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
}

async function postJson(url: string, body?: Record<string, unknown>) {
  const init: RequestInit = { method: "POST" };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  return response.json();
}

function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`mockup-status-chip tone-${tone}`}>{children}</span>;
}

function TemplateGlyph({ tone }: { tone: string }) {
  return <span className={`mockup-template-glyph tone-${tone}`} aria-hidden="true">
    <span />
  </span>;
}

function ResultPanel({ result }: { result: unknown }) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const record = result as Row;
  const ok = Boolean(record.ok);
  const status = ownerLabel(record.status ?? (ok ? "completed" : "blocked"));
  const message = actionStatusMessage(record);
  const blockers = safeBlockingReasons(record);
  const mockup = record.mockup && typeof record.mockup === "object" ? record.mockup as Row : null;
  const mockups = Array.isArray(record.mockups) ? record.mockups.filter((item: unknown): item is Row => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
  const draft = record.draft && typeof record.draft === "object" ? record.draft as Row : null;

  return <section className={`mockup-result-panel ${ok ? "is-success" : "is-warning"}`} aria-live="polite">
    <div>
      <p className="eyebrow-label">Mockup result</p>
      <h3>{status}</h3>
      <p className="text-muted">{message}</p>
    </div>
    {mockup ? <PrivateImagePreview src={mockupPreviewPath(mockup)} alt="Rendered mockup preview" aspectRatio="4 / 5" maxHeight={320} /> : null}
    {!mockup && mockups.length ? <div className="mockup-result-strip">
      {mockups.slice(0, 4).map((item) => <article key={String(item.id)} className="mockup-result-mini">
        <PrivateImagePreview src={String(item.previewUrl ?? mockupPreviewPath(item))} alt="Rendered mockup preview" aspectRatio="4 / 5" maxHeight={220} />
        <strong>{templateBadgeLabel(item)}</strong>
      </article>)}
    </div> : null}
    {blockers.length ? <div className="mockup-blocker-list"><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    <dl className="mockup-proof-grid">
      {mockup ? <div><dt>Mockup</dt><dd>{shortId(mockup.id)}</dd></div> : null}
      {mockup ? <div><dt>Template</dt><dd>{templateInfo(mockupTemplateId(mockup)).label}</dd></div> : null}
      {draft ? <div><dt>Product draft</dt><dd>{shortId(draft.id)}</dd></div> : null}
      {draft ? <div><dt>Draft status</dt><dd>{ownerLabel(draft.status)}</dd></div> : null}
    </dl>
    <div className="action-bar">
      {draft ? <a className="btn btn-primary" href={`/studio/product-builder?draft_id=${encodeURIComponent(String(draft.id))}`}>Open product draft</a> : null}
      {draft ? <a className="btn btn-secondary" href="/studio/publish-review">Open publish review</a> : null}
    </div>
  </section>;
}

function ProofDetails({ mockup }: { mockup: Row | null | undefined }) {
  if (!mockup) return null;
  const template = templateInfo(mockupTemplateId(mockup));
  return <details className="mockup-proof-details" data-testid="mockup-proof-details">
    <summary>Proof details</summary>
    <dl className="mockup-proof-grid">
      <div><dt>Mockup ID</dt><dd>{String(mockup.id)}</dd></div>
      <div><dt>Source asset ID</dt><dd>{mockupAssetId(mockup)}</dd></div>
      <div><dt>Derivative kind</dt><dd>print_png</dd></div>
      <div><dt>Template ID</dt><dd>{template.id}</dd></div>
      <div><dt>Renderer version</dt><dd>{rendererVersion(mockup)}</dd></div>
      <div><dt>Checksum</dt><dd>{mockupChecksum(mockup) || "Not recorded"}</dd></div>
      <div><dt>Preview route</dt><dd>{mockupPreviewPath(mockup)}</dd></div>
    </dl>
  </details>;
}

export function MockupWorkflowClient({
  initialAssets,
  initialDerivatives = [],
  initialMockups,
  initialAssetId
}: {
  initialAssets: Row[];
  initialDerivatives?: Row[];
  initialMockups: Row[];
  initialAssetId?: string | undefined;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [derivatives, setDerivatives] = useState(initialDerivatives);
  const preferredInitialAssetId =
    (initialAssetId && initialAssets.some((asset) => asset.id === initialAssetId) ? initialAssetId : "")
    || initialAssets.find((asset) => assetApproved(asset))?.id
    || initialAssets[0]?.id
    || "";
  const [assetId, setAssetId] = useState(preferredInitialAssetId);
  const [productType, setProductType] = useState("tee_front");
  const [templateId, setTemplateId] = useState("tmpl_internal_apparel_light_tee");
  const [placement, setPlacement] = useState<PlacementState>({ x: 450, y: 520, scale: 1, rotation: 0, fit: "contain", opacity: 0.96 });
  const [mockups, setMockups] = useState(initialMockups);
  const initialMockupForAsset = initialMockups.find((mockup) => mockupAssetId(mockup) === preferredInitialAssetId);
  const initialHeroForAsset = initialMockups.find((mockup) => mockupAssetId(mockup) === preferredInitialAssetId && isHero(mockup));
  const [selectedMockupId, setSelectedMockupId] = useState((initialHeroForAsset ?? initialMockupForAsset ?? initialMockups[0])?.id ?? "");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === assetId) ?? null, [assets, assetId]);
  const selectedDerivatives = useMemo(() => derivatives.filter((derivative) => derivativeParentId(derivative) === assetId), [derivatives, assetId]);
  const derivativeKindSet = useMemo(() => new Set(selectedDerivatives.map((derivative) => derivativeKindOf(derivative)).filter(Boolean)), [selectedDerivatives]);
  const hasPrintPng = derivativeKindSet.has("print_png");
  const mockupsForAsset = useMemo(() => mockups.filter((mockup) => mockupAssetId(mockup) === assetId), [mockups, assetId]);
  const heroMockup = useMemo(() => mockupsForAsset.find((mockup) => isHero(mockup)) ?? null, [mockupsForAsset]);
  const approvedMockups = useMemo(() => mockupsForAsset.filter((mockup) => isApprovedMockup(mockup)), [mockupsForAsset]);
  const selectedMockup = useMemo(() => mockupsForAsset.find((mockup) => mockup.id === selectedMockupId) ?? heroMockup ?? mockupsForAsset[0] ?? null, [heroMockup, mockupsForAsset, selectedMockupId]);
  const featuredMockup = heroMockup ?? selectedMockup;
  const draftMockup = heroMockup && isApprovedMockup(heroMockup) ? heroMockup : approvedMockups[0] ?? null;
  const activeTemplate = templateInfo(templateId);
  const qaPassed = assetQaStatus(selectedAsset) === "passed";
  const readyForMockups = Boolean(selectedAsset && assetApproved(selectedAsset) && qaPassed && hasPrintPng);
  const draftGateReason = !selectedAsset
    ? "Select approved source artwork first."
    : !hasPrintPng
      ? "This asset needs a print-ready file."
      : !mockupsForAsset.length
        ? "Generate mockups before creating product draft."
        : heroMockup && !isApprovedMockup(heroMockup)
          ? "Approve the hero mockup before creating product draft."
          : !draftMockup
            ? "Select a hero mockup or approve a mockup first."
            : "";
  const canCreateDraft = Boolean(selectedAsset && hasPrintPng && draftMockup && !busy);

  async function refreshAssets() {
    const data = await fetch("/api/studio/assets/upload", { cache: "no-store" }).then((res) => res.json());
    if (Array.isArray(data.assets)) {
      const sourceRows = data.assets.filter((asset: Row) => !isDerivativeRow(asset));
      const derivativeRows = data.assets.filter((asset: Row) => isDerivativeRow(asset));
      setAssets(sourceRows);
      setDerivatives(derivativeRows);
      const preferredAssetId =
        (initialAssetId && sourceRows.some((asset: Row) => asset.id === initialAssetId) ? initialAssetId : "")
        || (assetId && sourceRows.some((asset: Row) => asset.id === assetId) ? assetId : "")
        || sourceRows.find((asset: Row) => assetApproved(asset))?.id
        || sourceRows[0]?.id
        || "";
      if (preferredAssetId !== assetId) setAssetId(preferredAssetId);
    }
  }

  async function refreshMockups() {
    const data = await fetch("/api/studio/mockups/generate", { cache: "no-store" }).then((res) => res.json());
    if (Array.isArray(data.mockups)) {
      setMockups(data.mockups);
      const sourceMockups = data.mockups.filter((mockup: Row) => mockupAssetId(mockup) === assetId);
      const nextHero = sourceMockups.find((mockup: Row) => isHero(mockup));
      const currentStillExists = sourceMockups.some((mockup: Row) => mockup.id === selectedMockupId);
      if (nextHero) setSelectedMockupId(nextHero.id);
      else if (!currentStillExists && sourceMockups[0]) setSelectedMockupId(sourceMockups[0].id);
    }
  }

  useEffect(() => {
    refreshAssets().catch(() => {
      // Keep server-rendered assets if the authenticated refresh is unavailable.
    });
  }, []);

  async function generate(mode: "single" | "recommended" = "single", requestedTemplateId = templateId) {
    setBusy(true);
    try {
      const data = await postJson("/api/studio/mockups/generate", {
        asset_id: assetId,
        product_type: productType,
        template_id: requestedTemplateId,
        mode: mode === "recommended" ? "recommended" : "single",
        placement
      });
      setResult(data);
      await refreshMockups();
      if (data.mockup?.id) setSelectedMockupId(data.mockup.id);
      if (!data.mockup?.id && Array.isArray(data.mockups) && data.mockups[0]?.id) setSelectedMockupId(data.mockups[0].id);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to generate mockup." });
    } finally {
      setBusy(false);
    }
  }

  async function rerenderMockup(mockup: Row | null | undefined) {
    const nextTemplateId = mockupTemplateId(mockup) || templateId;
    setTemplateId(nextTemplateId);
    await generate("single", nextTemplateId);
  }

  async function setHero(mockupId = selectedMockup?.id) {
    if (!mockupId) return;
    setBusy(true);
    try {
      const data = await postJson(`/api/studio/mockups/${encodeURIComponent(String(mockupId))}/hero`);
      setResult(data);
      await refreshMockups();
      setSelectedMockupId(String(mockupId));
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to set hero mockup." });
    } finally {
      setBusy(false);
    }
  }

  async function review(action: "approve" | "reject", mockupId = selectedMockup?.id) {
    if (!mockupId) return;
    setBusy(true);
    try {
      const data = await postJson(`/api/studio/mockups/${encodeURIComponent(String(mockupId))}/${action}`);
      setResult(data);
      await refreshMockups();
      setSelectedMockupId(String(mockupId));
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update mockup." });
    } finally {
      setBusy(false);
    }
  }

  async function runQa() {
    if (!selectedAsset) return;
    setBusy(true);
    try {
      const data = await postJson(`/api/studio/assets/${encodeURIComponent(String(selectedAsset.id))}/run-qa`);
      setResult(data);
      await refreshAssets();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to run QA." });
    } finally {
      setBusy(false);
    }
  }

  async function createDraft() {
    if (!selectedAsset || !draftMockup) return;
    setBusy(true);
    try {
      const data = await postJson("/api/studio/drafts/create-from-assets", {
        asset_id: selectedAsset.id,
        mockup_ids: [draftMockup.id],
        title: "Internal POD Product Draft",
        description: "Private product draft created from approved source art and internal mockup. Human review required before public projection.",
        tags: ["pod", "internal-review"],
        product_type: productType.replace("_front", ""),
        collection: "Studio Drafts",
        price: 32,
        estimated_cogs: 12,
        estimated_shipping: 5,
        provider_target: "internal_only"
      });
      setResult(data);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to create draft." });
    } finally {
      setBusy(false);
    }
  }

  if (!assets.length) {
    return <section className="mockup-studio" data-testid="mockup-studio-root">
      <div className="pod-empty-state">
        <strong>No generated artwork yet</strong>
        <p className="text-muted">Generate artwork, run QA, and approve it before rendering internal mockups.</p>
        <a className="btn btn-primary" href="/studio/image-generation">Open image generation</a>
      </div>
    </section>;
  }

  return <section className="mockup-studio" data-testid="mockup-studio-root">
    <div className="mockup-studio-toolbar">
      <div>
        <p className="eyebrow-label">Internal Mockup Workflow</p>
        <h2>Mockup production board</h2>
        <p className="text-muted">Select approved artwork, render internal product previews, choose a hero mockup, and move only approved proof into Product Builder.</p>
      </div>
      <div className="action-bar">
        <button className="btn btn-primary" type="button" disabled={busy || !readyForMockups} title={readyForMockups ? "Render the recommended internal template set." : "Artwork must pass QA and have a print-ready PNG before mockups can render."} onClick={() => generate("recommended")}>
          Generate recommended mockups
        </button>
        <a className="btn btn-secondary" href={selectedAsset ? `/studio/assets?asset_id=${encodeURIComponent(String(selectedAsset.id))}` : "/studio/assets"}>Open asset</a>
        <button className="btn btn-secondary" type="button" disabled={busy || !selectedAsset} onClick={runQa}>Re-run QA</button>
      </div>
    </div>

    <div className="mockup-studio-summary">
      <div><span>Selected asset</span><strong>{shortId(selectedAsset?.id)}</strong></div>
      <div><span>Source</span><strong>{providerLabel(selectedAsset)}</strong></div>
      <div><span>QA status</span><strong>{ownerLabel(assetQaStatus(selectedAsset))}</strong></div>
      <div><span>Derivative status</span><strong>{hasPrintPng ? "print PNG ready" : "print PNG missing"}</strong></div>
    </div>

    <div className="mockup-studio-main-grid">
      <section className="surface-card mockup-asset-panel" data-testid="selected-asset-panel">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Selected artwork</p>
            <h2>Source asset proof</h2>
          </div>
          <StatusChip tone={readyForMockups ? "success" : "warning"}>{readyForMockups ? "Ready for mockups" : "Needs setup"}</StatusChip>
        </div>
        {selectedAsset ? <PrivateImagePreview src={assetPreviewPath(selectedAsset)} alt="Approved source artwork preview" aspectRatio="1 / 1" maxHeight={420} /> : null}
        <label className="mockup-field">Source artwork
          <select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{shortId(asset.id)} - {providerLabel(asset)}</option>)}
          </select>
        </label>
        <dl className="mockup-proof-grid">
          <div><dt>Provider</dt><dd>{providerLabel(selectedAsset)}</dd></div>
          <div><dt>Model</dt><dd>{String(selectedAsset?.model ?? "Not recorded")}</dd></div>
          <div><dt>Print target</dt><dd>{printTargetLabel(assetPrintTarget(selectedAsset))}</dd></div>
          <div><dt>QA badge</dt><dd>{ownerLabel(assetQaStatus(selectedAsset))}</dd></div>
          <div><dt>Approval</dt><dd>{assetApproved(selectedAsset) ? "Artwork approved" : "Needs QA"}</dd></div>
          <div><dt>Derivatives</dt><dd>{hasPrintPng ? "Print file ready" : "Missing print file"}</dd></div>
        </dl>
        <div className="mockup-derivative-row" aria-label="Derivative package status">
          {derivativeKinds.map((kind) => <StatusChip key={kind} tone={derivativeKindSet.has(kind) ? "success" : "warning"}>
            {kind === "print_png" ? "print PNG" : kind.replace("_", " ")} {derivativeKindSet.has(kind) ? "ready" : "missing"}
          </StatusChip>)}
        </div>
      </section>

      <section className="surface-card mockup-hero-panel" data-testid="hero-mockup-panel">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Hero mockup</p>
            <h2>{featuredMockup ? templateInfo(mockupTemplateId(featuredMockup)).name : "Render a product preview"}</h2>
            <p className="text-muted">{featuredMockup ? `${mockupRenderer(featuredMockup)} renderer - source ${shortId(mockupAssetId(featuredMockup))}` : "Generate internal mockups from the print-ready file, then approve and select a hero."}</p>
          </div>
          {featuredMockup ? <div className="mockup-chip-row">
            {isHero(featuredMockup) ? <StatusChip tone="success">Hero selected</StatusChip> : <StatusChip tone="info">Selected preview</StatusChip>}
            <StatusChip tone={isApprovedMockup(featuredMockup) ? "success" : isRejectedMockup(featuredMockup) ? "danger" : "warning"}>{isApprovedMockup(featuredMockup) ? "Approved" : isRejectedMockup(featuredMockup) ? "Rejected" : "Needs approval"}</StatusChip>
          </div> : null}
        </div>
        {featuredMockup ? <PrivateImagePreview src={mockupPreviewPath(featuredMockup)} alt="Rendered mockup preview" aspectRatio="4 / 5" maxHeight={560} /> : <div className="mockup-empty-preview">
          <strong>No mockup rendered for this asset yet</strong>
          <p className="text-muted">Use recommended mockups for a full preview set, or choose a template below.</p>
        </div>}
        {featuredMockup ? <dl className="mockup-proof-grid">
          <div><dt>Template</dt><dd>{templateInfo(mockupTemplateId(featuredMockup)).label}</dd></div>
          <div><dt>Renderer</dt><dd>{mockupRenderer(featuredMockup)}</dd></div>
          <div><dt>Mockup ID</dt><dd>{shortId(featuredMockup.id)}</dd></div>
          <div><dt>Approval</dt><dd>{isApprovedMockup(featuredMockup) ? "Approved for product draft" : "Needs approval"}</dd></div>
        </dl> : null}
        <div className="mockup-action-panel">
          <div>
            <strong>Create Product Draft</strong>
            <p className="text-muted" data-testid="draft-gate-reason">{draftGateReason || "Ready to create a guarded product draft from the approved hero mockup."}</p>
          </div>
          <button className="btn btn-primary" data-testid="create-product-draft-button" type="button" disabled={!canCreateDraft} title={draftGateReason || "Create a product draft."} onClick={createDraft}>
            Create Product Draft
          </button>
        </div>
        {featuredMockup ? <div className="action-bar">
          <button className="btn btn-primary" type="button" disabled={busy || isHero(featuredMockup)} onClick={() => setHero(featuredMockup.id)}>{isHero(featuredMockup) ? "Hero selected" : "Set as hero mockup"}</button>
          <button className="btn btn-secondary" type="button" disabled={busy || isApprovedMockup(featuredMockup)} onClick={() => review("approve", featuredMockup.id)}>Approve Mockup</button>
          <button className="btn btn-secondary" type="button" disabled={busy || isRejectedMockup(featuredMockup)} onClick={() => review("reject", featuredMockup.id)}>Reject Mockup</button>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => rerenderMockup(featuredMockup)}>Re-render</button>
        </div> : null}
        <ProofDetails mockup={featuredMockup} />
      </section>
    </div>

    <section className="surface-card">
      <div className="mockup-panel-heading">
        <div>
          <p className="eyebrow-label">Gallery</p>
          <h2>Rendered mockup variants</h2>
          <p className="text-muted">Compare internal previews, set a hero, and approve the mockup that should move downstream.</p>
        </div>
        <StatusChip tone={mockupsForAsset.length ? "success" : "warning"}>{mockupsForAsset.length ? `${mockupsForAsset.length} rendered` : "No renders yet"}</StatusChip>
      </div>
      {mockupsForAsset.length ? <div className="mockup-gallery-grid" data-testid="mockup-gallery">
        {mockupsForAsset.map((mockup) => {
          const template = templateInfo(mockupTemplateId(mockup));
          const selected = featuredMockup?.id === mockup.id;
          return <article key={mockup.id} className={`mockup-card ${selected ? "is-selected" : ""}`} data-testid="mockup-card">
            <PrivateImagePreview src={mockupPreviewPath(mockup)} alt="Rendered mockup preview" aspectRatio="4 / 5" maxHeight={280} />
            <div className="mockup-card-copy">
              <div className="mockup-card-title-row">
                <strong>{template.label}</strong>
                {isHero(mockup) ? <StatusChip tone="success">Hero</StatusChip> : null}
              </div>
              <p className="text-muted">{template.name}</p>
              <div className="mockup-chip-row">
                <StatusChip tone="info">{mockupRenderer(mockup)}</StatusChip>
                <StatusChip tone={isApprovedMockup(mockup) ? "success" : isRejectedMockup(mockup) ? "danger" : "warning"}>{isApprovedMockup(mockup) ? "Approved" : isRejectedMockup(mockup) ? "Rejected" : "Needs approval"}</StatusChip>
              </div>
              <small className="mockup-proof-line">Proof {shortId(mockup.id)} - {mockupChecksum(mockup) ? `${mockupChecksum(mockup).slice(0, 10)}...` : "checksum pending"}</small>
            </div>
            <div className="mockup-card-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setSelectedMockupId(mockup.id)}>Preview</button>
              <button className="btn btn-secondary" type="button" disabled={busy || isHero(mockup)} onClick={() => setHero(mockup.id)}>Set hero</button>
              <button className="btn btn-secondary" type="button" disabled={busy || isApprovedMockup(mockup)} onClick={() => review("approve", mockup.id)}>Approve</button>
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => rerenderMockup(mockup)}>Re-render</button>
            </div>
          </article>;
        })}
      </div> : <div className="pod-empty-state">
        <strong>No mockups yet</strong>
        <p className="text-muted">Generate recommended internal mockups once the source asset has passed QA and has a print-ready PNG.</p>
        <button className="btn btn-primary" type="button" disabled={busy || !readyForMockups} onClick={() => generate("recommended")}>Render recommended set</button>
      </div>}
    </section>

    <div className="mockup-studio-secondary-grid">
      <section className="surface-card" data-testid="template-picker">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Templates</p>
            <h2>Choose an internal preview template</h2>
          </div>
          <label className="mockup-inline-field">Internal template
            <select value={templateId} onChange={(event) => {
              const next = event.target.value;
              setTemplateId(next);
              setProductType(templateInfo(next).productTypeValue);
            }}>
              {internalTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mockup-template-grid">
          {internalTemplates.map((template) => <article key={template.id} className={`mockup-template-card ${template.id === templateId ? "is-selected" : ""}`}>
            <TemplateGlyph tone={template.tone} />
            <div>
              <strong>{template.label}</strong>
              <p className="text-muted">{template.productType} - {printTargetLabel(template.recommendedPrintTarget)}</p>
            </div>
            <button className="btn btn-secondary" type="button" disabled={busy || !readyForMockups} onClick={() => {
              setTemplateId(template.id);
              setProductType(template.productTypeValue);
              void generate("single", template.id);
            }}>Render</button>
          </article>)}
        </div>
      </section>

      <section className="surface-card" data-testid="placement-controls">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Placement</p>
            <h2>{activeTemplate.label} controls</h2>
            <p className="text-muted">Placement changes are rendered server-side with the internal compositor.</p>
          </div>
        </div>
        <div className="mockup-placement-grid">
          <label>X<input type="number" value={placement.x} onChange={(event) => setPlacement((current) => ({ ...current, x: Number(event.target.value) || 0 }))} /></label>
          <label>Y<input type="number" value={placement.y} onChange={(event) => setPlacement((current) => ({ ...current, y: Number(event.target.value) || 0 }))} /></label>
          <label>Scale<input type="number" step="0.05" min="0.25" max="2.5" value={placement.scale} onChange={(event) => setPlacement((current) => ({ ...current, scale: Number(event.target.value) || 1 }))} /></label>
          <label>Rotation<input type="number" value={placement.rotation} onChange={(event) => setPlacement((current) => ({ ...current, rotation: Number(event.target.value) || 0 }))} /></label>
          <label>Fit<select value={placement.fit} onChange={(event) => setPlacement((current) => ({ ...current, fit: event.target.value as "contain" | "cover" }))}><option value="contain">Contain</option><option value="cover">Cover</option></select></label>
          <label>Opacity<input type="number" min="0.1" max="1" step="0.01" value={placement.opacity} onChange={(event) => setPlacement((current) => ({ ...current, opacity: Number(event.target.value) || 0.96 }))} /></label>
        </div>
        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => setPlacement({ x: 450, y: 520, scale: 1, rotation: 0, fit: "contain", opacity: 0.96 })}>Reset placement</button>
          <button className="btn btn-primary" type="button" disabled={busy || !readyForMockups} onClick={() => generate("single")}>Render with placement</button>
        </div>
      </section>
    </div>

    <ResultPanel result={result} />
  </section>;
}
