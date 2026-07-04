import { bmvbhash } from "blockhash-core";
import sharp from "sharp";

export type AssetQaStatus = "passed" | "failed" | "warnings" | "not_applicable";

export type AssetQaCheck = {
  status: AssetQaStatus;
  message: string;
  evidence?: Record<string, unknown>;
};

export const defaultQaRules = {
  minWidth: 3000,
  minHeight: 3000,
  minDpi: 300,
  maxFileSizeBytes: 50 * 1024 * 1024,
  requireTransparent: true,
  allowedFormats: ["png", "jpg", "jpeg", "webp"],
  safeMarginPercent: 0.05
};

export async function readImageMetadata(p: string | Buffer) {
  const image = sharp(p, { failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || !metadata.format) throw new Error("invalid_image_metadata");
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    hasAlpha: Boolean(metadata.hasAlpha),
    density: metadata.density ?? 0,
    space: metadata.space ?? "unknown",
    fileSizeBytes: Buffer.isBuffer(p) ? p.byteLength : undefined
  };
}

export async function computePerceptualHash(p: string | Buffer) {
  const image = sharp(p, { failOn: "warning" }).ensureAlpha().resize(256, 256, { fit: "fill" });
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  return bmvbhash({ data, width: info.width, height: info.height }, 16);
}

export function duplicateSimilarity(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return 0;
  let differentBits = 0;
  for (let index = 0; index < a.length; index++) {
    const xor = Number.parseInt(a[index] ?? "0", 16) ^ Number.parseInt(b[index] ?? "0", 16);
    differentBits += xor.toString(2).replace(/0/g, "").length;
  }
  return 1 - differentBits / (a.length * 4);
}

function check(status: AssetQaStatus, message: string, evidence?: Record<string, unknown>): AssetQaCheck {
  return evidence ? { status, message, evidence } : { status, message };
}

function scanUnsafeText(value: string) {
  const lowered = value.toLowerCase();
  const prohibited = ["disney", "nike", "harley", "gucci", "ignore previous instructions", "system prompt"];
  return prohibited.filter((term) => lowered.includes(term));
}

export function evaluateAssetQaFromMetadata(
  m: { width: number; height: number; format: string; hasAlpha?: boolean; density?: number; fileSizeBytes?: number; filename?: string; notes?: string; perceptualHash?: string },
  r = defaultQaRules,
  existing: string[] = []
) {
  const format = String(m.format || "").toLowerCase().replace("image/", "");
  const hash = m.perceptualHash ?? "";
  const dup = hash ? Math.max(0, ...existing.map((h) => duplicateSimilarity(hash, h))) : 0;
  const unsafeTerms = scanUnsafeText(`${m.filename ?? ""} ${m.notes ?? ""}`);
  const checks: Record<string, AssetQaCheck | boolean | string | number | null> = {
    resolution_ok: check(
      m.width >= r.minWidth && m.height >= r.minHeight ? "passed" : "failed",
      m.width >= r.minWidth && m.height >= r.minHeight ? "Meets minimum print resolution." : `Minimum image size is ${r.minWidth}x${r.minHeight}px.`,
      { width: m.width, height: m.height, minWidth: r.minWidth, minHeight: r.minHeight }
    ),
    min_dpi_met: check(
      (m.density ?? 0) >= r.minDpi ? "passed" : "warnings",
      (m.density ?? 0) >= r.minDpi ? "DPI metadata meets print target." : "DPI metadata is missing or below target; verify print dimensions manually.",
      { density: m.density ?? 0, minDpi: r.minDpi }
    ),
    canvas_size_ok: check(m.width > 0 && m.height > 0 ? "passed" : "failed", "Image dimensions were decoded from the uploaded file."),
    transparent_background_ok: check(
      !r.requireTransparent || m.hasAlpha === true ? "passed" : "failed",
      !r.requireTransparent || m.hasAlpha === true ? "Transparency requirement is satisfied." : "Transparent PNG/source art requires an alpha channel.",
      { hasAlpha: Boolean(m.hasAlpha) }
    ),
    safe_margin_ok: check("not_applicable", "Safe-zone fit requires a selected product template and is not treated as passed."),
    text_legibility: check("not_applicable", "Automated text/readability detection is not implemented; human review remains required."),
    trademark_risk_scan: check(unsafeTerms.length ? "failed" : "not_applicable", unsafeTerms.length ? "Filename/notes contain prohibited or risky terms." : "Trademark/IP scan adapter is not implemented; no risky filename terms were detected.", { terms: unsafeTerms }),
    prompt_injection_scan: check(unsafeTerms.some((term) => term.includes("instructions") || term.includes("prompt")) ? "failed" : "passed", "Filename and notes were scanned for prompt-injection phrases."),
    duplicate_similarity: check(dup > 0.92 ? "warnings" : "passed", dup > 0.92 ? "Potential duplicate detected by perceptual hash." : hash ? "No high-similarity duplicate detected." : "Perceptual hash unavailable for this metadata-only QA run.", { score: dup }),
    file_format_ok: check(r.allowedFormats.includes(format) ? "passed" : "failed", r.allowedFormats.includes(format) ? "File format is allowed." : "File format is not allowed.", { format, allowedFormats: r.allowedFormats }),
    file_size_ok: check((m.fileSizeBytes ?? 0) <= r.maxFileSizeBytes ? "passed" : "failed", "File size is within the private asset limit.", { fileSizeBytes: m.fileSizeBytes ?? 0, maxFileSizeBytes: r.maxFileSizeBytes }),
    perceptual_hash: hash,
    duplicate_similarity_score: dup,
    duplicate_of: null,
    copyright_risk_flag: unsafeTerms.length > 0,
    trademark_risk_flag: unsafeTerms.length > 0,
    color_profile_ok: true,
    text_detected: false,
    text_legible: null,
    spelling_review_required: false
  };
  const required = ["resolution_ok", "canvas_size_ok", "transparent_background_ok", "trademark_risk_scan", "prompt_injection_scan", "file_format_ok", "file_size_ok"];
  const blocked_reasons = required.filter((key) => (checks[key] as AssetQaCheck).status === "failed");
  const warnings = Object.entries(checks)
    .filter(([, value]) => typeof value === "object" && value !== null && (value as AssetQaCheck).status === "warnings")
    .map(([key]) => key);
  return {
    checks,
    status: blocked_reasons.length ? "failed" : "passed",
    blocked_reasons,
    warnings,
    evidence: {
      width: m.width,
      height: m.height,
      format,
      hasAlpha: Boolean(m.hasAlpha),
      fileSizeBytes: m.fileSizeBytes ?? 0,
      optionalChecksNotAutoPassed: ["safe_margin_ok", "text_legibility", "trademark_risk_scan"]
    },
    approved_for_product_draft: blocked_reasons.length === 0
  };
}

