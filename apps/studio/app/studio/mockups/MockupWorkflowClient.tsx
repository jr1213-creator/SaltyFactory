"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PrivateImagePreview } from "../_components/PrivateImagePreview";
import { assetPreviewPath } from "../_private-preview-paths";

type Row = Record<string, any>;
type ActionResult = Row | null;

const derivativeKinds = ["thumbnail", "web_preview", "print_png"] as const;

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
    printify_image_uploaded: "Printify upload complete",
    printify_product_created: "Printify product created",
    printify_product_created_with_mockups: "Printify product created with mockups",
    printify_mockups_imported: "Printify mockups imported",
    mockups_not_ready: "Mockups not ready",
    rate_limited: "Provider rate limited",
    product_create_failed: "Product creation failed",
    upload_failed: "Upload failed",
    draft_created_requires_review: "Product draft ready",
    hero_mockup_selected: "Hero mockup selected",
    mockup_approved_for_product: "Mockup approved",
    mockup_rejected: "Mockup rejected",
    blocked: "Blocked",
    request_failed: "Request failed",
    printify_mockup_imported: "Printify mockup"
  };
  return mapped[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function providerLabel(asset: Row | null | undefined) {
  const metadata = metadataOf(asset);
  const provider = String(asset?.generator ?? asset?.provider ?? metadata.provider ?? metadata.source_provider ?? metadata.sourceProvider ?? "");
  if (/huggingface|hf/i.test(provider)) return "Hugging Face";
  if (/local_folder/i.test(provider)) return "Local folder import";
  if (/manual_upload/i.test(provider)) return "Owner upload";
  if (/local|manual/i.test(provider)) return "Internal asset";
  return provider ? ownerLabel(provider) : "Internal asset";
}

function assetApproved(asset: Row | null | undefined) {
  return Boolean(asset?.approved_for_mockup ?? asset?.approvedForMockup);
}

function assetQaStatus(asset: Row | null | undefined) {
  return String(asset?.qa_status ?? asset?.qaStatus ?? "pending");
}

function isPrintifyMockup(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return metadata.provider_source === "printify"
    || metadata.providerSource === "printify"
    || metadata.source === "printify"
    || Boolean(metadata.provider_mockup_url ?? metadata.providerMockupUrl);
}

function printifyMockupUrl(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return String(metadata.provider_mockup_url ?? metadata.providerMockupUrl ?? metadata.public_url ?? metadata.publicUrl ?? mockup?.file_path ?? mockup?.filePath ?? "");
}

function mockupAssetId(mockup: Row | null | undefined) {
  return String(mockup?.asset_id ?? mockup?.assetId ?? metadataOf(mockup).source_asset_id ?? metadataOf(mockup).sourceAssetId ?? "");
}

function mockupDraftId(mockup: Row | null | undefined) {
  return String(mockup?.product_draft_id ?? mockup?.productDraftId ?? "");
}

function isHero(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return metadata.is_hero === true || metadata.isHero === true;
}

function isDefaultPrintifyImage(mockup: Row | null | undefined) {
  const metadata = metadataOf(mockup);
  return metadata.printify_is_default === true || metadata.printifyIsDefault === true;
}

function isApprovedMockup(mockup: Row | null | undefined) {
  return Boolean(mockup?.approved_for_product ?? mockup?.approvedForProduct);
}

function printifyProductId(ref: Row | null | undefined) {
  return String(ref?.printify_product_id ?? ref?.printifyProductId ?? "");
}

function printifyUploadIdFromAsset(asset: Row | null | undefined) {
  const metadata = metadataOf(asset);
  return String(metadata.printify_upload_id ?? metadata.printifyUploadId ?? "");
}

function printifyUploadIdFromRef(ref: Row | null | undefined) {
  return String(ref?.printify_upload_id ?? ref?.printifyUploadId ?? "");
}

function draftAssetId(draft: Row | null | undefined) {
  return String(draft?.asset_id ?? draft?.assetId ?? metadataOf(draft).source_asset_id ?? "");
}

function draftTitle(draft: Row | null | undefined) {
  return String(draft?.title ?? draft?.name ?? draft?.id ?? "Untitled product draft");
}

function printifyRefDraftId(ref: Row | null | undefined) {
  return String(ref?.product_draft_id ?? ref?.productDraftId ?? "");
}

function printifyRefAssetId(ref: Row | null | undefined) {
  const metadata = metadataOf(ref);
  return String(ref?.asset_id ?? ref?.assetId ?? metadata.asset_id ?? metadata.assetId ?? "");
}

function providerVariantIds(ref: Row | null | undefined) {
  const values = ref?.printify_variant_ids ?? ref?.printifyVariantIds ?? [];
  return Array.isArray(values) ? values.map(String) : [];
}

function numberFromMetadata(row: Row | null | undefined, key: string) {
  const value = Number(metadataOf(row)[key]);
  return Number.isFinite(value) ? value : 0;
}

function printPngTransparencyReady(row: Row | null | undefined) {
  if (!row) return false;
  const metadata = metadataOf(row);
  if (metadata.transparent_background_ready === true || metadata.transparentBackgroundReady === true) return true;
  const hasAlpha = row.transparent_background === true
    || row.transparentBackground === true
    || metadata.has_alpha === true
    || metadata.hasAlpha === true;
  return hasAlpha && numberFromMetadata(row, "transparent_pixel_ratio") >= 0.02;
}

function printPngStatusLabel(row: Row | null | undefined, hasPrintPng: boolean) {
  if (!hasPrintPng) return "Missing print file";
  if (printPngTransparencyReady(row)) return "Transparent print file ready";
  const metadata = metadataOf(row);
  if (metadata.chroma_key_cleanup_failed === true || metadata.chromaKeyCleanupFailed === true) return "Chroma cleanup failed";
  if ((metadata.chroma_key_enabled === true || metadata.chromaKeyEnabled === true) && !(metadata.chroma_key_applied === true || metadata.chromaKeyApplied === true)) return "Chroma cleanup needed";
  return "Transparent print file needed";
}

function printPngBlockedReason(row: Row | null | undefined, hasPrintPng: boolean) {
  if (!hasPrintPng) return "This asset needs a print-ready PNG.";
  const metadata = metadataOf(row);
  if (metadata.chroma_key_cleanup_failed === true || metadata.chromaKeyCleanupFailed === true) {
    if (metadata.chroma_key_keyed_pixel_ratio === 0) return "Chroma cleanup did not find the expected key background.";
    return "Chroma cleanup did not produce a production-ready transparent print PNG.";
  }
  if ((metadata.chroma_key_enabled === true || metadata.chromaKeyEnabled === true) && !(metadata.chroma_key_applied === true || metadata.chromaKeyApplied === true)) {
    return "Run chroma cleanup before Printify upload.";
  }
  return "This asset needs a transparent print-ready PNG before Printify upload.";
}

async function postJson(url: string, body?: Record<string, unknown>) {
  const init: RequestInit = { method: "POST" };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({ ok: false, status: "invalid_json_response", message: "The server returned an invalid response." }));
  return { response, data };
}

