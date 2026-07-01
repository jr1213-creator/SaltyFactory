import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";
import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const maxUploadBytes = 15 * 1024 * 1024;
const allowedMimeTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);
const allowedAssetTypes = new Set(["source_art", "transparent_png", "print_file", "mockup", "product_photo"]);

function isProduction() {
  return process.env.APP_ENV === "production";
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "asset";
}

async function readImageMetadata(buffer: Buffer) {
  const sharp = (await import("sharp")).default;
  const image = sharp(buffer, { failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || !metadata.format) throw new Error("invalid_image_metadata");
  const stats = metadata.format === "png" ? await image.stats().catch(() => null) : null;
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    density: metadata.density ?? 0,
    hasAlpha: Boolean(metadata.hasAlpha),
    transparentBackground: Boolean(stats?.isOpaque === false || metadata.hasAlpha)
  };
}

function jsonError(status: number, code: string, message: string, blockingReasons: string[]) {
  return NextResponse.json({ ok: false, status: code, message, blockingReasons }, { status });
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({ ok: true, assets: await createRepositories().asset.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError(415, "unsupported_media_type", "Asset upload requires multipart/form-data with a file field.", ["missing_multipart_file"]);
    }
    const privateBucket = process.env.SUPABASE_PRIVATE_ASSETS_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "";
    const canUseSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && privateBucket);
    if (isProduction() && !canUseSupabaseStorage) {
      return jsonError(503, "not_configured", "Production asset upload requires server-side Supabase Storage configuration before asset records can be created.", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"]);
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError(400, "invalid_request", "A file field is required.", ["missing_file"]);
    }
    if (file.size <= 0) return jsonError(400, "invalid_request", "Uploaded file is empty.", ["empty_file"]);
    if (file.size > maxUploadBytes) return jsonError(413, "file_too_large", "Uploaded file exceeds the 15MB private asset limit.", ["file_size_exceeds_limit"]);
    const extension = allowedMimeTypes.get(file.type);
    if (!extension) {
      return jsonError(415, "unsupported_media_type", "Only PNG, JPEG, and WebP images are accepted for the POD asset workflow.", ["unsupported_file_type"]);
    }
    const originalName = sanitizeSegment(file.name || "uploaded-asset");
    const lowerName = originalName.toLowerCase();
    if (/\.(svg|html?|js|mjs|cjs|exe|bat|cmd|ps1|pdf)$/i.test(lowerName)) {
      return jsonError(415, "unsafe_extension", "This file extension is not accepted for private POD image assets.", ["unsafe_extension"]);
    }
    const assetTypeInput = String(form.get("asset_type") || "source_art");
    const assetType = allowedAssetTypes.has(assetTypeInput) ? assetTypeInput : "source_art";
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await readImageMetadata(buffer).catch(() => null);
    if (!metadata) {
      return jsonError(400, "invalid_image", "The uploaded file could not be decoded as a supported image.", ["invalid_image_metadata"]);
    }
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    const id = `asset_${Date.now()}_${checksum.slice(0, 10)}`;
    const storagePrefix = `workspaces/${sanitizeSegment(workspaceId)}/private/assets`;
    const storageKey = `${storagePrefix}/${id}.${extension}`;
    const localRoot = path.resolve(process.cwd(), ".saltyfactory-private", "assets", sanitizeSegment(workspaceId));
    const targetPath = path.resolve(localRoot, `${id}.${extension}`);
    if (!targetPath.startsWith(localRoot)) {
      return jsonError(400, "invalid_storage_key", "Generated storage key failed workspace prefix validation.", ["storage_prefix_violation"]);
    }
    if (canUseSupabaseStorage) {
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
      const uploaded = await supabase.storage.from(privateBucket).upload(storageKey, buffer, {
        contentType: file.type,
        cacheControl: "private, max-age=0",
        upsert: false
      });
      if (uploaded.error) {
        return jsonError(502, "storage_upload_failed", "Private storage rejected the uploaded asset.", ["private_storage_upload_failed"]);
      }
    } else {
      await mkdir(localRoot, { recursive: true });
      await writeFile(targetPath, buffer);
    }
    const asset = await createRepositories().asset.create({
      id,
      workspace_id: workspaceId,
      asset_type: assetType,
      original_filename: file.name,
      storage_bucket: privateBucket || "local-dev-private-assets",
      storage_key: storageKey,
      file_path: storageKey,
      file_size_bytes: file.size,
      checksum,
      mime_type: file.type,
      extension,
      width: metadata.width,
      height: metadata.height,
      dpi: metadata.density,
      transparent_background: metadata.transparentBackground,
      generator: "manual_upload",
      model: "none",
      qa_status: "pending",
      risk_status: "pending",
      approved_for_mockup: false,
      visibility: "private",
      created_by: user.id,
      updated_by: user.id
    }, {
      id: `audit_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "design_asset",
      entity_id: id,
      action: "manual_upload_created_private_asset",
      actor_type: "human",
      actor_id: user.id,
      created_at: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, status: "private_asset_created", asset });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
