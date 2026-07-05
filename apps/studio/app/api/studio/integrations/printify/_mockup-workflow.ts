import { eq } from "drizzle-orm";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories, getDb, mockupTemplates, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { defaultQaRules, resolvePrintQualityRequirements } from "@saltyfactory/image-pipeline";
import { sanitizeProviderError } from "@saltyfactory/security";
import { findAssetDerivative, metadataOf } from "../../_image-production";
import {
  defaultPrintAreas,
  extractProviderProductId,
  getApprovedGeneratedArtwork,
  getDraftVariants,
  metadataOf as providerMetadataOf,
  printifyVariantPayload,
  privateMediaSourceFor,
  writeProviderEvent
} from "../../publish/_provider-workflow";
import { resolvePrintifyRuntime } from "./_runtime";

export const printifyProviderTemplateId = "tmpl_printify_provider_mockup";
const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function now() {
  return new Date().toISOString();
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "printify";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function isPrintifyMockupRow(row: WorkspaceRow | null | undefined) {
  const metadata = metadataOf(row);
  return metadata.provider_source === "printify"
    || metadata.providerSource === "printify"
    || metadata.source === "printify"
    || Boolean(metadata.provider_mockup_url ?? metadata.providerMockupUrl);
}

export function isHeroOrDefaultPrintifyMockup(row: WorkspaceRow | null | undefined) {
  const metadata = metadataOf(row);
  return isPrintifyMockupRow(row)
    && (metadata.is_hero === true || metadata.isHero === true || metadata.printify_is_default === true || metadata.printifyIsDefault === true);
}

export function evaluatePrintifyMockupProductionProof(input: { mockup: WorkspaceRow | null | undefined; assetId: string }) {
  const mockup = input.mockup;
  if (!mockup) {
    return {
      ok: false as const,
      status: "mockup_not_found",
      message: "Product drafts can only use real Printify mockup images.",
      blockingReasons: ["mockup_not_approved"]
    };
  }
  const mockupAssetId = text(mockup.asset_id ?? mockup.assetId ?? (mockup as any).source_asset_id ?? (mockup as any).sourceAssetId);
  if (mockupAssetId !== input.assetId) {
    return {
      ok: false as const,
      status: "mockup_asset_mismatch",
      message: "Product draft mockups must belong to the selected approved asset.",
      blockingReasons: ["mockup_asset_mismatch"]
    };
  }
  if (!isPrintifyMockupRow(mockup)) {
    return {
      ok: false as const,
      status: "printify_mockup_required",
      message: "Product drafts now require a real Printify mockup image, not an internal preview.",
      blockingReasons: ["printify_mockup_required"]
    };
  }
  if (mockup.approved_for_product !== true && mockup.approvedForProduct !== true && !isHeroOrDefaultPrintifyMockup(mockup)) {
    return {
      ok: false as const,
      status: "printify_hero_mockup_required",
      message: "Select a hero Printify mockup before creating a product draft.",
      blockingReasons: ["printify_hero_mockup_required"]
    };
  }
  return { ok: true as const, status: "printify_mockup_proof_accepted", mockup };
}

function numberFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = Number(metadata[key]);
  return Number.isFinite(value) ? value : undefined;
}

export function evaluatePrintReadyPngForPrintify(input: { derivative: WorkspaceRow | null | undefined; productType?: string; printTarget?: string }) {
  const derivative = input.derivative;
  if (!derivative) {
    return {
      ok: false as const,
      status: "print_png_missing",
      message: "Upload requires the print-ready PNG derivative.",
      blockingReasons: ["print_png_missing"]
    };
  }
  const metadata = metadataOf(derivative);
  const printTarget = text(input.printTarget ?? metadata.print_target ?? metadata.printTarget, "apparel_front_square");
  const requirements = resolvePrintQualityRequirements({ productType: input.productType, printTarget });
  if (!requirements.rules.requireTransparent) return { ok: true as const, derivative };

  const transparentPixelRatio = numberFromMetadata(metadata, "transparent_pixel_ratio") ?? 0;
  const hasAlpha = derivative.transparent_background === true
    || derivative.transparentBackground === true
    || metadata.has_alpha === true
    || metadata.hasAlpha === true;
  const transparentReady = metadata.transparent_background_ready === true
    || metadata.transparentBackgroundReady === true
    || (hasAlpha && transparentPixelRatio >= (requirements.rules.minTransparentPixelRatio ?? defaultQaRules.minTransparentPixelRatio));

  if (!transparentReady) {
    return {
      ok: false as const,
      status: "transparent_background_missing",
      message: "This apparel print file has an opaque background. Run background removal and regenerate a transparent print PNG before uploading to Printify.",
      blockingReasons: ["transparent_background_missing"],
      evidence: {
        printTarget,
        hasAlpha,
        transparentPixelRatio,
        minTransparentPixelRatio: requirements.rules.minTransparentPixelRatio,
        backgroundRemovalRequired: true
      }
    };
  }
  return { ok: true as const, derivative };
}

