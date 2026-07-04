import { NextResponse } from "next/server";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { requireProviderMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, getDb, mockupTemplates } from "@saltyfactory/db";
import { parseEnv } from "@saltyfactory/config";
import { createStorageProvider, resolveStorageRuntimeConfig } from "@saltyfactory/storage";
import { generateMockup } from "@saltyfactory/image-pipeline";
import { studioAuthErrorResponse, notFoundApiResponse } from "../../_auth";
import { findAssetDerivative, metadataOf, type GeneratedDerivativeKind } from "../../_image-production";

export const runtime = "nodejs";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const printDerivativeKind: GeneratedDerivativeKind = "print_png";

const internalTemplatePack = [
  {
    id: "tmpl_internal_apparel_light_tee",
    name: "Apparel Front - Light Tee",
    productType: "tee_front",
    canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900, safePadding: 0.08 } },
    colorVariant: "light",
    recommendedPrintTarget: "apparel_front_square"
  },
  {
    id: "tmpl_internal_apparel_dark_tee",
    name: "Apparel Front - Dark Tee",
    productType: "tee_front",
    canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900, safePadding: 0.08 } },
    colorVariant: "dark",
    recommendedPrintTarget: "apparel_front_square"
  },
  {
    id: "tmpl_internal_apparel_sand_tee",
    name: "Apparel Front - Sand Tee",
    productType: "tee_front",
    canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900, safePadding: 0.08 } },
    colorVariant: "sand",
    recommendedPrintTarget: "apparel_front_square"
  },
  {
    id: "tmpl_internal_tote_natural_canvas",
    name: "Tote Front - Natural Canvas",
    productType: "tote",
    canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 610, width: 900, height: 820, safePadding: 0.1 } },
    colorVariant: "natural",
    recommendedPrintTarget: "tote_front"
  },
  {
    id: "tmpl_internal_sticker_sheet_cream",
    name: "Sticker Sheet - Cream Background",
    productType: "sticker",
    canvas: { width: 1800, height: 1800, art_zone: { x: 390, y: 360, width: 1020, height: 1020, safePadding: 0.08 } },
    colorVariant: "cream",
    recommendedPrintTarget: "sticker_square"
  },
  {
    id: "tmpl_internal_mug_white_front",
    name: "Mug Front - White Mug",
    productType: "mug",
    canvas: { width: 1800, height: 1400, art_zone: { x: 520, y: 430, width: 760, height: 520, safePadding: 0.08 } },
    colorVariant: "white",
    recommendedPrintTarget: "mug_wrap"
  },
  {
    id: "tmpl_internal_square_product_card",
    name: "Square Product Card - Boutique Flatlay",
    productType: "product_card",
    canvas: { width: 1800, height: 1800, art_zone: { x: 420, y: 360, width: 960, height: 960, safePadding: 0.06 } },
    colorVariant: "cream",
    recommendedPrintTarget: "generic_square"
  }
];

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "mockup";
}

function publicTemplate(template: (typeof internalTemplatePack)[number]) {
  return {
    id: template.id,
    name: template.name,
    productType: template.productType,
    colorVariant: template.colorVariant,
    recommendedPrintTarget: template.recommendedPrintTarget,
    qualityLabel: "internal_preview",
    artZone: template.canvas.art_zone
  };
}

function templateByRequest(input: { templateId?: string; productType?: string }) {
  const requested = input.templateId ? internalTemplatePack.find((template) => template.id === input.templateId) : null;
  if (requested) return requested;
  const productType = input.productType ? safeSegment(input.productType) : "";
  return internalTemplatePack.find((template) => template.productType === productType) ?? internalTemplatePack[0]!;
}

function recommendedTemplatesForAsset(asset: Record<string, any>) {
  const metadata = metadataOf(asset);
  const printTarget = String(metadata.print_target ?? metadata.printTarget ?? "");
  const matching = internalTemplatePack.filter((template) => template.recommendedPrintTarget === printTarget);
  return matching.length ? matching : internalTemplatePack.slice(0, 3);
}

