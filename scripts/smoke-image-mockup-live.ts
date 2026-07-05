import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import {
  SUPABASE_ACCESS_COOKIE,
  requireProviderMutationPermission,
  setSupabaseUserVerifierForTests,
  setWorkspaceAuthorizerForTests
} from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import {
  createRepositories,
  getDb,
  mockupTemplates,
  type RepositoryBundle,
  type WorkspaceRow,
  users,
  workspaces
} from "@saltyfactory/db";
import { resolveImageGenerationProvider, type ImageGenerationProviderResolution } from "@saltyfactory/ai-free";
import { inspectImageTransparency } from "@saltyfactory/image-pipeline";
import { checkStorageReadiness } from "@saltyfactory/storage";

export const smokeDerivativeKinds = ["thumbnail", "web_preview", "print_png"] as const;

type SmokeDerivativeKind = typeof smokeDerivativeKinds[number];
type SmokeFailureCategory =
  | "setup_failure"
  | "database_failure"
  | "storage_failure"
  | "provider_auth_failure"
  | "provider_model_failure"
  | "provider_response_failure"
  | "derivative_failure"
  | "mockup_render_failure"
  | "preview_failure";

let currentSmokePhase = "not_started";

export class SmokeSetupError extends Error {
  readonly category: SmokeFailureCategory;
  readonly safeDetails: Record<string, unknown>;

  constructor(category: SmokeFailureCategory, code: string, safeDetails: Record<string, unknown> = {}) {
    super(JSON.stringify({ ok: false, category, code, ...safeDetails }));
    this.name = "SmokeSetupError";
    this.category = category;
    this.safeDetails = safeDetails;
  }
}

function setSmokePhase(phase: string, details: Record<string, unknown> = {}) {
  currentSmokePhase = phase;
  console.error(JSON.stringify({ phase, ...details }));
}

function loadEnvFile(filePath: string) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [rawKey, ...rawValue] = trimmed.split("=");
      const key = rawKey?.trim();
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = rawValue.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Local env files are optional. Explicit process env always wins.
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "apps/studio/.env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

export function requireLiveRuntimeConfig() {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new SmokeSetupError("setup_failure", "live_smoke_refuses_production_runtime");
  }
  const missing = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL && "SUPABASE_URL",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.SUPABASE_PRIVATE_ASSETS_BUCKET && "SUPABASE_PRIVATE_ASSETS_BUCKET"
  ].filter(Boolean);
  if (missing.length) {
    throw new SmokeSetupError("setup_failure", "live_smoke_missing_required_runtime", { missing });
  }
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.NODE_ENV = "test";
  mutableEnv.APP_ENV = mutableEnv.APP_ENV || "test";
  mutableEnv.REPOSITORY_ADAPTER = "drizzle";
}

function workspaceId() {
  return process.env.STUDIO_WORKSPACE_ID || "wks_default";
}

function smokeActorId() {
  return process.env.SMOKE_USER_ID || "image_mockup_smoke_owner";
}