export function providerMockupUrl(row: WorkspaceRow | null | undefined) {
  const metadata = metadataOf(row);
  return text(metadata.provider_mockup_url ?? metadata.providerMockupUrl ?? metadata.public_url ?? metadata.publicUrl ?? row?.file_path ?? row?.filePath);
}

async function ensurePrintifyProviderTemplate(actorId: string, adapter: RepositoryBundle["adapter"]) {
  const row = {
    id: printifyProviderTemplateId,
    workspaceId,
    name: "Printify provider mockup",
    productType: "printify_provider_mockup",
    canvas: { provider: "printify" },
    baseImagePath: "printify-provider-image",
    colorVariants: ["provider"],
    active: true,
    status: "active",
    notes: "Provider-generated Printify mockup image. Owner workflow source of truth.",
    metadata: { quality_label: "provider_generated", provider_source: "printify" },
    createdBy: actorId,
    updatedBy: actorId
  };
  if (adapter === "memory") return row;
  const db = getDb();
  const existing = await db.select().from(mockupTemplates).where(eq(mockupTemplates.id, printifyProviderTemplateId)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(mockupTemplates).values(row as any).returning();
  if (!created) throw new Error("printify_provider_template_create_failed");
  return created;
}

function imageUrlFrom(value: unknown) {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  return text(record.src ?? record.url ?? record.preview_url ?? record.previewUrl);
}

export function extractPrintifyMockupImages(product: unknown) {
  const record = product && typeof product === "object" && !Array.isArray(product) ? product as Record<string, unknown> : {};
  const images = asArray(record.images);
  const parsed = images.map((image, index) => {
    const imageRecord = image && typeof image === "object" && !Array.isArray(image) ? image as Record<string, unknown> : {};
    const src = imageUrlFrom(image);
    return {
      src,
      variantIds: asArray(imageRecord.variant_ids ?? imageRecord.variantIds).map(String),
      position: text(imageRecord.position, index === 0 ? "front" : `image_${index + 1}`),
      isDefault: Boolean(imageRecord.is_default ?? imageRecord.isDefault ?? index === 0),
      width: Number(imageRecord.width ?? 0),
      height: Number(imageRecord.height ?? 0)
    };
  }).filter((image) => /^https?:\/\//i.test(image.src));

  if (parsed.length) return parsed;

  const urls = new Set<string>();
  function walk(value: unknown, path: string[] = []) {
    if (typeof value === "string" && /^https?:\/\//i.test(value) && path.some((part) => /image|mockup|src|url|preview/i.test(part))) {
      urls.add(value);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)]));
      return;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => walk(nested, [...path, key]));
  }
  walk(product);
  return [...urls].map((src, index) => ({ src, variantIds: [], position: index === 0 ? "front" : `image_${index + 1}`, isDefault: index === 0, width: 0, height: 0 }));
}

export async function getPrintReadyDerivativeOrBlock(repos: RepositoryBundle, sourceAssetId: string) {
  const derivative = await findAssetDerivative(repos, workspaceId, sourceAssetId, "print_png");
  return evaluatePrintReadyPngForPrintify({ derivative });
}