async function ensureInternalTemplate(templateId: string, actorId: string, adapter: "memory" | "drizzle") {
  const selected = templateByRequest({ templateId });
  const id = selected.id;
  if (adapter === "memory") {
    return {
      id,
      workspaceId,
      name: selected.name,
      productType: selected.productType,
      canvas: selected.canvas,
      baseImagePath: "internal-preview-template",
      colorVariants: [selected.colorVariant],
      active: true,
      status: "active",
      notes: "Internal Studio preview template. This is not a Printify provider-generated mockup.",
      metadata: { quality_label: "internal_preview", recommended_print_target: selected.recommendedPrintTarget },
      createdBy: actorId,
      updatedBy: actorId
    };
  }
  const db = getDb();
  const existing = await db.select().from(mockupTemplates).where(eq(mockupTemplates.id, id)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(mockupTemplates).values({
    id,
    workspaceId,
    name: selected.name,
    productType: selected.productType,
    canvas: selected.canvas,
    baseImagePath: "internal-preview-template",
    colorVariants: [selected.colorVariant],
    active: true,
    status: "active",
    notes: "Internal Studio preview template. This is not a Printify provider-generated mockup.",
    createdBy: actorId,
    updatedBy: actorId
  } as any).returning();
  if (!created) throw new Error("mockup_template_create_failed");
  return created;
}

function localPrivatePathFor(storageKey: string, kind: "assets" | "mockups") {
  return path.resolve(process.cwd(), ".saltyfactory-private", kind, safeSegment(workspaceId), path.basename(storageKey));
}

function isProduction() {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

function configForStoredBucket(asset: Record<string, any>) {
  const config = parseEnv();
  const storedBucket = String(asset.storage_bucket ?? asset.storageBucket ?? "").trim();
  if (storedBucket && storedBucket !== "local-dev-private-assets") {
    return { ...config, SUPABASE_PRIVATE_ASSETS_BUCKET: storedBucket };
  }
  return config;
}

async function readPrivateAssetBuffer(asset: Record<string, any>, kind: "assets" | "mockups" = "assets") {
  const storageKey = String(asset.file_path ?? asset.filePath ?? asset.storage_key ?? asset.storageKey ?? "");
  const localPath = localPrivatePathFor(storageKey, kind);
  try {
    return { ok: true as const, buffer: await readFile(localPath) };
  } catch {
    const config = configForStoredBucket(asset);
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY || !storageKey) {
      return {
        ok: false as const,
        status: "not_configured",
        blockingReasons: ["source_art_bytes_or_signed_url_required"],
        setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"]
      };
    }
    const source = await createStorageProvider(config).downloadPrivateAsset(storageKey);
    if (!source.ok) {
      return {
        ok: false as const,
        status: "not_configured",
        blockingReasons: ["source_art_private_storage_read_required"],
        setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"]
      };
    }
    return { ok: true as const, buffer: Buffer.from(source.bytes) };
  }
}

function placementNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function templateWithPlacement(template: any, placementOverride: Record<string, unknown> = {}) {
  const canvas = template.canvas ?? { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } };
  const zone = canvas.art_zone ?? {};
  const scale = Math.max(0.25, Math.min(2.5, placementNumber(placementOverride.scale, 1)));
  const nextZone = {
    ...zone,
    x: placementNumber(placementOverride.x, zone.x ?? 450),
    y: placementNumber(placementOverride.y, zone.y ?? 520),
    width: Math.round(placementNumber(placementOverride.width, zone.width ?? 900) * scale),
    height: Math.round(placementNumber(placementOverride.height, zone.height ?? 900) * scale)
  };
  return { ...template, canvas: { ...canvas, art_zone: nextZone }, placement_json: { ...nextZone, scale, rotation: placementNumber(placementOverride.rotation, 0), fit: String(placementOverride.fit || "contain"), opacity: placementNumber(placementOverride.opacity, 0.96) } };
}

