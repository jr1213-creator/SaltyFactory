import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  ensurePathInside,
  importLocalFolderImages,
  resolveLocalFolderConfig
} from "../apps/studio/app/api/studio/_local-folder-image-source";

const workspaceId = "wks_local_folder";
const actorId = "owner";
const briefId = "brief_local_folder";
const jobId = "job_local_folder";
const tempRoot = path.resolve(process.cwd(), ".tmp", "local-folder-tests");

async function writePng(filePath: string, buffer: Buffer) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

async function chromaArt() {
  return sharp({ create: { width: 512, height: 512, channels: 4, background: "#ff00ff" } })
    .composite([{ input: await sharp({ create: { width: 220, height: 220, channels: 4, background: "#0f766e" } }).png().toBuffer(), left: 146, top: 146 }])
    .png()
    .toBuffer();
}

async function opaqueWhiteArt() {
  return sharp({ create: { width: 512, height: 512, channels: 3, background: "#ffffff" } })
    .composite([{ input: await sharp({ create: { width: 220, height: 220, channels: 3, background: "#ef675b" } }).png().toBuffer(), left: 146, top: 146 }])
    .png()
    .toBuffer();
}

async function alphaArt() {
  return sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
    .composite([{ input: await sharp({ create: { width: 220, height: 220, channels: 4, background: "#008d96" } }).png().toBuffer(), left: 146, top: 146 }])
    .png()
    .toBuffer();
}

