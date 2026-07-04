import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseEnv } from "@saltyfactory/config";
import { createStorageProvider } from "@saltyfactory/storage";
import type { WorkspaceRow } from "@saltyfactory/db";

const imageContentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export function safePrivateSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

export function privateStorageKey(row: WorkspaceRow | null | undefined) {
  return String(row?.file_path ?? row?.filePath ?? row?.storage_key ?? row?.storageKey ?? "");
}

function localKind(storageKey: string, fallbackKind: "assets" | "mockups") {
  if (storageKey.includes("/mockups/")) return "mockups";
  if (storageKey.includes("/assets/")) return "assets";
  return fallbackKind;
}

function localPrivatePath(workspaceId: string, storageKey: string, fallbackKind: "assets" | "mockups") {
  return path.resolve(
    process.cwd(),
    ".saltyfactory-private",
    localKind(storageKey, fallbackKind),
    safePrivateSegment(workspaceId),
    path.basename(storageKey)
  );
}

function contentTypeFor(storageKey: string, fallback = "image/png") {
  return imageContentTypes[path.extname(storageKey).toLowerCase()] ?? fallback;
}

function storedMimeType(row: WorkspaceRow) {
  const value = String(row.mime_type ?? row.mimeType ?? "");
  return value.startsWith("image/") ? value : "";
}

function detectImageContentType(bytes: Uint8Array, fallback = "image/png") {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return fallback.startsWith("image/") ? fallback : "image/png";
}

function configForStoredBucket(row: WorkspaceRow) {
  const config = parseEnv();
  const storedBucket = String(row.storage_bucket ?? row.storageBucket ?? "").trim();
  if (storedBucket && storedBucket !== "local-dev-private-assets") {
    return { ...config, SUPABASE_PRIVATE_ASSETS_BUCKET: storedBucket };
  }
  return config;
}

export async function privatePreviewResponse(input: {
  row: WorkspaceRow;
  workspaceId: string;
  fallbackKind: "assets" | "mockups";
  maxAgeSeconds?: number;
}) {
  const storageKey = privateStorageKey(input.row);
  if (!storageKey) {
    return NextResponse.json({ ok: false, status: "preview_unavailable", message: "Private file path is missing." }, { status: 404 });
  }

  try {
    const bytes = await readFile(localPrivatePath(input.workspaceId, storageKey, input.fallbackKind));
    const contentType = detectImageContentType(bytes, contentTypeFor(storageKey, storedMimeType(input.row) || "image/png"));
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=60",
        "x-saltyfactory-private-preview": "local"
      }
    });
  } catch {
    // Supabase-backed assets are proxied server-side. The service-role key stays server-side.
  }

  const config = configForStoredBucket(input.row);
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: false,
      status: "preview_unavailable",
      message: "Private preview bytes are unavailable from this runtime."
    }, { status: 404 });
  }

  const downloaded = await createStorageProvider(config).downloadPrivateAsset(storageKey);
  if (!downloaded.ok) {
    return NextResponse.json({
      ok: false,
      status: "preview_unavailable",
      message: "Private preview bytes could not be read from storage."
    }, { status: 404 });
  }

  const contentType = detectImageContentType(
    downloaded.bytes,
    contentTypeFor(storageKey, storedMimeType(input.row) || downloaded.contentType || "image/png")
  );
  return new NextResponse(Buffer.from(downloaded.bytes), {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": `private, max-age=${Math.min(input.maxAgeSeconds ?? 300, 300)}`,
      "x-saltyfactory-private-preview": "storage"
    }
  });
}