export async function uploadPrintReadyAssetToPrintify(input: {
  repos: RepositoryBundle;
  draft: WorkspaceRow;
  actorId: string;
}) {
  const config = parseEnv();
  const runtime = await resolvePrintifyRuntime(input.repos);
  if (runtime.resolution.status !== "ready") {
    return {
      ok: false as const,
      status: "printify_not_connected",
      message: runtime.resolution.safeMessage,
      setupRequired: runtime.resolution.setupRequired,
      blockingReasons: runtime.resolution.blockingReasons
    };
  }
  const artwork = await getApprovedGeneratedArtwork({ repos: input.repos, workspaceId, draft: input.draft });
  if (!artwork.ok) return artwork;
  const derivative = await getPrintReadyDerivativeOrBlock(input.repos, artwork.asset.id);
  if (!derivative.ok) return derivative;
  const source = await privateMediaSourceFor(derivative.derivative, workspaceId, config);
  if ("ok" in source) return source;

  const upload = await runtime.printify.uploadImage({
    fileName: source.fileName || `${artwork.asset.id}-print.png`,
    contents: source.contents,
    url: source.url
  });
  if (!upload.ok) {
    return {
      ok: false as const,
      status: upload.rateLimited ? "rate_limited" : "upload_failed",
      message: sanitizeProviderError(upload.error),
      retryable: upload.retryable === true || upload.rateLimited === true,
      rateLimited: upload.rateLimited === true,
      setupRequired: upload.setupRequired,
      blockingReasons: [upload.rateLimited ? "rate_limited" : "printify_upload_failed"]
    };
  }
  const uploadId = text((upload.data as any).id ?? (upload.data as any).upload_id);
  if (!uploadId) {
    return {
      ok: false as const,
      status: "upload_failed",
      message: "Printify upload response did not include an image ID.",
      blockingReasons: ["printify_upload_id_missing"]
    };
  }
  const metadata = metadataOf(artwork.asset);
  const updated = await input.repos.asset.update(artwork.asset.id, {
    metadata: {
      ...metadata,
      printify_upload_id: uploadId,
      printify_uploaded_at: now(),
      printify_upload_derivative_kind: "print_png",
      printify_upload_derivative_id: derivative.derivative.id
    },
    updated_by: input.actorId
  });
  await input.repos.shared.events.create({
    id: `event_printify_upload_${Date.now()}`,
    workspace_id: workspaceId,
    entity_type: "design_asset",
    entity_id: artwork.asset.id,
    event_type: "printify_image_uploaded",
    event_label: "Print-ready artwork uploaded to Printify",
    source_label: "provider_api",
    created_by: input.actorId,
    updated_by: input.actorId,
    payload: {
      status: "completed",
      message: "Printify returned a real upload ID for the print-ready PNG derivative.",
      productDraftId: input.draft.id,
      printifyUploadId: uploadId,
      derivativeKind: "print_png"
    }
  });
  return { ok: true as const, uploadId, asset: updated, derivative: derivative.derivative };
}

export async function persistPrintifyMockupImages(input: {
  repos: RepositoryBundle;
  actorId: string;
  productDraftId: string;
  assetId: string;
  printifyProductId: string;
  images: Array<{ src: string; variantIds: string[]; position: string; isDefault: boolean; width?: number; height?: number }>;
}) {
  await ensurePrintifyProviderTemplate(input.actorId, input.repos.adapter);
  const existing = (await input.repos.mockup.listByWorkspace(workspaceId)).filter((mockup) => {
    const metadata = metadataOf(mockup);
    return String(mockup.product_draft_id ?? mockup.productDraftId ?? "") === input.productDraftId
      && String(metadata.printify_product_id ?? metadata.printifyProductId ?? "") === input.printifyProductId
      && isPrintifyMockupRow(mockup);
  });
  const createdOrUpdated: WorkspaceRow[] = [];
  for (const [index, image] of input.images.entries()) {
    const match = existing.find((mockup) => providerMockupUrl(mockup) === image.src);
    const metadata = {
      provider_source: "printify",
      source: "printify",
      provider_mockup_url: image.src,
      public_url: image.src,
      printify_product_id: input.printifyProductId,
      printify_variant_ids: image.variantIds,
      printify_position: image.position,
      printify_is_default: image.isDefault,
      derivative_kind: "print_png",
      template_quality_label: "provider_generated",
      is_hero: match ? metadataOf(match).is_hero === true : image.isDefault && !existing.some((mockup) => metadataOf(mockup).is_hero === true)
    };
    const base = {
      workspace_id: workspaceId,
      asset_id: input.assetId,
      template_id: printifyProviderTemplateId,
      product_draft_id: input.productDraftId,
      color_variant: image.position || "provider",
      storage_bucket: "printify-provider-url",
      file_path: image.src,
      width: Number(image.width ?? 0),
      height: Number(image.height ?? 0),
      status: "printify_mockup_imported",
      approved_for_product: Boolean(match?.approved_for_product ?? match?.approvedForProduct ?? false),
      notes: "Printify provider-generated product mockup image.",
      metadata,
      updated_by: input.actorId
    };
    const row = match
      ? await input.repos.mockup.update(match.id, base)
      : await input.repos.mockup.create({
        id: `mockup_printify_${safeSegment(input.printifyProductId)}_${Date.now()}_${index}`,
        ...base,
        created_by: input.actorId
      } as WorkspaceRow);
    createdOrUpdated.push(row);
  }
  return createdOrUpdated;
}

