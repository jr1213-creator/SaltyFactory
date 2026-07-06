import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { ensureSaltyCowhideTrendProfile, getTrendSignalRunDetail, runTrendSourcesForProfile } from "@saltyfactory/integrations";
import { POST as createRunPost } from "../apps/studio/app/api/studio/trend-intelligence/runs/create/route";

const workspaceId = "wks_default";
const actorId = "trend_safety_owner";
const originalEnv = { ...process.env };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trend source safety", () => {
  it("never echoes API keys in aggregate results or run detail payloads", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const token = "etsy_secret_do_not_echo";
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["etsy_v3"],
      keywords: ["coastal cowgirl"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development", ETSY_API_KEY: token }),
      fetchers: {
        etsy_v3: async () => jsonResponse({
          results: [
            {
              listing_id: 987,
              title: "Coastal Cowgirl Charm",
              tags: ["cowgirl", "charm"],
              price: { amount: "22.00", currency_code: "USD" },
              url: "https://etsy.com/listing/987"
            }
          ]
        })
      }
    });

    const runId = result.sourceResults[0]?.runId;
    expect(runId).toBeTruthy();
    const detail = await getTrendSignalRunDetail({ repos, workspaceId, runId: runId as string });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(detail)).not.toContain(token);
  });

  it("rejects proxy or captcha fields in the route body", async () => {
    setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: actorId, email: "owner@saltycowhide.com", emailVerified: true } : null);
    setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
      id: user.id,
      email: user.email,
      role: "owner",
      workspaceId,
      supabaseUserId: user.id
    }));
    const response = await createRunPost(new Request("http://localhost:3001/api/studio/trend-intelligence/runs/create", {
      method: "POST",
      headers: {
        cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ profileId: "twatch_salty_cowhide", proxyUrl: "http://127.0.0.1:8080", captchaSolver: "stealth" })
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ failureCode: "trend_source_unsafe_automation_requested" });
  });

  it("does not add scraper-style dependencies or forbidden provider paths", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }).toLowerCase();
    expect(deps).not.toMatch(/puppeteer|cheerio|crawlee|apify|selenium-webdriver|playwright-extra/);

    const source = readFileSync(path.join(process.cwd(), "packages/integrations/src/trend-intelligence.ts"), "utf8");
    expect(source).not.toMatch(/ollama|printify|createProductDraft|publishProductGuarded|send-to-generation|huggingface/i);
  });
});
