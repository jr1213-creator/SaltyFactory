import { describe, expect, it } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  assertSafeTrendSourceRequest,
  ensureSaltyCowhideTrendProfile,
  ensureTrendSourceRegistry,
  runTrendSourcesForProfile,
  PINTEREST_AUTH_MISSING,
  TREND_SOURCE_NOT_ALLOWED_FOR_PROFILE
} from "@saltyfactory/integrations";

const workspaceId = "wks_default";
const actorId = "trend_registry_owner";

describe("trend source registry", () => {
  it("registers every supported source with the expected policy fields", async () => {
    const repos = createMemoryRepositories();
    const sources = await ensureTrendSourceRegistry({
      repos,
      workspaceId,
      actorId,
      config: parseEnv({
        NODE_ENV: "test",
        APP_ENV: "development",
        ETSY_API_KEY: "etsy_registry_key",
        EBAY_CLIENT_ID: "ebay_registry_id",
        EBAY_CLIENT_SECRET: "ebay_registry_secret"
      })
    });

    expect(sources.map((row) => row.source_key)).toEqual(expect.arrayContaining([
      "etsy_v3",
      "ebay_browse",
      "shopify_internal",
      "google_search_console",
      "google_analytics",
      "pinterest_trends",
      "google_trends_alpha",
      "meta_ad_library",
      "reddit_api",
      "tiktok_business_discovery",
      "licensed_google_serp_provider"
    ]));
    expect(sources.find((row) => row.source_key === "etsy_v3")).toMatchObject({
      access_mode: "official_api",
      auth_status: "configured",
      is_enabled: true,
      commercial_use_allowed: true
    });
    expect(sources.find((row) => row.source_key === "pinterest_trends")).toMatchObject({
      requires_approval: true,
      access_mode: "official_api",
      is_enabled: false
    });
  });

  it("rejects unsafe automation settings before any provider call", () => {
    expect(() => assertSafeTrendSourceRequest({ proxyUrl: "http://127.0.0.1:8080", captchaSolver: "bad" })).toThrow();
  });

  it("blocks sources that are not allowed by the watch profile", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["reddit_api"],
      config: parseEnv({
        NODE_ENV: "test",
        APP_ENV: "development",
        REDDIT_API_ENABLED: "true",
        REDDIT_COMMERCIAL_APPROVED: "true",
        REDDIT_ACCESS_TOKEN: "reddit_registry_token"
      })
    });

    expect(result.sourceResults[0]).toMatchObject({
      sourceKey: "reddit_api",
      status: "blocked",
      failureCode: TREND_SOURCE_NOT_ALLOWED_FOR_PROFILE
    });
  });

  it("keeps allowed but unconfigured sources blocked with typed failure codes", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["pinterest_trends"],
      config: parseEnv({
        NODE_ENV: "test",
        APP_ENV: "development"
      })
    });

    expect(result.sourceResults[0]).toMatchObject({
      sourceKey: "pinterest_trends",
      status: "blocked",
      failureCode: PINTEREST_AUTH_MISSING
    });
  });
});
