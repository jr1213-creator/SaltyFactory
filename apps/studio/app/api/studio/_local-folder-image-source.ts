import crypto from "node:crypto";
import { copyFile, mkdir, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { RuntimeConfig } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import { runAssetQaEvaluation } from "./_asset-qa";
import {
  contentTypeForExtension,
  createAssetDerivatives,
  createDesignAssetFromBuffer,
  safeImageSegment,
  storePrivateImageBuffer
} from "./_image-production";

export type LocalFolderImportFailureCode =
  | "local_folder_source_disabled"
  | "local_folder_source_missing"
  | "local_folder_no_images_found"
  | "local_folder_invalid_path"
  | "local_folder_invalid_extension"
  | "local_folder_file_read_failed"
  | "local_folder_invalid_image"
  | "local_folder_import_failed"
  | "local_folder_archive_failed"
  | "local_folder_source_not_allowed_in_production";

export type LocalFolderImageSourceConfig = {
  sourceDir: string;
  archiveDir: string;
  rejectedDir: string;
  allowedExtensions: Set<string>;
  pickMode: "oldest" | "newest";
  importLimit: number;
  requireChroma: boolean;
  chromaKey: string;
};

type LocalFolderImportFailure = {
  code: LocalFolderImportFailureCode;
  message: string;
  fileName?: string;
  retryable?: boolean;
};

type LocalFolderImportedAsset = {
  asset: WorkspaceRow;
  derivatives: WorkspaceRow[];
  qa: WorkspaceRow;
  warnings: string[];
  archivedFile?: string;
};

export type LocalFolderImportResult =
  | { ok: true; imported: LocalFolderImportedAsset[]; warnings: string[]; provider: "local_folder"; importedCount: number }
  | { ok: false; code: LocalFolderImportFailureCode; message: string; failures?: LocalFolderImportFailure[]; warnings?: string[] };

function isProductionRuntime(config: RuntimeConfig) {
  return config.APP_ENV === "production" || config.NODE_ENV === "production";
}

function parseImportLimit(raw: string) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(5, Math.trunc(value)));
}

function normalizeExtension(value: string) {
  return value.trim().replace(/^\./, "").toLowerCase();
}

export function resolveLocalFolderConfig(config: RuntimeConfig): LocalFolderImageSourceConfig {
  if (isProductionRuntime(config)) throw new Error("local_folder_source_not_allowed_in_production");
  if (!config.LOCAL_IMAGE_SOURCE_DIR.trim()) throw new Error("local_folder_source_missing");
  const sourceDir = path.resolve(config.LOCAL_IMAGE_SOURCE_DIR);
  const archiveDir = path.resolve(config.LOCAL_IMAGE_ARCHIVE_DIR.trim() || path.join(sourceDir, "processed"));
  const rejectedDir = path.resolve(config.LOCAL_IMAGE_REJECTED_DIR.trim() || path.join(sourceDir, "rejected"));
  const allowedExtensions = new Set(
    config.LOCAL_IMAGE_ALLOWED_EXTENSIONS.split(",").map(normalizeExtension).filter(Boolean)
  );
  return {
    sourceDir,
    archiveDir,
    rejectedDir,
    allowedExtensions: allowedExtensions.size ? allowedExtensions : new Set(["png", "jpg", "jpeg", "webp"]),
    pickMode: config.LOCAL_IMAGE_PICK_MODE,
    importLimit: parseImportLimit(config.LOCAL_IMAGE_IMPORT_LIMIT),
    requireChroma: config.LOCAL_IMAGE_REQUIRE_CHROMA,
    chromaKey: config.LOCAL_IMAGE_CHROMA_KEY.trim() || "#FF00FF"
  };
}