function authedRequest(pathname: string, init: RequestInit = {}) {
  return new Request(`http://localhost:3001${pathname}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      cookie: `${SUPABASE_ACCESS_COOKIE}=smoke`
    }
  });
}

function authedPost(pathname: string, body?: Record<string, unknown>) {
  return authedRequest(pathname, {
    method: "POST",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
  });
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function publicProvider(provider: ImageGenerationProviderResolution) {
  return {
    status: provider.status,
    provider: provider.provider,
    model: provider.model ?? null,
    credentialSource: provider.credentialSource,
    setupRequired: provider.setupRequired,
    blockingReasons: provider.blockingReasons
  };
}

function safeErrorText(error: unknown) {
  const cause = typeof error === "object" && error && "cause" in error ? (error as { cause?: unknown }).cause : null;
  const message = cause instanceof Error && cause.message ? cause.message : error instanceof Error && error.message ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/hf_[A-Za-z0-9_]+/g, "hf_[redacted]");
}

function safeErrorInfo(error: unknown) {
  const err = typeof error === "object" && error ? error as Record<string, unknown> : {};
  const cause = typeof err.cause === "object" && err.cause ? err.cause as Record<string, unknown> : {};
  return {
    name: typeof err.name === "string" ? err.name : undefined,
    code: typeof err.code === "string" ? err.code : undefined,
    message: safeErrorText(error),
    causeName: typeof cause.name === "string" ? cause.name : undefined,
    causeCode: typeof cause.code === "string" ? cause.code : undefined,
    causeMessage: safeErrorText(cause)
  };
}

function timedFetch(timeoutMs: number): typeof fetch {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function isApprovedSmokeBrief(brief: WorkspaceRow | null | undefined) {
  return Boolean(brief && brief.status === "approved" && (brief.approved_for_generation === true || brief.approvedForGeneration === true));
}

export function assertLiveImageProvider(provider: ImageGenerationProviderResolution) {
  const isLocalDemo = provider.provider === "local_dev_mock" || provider.credentialSource === "local_demo";
  if (isLocalDemo) {
    throw new SmokeSetupError("setup_failure", "live_smoke_rejected_local_demo_provider", { provider: publicProvider(provider) });
  }
  if (provider.status !== "ready" || provider.provider !== "huggingface" || !provider.serverCredential?.token?.trim()) {
    throw new SmokeSetupError("setup_failure", "live_smoke_requires_real_huggingface_provider", { provider: publicProvider(provider) });
  }
}

export function assertLiveGeneratedAsset(generation: Record<string, any>, assetId: string) {
  if (!assetId.startsWith("asset_hf_")) {
    throw new SmokeSetupError("provider_response_failure", "live_smoke_rejected_non_huggingface_asset_id", { assetId });
  }
  const provider = generation.provider ?? {};
  if (provider.credentialSource === "local_demo" || provider.provider === "local_dev_mock") {
    throw new SmokeSetupError("provider_response_failure", "generation_used_local_demo_not_live_provider", { provider });
  }
  const generator = String(generation.asset?.generator ?? generation.assets?.[0]?.generator ?? "");
  if (generator && generator !== "huggingface") {
    throw new SmokeSetupError("provider_response_failure", "generation_asset_generator_not_huggingface", { assetId, generator });
  }
}

export function safePreflightDiagnostics(input: {
  workspaceId: string;
  smokeBriefMode: "create" | "existing";
  provider: ImageGenerationProviderResolution;
  storageReady: boolean;
  privateBucketName?: string;
}) {
  return {
    phase: "preflight",
    database: "ready",
    workspace: input.workspaceId,
    smokeBriefMode: input.smokeBriefMode,
    storage: input.storageReady ? "ready" : "not_ready",
    imageProvider: input.provider.provider,
    model: input.provider.model ?? null,
    credentialSource: input.provider.credentialSource,
    privateBucket: input.privateBucketName ? "configured" : "missing",
    token: input.provider.serverCredential?.token ? "present_masked" : "missing"
  };
}

export async function verifyImagePreviewResponse(response: Response, label: string) {
  const contentType = String(response.headers.get("content-type") ?? "");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200 || !contentType.startsWith("image/") || bytes.byteLength === 0) {
    throw new SmokeSetupError("preview_failure", `${label}_preview_failed`, {
      httpStatus: response.status,
      contentType: contentType || "missing",
      byteLength: bytes.byteLength
    });
  }
  return { contentType, byteLength: bytes.byteLength, bytes };
}

function colorDistance(red: number, green: number, blue: number, key: { red: number; green: number; blue: number }) {
  return Math.sqrt((red - key.red) ** 2 + (green - key.green) ** 2 + (blue - key.blue) ** 2);
}

export async function verifyChromaBackdrop(input: { bytes: Buffer; keyColor?: string; tolerance?: number }) {
  const keyColor = input.keyColor ?? "#FF00FF";
  const tolerance = Math.max(0, Math.min(Number(input.tolerance ?? 86), 255));
  const key = { red: 255, green: 0, blue: 255 };
  const raw = await sharp(input.bytes, { failOn: "warning" })
    .ensureAlpha()
    .resize({ width: 256, height: 256, fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = raw.info.width * raw.info.height;
  let nearKey = 0;
  let borderNearKey = 0;
  let borderPixels = 0;
  const borderWidth = Math.max(8, Math.round(Math.min(raw.info.width, raw.info.height) * 0.12));
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const x = pixel % raw.info.width;
    const y = Math.floor(pixel / raw.info.width);
    const offset = pixel * 4;
    const alpha = raw.data[offset + 3] ?? 255;
    const isBorder = x < borderWidth || y < borderWidth || x >= raw.info.width - borderWidth || y >= raw.info.height - borderWidth;
    if (isBorder) borderPixels += 1;
    if (alpha < 20) continue;
    const close = colorDistance(raw.data[offset] ?? 0, raw.data[offset + 1] ?? 0, raw.data[offset + 2] ?? 0, key) <= tolerance;
    if (close) nearKey += 1;
    if (close && isBorder) borderNearKey += 1;
  }
  const nearKeyPixelRatio = pixels ? nearKey / pixels : 0;
  const borderNearKeyPixelRatio = borderPixels ? borderNearKey / borderPixels : 0;
  if (nearKeyPixelRatio < 0.08 || borderNearKeyPixelRatio < 0.16) {
    throw new SmokeSetupError("provider_response_failure", "chroma_key_backdrop_not_detected", {
      keyColor,
      tolerance,
      nearKeyPixelRatio,
      borderNearKeyPixelRatio
    });
  }
  return { keyColor, tolerance, nearKeyPixelRatio, borderNearKeyPixelRatio, width: raw.info.width, height: raw.info.height };
}

async function ensureSmokeUserExists(actorId: string) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.id, actorId)).limit(1);
  if (existing[0]) return;
  await db.insert(users).values({
    id: actorId,
    email: `${actorId.replace(/[^a-zA-Z0-9._-]/g, "_")}@saltyfactory.local`,
    displayName: "Image Mockup Smoke Owner",
    status: "active",
    metadata: { smoke: true, createdBy: "smoke:image-mockup-live" }
  });
}

export async function runLivePreflight(repos: RepositoryBundle, actorId: string) {
  const config = parseEnv();
  const currentWorkspaceId = workspaceId();
  let workspace: Array<{ id: string }>;
  try {
    workspace = await getDb().select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, currentWorkspaceId)).limit(1);
  } catch (error) {
    throw new SmokeSetupError("database_failure", "smoke_workspace_lookup_failed", { error: safeErrorInfo(error), workspaceId: currentWorkspaceId });
  }
  if (!workspace[0]) {
    throw new SmokeSetupError("database_failure", "smoke_workspace_missing", { workspaceId: currentWorkspaceId });
  }
  await ensureSmokeUserExists(actorId);
  const provider = await resolveImageGenerationProvider({ workspaceId: currentWorkspaceId, repos, config });
  assertLiveImageProvider(provider);
  const storage = await checkStorageReadiness(config, timedFetch(20000));
  if (!storage.ok) {
    throw new SmokeSetupError("storage_failure", "storage_readiness_failed", {
      checks: storage.checks,
      setupRequired: storage.setupRequired,
      safeMessage: storage.safeMessage
    });
  }
  return {
    provider,
    storage,
    diagnostics: safePreflightDiagnostics({
      workspaceId: currentWorkspaceId,
      smokeBriefMode: process.env.SMOKE_BRIEF_ID ? "existing" : "create",
      provider,
      storageReady: storage.ok,
      privateBucketName: storage.environment.SUPABASE_PRIVATE_ASSETS_BUCKET.name
    })
  };
}

type DesignBriefCreateRoute = (req: Request) => Promise<Response>;
type DesignBriefApproveRoute = (req: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

export async function getOrCreateApprovedSmokeBrief(input: {
  repos: RepositoryBundle;
  createBriefPost: DesignBriefCreateRoute;
  approveBriefPost: DesignBriefApproveRoute;
}) {
  const currentWorkspaceId = workspaceId();
  const existingBriefId = process.env.SMOKE_BRIEF_ID?.trim();
  if (existingBriefId) {
    const brief = await input.repos.brief.getById(existingBriefId, currentWorkspaceId);
    if (!brief) {
      throw new SmokeSetupError("database_failure", "smoke_brief_id_not_found", { briefId: existingBriefId, workspaceId: currentWorkspaceId });
    }
    if (!isApprovedSmokeBrief(brief)) {
      throw new SmokeSetupError("database_failure", "smoke_brief_id_not_approved", { briefId: existingBriefId, status: brief.status });
    }
    return brief;
  }

  const createResponse = await input.createBriefPost(authedPost("/api/studio/design-briefs", {
    title: "Live smoke test artwork",
    phrase_text: "simple coral turquoise western seashell graphic",
    product_type: "tee",
    collection: "Live Smoke Tests",
    target_audience: "private beta smoke test",
    background_requirement: "transparent",
    art_direction: "Create a simple high-resolution print-on-demand artwork graphic, centered composition, coastal cowgirl boutique style, coral and turquoise western seashell motif, suitable for apparel printing, isolated artwork only on a flat solid #FF00FF chroma key background. Do not use #FF00FF or magenta inside the design. No shirt mockup, no model, no text, no watermark.",
    color_palette: ["coral", "turquoise", "cream", "navy"],
    output_width: 512,
    output_height: 512
  }));
  const created = await createResponse.json() as any;
  if (!created.ok || !created.brief?.id) {
    throw new SmokeSetupError("database_failure", "smoke_brief_create_failed", {
      httpStatus: createResponse.status,
      status: created.status,
      message: created.message ?? "Smoke brief creation failed."
    });
  }
  const briefId = String(created.brief.id);
  const approveResponse = await input.approveBriefPost(authedPost(`/api/studio/design-briefs/${briefId}/approve`), {
    params: Promise.resolve({ id: briefId })
  });
  const approved = await approveResponse.json() as any;
  if (!approved.ok || !approved.brief?.id || !isApprovedSmokeBrief(approved.brief)) {
    throw new SmokeSetupError("database_failure", "smoke_brief_approval_failed", {
      briefId,
      httpStatus: approveResponse.status,
      status: approved.status,
      message: approved.message ?? "Smoke brief approval failed.",
      blockingReasons: approved.blockingReasons ?? []
    });
  }
  return approved.brief as WorkspaceRow;
}

export async function internalPreviewBaseTemplateBytes(template: Record<string, any>) {
  const canvas = template.canvas && typeof template.canvas === "object" ? template.canvas : {};
  const width = Number(canvas.width ?? template.width ?? 1800);
  const height = Number(canvas.height ?? template.height ?? 2200);
  const productType = String(template.productType ?? template.product_type ?? "tee_front").replace(/_/g, " ");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f8fbfc"/>
    <rect x="${Math.round(width * 0.19)}" y="${Math.round(height * 0.13)}" width="${Math.round(width * 0.62)}" height="${Math.round(height * 0.70)}" rx="${Math.round(width * 0.06)}" fill="#f4eadb" stroke="#0b1f33" stroke-width="10"/>
    <rect x="${Math.round(width * 0.27)}" y="${Math.round(height * 0.06)}" width="${Math.round(width * 0.46)}" height="${Math.round(height * 0.11)}" rx="${Math.round(width * 0.05)}" fill="#ffffff" stroke="#dbe7ea" stroke-width="8"/>
    <text x="${Math.round(width / 2)}" y="${Math.round(height * 0.91)}" text-anchor="middle" font-family="Inter, Arial" font-size="${Math.max(34, Math.round(width * 0.035))}" fill="#526475">${productType} internal compositor preview</text>
  </svg>`);
  return sharp(svg).png().toBuffer();
}

