import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

type AuthIdentity = {
  id: string;
  email: string;
  emailVerified: boolean;
};

type AuthorizedStudioUser = {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  supabaseUserId: string;
};

type RepoAssetRow = {
  id: string;
  metadata?: Record<string, unknown> | null;
  file_path?: string | null;
  asset_type?: string | null;
};

type LocalFolderSmokeReport = {
  ok: boolean;
  sourceDir: string;
  importedCount: number;
  assetIds: string[];
  sourceProvider: string;
  sourceType: string;
  derivativeIds: string[];
  printPngAlpha: boolean;
  chromaCleanup: boolean;
  archivedFiles: string[];
  hfCalled: false;
  printifyCalled: false;
  shopifyCalled: false;
};

export class LocalFolderSmokeError extends Error {
  constructor(readonly code: string, readonly safeDetails: Record<string, unknown> = {}) {
    super(JSON.stringify({ ok: false, code, ...safeDetails }));
    this.name = "LocalFolderSmokeError";
  }
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
    // optional
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "apps/studio/.env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

function workspaceId() {
  return process.env.STUDIO_WORKSPACE_ID || "wks_default";
}

function actorId() {
  return process.env.SMOKE_USER_ID || "local_folder_smoke_owner";
}

function authedPost(cookieName: string, pathname: string, body?: Record<string, unknown>) {
  return new Request(`http://localhost:3001${pathname}`, {
    method: "POST",
    headers: {
      cookie: `${cookieName}=smoke`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

async function ensureSmokeUserExists(input: { id: string; getDb: () => any; users: any; eq: any; }) {
  const db = input.getDb();
  const existing = await db.select().from(input.users).where(input.eq(input.users.id, input.id)).limit(1);
  if (existing[0]) return;
  await db.insert(input.users).values({
    id: input.id,
    email: `${input.id.replace(/[^a-zA-Z0-9._-]/g, "_")}@saltyfactory.local`,
    displayName: "Local Folder Smoke Owner",
    status: "active",
    metadata: { smoke: true, createdBy: "smoke:local-folder-image-import" }
  });
}

async function assertWorkspaceExists(input: { id: string; getDb: () => any; workspaces: any; eq: any; }) {
  const rows = await input.getDb().select({ id: input.workspaces.id }).from(input.workspaces).where(input.eq(input.workspaces.id, input.id)).limit(1);
  if (!rows[0]) throw new LocalFolderSmokeError("smoke_workspace_missing", { workspaceId: input.id });
}

async function getOrCreateApprovedSmokeBrief(input: {
  repos: any;
  createBriefPost: (req: Request) => Promise<Response>;
  approveBriefPost: (req: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  cookieName: string;
}) {
  const explicitBriefId = process.env.SMOKE_BRIEF_ID?.trim();
  if (explicitBriefId) {
    const brief = await input.repos.brief.getById(explicitBriefId, workspaceId());
    if (!brief) throw new LocalFolderSmokeError("smoke_brief_not_found", { briefId: explicitBriefId });
    if (!(brief.status === "approved" && (brief.approved_for_generation === true || brief.approvedForGeneration === true))) {
      throw new LocalFolderSmokeError("smoke_brief_not_approved", { briefId: explicitBriefId, status: brief.status });
    }
    return brief;
  }

  const createResponse = await input.createBriefPost(authedPost(input.cookieName, "/api/studio/design-briefs", {
    title: "Local folder smoke import artwork",
    phrase_text: "local folder import",
    product_type: "tee",
    collection: "Local Folder Smoke Tests",
    target_audience: "private beta smoke test",
    background_requirement: "transparent",
    art_direction: "Import external artwork from the approved local folder and treat it as print-on-demand source art on a flat solid #FF00FF chroma background.",
    color_palette: ["coral", "turquoise", "cream", "navy"],
    output_width: 3000,
    output_height: 3000
  }));
  const created = await createResponse.json() as any;
  if (!created.ok || !created.brief?.id) {
    throw new LocalFolderSmokeError("smoke_brief_create_failed", { status: created.status, message: created.message, httpStatus: createResponse.status });
  }
  const briefId = String(created.brief.id);
  const approveResponse = await input.approveBriefPost(authedPost(input.cookieName, `/api/studio/design-briefs/${briefId}/approve`), {
    params: Promise.resolve({ id: briefId })
  });
  const approved = await approveResponse.json() as any;
  if (!approved.ok) throw new LocalFolderSmokeError("smoke_brief_approve_failed", { briefId, status: approved.status, message: approved.message });
  const brief = await input.repos.brief.getById(briefId, workspaceId());
  if (!brief) throw new LocalFolderSmokeError("smoke_brief_missing_after_approve", { briefId });
  return brief;
}

async function runSmoke() {
  loadLocalEnv();
  if (process.env.RUN_LOCAL_FOLDER_IMAGE_SMOKE !== "true") {
    console.log("smoke:local-folder-image-import skipped; set RUN_LOCAL_FOLDER_IMAGE_SMOKE=true to run.");
    return null;
  }
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  (process.env as Record<string, string | undefined>).APP_ENV = process.env.APP_ENV || "test";
  (process.env as Record<string, string | undefined>).REPOSITORY_ADAPTER = "drizzle";

  const [{ eq }, authModule, configModule, dbModule] = await Promise.all([
    import("drizzle-orm"),
    import(pathToFileURL(path.resolve(process.cwd(), "packages/auth/src/index.ts")).href),
    import(pathToFileURL(path.resolve(process.cwd(), "packages/config/src/index.ts")).href),
    import(pathToFileURL(path.resolve(process.cwd(), "packages/db/src/index.ts")).href)
  ]);
  const { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } = authModule;
  const { parseEnv } = configModule;
  const { createRepositories, getDb, users, workspaces } = dbModule;
  const config = parseEnv();
  if (config.APP_ENV === "production" || config.NODE_ENV === "production") {
    throw new LocalFolderSmokeError("local_folder_source_not_allowed_in_production");
  }
  if (config.IMAGE_GENERATION_PROVIDER !== "local_folder") {
    throw new LocalFolderSmokeError("local_folder_source_disabled", { provider: config.IMAGE_GENERATION_PROVIDER });
  }
  if (!config.LOCAL_IMAGE_SOURCE_DIR.trim()) {
    throw new LocalFolderSmokeError("local_folder_source_missing");
  }

  await assertWorkspaceExists({ id: workspaceId(), getDb, workspaces, eq });
  await ensureSmokeUserExists({ id: actorId(), getDb, users, eq });
  setSupabaseUserVerifierForTests(async (token: string): Promise<AuthIdentity | null> => token === "smoke" ? { id: actorId(), email: "smoke@saltyfactory.local", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user: AuthIdentity, authorizedWorkspaceId: string): Promise<AuthorizedStudioUser> => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));

  const repos = createRepositories();
  const originalFetch = globalThis.fetch;
  const unexpectedFetches: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    unexpectedFetches.push(url);
    throw new Error(`unexpected_network_call:${url}`);
  }) as typeof fetch;

  try {
    const [{ POST: createBriefPost }, { POST: approveBriefPost }, { POST: sendToGenerationPost }] = await Promise.all([
      import(pathToFileURL(path.resolve(process.cwd(), "apps/studio/app/api/studio/design-briefs/route.ts")).href),
      import(pathToFileURL(path.resolve(process.cwd(), "apps/studio/app/api/studio/design-briefs/[id]/approve/route.ts")).href),
      import(pathToFileURL(path.resolve(process.cwd(), "apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route.ts")).href)
    ]);

    const brief = await getOrCreateApprovedSmokeBrief({ repos, createBriefPost, approveBriefPost, cookieName: SUPABASE_ACCESS_COOKIE });
    const response = await sendToGenerationPost(authedPost(SUPABASE_ACCESS_COOKIE, `/api/studio/design-briefs/${brief.id}/send-to-generation`, { variantCount: 5 }), {
      params: Promise.resolve({ id: String(brief.id) })
    });
    const body = await response.json() as any;
    if (!body.ok) throw new LocalFolderSmokeError(String(body.status ?? "local_folder_import_failed"), { message: body.message, blockingReasons: body.blockingReasons });

    const assets = Array.isArray(body.assets) ? body.assets : body.asset ? [body.asset] : [];
    if (!assets.length) throw new LocalFolderSmokeError("local_folder_import_failed", { message: "No imported assets were returned." });
    const derivativeIds: string[] = [];
    const archivedFiles: string[] = [];
    let printPngAlpha = false;
    let chromaCleanup = false;

    for (const item of assets) {
      const asset = await repos.asset.getById(String(item.id), workspaceId());
      if (!asset) throw new LocalFolderSmokeError("local_folder_import_failed", { assetId: item.id, message: "Imported asset row missing." });
      const meta = asset.metadata && typeof asset.metadata === "object" ? asset.metadata as Record<string, unknown> : {};
      const derivatives = (await repos.asset.listByWorkspace(workspaceId()) as RepoAssetRow[]).filter((row: RepoAssetRow) => {
        const derivativeMeta = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
        return String(derivativeMeta.source_asset_id ?? derivativeMeta.sourceAssetId ?? "") === String(asset.id);
      });
      derivativeIds.push(...derivatives.map((row: RepoAssetRow) => String(row.id)));
      const printPng = derivatives.find((row: RepoAssetRow) => String((row.metadata as any)?.derivative_kind ?? row.asset_type) === "print_png");
      if (!printPng) throw new LocalFolderSmokeError("local_folder_import_failed", { assetId: asset.id, message: "print_png derivative missing." });
      const storageKey = String(printPng.file_path ?? "");
      const localPath = path.resolve(process.cwd(), ".saltyfactory-private", "assets", workspaceId(), path.basename(storageKey));
      const bytes = await readFile(localPath);
      const transparency = await sharp(bytes, { failOn: "warning" }).metadata();
      const alphaStats = await sharp(bytes, { failOn: "warning" }).ensureAlpha().resize({ width: 256, height: 256, fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
      let transparentPixels = 0;
      for (let index = 3; index < alphaStats.data.length; index += 4) {
        if ((alphaStats.data[index] ?? 255) < 16) transparentPixels += 1;
      }
      const transparentPixelRatio = alphaStats.info.width * alphaStats.info.height ? transparentPixels / (alphaStats.info.width * alphaStats.info.height) : 0;
      if (transparency.hasAlpha && transparentPixelRatio > 0.02) printPngAlpha = true;
      const printMeta = printPng.metadata && typeof printPng.metadata === "object" ? printPng.metadata as Record<string, unknown> : {};
      chromaCleanup = chromaCleanup || printMeta.chroma_key_applied === true || printMeta.chromaKeyApplied === true;
      const archiveDir = path.resolve(config.LOCAL_IMAGE_ARCHIVE_DIR || path.join(config.LOCAL_IMAGE_SOURCE_DIR, "processed"));
      const archived = path.resolve(archiveDir);
      try {
        const files = await import("node:fs/promises").then((fs) => fs.readdir(archived));
        archivedFiles.push(...files.filter((name) => name.includes(String(meta.original_filename ?? ""))).map((name) => path.join(archived, name)));
      } catch {
        // no-op
      }
    }

    if (unexpectedFetches.some((url) => /huggingface|printify|shopify/i.test(url))) {
      throw new LocalFolderSmokeError("unexpected_provider_call", { unexpectedFetches });
    }

    const report: LocalFolderSmokeReport = {
      ok: true,
      sourceDir: config.LOCAL_IMAGE_SOURCE_DIR,
      importedCount: assets.length,
      assetIds: assets.map((item: any) => String(item.id)),
      sourceProvider: "local_folder",
      sourceType: "external_generated",
      derivativeIds,
      printPngAlpha,
      chromaCleanup,
      archivedFiles,
      hfCalled: false,
      printifyCalled: false,
      shopifyCalled: false
    };

    const reportDir = path.resolve(process.cwd(), "test-results", "local-folder-image-import");
    await mkdir(reportDir, { recursive: true });
    await writeFile(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    globalThis.fetch = originalFetch;
    setSupabaseUserVerifierForTests(null);
    setWorkspaceAuthorizerForTests(null);
  }
}

runSmoke().catch((error) => {
  const payload = error instanceof LocalFolderSmokeError
    ? { ok: false, code: error.code, ...error.safeDetails }
    : { ok: false, code: "local_folder_import_failed", message: error instanceof Error ? error.message : String(error) };
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