function localFolderEnv(overrides: Record<string, string> = {}) {
  return parseEnv({
    NODE_ENV: "development",
    APP_ENV: "development",
    IMAGE_GENERATION_ENABLED: "true",
    IMAGE_GENERATION_PROVIDER: "local_folder",
    LOCAL_IMAGE_SOURCE_ENABLED: "true",
    LOCAL_IMAGE_SOURCE_DIR: path.join(tempRoot, "source"),
    LOCAL_IMAGE_ARCHIVE_DIR: path.join(tempRoot, "processed"),
    LOCAL_IMAGE_REJECTED_DIR: path.join(tempRoot, "rejected"),
    LOCAL_IMAGE_ALLOWED_EXTENSIONS: "png,jpg,jpeg,webp",
    LOCAL_IMAGE_IMPORT_LIMIT: "5",
    LOCAL_IMAGE_REQUIRE_CHROMA: "true",
    LOCAL_IMAGE_CHROMA_KEY: "#FF00FF",
    ...overrides
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("local folder image source", () => {
  it("missing folder returns local_folder_source_missing", async () => {
    const repos = createMemoryRepositories();
    const result = await importLocalFolderImages({
      repos,
      workspaceId,
      briefId,
      jobId,
      actorId,
      config: localFolderEnv({ LOCAL_IMAGE_SOURCE_DIR: path.join(tempRoot, "does-not-exist") }),
      variantCount: 1,
      printTarget: "apparel_front_square",
      productType: "tee",
      forceLocal: true
    });

    expect(result).toMatchObject({ ok: false, code: "local_folder_source_missing" });
  });

  it("empty folder returns local_folder_no_images_found", async () => {
    const repos = createMemoryRepositories();
    const dir = path.join(tempRoot, "empty");
    await mkdir(dir, { recursive: true });
    const result = await importLocalFolderImages({
      repos,
      workspaceId,
      briefId,
      jobId,
      actorId,
      config: localFolderEnv({ LOCAL_IMAGE_SOURCE_DIR: dir }),
      variantCount: 1,
      printTarget: "apparel_front_square",
      productType: "tee",
      forceLocal: true
    });

    expect(result).toMatchObject({ ok: false, code: "local_folder_no_images_found" });
  });

  it("invalid extension-only folder returns local_folder_invalid_extension", async () => {
    const repos = createMemoryRepositories();
    const dir = path.join(tempRoot, "invalid-extension");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "bad.txt"), "not-an-image");
    const result = await importLocalFolderImages({
      repos,
      workspaceId,
      briefId,
      jobId,
      actorId,
      config: localFolderEnv({ LOCAL_IMAGE_SOURCE_DIR: dir }),
      variantCount: 1,
      printTarget: "apparel_front_square",
      productType: "tee",
      forceLocal: true
    });

    expect(result).toMatchObject({ ok: false, code: "local_folder_invalid_extension" });
  });

  it("rejects path traversal outside the allowlisted source directory", () => {
    expect(() => ensurePathInside("C:\\allowed", "C:\\allowed\\..\\Windows\\System32")).toThrow(/local_folder_invalid_path/);
  });

  it("imports a valid chroma PNG, persists truthful source metadata, and creates transparent print_png", async () => {
    const repos = createMemoryRepositories();
    const dir = path.join(tempRoot, "success");
    const fileName = "coastal-test.png";
    await writePng(path.join(dir, fileName), await chromaArt());
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await importLocalFolderImages({
      repos,
      workspaceId,
      briefId,
      jobId,
      actorId,
      config: localFolderEnv({ LOCAL_IMAGE_SOURCE_DIR: dir }),
      variantCount: 1,
      printTarget: "apparel_front_square",
      productType: "tee",
      forceLocal: true
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.importedCount).toBe(1);
    expect(result.imported[0]?.asset.generator).toBe("local_folder");
    expect(result.imported[0]?.asset.metadata).toMatchObject({
      source_provider: "local_folder",
      source_type: "external_generated",
      original_filename: fileName,
      local_folder_import: true
    });
    const printPng = result.imported[0]?.derivatives.find((row) => row.asset_type === "print_png");
    expect(printPng?.metadata).toMatchObject({
      transparent_background_ready: true,
      chroma_key_applied: true
    });
    expect(result.imported[0]?.qa.status).toBe("passed");
  }, 20000);

  it("preserves source alpha for imported transparent images", async () => {
    const repos = createMemoryRepositories();
    const dir = path.join(tempRoot, "alpha");
    await writePng(path.join(dir, "alpha-art.png"), await alphaArt());
    const result = await importLocalFolderImages({
      repos,
      workspaceId,
      briefId,
      jobId,
      actorId,
      config: localFolderEnv({ LOCAL_IMAGE_SOURCE_DIR: dir }),
      variantCount: 1,
      printTarget: "apparel_front_square",
      productType: "tee",
      forceLocal: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const printPng = result.imported[0]?.derivatives.find((row) => row.asset_type === "print_png");
    expect(printPng?.metadata).toMatchObject({
      transparent_background_ready: true,
      background_removal_required: false
    });
  }, 20000);

  it("fails apparel readiness for opaque imports without usable chroma transparency", async () => {
    const repos = createMemoryRepositories();
    const dir = path.join(tempRoot, "opaque");
    await writePng(path.join(dir, "opaque.png"), await opaqueWhiteArt());
    const result = await importLocalFolderImages({
      repos,
      workspaceId,
      briefId,
      jobId,
      actorId,
      config: localFolderEnv({ LOCAL_IMAGE_SOURCE_DIR: dir }),
      variantCount: 1,
      printTarget: "apparel_front_square",
      productType: "tee",
      forceLocal: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const printPng = result.imported[0]?.derivatives.find((row) => row.asset_type === "print_png");
    expect(printPng?.metadata).toMatchObject({
      transparent_background_ready: false,
      background_removal_required: true
    });
    expect(result.imported[0]?.qa.blocked_reasons ?? result.imported[0]?.qa.blockedReasons).toContain("transparent_background_missing");
  }, 20000);

  it("resolveLocalFolderConfig blocks local_folder in production", () => {
    expect(() => resolveLocalFolderConfig(parseEnv({
      NODE_ENV: "production",
      APP_ENV: "production",
      IMAGE_GENERATION_ENABLED: "true",
      IMAGE_GENERATION_PROVIDER: "local_folder",
      LOCAL_IMAGE_SOURCE_ENABLED: "true",
      LOCAL_IMAGE_SOURCE_DIR: "C:\\data\\SaltyFactoryImageDrop"
    }))).toThrow(/local_folder_source_not_allowed_in_production/);
  });
});