export async function proveMockupContainsSourceArt(input: {
  sourceBytes: Buffer;
  mockupBytes: Buffer;
  template: Record<string, any>;
}) {
  const baseTemplateBytes = await internalPreviewBaseTemplateBytes(input.template);
  const mockupChecksum = sha256(input.mockupBytes);
  const baseChecksum = sha256(baseTemplateBytes);
  const zone = (input.template.canvas as any)?.art_zone ?? {};
  const left = Math.max(0, Math.round(Number(zone.x ?? 450)));
  const top = Math.max(0, Math.round(Number(zone.y ?? 520)));
  const width = Math.max(1, Math.round(Number(zone.width ?? 900)));
  const height = Math.max(1, Math.round(Number(zone.height ?? 900)));
  const normalizedSource = await sharp(input.sourceBytes, { failOn: "warning" })
    .ensureAlpha()
    .resize(width, height, { fit: "inside", withoutEnlargement: false })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sampleWidth = Math.min(width, normalizedSource.info.width);
  const sampleHeight = Math.min(height, normalizedSource.info.height);
  const [mockupRegion, baseRegion] = await Promise.all([
    sharp(input.mockupBytes, { failOn: "warning" }).ensureAlpha().extract({ left, top, width: sampleWidth, height: sampleHeight }).raw().toBuffer(),
    sharp(baseTemplateBytes, { failOn: "warning" }).ensureAlpha().extract({ left, top, width: sampleWidth, height: sampleHeight }).raw().toBuffer()
  ]);
  let sampled = 0;
  let sourceLikePixels = 0;
  let changedPixels = 0;
  const stride = Math.max(1, Math.floor((sampleWidth * sampleHeight) / 2000));
  for (let pixel = 0; pixel < sampleWidth * sampleHeight; pixel += stride) {
    const offset = pixel * 4;
    const alpha = normalizedSource.data[offset + 3] ?? 0;
    if (alpha < 20) continue;
    sampled++;
    const sourceDelta = Math.abs((normalizedSource.data[offset] ?? 0) - (mockupRegion[offset] ?? 0))
      + Math.abs((normalizedSource.data[offset + 1] ?? 0) - (mockupRegion[offset + 1] ?? 0))
      + Math.abs((normalizedSource.data[offset + 2] ?? 0) - (mockupRegion[offset + 2] ?? 0));
    const baseDelta = Math.abs((baseRegion[offset] ?? 0) - (mockupRegion[offset] ?? 0))
      + Math.abs((baseRegion[offset + 1] ?? 0) - (mockupRegion[offset + 1] ?? 0))
      + Math.abs((baseRegion[offset + 2] ?? 0) - (mockupRegion[offset + 2] ?? 0));
    if (sourceDelta <= 75) sourceLikePixels++;
    if (baseDelta >= 30) changedPixels++;
  }
  const sourceLikeRatio = sampled ? sourceLikePixels / sampled : 0;
  const changedRatio = sampled ? changedPixels / sampled : 0;
  const passed = mockupChecksum !== baseChecksum && sampled > 0 && sourceLikeRatio > 0.15 && changedRatio > 0.15;
  if (!passed) {
    throw new SmokeSetupError("mockup_render_failure", "mockup_pixel_proof_failed", {
      checksumDiffersFromBase: mockupChecksum !== baseChecksum,
      sampledPixels: sampled,
      sourceLikeRatio,
      changedRatio
    });
  }
  return {
    passed: true,
    checksumDiffersFromBase: true,
    sampledPixels: sampled,
    sourceLikeRatio,
    changedRatio
  };
}