function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`mockup-status-chip tone-${tone}`}>{children}</span>;
}

function providerResultMessage(result: ActionResult) {
  if (!result) return "";
  return String(result.safeMessage ?? result.message ?? (result.ok ? "Printify action completed." : "Printify action could not be completed."));
}

function ResultPanel({ result }: { result: ActionResult }) {
  if (!result) return null;
  const ok = Boolean(result.ok);
  const blockers = Array.isArray(result.blockingReasons) ? result.blockingReasons.map((item: unknown) => ownerLabel(item)) : [];
  return <section className={`mockup-result-panel ${ok ? "is-success" : "is-warning"}`} aria-live="polite">
    <div>
      <p className="eyebrow-label">Printify result</p>
      <h3>{ownerLabel(result.status ?? (ok ? "completed" : "blocked"))}</h3>
      <p className="text-muted">{providerResultMessage(result)}</p>
    </div>
    {blockers.length ? <div className="mockup-blocker-list"><strong>Blockers</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
    {result.uploadId ? <dl className="mockup-proof-grid"><div><dt>Printify upload</dt><dd>{shortId(result.uploadId)}</dd></div></dl> : null}
    {result.importedCount ? <dl className="mockup-proof-grid"><div><dt>Imported mockups</dt><dd>{String(result.importedCount)}</dd></div></dl> : null}
  </section>;
}

function ProofDetails({ mockup }: { mockup: Row | null | undefined }) {
  if (!mockup) return null;
  const metadata = metadataOf(mockup);
  return <details className="mockup-proof-details" data-testid="mockup-proof-details">
    <summary>Proof details</summary>
    <dl className="mockup-proof-grid">
      <div><dt>Mockup ID</dt><dd>{String(mockup.id)}</dd></div>
      <div><dt>Source asset ID</dt><dd>{mockupAssetId(mockup)}</dd></div>
      <div><dt>Derivative kind</dt><dd>print_png</dd></div>
      <div><dt>Printify product</dt><dd>{String(metadata.printify_product_id ?? "Not recorded")}</dd></div>
      <div><dt>Variant IDs</dt><dd>{Array.isArray(metadata.printify_variant_ids) ? metadata.printify_variant_ids.join(", ") : "Provider default"}</dd></div>
      <div><dt>Source</dt><dd>Printify</dd></div>
      <div><dt>Preview URL</dt><dd>{printifyMockupUrl(mockup) ? "Provider image URL stored" : "Not available"}</dd></div>
    </dl>
  </details>;
}

export function MockupWorkflowClient({
  initialAssets,
  initialDerivatives = [],
  initialMockups,
  initialDrafts = [],
  initialPrintifyProducts = [],
  initialAssetId
}: {
  initialAssets: Row[];
  initialDerivatives?: Row[];
  initialMockups: Row[];
  initialDrafts?: Row[];
  initialPrintifyProducts?: Row[];
  initialAssetId?: string | undefined;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [derivatives, setDerivatives] = useState(initialDerivatives);
  const [mockups, setMockups] = useState(initialMockups);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [printifyProducts, setPrintifyProducts] = useState(initialPrintifyProducts);
  const preferredAssetId =
    initialAssetId
    || initialAssets.find((asset) => assetApproved(asset))?.id
    || initialAssets[0]?.id
    || "";
  const [assetId, setAssetId] = useState(preferredAssetId);
  const [draftId, setDraftId] = useState("");
  const [selectedMockupId, setSelectedMockupId] = useState("");
  const [result, setResult] = useState<ActionResult>(null);
  const [busy, setBusy] = useState("");

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === assetId) ?? null, [assets, assetId]);
  const displayAsset = selectedAsset ?? (assetId ? {
    id: assetId,
    generator: "selected_asset",
    qa_status: "passed",
    approved_for_mockup: true,
    metadata: { selected_from_query: true }
  } : null);
  const selectedDerivatives = useMemo(() => derivatives.filter((derivative) => derivativeParentId(derivative) === assetId), [derivatives, assetId]);
  const derivativeKindSet = useMemo(() => new Set(selectedDerivatives.map((derivative) => derivativeKindOf(derivative)).filter(Boolean)), [selectedDerivatives]);
  const printPngDerivative = useMemo(() => selectedDerivatives.find((derivative) => derivativeKindOf(derivative) === "print_png") ?? null, [selectedDerivatives]);
  const hasPrintPng = derivativeKindSet.has("print_png");
  const transparentPrintPngReady = printPngTransparencyReady(printPngDerivative);
  const printFileReady = hasPrintPng && transparentPrintPngReady;
  const printFileStatusLabel = printPngStatusLabel(printPngDerivative, hasPrintPng);
  const assetDrafts = useMemo(() => drafts.filter((draft) => draftAssetId(draft) === assetId), [drafts, assetId]);
  const selectedDraft = useMemo(() => assetDrafts.find((draft) => draft.id === (draftId || assetDrafts[0]?.id)) ?? assetDrafts[0] ?? null, [assetDrafts, draftId]);
  const selectedDraftId = String(selectedDraft?.id ?? "");
  const printifyRefsForDraft = useMemo(() => printifyProducts.filter((ref) => printifyRefDraftId(ref) === selectedDraftId || printifyRefAssetId(ref) === assetId), [printifyProducts, selectedDraftId, assetId]);
  const selectedPrintifyRef = printifyRefsForDraft[0] ?? null;
  const uploadId = printifyUploadIdFromAsset(selectedAsset) || printifyUploadIdFromRef(selectedPrintifyRef);
  const printifyMockupsForAsset = useMemo(() => mockups.filter((mockup) => isPrintifyMockup(mockup) && mockupAssetId(mockup) === assetId), [mockups, assetId]);
  const printifyMockupsForDraft = useMemo(() => printifyMockupsForAsset.filter((mockup) => !selectedDraftId || mockupDraftId(mockup) === selectedDraftId), [printifyMockupsForAsset, selectedDraftId]);
  const internalMockupCount = useMemo(() => mockups.filter((mockup) => !isPrintifyMockup(mockup) && mockupAssetId(mockup) === assetId).length, [mockups, assetId]);
  const heroMockup = useMemo(() => printifyMockupsForDraft.find((mockup) => isHero(mockup)) ?? printifyMockupsForDraft.find((mockup) => isDefaultPrintifyImage(mockup)) ?? null, [printifyMockupsForDraft]);
  const selectedMockup = useMemo(() => printifyMockupsForDraft.find((mockup) => mockup.id === selectedMockupId) ?? heroMockup ?? printifyMockupsForDraft[0] ?? null, [heroMockup, printifyMockupsForDraft, selectedMockupId]);
  const qaPassed = assetQaStatus(displayAsset) === "passed";

  const stage = !displayAsset
    ? "no_asset"
    : !printFileReady
      ? "missing_print_file"
      : !selectedDraft
        ? "no_product_shell"
        : !uploadId
          ? "upload_needed"
          : !selectedPrintifyRef
            ? "product_needed"
            : !printifyMockupsForDraft.length
              ? "mockups_needed"
              : "mockups_ready";

  const primaryAction = stage === "no_asset"
    ? { label: "Open Assets", href: "/studio/assets" }
    : stage === "missing_print_file"
      ? { label: "Open Asset", href: selectedAsset ? `/studio/assets?asset_id=${encodeURIComponent(String(selectedAsset.id))}` : "/studio/assets" }
      : stage === "no_product_shell"
        ? { label: "Open Printify Catalog", href: "/studio/printify-catalog" }
        : stage === "upload_needed"
          ? { label: "Upload to Printify", action: "upload" }
          : stage === "product_needed"
            ? { label: "Create Printify Product", action: "create-product" }
            : stage === "mockups_needed"
              ? { label: "Import Mockups", action: "import-mockups" }
              : { label: "Open Product Builder", href: selectedDraft ? `/studio/product-builder?draft_id=${encodeURIComponent(String(selectedDraft.id))}` : "/studio/product-builder" };

  const draftGateReason = !displayAsset
    ? "Select approved artwork first."
    : !hasPrintPng
      ? printPngBlockedReason(printPngDerivative, hasPrintPng)
      : !transparentPrintPngReady
        ? printPngBlockedReason(printPngDerivative, hasPrintPng)
      : !selectedDraft
        ? "Choose a Printify product shell first."
        : !uploadId
          ? "Upload the print-ready file to Printify first."
          : !selectedPrintifyRef
            ? "Create the Printify product first."
            : !printifyMockupsForDraft.length
              ? "Import Printify mockups first."
              : !heroMockup
                ? "Select a hero Printify mockup first."
                : "";
  const canOpenDraft = Boolean(!draftGateReason && selectedDraft);

  async function refreshAssets() {
    const data = await fetch("/api/studio/assets/upload", { cache: "no-store" }).then((res) => res.json());
    if (!Array.isArray(data.assets)) return;
    const sourceRows = data.assets.filter((asset: Row) => !derivativeKindOf(asset));
    const derivativeRows = data.assets.filter((asset: Row) => derivativeKindOf(asset));
    setAssets(sourceRows);
    setDerivatives(derivativeRows);
  }

  async function refreshMockups() {
    const data = await fetch("/api/studio/mockups/generate", { cache: "no-store" }).then((res) => res.json());
    if (Array.isArray(data.mockups)) setMockups(data.mockups);
  }

  async function run(action: "upload" | "create-product" | "import-mockups") {
    if (!selectedDraft) return;
    setBusy(action);
    try {
      const url = action === "upload"
        ? "/api/studio/integrations/printify/uploads"
        : action === "create-product"
          ? "/api/studio/integrations/printify/products/create"
          : "/api/studio/integrations/printify/mockups/import";
      const { data } = await postJson(url, { productDraftId: selectedDraft.id });
      setResult(data);
      if (data.reference) {
        setPrintifyProducts((current) => {
          const next = current.filter((ref) => ref.id !== data.reference.id);
          return [data.reference, ...next];
        });
      }
      if (Array.isArray(data.mockups)) {
        setMockups((current) => {
          const incomingIds = new Set(data.mockups.map((mockup: Row) => mockup.id));
          return [...data.mockups, ...current.filter((mockup) => !incomingIds.has(mockup.id))];
        });
      }
      await refreshAssets();
      await refreshMockups();
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Printify action could not be completed." });
    } finally {
      setBusy("");
    }
  }

  async function setHero(mockupId = selectedMockup?.id) {
    if (!mockupId) return;
    setBusy("hero");
    try {
      const { data } = await postJson(`/api/studio/mockups/${encodeURIComponent(String(mockupId))}/hero`);
      setResult(data);
      await refreshMockups();
      setSelectedMockupId(String(mockupId));
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to set hero Printify mockup." });
    } finally {
      setBusy("");
    }
  }

  async function approve(mockupId = selectedMockup?.id) {
    if (!mockupId) return;
    setBusy("approve");
    try {
      const { data } = await postJson(`/api/studio/mockups/${encodeURIComponent(String(mockupId))}/approve`);
      setResult(data);
      await refreshMockups();
      setSelectedMockupId(String(mockupId));
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to approve Printify mockup." });
    } finally {
      setBusy("");
    }
  }

  async function createDraftFromPrintifyMockup() {
    if (!selectedAsset || !heroMockup) return;
    if (selectedDraft) {
      window.location.href = `/studio/product-builder?draft_id=${encodeURIComponent(String(selectedDraft.id))}`;
      return;
    }
    setBusy("draft");
    try {
      const { data } = await postJson("/api/studio/drafts/create-from-assets", {
        asset_id: selectedAsset.id,
        mockup_ids: [heroMockup.id],
        title: "Printify Mockup Product Draft",
        description: "Product draft created from a real Printify provider mockup. Human review required before public projection.",
        tags: ["pod", "printify"],
        product_type: "tee",
        collection: "Studio Drafts",
        price: 32,
        estimated_cogs: 12,
        estimated_shipping: 5,
        provider_target: "printify_draft"
      });
      setResult(data);
      if (data.draft) setDrafts((current) => [data.draft, ...current.filter((draft) => draft.id !== data.draft.id)]);
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to create product draft from Printify mockup." });
    } finally {
      setBusy("");
    }
  }

  if (!assets.length && !assetId) {
    return <section className="mockup-studio" data-testid="mockup-studio-root">
      <div className="pod-empty-state">
        <strong>Select approved artwork first.</strong>
        <p className="text-muted">Generate artwork, run QA, and approve the print-ready file before creating Printify mockups.</p>
        <a className="btn btn-primary" href="/studio/assets">Open Assets</a>
      </div>
    </section>;
  }

  return <section className="mockup-studio" data-testid="mockup-studio-root">
    <div className="mockup-studio-toolbar">
      <div>
        <p className="eyebrow-label">Printify Mockup Workflow</p>
        <h2>Mockup production board</h2>
        <p className="text-muted">Use real Printify products and provider images as the production mockup source of truth.</p>
      </div>
      <div className="action-bar">
        {"href" in primaryAction ? <a className="btn btn-primary" href={primaryAction.href}>{primaryAction.label}</a> : <button className="btn btn-primary" type="button" disabled={Boolean(busy)} onClick={() => run(primaryAction.action as any)}>{primaryAction.label}</button>}
        <a className="btn btn-secondary" href={displayAsset ? `/studio/assets?asset_id=${encodeURIComponent(String(displayAsset.id))}` : "/studio/assets"}>Open asset</a>
        <a className="btn btn-secondary" href="/studio/printify-catalog">Open Printify Catalog</a>
      </div>
    </div>

    <div className="mockup-studio-summary">
      <div><span>Selected asset</span><strong>{shortId(displayAsset?.id)}</strong></div>
      <div><span>Source</span><strong>{providerLabel(displayAsset)}</strong></div>
      <div><span>QA status</span><strong>{ownerLabel(assetQaStatus(displayAsset))}</strong></div>
      <div><span>Derivative status</span><strong>{printFileStatusLabel}</strong></div>
    </div>

    <div className="mockup-studio-main-grid">
      <section className="surface-card mockup-asset-panel" data-testid="selected-asset-panel">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Selected artwork</p>
            <h2>Source asset proof</h2>
          </div>
          <StatusChip tone={assetApproved(displayAsset) && qaPassed && hasPrintPng ? "success" : "warning"}>
            {assetApproved(displayAsset) && qaPassed && printFileReady ? "Ready for Printify" : "Needs artwork proof"}
          </StatusChip>
        </div>
        {displayAsset ? <PrivateImagePreview src={assetPreviewPath(displayAsset)} alt="Approved source artwork preview" aspectRatio="1 / 1" maxHeight={420} /> : null}
        {assets.length ? <label className="mockup-field">Source artwork
          <select value={assetId} onChange={(event) => {
            setAssetId(event.target.value);
            setDraftId("");
            setSelectedMockupId("");
          }}>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{shortId(asset.id)} - {providerLabel(asset)}</option>)}
          </select>
        </label> : null}
        <dl className="mockup-proof-grid">
          <div><dt>Provider</dt><dd>{providerLabel(displayAsset)}</dd></div>
          <div><dt>Model</dt><dd>{String(displayAsset?.model ?? "Not recorded")}</dd></div>
          <div><dt>QA badge</dt><dd>{ownerLabel(assetQaStatus(displayAsset))}</dd></div>
          <div><dt>Approval</dt><dd>{assetApproved(displayAsset) ? "Artwork approved" : "Needs QA"}</dd></div>
          <div><dt>Print file</dt><dd>{printFileStatusLabel}</dd></div>
          <div><dt>Printify upload</dt><dd>{uploadId ? shortId(uploadId) : "Not uploaded"}</dd></div>
        </dl>
        <div className="mockup-derivative-row" aria-label="Derivative package status">
          {derivativeKinds.map((kind) => {
            const ready = kind === "print_png" ? printFileReady : derivativeKindSet.has(kind);
            const label = kind === "print_png" && hasPrintPng && !printFileReady ? printFileStatusLabel : ready ? "ready" : "missing";
            return <StatusChip key={kind} tone={ready ? "success" : "warning"}>
              {kind === "print_png" ? "print PNG" : kind.replace("_", " ")} {label}
            </StatusChip>;
          })}
        </div>
      </section>

      <section className="surface-card mockup-hero-panel" data-testid="hero-mockup-panel">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Hero Printify mockup</p>
            <h2>{selectedMockup ? "Provider mockup selected" : "Create a Printify product to generate real mockups"}</h2>
            <p className="text-muted">{selectedMockup ? `Printify image for ${shortId(mockupAssetId(selectedMockup))}` : "Mockups shown here come from Printify after SaltyFactory uploads your approved artwork to a selected Printify product."}</p>
          </div>
          {selectedMockup ? <div className="mockup-chip-row">
            {isHero(selectedMockup) || isDefaultPrintifyImage(selectedMockup) ? <StatusChip tone="success">Hero/default</StatusChip> : <StatusChip tone="info">Selected</StatusChip>}
            <StatusChip tone={isApprovedMockup(selectedMockup) ? "success" : "warning"}>{isApprovedMockup(selectedMockup) ? "Approved" : "Needs approval"}</StatusChip>
            <StatusChip tone="info">Printify Mockup</StatusChip>
          </div> : null}
        </div>
        {selectedMockup ? <img className="mockup-provider-preview" src={printifyMockupUrl(selectedMockup)} alt="Printify mockup preview" /> : <div className="mockup-empty-preview">
          <strong>Create a Printify product to generate real mockups</strong>
          <p className="text-muted">Choose a product, provider, and variants first, then upload the print-ready file and import Printify mockups.</p>
          <div className="action-bar">
            <a className="btn btn-primary" href="/studio/printify-catalog">Open Printify Catalog</a>
            <a className="btn btn-secondary" href="/studio/product-builder">Open Product Builder</a>
          </div>
        </div>}
        {selectedPrintifyRef ? <dl className="mockup-proof-grid">
          <div><dt>Printify product</dt><dd>{shortId(printifyProductId(selectedPrintifyRef))}</dd></div>
          <div><dt>Blueprint</dt><dd>{shortId(selectedPrintifyRef.printify_blueprint_id ?? selectedPrintifyRef.printifyBlueprintId)}</dd></div>
          <div><dt>Provider</dt><dd>{shortId(selectedPrintifyRef.printify_print_provider_id ?? selectedPrintifyRef.printifyPrintProviderId)}</dd></div>
          <div><dt>Variants</dt><dd>{providerVariantIds(selectedPrintifyRef).length ? `${providerVariantIds(selectedPrintifyRef).length} selected` : "Not selected"}</dd></div>
        </dl> : null}
        <div className="mockup-action-panel">
          <div>
            <strong>Create Product Draft from Printify Mockup</strong>
            <p className="text-muted" data-testid="draft-gate-reason">{draftGateReason || "Ready. The selected product draft has real Printify mockup evidence."}</p>
          </div>
          <button className="btn btn-primary" data-testid="create-product-draft-button" type="button" disabled={!canOpenDraft || Boolean(busy)} title={draftGateReason || "Open product draft."} onClick={createDraftFromPrintifyMockup}>
            {selectedDraft ? "Open Product Draft" : "Create Product Draft from Printify Mockup"}
          </button>
        </div>
        {selectedMockup ? <div className="action-bar">
          <button className="btn btn-primary" type="button" disabled={busy === "hero" || isHero(selectedMockup)} onClick={() => setHero(selectedMockup.id)}>{isHero(selectedMockup) ? "Hero selected" : "Set hero"}</button>
          <button className="btn btn-secondary" type="button" disabled={busy === "approve" || isApprovedMockup(selectedMockup)} onClick={() => approve(selectedMockup.id)}>Approve</button>
          <button className="btn btn-secondary" type="button" disabled={!selectedDraft || busy === "import-mockups"} onClick={() => run("import-mockups")}>Import again</button>
        </div> : null}
        <ProofDetails mockup={selectedMockup} />
      </section>
    </div>

    <section className="surface-card">
      <div className="mockup-panel-heading">
        <div>
          <p className="eyebrow-label">Printify gallery</p>
          <h2>Provider-generated mockup images</h2>
          <p className="text-muted">Only Printify product images appear in the production gallery.</p>
        </div>
        <StatusChip tone={printifyMockupsForDraft.length ? "success" : "warning"}>{printifyMockupsForDraft.length ? `${printifyMockupsForDraft.length} imported` : ownerLabel(stage)}</StatusChip>
      </div>
      {printifyMockupsForDraft.length ? <div className="mockup-gallery-grid" data-testid="mockup-gallery">
        {printifyMockupsForDraft.map((mockup) => {
          const metadata = metadataOf(mockup);
          const selected = selectedMockup?.id === mockup.id;
          return <article key={mockup.id} className={`mockup-card ${selected ? "is-selected" : ""}`} data-testid="mockup-card">
            <img className="mockup-provider-card-image" src={printifyMockupUrl(mockup)} alt="Printify mockup preview" />
            <div className="mockup-card-copy">
              <div className="mockup-card-title-row">
                <strong>{String(metadata.printify_position ?? metadata.position ?? "Printify product mockup")}</strong>
                {isHero(mockup) || isDefaultPrintifyImage(mockup) ? <StatusChip tone="success">Hero/default</StatusChip> : null}
              </div>
              <p className="text-muted">Real provider image from Printify product {shortId(metadata.printify_product_id)}</p>
              <div className="mockup-chip-row">
                <StatusChip tone="info">Printify Mockup</StatusChip>
                <StatusChip tone={isApprovedMockup(mockup) ? "success" : "warning"}>{isApprovedMockup(mockup) ? "Approved" : "Needs approval"}</StatusChip>
              </div>
              <small className="mockup-proof-line">Proof {shortId(mockup.id)}</small>
            </div>
            <div className="mockup-card-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setSelectedMockupId(mockup.id)}>Preview</button>
              <button className="btn btn-secondary" type="button" disabled={busy === "hero" || isHero(mockup)} onClick={() => setHero(mockup.id)}>Set hero</button>
              <button className="btn btn-secondary" type="button" disabled={busy === "approve" || isApprovedMockup(mockup)} onClick={() => approve(mockup.id)}>Approve</button>
            </div>
          </article>;
        })}
      </div> : <div className="pod-empty-state">
        <strong>{stage === "mockups_needed" ? "Import Printify mockups" : "Create a Printify product to generate real mockups"}</strong>
        <p className="text-muted">{stage === "mockups_needed" ? "Printify product exists, but provider mockup images have not been imported yet." : "Mockups shown here come from Printify after SaltyFactory uploads your approved artwork to a selected Printify product."}</p>
        <div className="action-bar">
          {stage === "mockups_needed" ? <button className="btn btn-primary" type="button" disabled={Boolean(busy)} onClick={() => run("import-mockups")}>Import Printify mockups</button> : <a className="btn btn-primary" href="/studio/printify-catalog">Open Printify Catalog</a>}
          <a className="btn btn-secondary" href="/studio/product-builder">Open Product Builder</a>
        </div>
      </div>}
    </section>

    <section className="mockup-studio-secondary-grid">
      <article className="surface-card" data-testid="printify-product-shell">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Product shell</p>
            <h2>Printify product setup</h2>
            <p className="text-muted">Select a real blueprint, print provider, and variants before provider mockups can exist.</p>
          </div>
        </div>
        {assetDrafts.length ? <label className="mockup-field">Product draft
          <select value={selectedDraftId} onChange={(event) => setDraftId(event.target.value)}>
            {assetDrafts.map((draft) => <option key={draft.id} value={draft.id}>{draftTitle(draft)}</option>)}
          </select>
        </label> : <div className="pod-empty-state">
          <strong>Choose a real Printify product to generate mockups.</strong>
          <p className="text-muted">Catalog browsing and variant selection create the product shell required for Printify mockups.</p>
          <a className="btn btn-primary" href="/studio/printify-catalog">Open Printify Catalog</a>
        </div>}
        <dl className="mockup-proof-grid">
          <div><dt>Draft</dt><dd>{selectedDraft ? shortId(selectedDraft.id) : "Not selected"}</dd></div>
          <div><dt>Upload</dt><dd>{uploadId ? shortId(uploadId) : "Upload needed"}</dd></div>
          <div><dt>Product</dt><dd>{selectedPrintifyRef ? shortId(printifyProductId(selectedPrintifyRef)) : "Create product needed"}</dd></div>
          <div><dt>Mockups</dt><dd>{printifyMockupsForDraft.length ? `${printifyMockupsForDraft.length} imported` : "Import needed"}</dd></div>
        </dl>
        <div className="action-bar">
          <button className="btn btn-secondary" type="button" disabled={!selectedDraft || !printFileReady || Boolean(busy)} onClick={() => run("upload")}>Upload print-ready file</button>
          <button className="btn btn-secondary" type="button" disabled={!selectedDraft || !uploadId || Boolean(busy)} onClick={() => run("create-product")}>Create Printify Product</button>
          <button className="btn btn-secondary" type="button" disabled={!selectedPrintifyRef || Boolean(busy)} onClick={() => run("import-mockups")}>Import Mockups</button>
        </div>
      </article>

      <article className="surface-card">
        <div className="mockup-panel-heading">
          <div>
            <p className="eyebrow-label">Local proof hidden</p>
            <h2>Local proof rows are not production mockups</h2>
            <p className="text-muted">Local proof renders are hidden from the owner workflow. Production mockups must come from Printify product images.</p>
          </div>
          <StatusChip tone="neutral">{internalMockupCount} hidden</StatusChip>
        </div>
      </article>
    </section>

    <ResultPanel result={result} />
  </section>;
}
