import { NextResponse } from "next/server";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { requireProviderMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, getDb, mockupTemplates } from "@saltyfactory/db";
import { parseEnv } from "@saltyfactory/config";
import { createStorageProvider, resolveStorageRuntimeConfig } from "@saltyfactory/storage";
import { generateMockup } from "@saltyfactory/image-pipeline";
import { studioAuthErrorResponse, notFoundApiResponse } from "../../_auth";

export const runtime = "nodejs";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "mockup";
}

async function ensureInternalTemplate(productType: string, actorId: string, adapter: "memory" | "drizzle") {
  const id = `tmpl_internal_${safeSegment(productType)}`;
  if (adapter === "memory") {
    return {
      id,
      workspaceId,
      name: `Internal ${productType} preview`,
      productType,
      canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } },
      baseImagePath: "internal-preview-template",
      colorVariants: ["natural"],
      active: true,
      status: "active",
      notes: "Internal Studio preview only. This is not a Printify mockup.",
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
    name: `Internal ${productType} preview`,
    productType,
    canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } },
    baseImagePath: "internal-preview-template",
    colorVariants: ["natural"],
    active: true,
    status: "active",
    notes: "Internal Studio preview only. This is not a Printify mockup.",
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

async function readApprovedAssetBuffer(asset: Record<string, any>) {
  const storageKey = String(asset.file_path ?? asset.filePath ?? asset.storage_key ?? asset.storageKey ?? "");
  const localPath = localPrivatePathFor(storageKey, "assets");
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

async function writeInternalMockup(productType: string, id: string, art: Buffer, template: any) {
  const root = path.resolve(process.cwd(), ".saltyfactory-private", "mockups", safeSegment(workspaceId));
  await mkdir(root, { recursive: true });
  const outputPath = path.resolve(root, `${id}.png`);
  await generateMockup(art, "", outputPath, {
    ...template,
    productType,
    canvas: template.canvas ?? { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } },
    baseImagePath: template.baseImagePath ?? template.base_image_path ?? "internal-preview-template"
  });
  const storageKey = `workspaces/${safeSegment(workspaceId)}/private/mockups/${id}.png`;
  const config = parseEnv();
  const storageConfig = resolveStorageRuntimeConfig(config);
  if (storageConfig.SUPABASE_URL && storageConfig.SUPABASE_SERVICE_ROLE_KEY) {
    const buffer = await readFile(outputPath);
    const uploaded = await createStorageProvider(config).uploadPrivateAsset(storageKey, buffer, "image/png");
    if (!uploaded.ok) {
      return { ok: false as const, status: "private_storage_upload_failed", blockingReasons: ["private_mockup_storage_upload_failed"] };
    }
    return { ok: true as const, storageKey, storageBucket: storageConfig.SUPABASE_PRIVATE_ASSETS_BUCKET };
  }
  if (isProduction()) {
    return { ok: false as const, status: "private_storage_not_configured", blockingReasons: ["private_mockup_storage_not_configured"] };
  }
  return { ok: true as const, storageKey, storageBucket: "local-dev-private-assets" };
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({ ok: true, mockups: await createRepositories().mockup.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const assetId = String(body.asset_id || body.assetId || "");
    const productType = String(body.product_type || body.productType || "tee_front");
    const repos = createRepositories();
    const asset = await repos.asset.getById(assetId, workspaceId);
    if (!asset) return notFoundApiResponse();
    if (asset.approved_for_mockup !== true && asset.approvedForMockup !== true) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Internal mockups require an approved asset with passing QA.", blockingReasons: ["asset_not_approved_for_mockup"] }, { status: 409 });
    }
    if (String(asset.qa_status ?? asset.qaStatus) !== "passed") {
      return NextResponse.json({ ok: false, status: "blocked", message: "Mockups require source artwork with passing print-file QA.", blockingReasons: ["asset_qa_not_passed"] }, { status: 409 });
    }
    const template = await ensureInternalTemplate(productType, user.id, repos.adapter);
    const source = await readApprovedAssetBuffer(asset);
    if (!source.ok) {
      return NextResponse.json({ ok: false, status: source.status, message: "Mockup compositor could not read the approved source artwork.", blockingReasons: source.blockingReasons, setupRequired: source.setupRequired }, { status: source.status === "not_configured" ? 503 : 409 });
    }
    const mockupId = `mockup_${Date.now()}`;
    const stored = await writeInternalMockup(productType, mockupId, source.buffer, template);
    if (!stored.ok) {
      return NextResponse.json({ ok: false, status: stored.status, message: "Mockup compositor could not store the composed private preview.", blockingReasons: stored.blockingReasons, setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"] }, { status: 503 });
    }
    const mockup = await repos.mockup.create({
      id: mockupId,
      workspace_id: workspaceId,
      asset_id: assetId,
      template_id: template.id,
      color_variant: "natural",
      storage_bucket: stored.storageBucket,
      file_path: stored.storageKey,
      width: 1800,
      height: 2200,
      status: "generated_composited_preview",
      approved_for_product: false,
      notes: "Internal compositor preview using the approved source artwork; not a Printify provider mockup.",
      metadata: { kind: "sharp_composited_mockup", provider: "internal", public: false, source_asset_id: assetId },
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "composited_mockup_created", mockup });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