export function ensurePathInside(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (!resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`) && resolvedCandidate !== resolvedRoot) {
    throw new Error("local_folder_invalid_path");
  }
  return resolvedCandidate;
}

export async function listLocalFolderCandidates(config: LocalFolderImageSourceConfig, requestedLimit?: number) {
  const sourceStats = await stat(config.sourceDir).catch(() => null);
  if (!sourceStats?.isDirectory()) throw new Error("local_folder_source_missing");
  const entries = await readdir(config.sourceDir, { withFileTypes: true });
  const fileEntries = entries.filter((entry) => entry.isFile() && !entry.name.startsWith("."));
  const files = await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile()) return null;
    if (entry.name.startsWith(".")) return null;
    const extension = normalizeExtension(path.extname(entry.name));
    if (!config.allowedExtensions.has(extension)) return null;
    const fullPath = ensurePathInside(config.sourceDir, path.join(config.sourceDir, entry.name));
    const details = await stat(fullPath).catch(() => null);
    if (!details?.isFile()) return null;
    return {
      name: entry.name,
      extension,
      fullPath,
      mtimeMs: details.mtimeMs
    };
  }));
  const filtered = files.filter(Boolean) as Array<{ name: string; extension: string; fullPath: string; mtimeMs: number }>;
  if (!filtered.length) {
    if (fileEntries.length) throw new Error("local_folder_invalid_extension");
    throw new Error("local_folder_no_images_found");
  }
  filtered.sort((a, b) => config.pickMode === "newest" ? b.mtimeMs - a.mtimeMs : a.mtimeMs - b.mtimeMs);
  const limit = Math.max(1, Math.min(requestedLimit ?? config.importLimit, config.importLimit));
  return filtered.slice(0, limit);
}

async function archiveImportedFile(config: LocalFolderImageSourceConfig, sourcePath: string, fileName: string) {
  await mkdir(config.archiveDir, { recursive: true });
  const targetPath = ensurePathInside(config.archiveDir, path.join(config.archiveDir, `${Date.now()}-${safeImageSegment(fileName)}`));
  try {
    await rename(sourcePath, targetPath);
  } catch {
    await copyFile(sourcePath, targetPath);
  }
  return targetPath;
}

function metadataForImportedAsset(input: {
  fileName: string;
  printTarget: string;
  productType: string;
  config: LocalFolderImageSourceConfig;
  hasAlpha: boolean;
}) {
  const transparentIntent = /apparel|tee|shirt|hoodie|sweatshirt|tote/.test(input.productType) || /apparel|tee|shirt|hoodie|sweatshirt|tote/.test(input.printTarget);
  return {
    original_filename: input.fileName,
    source_provider: "local_folder",
    source_type: "external_generated",
    imported: true,
    generated: false,
    local_folder_import: true,
    imported_at: new Date().toISOString(),
    print_target: input.printTarget,
    transparent_background_intent: transparentIntent,
    chroma_key: transparentIntent && !input.hasAlpha && input.config.requireChroma
      ? { enabled: true, keyColor: input.config.chromaKey, tolerance: 86, edgeSoftness: 0 }
      : undefined
  };
}

export async function importLocalFolderImages(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  briefId: string;
  jobId: string;
  actorId: string;
  config: RuntimeConfig;
  variantCount?: number;
  printTarget?: string;
  productType?: string;
  forceLocal?: boolean;
}) : Promise<LocalFolderImportResult> {
  let localConfig: LocalFolderImageSourceConfig;
  try {
    localConfig = resolveLocalFolderConfig(input.config);
  } catch (error) {
    const code = error instanceof Error ? error.message as LocalFolderImportFailureCode : "local_folder_import_failed";
    return { ok: false, code, message: code.replace(/_/g, " ") };
  }

  let candidates: Awaited<ReturnType<typeof listLocalFolderCandidates>>;
  try {
    candidates = await listLocalFolderCandidates(localConfig, input.variantCount);
  } catch (error) {
    const code = error instanceof Error ? error.message as LocalFolderImportFailureCode : "local_folder_import_failed";
    return { ok: false, code, message: code.replace(/_/g, " ") };
  }

  const imported: LocalFolderImportedAsset[] = [];
  const warnings: string[] = [];
  const failures: LocalFolderImportFailure[] = [];
  const printTarget = input.printTarget ?? "apparel_front_square";
  const productType = input.productType ?? "apparel";

  for (const [index, candidate] of candidates.entries()) {
    try {
      const buffer = await import("node:fs/promises").then((fs) => fs.readFile(candidate.fullPath)).catch(() => null);
      if (!buffer) {
        failures.push({ code: "local_folder_file_read_failed", message: "Local folder image could not be read.", fileName: candidate.name, retryable: true });
        continue;
      }
      const metadata = await sharp(buffer, { failOn: "warning" }).metadata().catch(() => null);
      if (!metadata?.width || !metadata.height) {
        failures.push({ code: "local_folder_invalid_image", message: "Local folder file is not a valid image.", fileName: candidate.name });
        continue;
      }
      const extension = candidate.extension === "jpg" ? "jpeg" : candidate.extension;
      const contentType = contentTypeForExtension(extension);
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
      const assetId = `asset_local_folder_${Date.now()}_${index}_${checksum.slice(0, 8)}`;
      const storageKey = `workspaces/${safeImageSegment(input.workspaceId)}/private/assets/${assetId}.${extension === "jpeg" ? "jpg" : extension}`;
      const storeInput: Parameters<typeof storePrivateImageBuffer>[0] = {
        workspaceId: input.workspaceId,
        buffer,
        storageKey,
        contentType,
        config: input.config,
        allowLocalFallback: true
      };
      if (input.forceLocal !== undefined) storeInput.forceLocal = input.forceLocal;
      const stored = await storePrivateImageBuffer(storeInput);
      if (!stored.ok) {
        failures.push({ code: "local_folder_import_failed", message: "Imported image could not be stored privately.", fileName: candidate.name });
        continue;
      }
      const sourceMetadata = metadataForImportedAsset({
        fileName: candidate.name,
        printTarget,
        productType,
        config: localConfig,
        hasAlpha: Boolean(metadata.hasAlpha)
      });
      const asset = await createDesignAssetFromBuffer({
        repos: input.repos,
        workspaceId: input.workspaceId,
        id: assetId,
        buffer,
        storageBucket: stored.storageBucket,
        storageKey: stored.storageKey,
        contentType,
        jobId: input.jobId,
        briefId: input.briefId,
        assetType: "generated_source_art",
        generator: "local_folder",
        model: "none",
        actorId: input.actorId,
        metadata: sourceMetadata,
        notes: "Imported from the dev-only local folder image source."
      });
      const derivativeInput: Parameters<typeof createAssetDerivatives>[0] = {
        repos: input.repos,
        workspaceId: input.workspaceId,
        sourceAsset: asset,
        imageBytes: buffer,
        actorId: input.actorId,
        config: input.config,
        printTarget
      };
      if (input.forceLocal !== undefined) derivativeInput.forceLocal = input.forceLocal;
      const derivatives = await createAssetDerivatives(derivativeInput);
      const qaResult = await runAssetQaEvaluation({
        repos: input.repos,
        workspaceId: input.workspaceId,
        assetId: asset.id,
        actorId: input.actorId,
        productType,
        printTarget
      });
      let archivedFile = "";
      try {
        archivedFile = await archiveImportedFile(localConfig, candidate.fullPath, candidate.name);
      } catch {
        warnings.push(`local_folder_archive_failed:${candidate.name}`);
      }
      imported.push({ asset, derivatives, qa: qaResult.qa, warnings: qaResult.warnings.map(String), ...(archivedFile ? { archivedFile } : {}) });
    } catch {
      failures.push({ code: "local_folder_import_failed", message: "Local folder image import failed.", fileName: candidate.name });
    }
  }

  if (!imported.length) {
    return {
      ok: false,
      code: failures[0]?.code ?? "local_folder_import_failed",
      message: failures[0]?.message ?? "No local folder images were imported.",
      failures,
      warnings
    };
  }

  return {
    ok: true,
    imported,
    warnings,
    provider: "local_folder",
    importedCount: imported.length
  };
}