async function main() {
  if (process.env.RUN_LIVE_IMAGE_MOCKUP_SMOKE !== "true") {
    console.log("smoke:image-mockup-live skipped; set RUN_LIVE_IMAGE_MOCKUP_SMOKE=true to run.");
    return;
  }
  const watchdogMs = Math.max(30000, Math.min(Number(process.env.LIVE_IMAGE_MOCKUP_SMOKE_TIMEOUT_MS || 180000), 600000));
  const watchdog = setTimeout(() => {
    console.error(JSON.stringify({
      ok: false,
      category: "setup_failure",
      code: "live_smoke_timeout",
      phase: currentSmokePhase,
      timeoutMs: watchdogMs
    }));
    process.exit(1);
  }, watchdogMs);
  loadLocalEnv();
  requireLiveRuntimeConfig();
  (process.env as Record<string, string | undefined>).PLAYWRIGHT_AUTH_BYPASS = "true";
  const actorId = smokeActorId();
  setSmokePhase("auth_setup");

  setSupabaseUserVerifierForTests(async (token) => token === "smoke" ? { id: actorId, email: "smoke@saltyfactory.local", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, authorizedWorkspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));
  await requireProviderMutationPermission(authedRequest("/api/studio/smoke-auth-check"), workspaceId());

  setSmokePhase("route_imports");
  const [
    { POST: createBriefPost },
    { POST: approveBriefPost },
    { POST: sendToGenerationPost },
    { GET: assetPreviewGet },
    { GET: assetDerivativePreviewGet },
    { POST: runQaPost },
    { POST: approveAssetPost },
    { POST: mockupGeneratePost },
    { GET: mockupPreviewGet }
  ] = await Promise.all([
    import("../apps/studio/app/api/studio/design-briefs/route"),
    import("../apps/studio/app/api/studio/design-briefs/[id]/approve/route"),
    import("../apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route"),
    import("../apps/studio/app/api/studio/assets/[id]/preview/route"),
    import("../apps/studio/app/api/studio/assets/[id]/derivatives/[kind]/preview/route"),
    import("../apps/studio/app/api/studio/assets/[id]/run-qa/route"),
    import("../apps/studio/app/api/studio/assets/[id]/approve/route"),
    import("../apps/studio/app/api/studio/mockups/generate/route"),
    import("../apps/studio/app/api/studio/mockups/[id]/preview/route")
  ]);

  const repos = createRepositories();
  setSmokePhase("preflight");
  const preflight = await runLivePreflight(repos, actorId);
  console.log(JSON.stringify(preflight.diagnostics));
  setSmokePhase("brief_setup");
  const brief = await getOrCreateApprovedSmokeBrief({ repos, createBriefPost, approveBriefPost });
  const briefId = String(brief.id);

  setSmokePhase("huggingface_generation", { briefId });
  const generationResponse = await sendToGenerationPost(authedPost(`/api/studio/design-briefs/${briefId}/send-to-generation`, {
    variantCount: 1,
    width: 512,
    height: 512,
    numInferenceSteps: 1,
    seed: 140704
  }), {
    params: Promise.resolve({ id: briefId })
  });
  const generation = await generationResponse.json() as any;
  if (!generation.ok) {
    throw new Error(JSON.stringify({
      status: "generation_failed",
      httpStatus: generationResponse.status,
      errorStatus: generation.errorStatus ?? generation.status,
      safeMessage: generation.safeMessage ?? generation.message ?? "Generation failed before an image was stored.",
      blockingReasons: generation.blockingReasons ?? generation.setupRequired ?? []
    }));
  }
  const assetId = String(generation.asset.id);
  assertLiveGeneratedAsset(generation, assetId);

  setSmokePhase("preview_verification", { assetId });
  const preview = await assetPreviewGet(authedRequest(`/api/studio/assets/${assetId}/preview`), { params: Promise.resolve({ id: assetId }) });
  const assetPreviewProof = await verifyImagePreviewResponse(preview, "asset_master");
  const chromaBackdropProof = await verifyChromaBackdrop({ bytes: assetPreviewProof.bytes, keyColor: "#FF00FF" });
  const derivativeProofs: Record<SmokeDerivativeKind, { contentType: string; byteLength: number; bytes: Buffer }> = {} as Record<SmokeDerivativeKind, { contentType: string; byteLength: number; bytes: Buffer }>;
  for (const kind of smokeDerivativeKinds) {
    const derivativePreview = await assetDerivativePreviewGet(authedRequest(`/api/studio/assets/${assetId}/derivatives/${kind}/preview`), {
      params: Promise.resolve({ id: assetId, kind })
    });
    derivativeProofs[kind] = await verifyImagePreviewResponse(derivativePreview, `asset_derivative_${kind}`);
  }
  const printPngTransparency = await inspectImageTransparency(derivativeProofs.print_png.bytes);
  if (!printPngTransparency.hasAlpha || printPngTransparency.transparentPixelRatio < 0.02) {
    throw new SmokeSetupError("derivative_failure", "chroma_print_png_alpha_missing", {
      hasAlpha: printPngTransparency.hasAlpha,
      transparentPixelRatio: printPngTransparency.transparentPixelRatio
    });
  }
  const printPngAsset = await repos.asset.getById(`${assetId}_print_png`, workspaceId());
  const printPngMetadata = printPngAsset?.metadata && typeof printPngAsset.metadata === "object" ? printPngAsset.metadata as Record<string, unknown> : {};

  setSmokePhase("asset_qa_and_approval", { assetId });
  await runQaPost(authedPost(`/api/studio/assets/${assetId}/run-qa`), { params: Promise.resolve({ id: assetId }) });
  await approveAssetPost(authedPost(`/api/studio/assets/${assetId}/approve`), { params: Promise.resolve({ id: assetId }) });

  setSmokePhase("mockup_render", { assetId });
  const mockupResponse = await mockupGeneratePost(authedPost("/api/studio/mockups/generate", { asset_id: assetId, mode: "recommended" }));
  const mockupBody = await mockupResponse.json() as any;
  if (!mockupBody.ok) throw new SmokeSetupError("mockup_render_failure", "mockup_failed", { status: mockupBody.status, message: mockupBody.message, blockingReasons: mockupBody.blockingReasons ?? [] });
  const mockupId = String(mockupBody.mockup.id);
  const mockupPreview = await mockupPreviewGet(authedRequest(`/api/studio/mockups/${mockupId}/preview`), { params: Promise.resolve({ id: mockupId }) });
  const mockupPreviewProof = await verifyImagePreviewResponse(mockupPreview, "mockup");
  const mockupRecord = await repos.mockup.getById(mockupId, workspaceId());
  if (!mockupRecord) throw new SmokeSetupError("mockup_render_failure", "mockup_record_missing", { mockupId });
  const mockupMetadata = mockupRecord.metadata && typeof mockupRecord.metadata === "object" ? mockupRecord.metadata as Record<string, unknown> : {};
  if (String(mockupRecord.asset_id ?? mockupRecord.assetId) !== assetId) {
    throw new SmokeSetupError("mockup_render_failure", "mockup_source_asset_mismatch", { mockupId, assetId });
  }
  if (mockupMetadata.renderer_version !== "internal-sharp-v1" || mockupMetadata.derivative_kind !== "print_png" || mockupMetadata.derivative_asset_id !== `${assetId}_print_png`) {
    throw new SmokeSetupError("mockup_render_failure", "mockup_metadata_incomplete", {
      mockupId,
      rendererVersion: mockupMetadata.renderer_version,
      derivativeKind: mockupMetadata.derivative_kind,
      derivativeAssetId: mockupMetadata.derivative_asset_id
    });
  }
  const templateRows = await getDb().select().from(mockupTemplates).where(eq(mockupTemplates.id, String(mockupRecord.template_id ?? mockupRecord.templateId))).limit(1);
  const template = templateRows[0];
  if (!template) throw new SmokeSetupError("mockup_render_failure", "mockup_template_missing_after_render", { templateId: mockupRecord.template_id ?? mockupRecord.templateId });
  setSmokePhase("mockup_pixel_proof", { assetId, mockupId });
  const pixelProof = await proveMockupContainsSourceArt({
    sourceBytes: derivativeProofs.print_png.bytes,
    mockupBytes: mockupPreviewProof.bytes,
    template: template as Record<string, any>
  });

  setSmokePhase("report_write", { assetId, mockupId });
  const derivativePreviewPaths = Object.fromEntries(smokeDerivativeKinds.map((kind) => [kind, `/api/studio/assets/${assetId}/derivatives/${kind}/preview`]));
  const reportPath = path.resolve(process.cwd(), ".saltyfactory-private", "smoke-reports", `image-mockup-${Date.now()}.json`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify({
    briefId,
    generationJobId: generation.job.id,
    assetId,
    derivativeKinds: smokeDerivativeKinds,
    chromaBackdropProof,
    printPngTransparency,
    printPngMetadata: {
      chroma_key_enabled: printPngMetadata.chroma_key_enabled,
      chroma_key_applied: printPngMetadata.chroma_key_applied,
      chroma_key_color: printPngMetadata.chroma_key_color,
      chroma_key_tolerance: printPngMetadata.chroma_key_tolerance,
      chroma_key_keyed_pixel_ratio: printPngMetadata.chroma_key_keyed_pixel_ratio,
      chroma_key_remaining_near_key_pixel_ratio: printPngMetadata.chroma_key_remaining_near_key_pixel_ratio,
      transparent_background_ready: printPngMetadata.transparent_background_ready
    },
    mockupId,
    rendererVersion: "internal-sharp-v1",
    pixelProof: {
      passed: pixelProof.passed,
      sampledPixels: pixelProof.sampledPixels,
      sourceLikeRatio: pixelProof.sourceLikeRatio,
      changedRatio: pixelProof.changedRatio
    },
    assetPreviewPath: `/api/studio/assets/${assetId}/preview`,
    derivativePreviewPaths,
    mockupPreviewPath: `/api/studio/mockups/${mockupId}/preview`
  }, null, 2));
  console.log(JSON.stringify({
    ok: true,
    briefId,
    generationJobId: generation.job.id,
    assetId,
    derivativeKinds: smokeDerivativeKinds,
    chromaBackdropProof,
    printPngTransparency,
    printPngMetadata: {
      chroma_key_enabled: printPngMetadata.chroma_key_enabled,
      chroma_key_applied: printPngMetadata.chroma_key_applied,
      chroma_key_color: printPngMetadata.chroma_key_color,
      chroma_key_tolerance: printPngMetadata.chroma_key_tolerance,
      chroma_key_keyed_pixel_ratio: printPngMetadata.chroma_key_keyed_pixel_ratio,
      chroma_key_remaining_near_key_pixel_ratio: printPngMetadata.chroma_key_remaining_near_key_pixel_ratio,
      transparent_background_ready: printPngMetadata.transparent_background_ready
    },
    mockupId,
    rendererVersion: "internal-sharp-v1",
    pixelProof: {
      passed: pixelProof.passed,
      sampledPixels: pixelProof.sampledPixels,
      sourceLikeRatio: pixelProof.sourceLikeRatio,
      changedRatio: pixelProof.changedRatio
    },
    assetPreviewPath: `/api/studio/assets/${assetId}/preview`,
    derivativePreviewPaths,
    mockupPreviewPath: `/api/studio/mockups/${mockupId}/preview`,
    reportPath
  }));
  clearTimeout(watchdog);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
