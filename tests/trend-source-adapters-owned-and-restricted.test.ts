import { describe, expect, it } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  ensureSaltyCowhideTrendProfile,
  GA4_AUTH_MISSING,
  GA4_PROPERTY_MISSING,
  GOOGLE_TRENDS_ALPHA_NOT_AVAILABLE,
  GSC_AUTH_MISSING,
  GSC_PROPERTY_MISSING,
  LICENSED_PROVIDER_KEY_MISSING,
  LICENSED_PROVIDER_NOT_APPROVED,
  META_AD_LIBRARY_AUTH_MISSING,
  PINTEREST_SCOPE_MISSING,
  REDDIT_COMMERCIAL_ACCESS_MISSING,
  SHOPIFY_CONNECTION_MISSING,
  TIKTOK_APPROVED_ACCESS_MISSING,
  runTrendSourcesForProfile,
  storeVerifiedGoogleOAuth
} from "@saltyfactory/integrations";

const workspaceId = "wks_default";
const actorId = "trend_owned_owner";
const encryptionKey = "0123456789abcdef0123456789abcdef";

async function seedGoogleOAuth(repos: ReturnType<typeof createMemoryRepositories>) {
  const config = parseEnv({
    NODE_ENV: "test",
    APP_ENV: "development",
    GOOGLE_INTEGRATIONS_ENABLED: "true",
    GOOGLE_ANALYTICS_ENABLED: "true",
    GOOGLE_SEARCH_CONSOLE_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3001/api/studio/integrations/google/oauth/callback",
    CREDENTIAL_ENCRYPTION_KEY: encryptionKey
  });
  await storeVerifiedGoogleOAuth({
    repos,
    workspaceId,
    actorId,
    config,
    tokens: {
      access_token: "google-access-token",
      refresh_token: "google-refresh-token",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      scope: "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly"
    },
    fetcher: async () => new Response(JSON.stringify({ email: "owner@saltycowhide.com", verified_email: true }), { status: 200, headers: { "content-type": "application/json" } })
  });
  return config;
}

async function runSingleSource(sourceKey: string, config: ReturnType<typeof parseEnv>) {
  const repos = createMemoryRepositories();
  const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
  const allowedSources = Array.isArray(profile.allowed_sources) ? profile.allowed_sources.map(String) : [];
  await repos.trendIntelligence.profiles.update(String(profile.id), {
    allowed_sources: Array.from(new Set([...allowedSources, sourceKey]))
  });
  const result = await runTrendSourcesForProfile({
    repos,
    workspaceId,
    actorId,
    profileId: String(profile.id),
    sourceKeys: [sourceKey],
    config
  });
  return result.sourceResults[0];
}

describe("owned-data and approval-gated trend source adapters", () => {
  it("blocks Shopify internal reads when no Shopify connection exists", async () => {
    await expect(runSingleSource("shopify_internal", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: SHOPIFY_CONNECTION_MISSING
    });
  });

  it("blocks Search Console when Google auth is missing", async () => {
    await expect(runSingleSource("google_search_console", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: GSC_AUTH_MISSING
    });
  });

  it("blocks Search Console when the property is missing even if OAuth exists", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const config = await seedGoogleOAuth(repos);
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["google_search_console"],
      config
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "blocked", failureCode: GSC_PROPERTY_MISSING });
  });

  it("blocks GA4 when Google auth is missing", async () => {
    await expect(runSingleSource("google_analytics", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: GA4_AUTH_MISSING
    });
  });

  it("blocks GA4 when the property ID is missing even if OAuth exists", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const config = await seedGoogleOAuth(repos);
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["google_analytics"],
      config
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "blocked", failureCode: GA4_PROPERTY_MISSING });
  });

  it("blocks Pinterest without approved scope", async () => {
    await expect(runSingleSource("pinterest_trends", parseEnv({
      NODE_ENV: "test",
      APP_ENV: "development",
      PINTEREST_TRENDS_ENABLED: "true",
      PINTEREST_ACCESS_TOKEN: "pin_token"
    }))).resolves.toMatchObject({ status: "blocked", failureCode: PINTEREST_SCOPE_MISSING });
  });

  it("blocks Google Trends alpha when official access is unavailable", async () => {
    await expect(runSingleSource("google_trends_alpha", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: GOOGLE_TRENDS_ALPHA_NOT_AVAILABLE
    });
  });

  it("blocks Meta Ad Library without auth", async () => {
    await expect(runSingleSource("meta_ad_library", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: META_AD_LIBRARY_AUTH_MISSING
    });
  });

  it("blocks Reddit without approved commercial-safe access", async () => {
    await expect(runSingleSource("reddit_api", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: REDDIT_COMMERCIAL_ACCESS_MISSING
    });
  });

  it("blocks TikTok without approved official access", async () => {
    await expect(runSingleSource("tiktok_business_discovery", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: TIKTOK_APPROVED_ACCESS_MISSING
    });
  });

  it("blocks licensed providers without approval or keys", async () => {
    await expect(runSingleSource("licensed_google_serp_provider", parseEnv({ NODE_ENV: "test", APP_ENV: "development" }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: LICENSED_PROVIDER_KEY_MISSING
    });
    await expect(runSingleSource("licensed_google_serp_provider", parseEnv({
      NODE_ENV: "test",
      APP_ENV: "development",
      LICENSED_TREND_PROVIDER_API_KEY: "licensed_key"
    }))).resolves.toMatchObject({
      status: "blocked",
      failureCode: LICENSED_PROVIDER_NOT_APPROVED
    });
  });
});