export async function importPrintifyMockupsForReference(input: {
  repos: RepositoryBundle;
  actorId: string;
  productDraftId: string;
  reference?: WorkspaceRow | null;
}) {
  const refs = input.reference
    ? [input.reference]
    : (await input.repos.printify.listByWorkspace(workspaceId)).filter((ref) => String(ref.product_draft_id ?? ref.productDraftId ?? "") === input.productDraftId);
  const ref = refs.sort((a, b) => String(b.synced_at ?? b.syncedAt ?? b.created_at ?? "").localeCompare(String(a.synced_at ?? a.syncedAt ?? a.created_at ?? "")))[0];
  if (!ref) {
    return { ok: false as const, status: "printify_product_missing", message: "Create the Printify product before importing mockups.", blockingReasons: ["printify_product_missing"] };
  }
  const productId = text(ref.printify_product_id ?? ref.printifyProductId);
  const runtime = await resolvePrintifyRuntime(input.repos);
  if (runtime.resolution.status !== "ready") {
    return {
      ok: false as const,
      status: "printify_not_connected",
      message: runtime.resolution.safeMessage,
      setupRequired: runtime.resolution.setupRequired,
      blockingReasons: runtime.resolution.blockingReasons
    };
  }
  const product = await runtime.printify.getProduct(productId);
  if (!product.ok) {
    return {
      ok: false as const,
      status: product.rateLimited ? "rate_limited" : "product_fetch_failed",
      message: sanitizeProviderError(product.error),
      retryable: product.retryable === true || product.rateLimited === true,
      rateLimited: product.rateLimited === true,
      blockingReasons: [product.rateLimited ? "rate_limited" : "printify_product_fetch_failed"]
    };
  }
  const images = extractPrintifyMockupImages(product.data);
  if (!images.length) {
    const updated = await input.repos.printify.update(ref.id, {
      sync_status: "draft_created_mockups_pending",
      metadata: { ...providerMetadataOf(ref), mockupSyncStatus: "mockups_not_ready" },
      synced_at: now(),
      updated_by: input.actorId
    });
    return {
      ok: false as const,
      status: "mockups_not_ready",
      message: "Printify has not returned mockup images yet. Try importing again in a minute.",
      retryable: true,
      reference: updated,
      blockingReasons: ["mockups_not_ready"]
    };
  }
  const draft = await input.repos.draft.getById(input.productDraftId, workspaceId);
  const assetId = text(ref.asset_id ?? ref.assetId ?? draft?.asset_id ?? draft?.assetId);
  const rows = await persistPrintifyMockupImages({
    repos: input.repos,
    actorId: input.actorId,
    productDraftId: input.productDraftId,
    assetId,
    printifyProductId: productId,
    images
  });
  const updated = await input.repos.printify.update(ref.id, {
    mockup_urls: images.map((image) => image.src),
    sync_status: "draft_created_mockups_synced",
    metadata: { ...providerMetadataOf(ref), mockupSyncStatus: "mockups_synced", mockupCount: images.length },
    synced_at: now(),
    updated_by: input.actorId
  });
  return { ok: true as const, status: "printify_mockups_imported", reference: updated, images, mockups: rows };
}

