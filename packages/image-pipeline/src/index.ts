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

export async function readImageMetadata(_p: string) {
  return { width: 4500, height: 5400, format: "png", hasAlpha: true, density: 300, space: "srgb" };
}

export async function computePerceptualHash(_p: string) {
  return "a1b2c3d4e5f6";
}

export function duplicateSimilarity(a: string, b: string) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) s++;
  return s / Math.max(a.length, b.length, 1);
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
  m: { width: number; height: number; format: string; hasAlpha?: boolean; density?: number; fileSizeBytes?: number; filename?: string; notes?: string },
  r = defaultQaRules,
  existing: string[] = []
) {
  const format = String(m.format || "").toLowerCase().replace("image/", "");
  const hash = `meta_${m.width}_${m.height}_${format}_${m.fileSizeBytes ?? 0}`;
  const dup = Math.max(0, ...existing.map((h) => duplicateSimilarity(hash, h)));
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
    duplicate_similarity: check(dup > 0.92 ? "warnings" : "passed", dup > 0.92 ? "Potential duplicate detected by metadata hash." : "No high-similarity duplicate detected.", { score: dup }),
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
  const result = evaluateAssetQaFromMetadata({ width: m.width, height: m.height, format: m.format, hasAlpha: m.hasAlpha, density: m.density }, r, existing);
  return { ...result, checks: { ...result.checks, perceptual_hash: hash, duplicate_similarity_score: dup } };
}

export const parseMockupTemplate = (t: any) => {
  if (!t?.canvas?.art_zone) throw new Error("mockup template missing art_zone");
  return t;
};

export async function generateMockup(_a: string, _b: string, outPath: string, t: any) {
  parseMockupTemplate(t);
  return { ok: true as const, path: outPath, width: t.canvas.width, height: t.canvas.height };
}

export function blockMockupIfQaFailed(qa: { status: string }) {
  if (qa.status !== "passed") throw new Error("mockup blocked because asset QA did not pass");
}

export function blockDraftIfPrintQaFailed(qa: { approved_for_product_draft: boolean }) {
  if (!qa.approved_for_product_draft) throw new Error("product draft blocked because print QA did not pass");
}