async function writeInternalMockup(id: string, art: Buffer, template: any, placementOverride: Record<string, unknown> = {}) {
  const root = path.resolve(process.cwd(), ".saltyfactory-private", "mockups", safeSegment(workspaceId));
  await mkdir(root, { recursive: true });
  const outputPath = path.resolve(root, `${id}.png`);
  const placedTemplate = templateWithPlacement(template, placementOverride);
  await generateMockup(art, "", outputPath, {
    ...placedTemplate,
    productType: placedTemplate.productType ?? placedTemplate.product_type ?? "tee_front",
    canvas: placedTemplate.canvas ?? { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } },
    baseImagePath: template.baseImagePath ?? template.base_image_path ?? "internal-preview-template"
  });
  const storageKey = `workspaces/${safeSegment(workspaceId)}/private/mockups/${id}.png`;
  const config = parseEnv();
  const storageConfig = resolveStorageRuntimeConfig(config);
  const buffer = await readFile(outputPath);
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  if (storageConfig.SUPABASE_URL && storageConfig.SUPABASE_SERVICE_ROLE_KEY) {
    const uploaded = await createStorageProvider(config).uploadPrivateAsset(storageKey, buffer, "image/png");
    if (!uploaded.ok) {
      return { ok: false as const, status: "private_storage_upload_failed", blockingReasons: ["private_mockup_storage_upload_failed"] };
    }
    return { ok: true as const, storageKey, storageBucket: storageConfig.SUPABASE_PRIVATE_ASSETS_BUCKET, checksum, placementJson: placedTemplate.placement_json };
  }
  if (isProduction()) {
    return { ok: false as const, status: "private_storage_not_configured", blockingReasons: ["private_mockup_storage_not_configured"] };
  }
  return { ok: true as const, storageKey, storageBucket: "local-dev-private-assets", checksum, placementJson: placedTemplate.placement_json };
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({
      ok: true,
      mockups: await createRepositories().mockup.listByWorkspace(workspaceId),
      templates: internalTemplatePack.map(publicTemplate)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

function safeMockup(mockup: Record<string, any>) {
  const metadata = metadataOf(mockup);
  return {
    id: mockup.id,
    assetId: mockup.asset_id ?? mockup.assetId,
    templateId: mockup.template_id ?? mockup.templateId,
    status: mockup.status,
    approvedForProduct: Boolean(mockup.approved_for_product ?? mockup.approvedForProduct),
    isHero: metadata.is_hero === true || metadata.isHero === true,
    providerSource: metadata.provider_source ?? metadata.providerSource ?? "internal",
    rendererVersion: metadata.renderer_version ?? metadata.rendererVersion ?? "internal-sharp-v1",
    checksum: metadata.checksum_sha256 ?? metadata.checksumSha256 ?? null,
    previewUrl: `/api/studio/mockups/${encodeURIComponent(String(mockup.id))}/preview`
  };
}

async function renderOneMockup(input: {
  repos: ReturnType<typeof createRepositories>;
  asset: Record<string, any>;
  derivative: Record<string, any>;
  templateId: string;
  actorId: string;
  placementOverride?: Record<string, unknown>;
  productDraftId?: string | null;
}) {
  const template = await ensureInternalTemplate(input.templateId, input.actorId, input.repos.adapter);
  const source = await readPrivateAssetBuffer(input.derivative, "assets");
  if (!source.ok) {
    return { ok: false as const, status: source.status, message: "Mockup compositor could not read the print-ready derivative.", blockingReasons: source.blockingReasons, setupRequired: source.setupRequired };
  }
  const mockupId = `mockup_${Date.now()}_${safeSegment(template.id).slice(0, 32)}_${Math.random().toString(16).slice(2, 8)}`;
  const stored = await writeInternalMockup(mockupId, source.buffer, template, input.placementOverride ?? {});
  if (!stored.ok) {
    return { ok: false as const, status: stored.status, message: "Mockup compositor could not store the composed private preview.", blockingReasons: stored.blockingReasons, setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"] };
  }
  const canvas = template.canvas ?? { width: 1800, height: 2200 };
  const mockup = await input.repos.mockup.create({
    id: mockupId,
    workspace_id: workspaceId,
    asset_id: input.asset.id,
    template_id: template.id,
    product_draft_id: input.productDraftId ?? null,
    color_variant: Array.isArray(template.colorVariants) ? template.colorVariants[0] ?? "natural" : "natural",
    storage_bucket: stored.storageBucket,
    file_path: stored.storageKey,
    width: Number(canvas.width ?? 1800),
    height: Number(canvas.height ?? 2200),
    status: "generated_composited_preview",
    approved_for_product: false,
    notes: "Internal compositor preview using the print-ready derivative; not a Printify provider mockup.",
    metadata: {
      kind: "sharp_composited_mockup",
      provider_source: "internal",
      renderer_version: "internal-sharp-v1",
      public: false,
      source_asset_id: input.asset.id,
      derivative_asset_id: input.derivative.id,
      derivative_kind: printDerivativeKind,
      template_quality_label: "internal_preview",
      placement_json: stored.placementJson,
      checksum_sha256: stored.checksum,
      is_hero: false
    },
    created_by: input.actorId,
    updated_by: input.actorId
  });
  return { ok: true as const, mockup };
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const assetId = String(body.asset_id || body.assetId || "");
    const productType = String(body.product_type || body.productType || "tee_front");
    const mode = String(body.mode || "");
    const templateId = String(body.template_id || body.templateId || "");
    const productDraftId = body.product_draft_id || body.productDraftId ? String(body.product_draft_id || body.productDraftId) : null;
    const placementOverride = body.placement && typeof body.placement === "object" && !Array.isArray(body.placement) ? body.placement as Record<string, unknown> : {};
    const repos = createRepositories();
    const asset = await repos.asset.getById(assetId, workspaceId);
    if (!asset) return notFoundApiResponse();
    if (asset.approved_for_mockup !== true && asset.approvedForMockup !== true) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Internal mockups require an approved asset with passing QA.", blockingReasons: ["asset_not_approved_for_mockup"] }, { status: 409 });
    }
    if (String(asset.qa_status ?? asset.qaStatus) !== "passed") {
      return NextResponse.json({ ok: false, status: "blocked", message: "Mockups require source artwork with passing print-file QA.", blockingReasons: ["asset_qa_not_passed"] }, { status: 409 });
    }
    const printDerivative = await findAssetDerivative(repos, workspaceId, assetId, printDerivativeKind);
    if (!printDerivative) {
      return NextResponse.json({
        ok: false,
        status: "blocked",
        message: "This asset needs a print-ready PNG derivative before internal mockups can be rendered.",
        blockingReasons: ["print_derivative_missing"],
        nextAction: "Regenerate the artwork package or run asset QA again."
      }, { status: 409 });
    }
    const templates = mode === "recommended"
      ? recommendedTemplatesForAsset(asset)
      : [templateByRequest({ templateId, productType })];
    const renders = [];
    const failures = [];
    for (const template of templates) {
      const rendered = await renderOneMockup({
        repos,
        asset,
        derivative: printDerivative,
        templateId: template.id,
        actorId: user.id,
        placementOverride,
        productDraftId
      });
      if (rendered.ok) renders.push(rendered.mockup);
      else failures.push({ templateId: template.id, status: rendered.status, message: rendered.message, blockingReasons: rendered.blockingReasons });
    }
    if (!renders.length) {
      return NextResponse.json({
        ok: false,
        status: "mockup_render_failed",
        message: "No internal mockups could be rendered.",
        blockingReasons: failures.flatMap((failure) => failure.blockingReasons ?? [failure.status]),
        failures
      }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      status: mode === "recommended" ? "recommended_mockups_created" : "composited_mockup_created",
      safeMessage: mode === "recommended" ? "Recommended internal mockups were rendered from the print-ready derivative." : "Internal mockup rendered from the print-ready derivative.",
      mockup: renders[0],
      mockups: renders.map(safeMockup),
      templates: templates.map(publicTemplate),
      failedRenderCount: failures.length,
      ...(failures.length ? { failures } : {})
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
