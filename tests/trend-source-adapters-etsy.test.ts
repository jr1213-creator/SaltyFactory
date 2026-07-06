import { describe, expect, it, vi } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  ensureSaltyCowhideTrendProfile,
  ensureTrendSourceRegistry,
  ETSY_INVALID_KEYWORD,
  SOURCE_AUTH_MISSING,
  SOURCE_INVALID_RESPONSE,
  SOURCE_RATE_LIMITED,
  runTrendSourcesForProfile
} from "@saltyfactory/integrations";

const workspaceId = "wks_default";
const actorId = "trend_etsy_owner";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Etsy trend source adapter", () => {
  it("queries the official Etsy endpoint, normalizes results, and persists citations", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    await ensureTrendSourceRegistry({
      repos,
      workspaceId,
      actorId,
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development", ETSY_API_KEY: "etsy_live_key" })
    });
    const fetcher = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      expect(String(url)).toContain("https://openapi.etsy.com/v3/application/listings/active");
      const parsed = new URL(String(url));
      expect(parsed.searchParams.get("keywords")).toBe("coastal cowgirl");
      expect((init?.headers as Record<string, string>)["x-api-key"]).toBe("etsy_live_key");
      return jsonResponse({
        results: [
          {
            listing_id: 123,
            title: "Coastal Cowgirl Ornament",
            tags: ["cowgirl", "ornament"],
            price: { amount: "24.00", currency_code: "USD" },
            url: "https://etsy.com/listing/123"
          }
        ]
      });
    });

    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["etsy_v3"],
      keywords: ["coastal cowgirl"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development", ETSY_API_KEY: "etsy_live_key" }),
      fetchers: { etsy_v3: fetcher }
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "success", normalizedSignalCount: 1, citationCount: 1 });
    const [signal] = await repos.trend.listByWorkspace(workspaceId);
    expect(signal).toMatchObject({
      source_key: "etsy_v3",
      signal_type: "etsy_listing",
      normalized_title: "Coastal Cowgirl Ornament",
      price_currency: "USD"
    });
    const citations = await repos.trendIntelligence.citations.listByWorkspace(workspaceId);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({ source_key: "etsy_v3", citation_url: "https://etsy.com/listing/123" });
  });

  it("blocks when Etsy credentials are missing", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["etsy_v3"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development" })
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "blocked", failureCode: SOURCE_AUTH_MISSING });
  });

  it("rejects invalid short keywords before the Etsy request runs", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    await repos.trendIntelligence.profiles.update(String(profile.id), { keywords: ["ab"] });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["etsy_v3"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development", ETSY_API_KEY: "etsy_short_key" })
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "blocked", failureCode: ETSY_INVALID_KEYWORD });
  });

  it("maps Etsy rate limits without fabricating signals", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["etsy_v3"],
      keywords: ["coastal cowgirl"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development", ETSY_API_KEY: "etsy_limited_key" }),
      fetchers: {
        etsy_v3: async () => jsonResponse({ error: "rate_limited" }, 429)
      }
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "failed", failureCode: SOURCE_RATE_LIMITED });
    expect(await repos.trend.listByWorkspace(workspaceId)).toEqual([]);
  });

  it("treats non-JSON Etsy responses as invalid", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["etsy_v3"],
      keywords: ["coastal cowgirl"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development", ETSY_API_KEY: "etsy_invalid_key" }),
      fetchers: {
        etsy_v3: async () => new Response("not-json", { status: 200 })
      }
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "failed", failureCode: SOURCE_INVALID_RESPONSE });
  });
});