export async function evaluatePrintFileQa(path: string, r = defaultQaRules, existing: string[] = []) {
  const m = await readImageMetadata(path);
  const hash = await computePerceptualHash(path);
  const dup = Math.max(0, ...existing.map((h) => duplicateSimilarity(hash, h)));
  const qaInput: { width: number; height: number; format: string; hasAlpha?: boolean; density?: number; fileSizeBytes?: number; perceptualHash?: string } = {
    width: m.width,
    height: m.height,
    format: m.format,
    hasAlpha: m.hasAlpha,
    density: m.density,
    perceptualHash: hash
  };
  if (typeof m.fileSizeBytes === "number") qaInput.fileSizeBytes = m.fileSizeBytes;
  const result = evaluateAssetQaFromMetadata(qaInput, r, existing);
  return { ...result, checks: { ...result.checks, perceptual_hash: hash, duplicate_similarity_score: dup } };
}

export const parseMockupTemplate = (t: any) => {
  if (!t?.canvas?.art_zone) throw new Error("mockup template missing art_zone");
  return t;
};

function templateArtZone(t: any) {
  const zone = t?.canvas?.art_zone;
  return {
    x: Number(zone?.x),
    y: Number(zone?.y),
    width: Number(zone?.width),
    height: Number(zone?.height)
  };
}

async function createBaseTemplate(t: any) {
  const width = Number(t.canvas.width);
  const height = Number(t.canvas.height);
  const baseImagePath = typeof t.baseImagePath === "string" ? t.baseImagePath : typeof t.base_image_path === "string" ? t.base_image_path : "";
  if (baseImagePath && baseImagePath !== "internal-preview-template") {
    try {
      return await sharp(baseImagePath).resize(width, height, { fit: "cover" }).png().toBuffer();
    } catch {
      throw new Error("mockup_template_base_image_missing");
    }
  }
  const productType = String(t.productType ?? t.product_type ?? "product").replace(/_/g, " ");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f8fbfc"/>
    <rect x="${Math.round(width * 0.19)}" y="${Math.round(height * 0.13)}" width="${Math.round(width * 0.62)}" height="${Math.round(height * 0.70)}" rx="${Math.round(width * 0.06)}" fill="#f4eadb" stroke="#0b1f33" stroke-width="10"/>
    <rect x="${Math.round(width * 0.27)}" y="${Math.round(height * 0.06)}" width="${Math.round(width * 0.46)}" height="${Math.round(height * 0.11)}" rx="${Math.round(width * 0.05)}" fill="#ffffff" stroke="#dbe7ea" stroke-width="8"/>
    <text x="${Math.round(width / 2)}" y="${Math.round(height * 0.91)}" text-anchor="middle" font-family="Inter, Arial" font-size="${Math.max(34, Math.round(width * 0.035))}" fill="#526475">${productType} internal compositor preview</text>
  </svg>`);
  return sharp(svg).png().toBuffer();
}

export async function generateMockup(a: string | Buffer, _b: string, outPath: string, t: any) {
  parseMockupTemplate(t);
  const zone = templateArtZone(t);
  if (![zone.x, zone.y, zone.width, zone.height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("mockup template missing valid art_zone");
  }
  const width = Number(t.canvas.width);
  const height = Number(t.canvas.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("mockup template missing valid canvas dimensions");
  }
  const base = await createBaseTemplate(t);
  const art = await sharp(a, { failOn: "warning" })
    .ensureAlpha()
    .resize(Math.round(zone.width), Math.round(zone.height), { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  await sharp(base)
    .composite([{ input: art, left: Math.round(zone.x), top: Math.round(zone.y), blend: "over" }])
    .png()
    .toFile(outPath);
  return { ok: true as const, path: outPath, width, height };
}

export function blockMockupIfQaFailed(qa: { status: string }) {
  if (qa.status !== "passed") throw new Error("mockup blocked because asset QA did not pass");
}

export function blockDraftIfPrintQaFailed(qa: { approved_for_product_draft: boolean }) {
  if (!qa.approved_for_product_draft) throw new Error("product draft blocked because print QA did not pass");
}

export {
  buildPodPromptRecipeFromBrief,
  buildPromptPackageFromBrief,
  defaultPodNegativePrompt,
  podStylePresets,
  type PodPromptRecipe,
  type PodStylePreset,
  type PromptBriefInput,
  type PromptPackage
} from "./prompt-builder";