export async function createPrintifyProductForMockups(input: {
  repos?: RepositoryBundle;
  productDraftId: string;
  actorId: string;
  placement?: Record<string, unknown>;
  forceUpload?: boolean;
  productOverride?: {
    title?: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
}) {
  const repos = input.repos ?? createRepositories();
  const draft = await repos.draft.getById(input.productDraftId, workspaceId);
  if (!draft) {
    return { ok: false as const, status: "product_draft_missing", message: "Choose a product draft before creating a Printify product.", blockingReasons: ["product_draft_missing"] };
  }
  const runtime = await resolvePrintifyRuntime(repos);
  if (runtime.resolution.status !== "ready") {
    return {
      ok: false as const,
      status: "printify_not_connected",
      message: runtime.resolution.safeMessage,
      setupRequired: runtime.resolution.setupRequired,
      blockingReasons: runtime.resolution.blockingReasons
    };
  }
  const artwork = await getApprovedGeneratedArtwork({ repos, workspaceId, draft });
  if (!artwork.ok) return artwork;
  const variantsResult = await getDraftVariants({ repos, workspaceId, draftId: input.productDraftId });
  if (!variantsResult.ok) return { ...variantsResult, status: "variants_missing" as const, message: "Select real Printify variants before product creation." };
  const variants = printifyVariantPayload(variantsResult.variants);
  if (!variants.length) {
    return { ok: false as const, status: "variants_missing", message: "Select at least one priced Printify variant.", blockingReasons: ["variants_missing"] };
  }
  const draftMetadata = providerMetadataOf(draft);
  const blueprintId = text(draftMetadata.printify_blueprint_id ?? draftMetadata.printifyBlueprintId ?? variantsResult.variants[0]?.printify_blueprint_id ?? variantsResult.variants[0]?.printifyBlueprintId);
  const printProviderId = text(draftMetadata.printify_print_provider_id ?? draftMetadata.printifyPrintProviderId ?? variantsResult.variants[0]?.printify_print_provider_id ?? variantsResult.variants[0]?.printifyPrintProviderId);
  if (!blueprintId) return { ok: false as const, status: "blueprint_missing", message: "Choose a Printify product shell first.", blockingReasons: ["blueprint_missing"] };
  if (!printProviderId) return { ok: false as const, status: "print_provider_missing", message: "Choose a Printify print provider first.", blockingReasons: ["print_provider_missing"] };

  const assetMetadata = metadataOf(artwork.asset);
  let uploadId = text(assetMetadata.printify_upload_id ?? assetMetadata.printifyUploadId);
  if (!uploadId || input.forceUpload === true) {
    const upload = await uploadPrintReadyAssetToPrintify({ repos, draft, actorId: input.actorId });
    if (!upload.ok) return upload;
    uploadId = upload.uploadId;
  }
  const variantIds = variants.map((variant) => String(variant.id));
  const printAreas = defaultPrintAreas(input.placement ? { uploadId, variantIds, placement: input.placement } : { uploadId, variantIds });
  const productTags = input.productOverride?.tags?.length
    ? input.productOverride.tags
    : Array.isArray(draft.tags)
      ? draft.tags.map(String).filter(Boolean)
      : [];
  const result = await runtime.printify.createProduct({
    title: text(input.productOverride?.title, text(draft.title, "SaltyFactory Printify Draft")),
    description: text(input.productOverride?.description, text(draft.description, "Owner-reviewed Printify product draft.")),
    blueprintId,
    printProviderId,
    variants,
    printAreas,
    tags: productTags
  });
  if (!result.ok) {
    return {
      ok: false as const,
      status: result.rateLimited ? "rate_limited" : "product_create_failed",
      message: sanitizeProviderError(result.error),
      retryable: result.retryable === true || result.rateLimited === true,
      rateLimited: result.rateLimited === true,
      blockingReasons: [result.rateLimited ? "rate_limited" : "product_create_failed"]
    };
  }
  const printifyProductId = extractProviderProductId(result.data);
  if (!printifyProductId) {
    return { ok: false as const, status: "product_create_failed", message: "Printify product creation did not return a product ID.", blockingReasons: ["printify_product_id_missing"] };
  }
  const sourceRecord = await repos.shared.sourceRecords.create({
    id: `src_printify_mockup_${Date.now()}`,
    workspace_id: workspaceId,
    origin: "provider_api",
    source_name: "printify",
    source_label: "Printify mockup product creation",
    provider: "printify",
    provider_key: "printify",
    entity_type: "product_draft",
    entity_id: input.productDraftId,
    status: "completed",
    raw_payload_ref: null,
    raw_payload: { blueprintId, printProviderId, variantIds, uploadId, mockupWorkflow: true, ...(input.productOverride?.metadata ?? {}) },
    metadata: { blueprintId, printProviderId, variantIds, uploadId, mockupWorkflow: true, ...(input.productOverride?.metadata ?? {}) },
    created_by: input.actorId,
    updated_by: input.actorId
  });
  const existing = (await repos.printify.listByWorkspace(workspaceId)).find((ref) =>
    String(ref.product_draft_id ?? ref.productDraftId ?? "") === input.productDraftId
    && String(ref.printify_product_id ?? ref.printifyProductId ?? "") === printifyProductId
  );
  const refInput = {
    workspace_id: workspaceId,
    product_draft_id: input.productDraftId,
    printify_product_id: printifyProductId,
    printify_shop_id: runtime.resolution.shopId ?? "",
    printify_blueprint_id: blueprintId,
    printify_print_provider_id: printProviderId,
    printify_upload_id: uploadId,
    printify_variant_ids: variantIds,
    print_areas: printAreas,
    printify_status: "draft",
    printify_published: false,
    sync_status: "draft_created_mockups_pending",
    source_record_id: sourceRecord.id,
    metadata: { provider_response_id: printifyProductId, uploadId, variantIds, printAreas, asset_id: artwork.asset.id, mockupWorkflow: true, ...(input.productOverride?.metadata ?? {}) },
    synced_at: now(),
    updated_by: input.actorId
  };
  const reference = existing
    ? await repos.printify.update(existing.id, refInput)
    : await repos.printify.create({ id: `ptyref_mockup_${Date.now()}`, ...refInput, created_by: input.actorId } as WorkspaceRow);

  const createdImages = extractPrintifyMockupImages(result.data);
  let imported: Awaited<ReturnType<typeof importPrintifyMockupsForReference>> | null = null;
  if (createdImages.length) {
    const rows = await persistPrintifyMockupImages({
      repos,
      actorId: input.actorId,
      productDraftId: input.productDraftId,
      assetId: artwork.asset.id,
      printifyProductId,
      images: createdImages
    });
    const updatedReference = await repos.printify.update(reference.id, {
      mockup_urls: createdImages.map((image) => image.src),
      sync_status: "draft_created_mockups_synced",
      synced_at: now(),
      updated_by: input.actorId
    });
    imported = { ok: true, status: "printify_mockups_imported", reference: updatedReference, images: createdImages, mockups: rows };
  } else {
    const fetched = await importPrintifyMockupsForReference({
      repos,
      actorId: input.actorId,
      productDraftId: input.productDraftId,
      reference
    });
    if (fetched.ok) imported = fetched;
  }
  await repos.draft.update(input.productDraftId, { printify_status: imported?.ok ? "draft_created_mockups_synced" : "draft_created_mockups_pending", updated_by: input.actorId });
  await writeProviderEvent({
    repos,
    workspaceId,
    actorId: input.actorId,
    provider: "printify",
    entityId: reference.id,
    action: "mockup_product_created",
    status: imported?.ok ? "draft_created_mockups_synced" : "draft_created_mockups_pending",
    details: { productDraftId: input.productDraftId, uploadId, variantIds, mockupCount: imported?.ok ? imported.mockups.length : 0 }
  });
  return { ok: true as const, status: imported?.ok ? "printify_product_created_with_mockups" : "printify_product_created", reference, uploadId, variantIds, printAreas, imported };
}
