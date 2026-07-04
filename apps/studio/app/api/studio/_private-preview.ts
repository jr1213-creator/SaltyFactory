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
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentTypeFor(storageKey, String(input.row.mime_type ?? input.row.mimeType ?? "image/png")),
        "cache-control": "private, max-age=60",
        "x-saltyfactory-private-preview": "local"
      }
    });
  } catch {
    // Supabase-backed assets are read through short-lived signed URLs. The service-role key stays server-side.
  }

  const config = parseEnv();
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: false,
      status: "preview_unavailable",
      message: "Private preview bytes are unavailable from this runtime."
    }, { status: 404 });
  }

  const signed = await createStorageProvider(config).createSignedPrivateUrl(storageKey, input.maxAgeSeconds ?? 300);
  if (!signed.ok || !signed.url) {
    return NextResponse.json({
      ok: false,
      status: "preview_unavailable",
      message: "Private preview signed URL could not be created."
    }, { status: 404 });
  }

  return NextResponse.redirect(signed.url, { status: 307 });
}
