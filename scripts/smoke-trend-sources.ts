import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRepositories } from "@saltyfactory/db";
import { ensureSaltyCowhideTrendProfile, runTrendSourcesForProfile } from "@saltyfactory/integrations";
import { parseEnv } from "@saltyfactory/config";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const actorId = "smoke_trend_source_runner";

function requireSmokeEnabled() {
  if (process.env.RUN_TREND_SOURCE_SMOKE !== "true") {
    console.log(JSON.stringify({ ok: true, status: "skipped", reason: "RUN_TREND_SOURCE_SMOKE is not true" }, null, 2));
    process.exit(0);
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
    // Local env files are optional.
  }
}

export function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "apps/studio/.env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

function candidateSecrets(config: ReturnType<typeof parseEnv>) {
  return [
    config.ETSY_API_KEY,
    config.ETSY_CLIENT_ID,
    config.EBAY_CLIENT_ID,
    config.EBAY_CLIENT_SECRET,
    config.PINTEREST_ACCESS_TOKEN,
    config.GOOGLE_TRENDS_ALPHA_API_KEY,
    config.GOOGLE_TRENDS_ALPHA_ACCESS_TOKEN,
    config.META_AD_LIBRARY_ACCESS_TOKEN,
    config.REDDIT_ACCESS_TOKEN,
    config.REDDIT_CLIENT_ID,
    config.REDDIT_CLIENT_SECRET,
    config.TIKTOK_ACCESS_TOKEN,
    config.LICENSED_TREND_PROVIDER_API_KEY
  ].filter((value): value is string => Boolean(value && value.trim()));
}

function summarize(result: Awaited<ReturnType<typeof runTrendSourcesForProfile>>) {
  const successes = result.sourceResults.filter((row) => row.status === "success" || row.status === "partial");
  const blocked = result.sourceResults.filter((row) => row.status === "blocked");
  const failures = result.sourceResults.filter((row) => row.status === "failed");
  return {
    successes: successes.length,
    blocked: blocked.length,
    failures: failures.length,
    totalSignals: successes.reduce((sum, row) => sum + row.normalizedSignalCount, 0),
    totalCitations: successes.reduce((sum, row) => sum + row.citationCount, 0)
  };
}

function assertLiveIfConfigured(config: ReturnType<typeof parseEnv>, result: Awaited<ReturnType<typeof runTrendSourcesForProfile>>) {
  const byKey = Object.fromEntries(result.sourceResults.map((row) => [row.sourceKey, row])) as Record<string, (typeof result.sourceResults)[number] | undefined>;
  const configuredChecks: Array<{ enabled: boolean; key: string }> = [
    { enabled: Boolean(config.ETSY_API_KEY || config.ETSY_CLIENT_ID), key: "etsy_v3" },
    { enabled: Boolean(config.EBAY_CLIENT_ID && config.EBAY_CLIENT_SECRET), key: "ebay_browse" }
  ];
  for (const check of configuredChecks) {
    if (!check.enabled) continue;
    const row = byKey[check.key];
    if (!row || row.status === "blocked") {
      throw new Error(JSON.stringify({ ok: false, code: "configured_source_blocked", sourceKey: check.key, result: row ?? null }));
    }
  }
}

export async function runTrendSourcesSmoke() {
  loadLocalEnv();
  requireSmokeEnabled();

  const config = parseEnv();
  const repos = createRepositories();
  const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
  const result = await runTrendSourcesForProfile({
    repos,
    workspaceId,
    actorId,
    config,
    profileId: String(profile.id)
  });
  const summary = summarize(result);
  const report = {
    ok: summary.failures === 0,
    profileId: String(profile.id),
    sourcesAttempted: result.sourcesAttempted,
    successes: summary.successes,
    blocked: summary.blocked,
    failures: summary.failures,
    totalSignals: summary.totalSignals,
    totalCitations: summary.totalCitations,
    perSource: result.sourceResults,
    tokenEchoDetected: false
  };

  const serialized = JSON.stringify(report);
  const tokenEchoDetected = candidateSecrets(config).some((candidate) => serialized.includes(candidate));
  report.tokenEchoDetected = tokenEchoDetected;
  if (tokenEchoDetected) {
    throw new Error(JSON.stringify({ ok: false, code: "trend_source_token_echo_detected" }));
  }

  assertLiveIfConfigured(config, result);

  const reportDir = path.resolve(process.cwd(), "test-results", "trend-sources");
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runTrendSourcesSmoke().catch(async (error) => {
    const reportDir = path.resolve(process.cwd(), "test-results", "trend-sources");
    await mkdir(reportDir, { recursive: true });
    const failure = {
      ok: false,
      code: "trend_source_smoke_failed",
      message: error instanceof Error ? error.message : String(error)
    };
    await writeFile(path.join(reportDir, "report.json"), JSON.stringify(failure, null, 2), "utf8");
    console.error(JSON.stringify(failure, null, 2));
    process.exit(1);
  });
}
