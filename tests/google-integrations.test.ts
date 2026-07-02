import { afterEach, describe, expect, it } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { decryptCredential } from "@saltyfactory/security";
import {
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_ANALYTICS_SETUP_SCOPES,
  GOOGLE_MERCHANT_CENTER_SETUP_SCOPES,
  GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES,
  autoDetectGoogleSetup,
  configureGoogleWorkspace,
  googleOAuthSetupRequired,
  setupGoogleAnalyticsForSaltyCowhide,
  setupMerchantCenterForSaltyCowhide,
  setupSearchConsoleForSaltyCowhide,
  storeVerifiedGoogleOAuth,
  syncGoogleAnalytics,
  syncGoogleBusinessProfile,
  syncGoogleSearchConsole,
  type GoogleFetch
} from "@saltyfactory/integrations";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { GET as googleOAuthStart } from "../apps/studio/app/api/studio/integrations/google/oauth/start/route";
import { GET as googleOAuthCallback } from "../apps/studio/app/api/studio/integrations/google/oauth/callback/route";
import { POST as googleAutoDetect } from "../apps/studio/app/api/studio/integrations/google/auto-detect/route";
import { signOAuthState } from "../apps/studio/app/api/studio/integrations/_shared";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const workspaceId = "wks_default";
const actor = { id: "auth_user_01", email: "owner@saltycowhide.com", emailVerified: true };
const key = "12345678901234567890123456789012";

function googleConfig(overrides: Record<string, string | undefined> = {}) {
  return parseEnv({
    APP_ENV: "development",
    GOOGLE_INTEGRATIONS_ENABLED: "true",
    GOOGLE_ANALYTICS_ENABLED: "true",
    GOOGLE_SEARCH_CONSOLE_ENABLED: "true",
    GOOGLE_BUSINESS_PROFILE_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3001/api/studio/integrations/google/oauth/callback",
    CREDENTIAL_ENCRYPTION_KEY: key,
    ...overrides
  });
}

function authedGet(url: string) {
  return new Request(url, { method: "GET", headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=valid` } });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function seedGoogleConnection(repos = createMemoryRepositories(), overrides: Record<string, string | undefined> = {}, scopes = GOOGLE_OAUTH_SCOPES) {
  const config = googleConfig(overrides);
  const fetcher: GoogleFetch = async (url) => {
    if (String(url).includes("userinfo")) return jsonResponse({ email: "owner@saltycowhide.com", verified_email: true });
    return jsonResponse({});
  };
  await storeVerifiedGoogleOAuth({
    repos,
    workspaceId,
    actorId: actor.id,
    config,
    tokens: {
      access_token: "google-access-token",
      refresh_token: "google-refresh-token",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      scope: scopes.join(" ")
    },
    fetcher
  });
  return { repos, config };
}

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("Google OAuth security", () => {
  it("OAuth start requires Supabase auth and workspace role permission", async () => {
    const response = await googleOAuthStart(new Request("http://localhost:3001/api/studio/integrations/google/oauth/start"));
    expect(response.status).toBe(401);
  });

  it("OAuth start generates signed state and exact read-only scopes for an owner", async () => {
    setSupabaseUserVerifierForTests(async () => actor);
    setWorkspaceAuthorizerForTests(async (user, workspace) => ({ id: user.id, email: user.email, role: "owner", workspaceId: workspace, supabaseUserId: user.id }));
    process.env.GOOGLE_INTEGRATIONS_ENABLED = "true";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:3001/api/studio/integrations/google/oauth/callback";
    process.env.CREDENTIAL_ENCRYPTION_KEY = key;
    const response = await googleOAuthStart(authedGet("http://localhost:3001/api/studio/integrations/google/oauth/start"));
    const body = await response.json();
    const url = new URL(body.authorizationUrl);
    expect(body.status).toBe("authorization_required");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(body.scopes).toEqual(GOOGLE_OAUTH_SCOPES);
    expect(body.authorizationUrl).not.toContain("google-client-secret");
    expect(url.searchParams.get("state")).toContain(".");
  });

  it("OAuth callback rejects invalid state before token exchange", async () => {
    setSupabaseUserVerifierForTests(async () => actor);
    setWorkspaceAuthorizerForTests(async (user, workspace) => ({ id: user.id, email: user.email, role: "owner", workspaceId: workspace, supabaseUserId: user.id }));
    process.env.GOOGLE_INTEGRATIONS_ENABLED = "true";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:3001/api/studio/integrations/google/oauth/callback";
    process.env.CREDENTIAL_ENCRYPTION_KEY = key;
    const response = await googleOAuthCallback(authedGet("http://localhost:3001/api/studio/integrations/google/oauth/callback?state=bad&code=code"));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.status).toBe("blocked");
  });

  it("OAuth callback exchanges code, verifies live userinfo, and never returns tokens", async () => {
    setSupabaseUserVerifierForTests(async () => actor);
    setWorkspaceAuthorizerForTests(async (user, workspace) => ({ id: user.id, email: user.email, role: "owner", workspaceId: workspace, supabaseUserId: user.id }));
    process.env.GOOGLE_INTEGRATIONS_ENABLED = "true";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:3001/api/studio/integrations/google/oauth/callback";
    process.env.CREDENTIAL_ENCRYPTION_KEY = key;
    globalThis.fetch = (async (url) => {
      if (String(url).includes("oauth2.googleapis.com/token")) return jsonResponse({ access_token: "google-access-token", refresh_token: "google-refresh-token", expires_in: 3600, scope: GOOGLE_OAUTH_SCOPES.join(" ") });
      if (String(url).includes("userinfo")) return jsonResponse({ email: "owner@saltycowhide.com", verified_email: true });
      return jsonResponse({});
    }) as typeof fetch;
    const state = signOAuthState({ workspaceId, actorId: actor.id, supabaseUserId: actor.id, nonce: "n", expiresAt: Date.now() + 60_000 }, key);
    const response = await googleOAuthCallback(authedGet(`http://localhost:3001/api/studio/integrations/google/oauth/callback?state=${encodeURIComponent(state)}&code=code`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("connected");
    expect(JSON.stringify(body)).not.toContain("google-access-token");
    expect(JSON.stringify(body)).not.toContain("google-refresh-token");
    expect(body.connection.credential_ref).toBe("[stored]");
  });

  it("stores Google tokens encrypted and server-only", async () => {
    const { repos } = await seedGoogleConnection();
    const connection = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "google_oauth");
    const credential = await repos.integration.getCredentialForServerUseOnly(workspaceId, String(connection?.secret_ref));
    expect(JSON.stringify(connection)).not.toContain("google-access-token");
    expect(JSON.stringify(credential)).not.toContain("google-refresh-token");
    const decrypted = decryptCredential(credential!.encrypted_payload as any, key);
    expect(decrypted).toContain("google-refresh-token");
  });
});

describe("Google provider status and sync", () => {
  it("reports missing env as not configured", () => {
    expect(googleOAuthSetupRequired(parseEnv({ APP_ENV: "development" }))).toEqual(expect.arrayContaining(["GOOGLE_INTEGRATIONS_ENABLED=true", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "CREDENTIAL_ENCRYPTION_KEY"]));
  });

  it("tokens present but unverified remain configured_not_verified until live verification succeeds", async () => {
    const repos = createMemoryRepositories();
    await configureGoogleWorkspace({ repos, workspaceId, actorId: actor.id, config: googleConfig(), values: { ga4PropertyId: "123" } });
    const connection = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "google_oauth");
    expect(connection?.status).toBe("configured_not_verified");
    expect(JSON.stringify(connection)).not.toContain("access_token");
  });

  it("GA4 missing property ID blocks sync without fake metrics", async () => {
    const { repos, config } = await seedGoogleConnection();
    const result = await syncGoogleAnalytics({ repos, workspaceId, actorId: actor.id, config });
    expect(result).toMatchObject({ ok: false, status: "not_configured" });
    expect(await repos.workspaceMetric.listByWorkspace(workspaceId)).toEqual([]);
  });

  it("mocked GA4 success persists real-shaped metrics", async () => {
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), { GA4_PROPERTY_ID: "123456789" });
    const fetcher: GoogleFetch = async (url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (String(url).includes("userinfo")) return jsonResponse({ email: "owner@saltycowhide.com", verified_email: true });
      if (body.dimensions?.[0]?.name === "pagePath") return jsonResponse({ rows: [{ dimensionValues: [{ value: "/products/tee" }], metricValues: [{ value: "12" }, { value: "8" }] }] });
      if (body.dimensions?.[0]?.name === "sessionSourceMedium") return jsonResponse({ rows: [{ dimensionValues: [{ value: "google / organic" }], metricValues: [{ value: "20" }, { value: "10" }] }] });
      return jsonResponse({ rows: [{ metricValues: [{ value: "100" }, { value: "80" }, { value: "240" }, { value: "16" }] }] });
    };
    const result = await syncGoogleAnalytics({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result).toMatchObject({ ok: true, status: "success" });
    const metrics = await repos.workspaceMetric.listByWorkspace(workspaceId);
    expect(metrics.map((metric) => metric.metric_key)).toEqual(expect.arrayContaining(["ga4.activeUsers.28d", "ga4.top_pages.views", "ga4.acquisition.sessions"]));
  });

  it("GA4 permission errors are sanitized and do not create fake fallback metrics", async () => {
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), { GA4_PROPERTY_ID: "123456789" });
    const fetcher: GoogleFetch = async () => jsonResponse({ error: { status: "PERMISSION_DENIED", message: "access_token google-access-token forbidden" } }, 403);
    const result = await syncGoogleAnalytics({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("access_denied");
    expect(JSON.stringify(result)).not.toContain("google-access-token");
    expect(await repos.workspaceMetric.listByWorkspace(workspaceId)).toEqual([]);
  });

  it("mocked Search Console success persists clicks, impressions, queries, and pages", async () => {
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), { GSC_SITE_URL: "https://example.com/" });
    const fetcher: GoogleFetch = async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (body.dimensions?.[0] === "query") return jsonResponse({ rows: [{ keys: ["coastal tee"], clicks: 3, impressions: 30, ctr: 0.1, position: 4.2 }] });
      if (body.dimensions?.[0] === "page") return jsonResponse({ rows: [{ keys: ["https://example.com/products/tee"], clicks: 5, impressions: 50, ctr: 0.1, position: 3.4 }] });
      return jsonResponse({ rows: [{ clicks: 8, impressions: 80, ctr: 0.1, position: 3.8 }] });
    };
    const result = await syncGoogleSearchConsole({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result).toMatchObject({ ok: true, status: "success" });
    const metrics = await repos.workspaceMetric.listByWorkspace(workspaceId);
    expect(metrics.map((metric) => metric.metric_key)).toEqual(expect.arrayContaining(["gsc.clicks.28d", "gsc.impressions.28d", "gsc.top_queries.clicks", "gsc.top_pages.clicks"]));
  });

  it("mocked Business Profile success persists account, location, performance, and review summary", async () => {
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), { GBP_ACCOUNT_ID: "accounts/1", GBP_LOCATION_ID: "locations/2" });
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("accountmanagement")) return jsonResponse({ accounts: [{ name: "accounts/1", accountName: "Salty" }] });
      if (text.includes("businessinformation")) return jsonResponse({ locations: [{ name: "locations/2", title: "Salty Cowhide Co." }] });
      if (text.includes("reviews")) return jsonResponse({ reviews: [{ starRatingNumeric: 5 }, { starRatingNumeric: 4 }] });
      if (text.includes("businessprofileperformance")) {
        return jsonResponse({
          multiDailyMetricTimeSeries: [
            {
              dailyMetricTimeSeries: [
                { dailyMetric: "WEBSITE_CLICKS", timeSeries: { datedValues: [{ value: "7" }, { value: "2" }] } },
                { dailyMetric: "CALL_CLICKS", timeSeries: { datedValues: [{ value: "3" }] } }
              ]
            }
          ]
        });
      }
      return jsonResponse({});
    };
    const result = await syncGoogleBusinessProfile({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result).toMatchObject({ ok: true, status: "success" });
    const metrics = await repos.workspaceMetric.listByWorkspace(workspaceId);
    expect(metrics.map((metric) => metric.metric_key)).toEqual(expect.arrayContaining(["gbp.accounts.count", "gbp.locations.count", "gbp.reviews.count", "gbp.reviews.average_rating", "gbp.performance.website_clicks.28d", "gbp.performance.call_clicks.28d"]));
  });

  it("Business Profile review quota/API access unavailable returns access_limited without write actions", async () => {
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), { GBP_ACCOUNT_ID: "accounts/1", GBP_LOCATION_ID: "locations/2" });
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("accountmanagement")) return jsonResponse({ accounts: [{ name: "accounts/1", accountName: "Salty" }] });
      if (text.includes("businessinformation")) return jsonResponse({ locations: [{ name: "locations/2", title: "Salty Cowhide Co." }] });
      if (text.includes("reviews")) return jsonResponse({ error: { status: "PERMISSION_DENIED", message: "API not enabled or quota exceeded" } }, 403);
      return jsonResponse({});
    };
    const result = await syncGoogleBusinessProfile({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result).toMatchObject({ ok: false, status: "access_limited" });
    expect(JSON.stringify(result)).not.toMatch(/replyReview|createPost|updateLocation|locations\.patch|localPosts/i);
  });
});

describe("Google auto-detect setup", () => {
  it("auto-detect route requires Supabase auth and workspace permission", async () => {
    const response = await googleAutoDetect(new Request("http://localhost:3001/api/studio/integrations/google/auto-detect", { method: "POST" }));
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.status).toBe("unauthorized");
  });

  it("auto-detect requires an encrypted Google OAuth connection", async () => {
    const repos = createMemoryRepositories();
    const result = await autoDetectGoogleSetup({ repos, workspaceId, actorId: actor.id, config: googleConfig(), fetcher: async () => jsonResponse({}) });
    expect(result).toMatchObject({ ok: false, status: "not_configured" });
  });

  it("one confident GA4 and Search Console match is saved as configured_not_verified without tokens", async () => {
    const { repos, config } = await seedGoogleConnection();
    await repos.businessProfileV1.create({
      id: "biz_google_detect",
      workspace_id: workspaceId,
      public_brand_name: "Salty Cowhide",
      profile_json: { publicBrandName: "Salty Cowhide", storefrontUrl: "https://saltycowhide.com/" },
      created_by: actor.id
    });
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("analyticsadmin.googleapis.com/v1beta/accounts")) return jsonResponse({ accounts: [{ name: "accounts/1", displayName: "Salty Cowhide" }] });
      if (text.includes("analyticsadmin.googleapis.com/v1beta/properties")) return jsonResponse({ properties: [{ name: "properties/123456789", displayName: "Salty Cowhide Web" }] });
      if (text.includes("dataStreams")) return jsonResponse({ dataStreams: [{ webStreamData: { defaultUri: "https://saltycowhide.com/" } }] });
      if (text.includes("webmasters")) return jsonResponse({ siteEntry: [{ siteUrl: "https://saltycowhide.com/", permissionLevel: "siteOwner" }] });
      if (text.includes("mybusinessaccountmanagement")) return jsonResponse({ accounts: [] });
      return jsonResponse({});
    };
    const result = await autoDetectGoogleSetup({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("auto-detect failed");
    expect(result.autoSaved).toMatchObject({ ga4PropertyId: "123456789", searchConsoleSiteUrl: "https://saltycowhide.com/" });
    expect(result.dataSources.businessProfile.status).toBe("optional_not_required");
    expect(JSON.stringify(result)).not.toContain("google-access-token");
    expect(JSON.stringify(result)).not.toContain("google-refresh-token");
    const ga4 = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "ga4");
    const gsc = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "google_search_console");
    expect(ga4?.status).toBe("configured_not_verified");
    expect(gsc?.status).toBe("configured_not_verified");
  });

  it("multiple matching GA4 candidates require owner selection and do not fake connected status", async () => {
    const { repos, config } = await seedGoogleConnection();
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("analyticsadmin.googleapis.com/v1beta/accounts")) return jsonResponse({ accounts: [{ name: "accounts/1", displayName: "Owner" }] });
      if (text.includes("analyticsadmin.googleapis.com/v1beta/properties")) return jsonResponse({ properties: [{ name: "properties/111", displayName: "Salty Cowhide A" }, { name: "properties/222", displayName: "Salty Cowhide B" }] });
      if (text.includes("dataStreams")) return jsonResponse({ dataStreams: [] });
      if (text.includes("webmasters")) return jsonResponse({ siteEntry: [] });
      if (text.includes("mybusinessaccountmanagement")) return jsonResponse({ accounts: [] });
      return jsonResponse({});
    };
    const result = await autoDetectGoogleSetup({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("auto-detect failed");
    expect(result.dataSources.ga4.status).toBe("needs_selection");
    expect(result.autoSaved.ga4PropertyId).toBeUndefined();
    expect(await repos.integration.getProviderConnectionForWorkspace(workspaceId, "ga4")).toBeNull();
  });

  it("unrelated and historically related Google resources are not auto-saved for Salty Cowhide", async () => {
    const { repos, config } = await seedGoogleConnection();
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("analyticsadmin.googleapis.com/v1beta/accounts")) return jsonResponse({ accounts: [{ name: "accounts/1", displayName: "Old projects" }] });
      if (text.includes("analyticsadmin.googleapis.com/v1beta/properties")) return jsonResponse({ properties: [{ name: "properties/111", displayName: "Ruffles and Pixie Dust" }] });
      if (text.includes("dataStreams")) return jsonResponse({ dataStreams: [{ webStreamData: { defaultUri: "https://rufflesandpixiedust.com/" } }] });
      if (text.includes("webmasters")) return jsonResponse({ siteEntry: [
        { siteUrl: "https://sellerinsiderhub.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://thelocalupgrade.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://rufflesandpixiedust.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://oldblog.blogspot.com/", permissionLevel: "siteOwner" }
      ] });
      if (text.includes("mybusinessaccountmanagement")) return jsonResponse({ accounts: [] });
      return jsonResponse({});
    };
    const result = await autoDetectGoogleSetup({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("auto-detect failed");
    expect(result.autoSaved.ga4PropertyId).toBeUndefined();
    expect(result.autoSaved.searchConsoleSiteUrl).toBeUndefined();
    expect(result.dataSources.searchConsole.candidates.map((candidate) => candidate.matchStrength)).toEqual(expect.arrayContaining(["unrelated", "likely_related"]));
    expect(await repos.integration.getProviderConnectionForWorkspace(workspaceId, "ga4")).toBeNull();
    expect(await repos.integration.getProviderConnectionForWorkspace(workspaceId, "google_search_console")).toBeNull();
  });

  it("Search Console properties are listed with sanitized candidate data", async () => {
    const { repos, config } = await seedGoogleConnection();
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("analyticsadmin")) return jsonResponse({ accounts: [] });
      if (text.includes("webmasters")) return jsonResponse({ siteEntry: [{ siteUrl: "sc-domain:saltycowhide.com", permissionLevel: "siteFullUser" }, { siteUrl: "https://example.com/", permissionLevel: "siteRestrictedUser" }] });
      if (text.includes("mybusinessaccountmanagement")) return jsonResponse({ accounts: [] });
      return jsonResponse({});
    };
    const result = await autoDetectGoogleSetup({ repos, workspaceId, actorId: actor.id, config, fetcher, autoSave: false });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("auto-detect failed");
    expect(result.dataSources.searchConsole.candidates.map((candidate) => candidate.siteUrl)).toEqual(expect.arrayContaining(["sc-domain:saltycowhide.com"]));
    expect(JSON.stringify(result)).not.toMatch(/access_token|refresh_token|client_secret|google-access-token|google-refresh-token/i);
  });

  it("GBP access limits are honest and not a hard blocker for online-only Salty Cowhide POD launch", async () => {
    const { repos, config } = await seedGoogleConnection();
    const fetcher: GoogleFetch = async (url) => {
      const text = String(url);
      if (text.includes("analyticsadmin")) return jsonResponse({ accounts: [] });
      if (text.includes("webmasters")) return jsonResponse({ siteEntry: [] });
      if (text.includes("mybusinessaccountmanagement")) return jsonResponse({ error: { status: "PERMISSION_DENIED", message: "API not enabled or quota exceeded for this account" } }, 403);
      return jsonResponse({});
    };
    const result = await autoDetectGoogleSetup({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("auto-detect failed");
    expect(result.dataSources.businessProfile.status).toBe("access_limited");
    expect(result.dataSources.businessProfile.message).toContain("not a hard blocker");
  });

  it("GA4 create setup requires explicit analytics edit scope before creating anything", async () => {
    const { repos, config } = await seedGoogleConnection();
    const result = await setupGoogleAnalyticsForSaltyCowhide({ repos, workspaceId, actorId: actor.id, config, authorizationUrl: "https://accounts.google.com/setup" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("requires_scope");
    expect(result.authorizationUrl).toContain("accounts.google.com");
    expect(result.setupRequired).toEqual(expect.arrayContaining(GOOGLE_ANALYTICS_SETUP_SCOPES));
    expect(await repos.integration.getProviderConnectionForWorkspace(workspaceId, "ga4")).toBeNull();
  });

  it("GA4 create setup saves property and web stream as configured_not_verified", async () => {
    const scopes = [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_ANALYTICS_SETUP_SCOPES];
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), {}, scopes);
    const fetcher: GoogleFetch = async (url, init) => {
      const text = String(url);
      if (text.includes("analyticsadmin.googleapis.com/v1beta/accounts")) return jsonResponse({ accounts: [{ name: "accounts/1", displayName: "Salty Cowhide" }] });
      if (text.endsWith("/properties") && init?.method === "POST") return jsonResponse({ name: "properties/123456789", displayName: "Salty Cowhide - GA4" });
      if (text.includes("dataStreams") && init?.method === "POST") return jsonResponse({ name: "properties/123456789/dataStreams/987", webStreamData: { defaultUri: "https://saltycowhide.com/" } });
      return jsonResponse({});
    };
    const result = await setupGoogleAnalyticsForSaltyCowhide({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("configured_not_verified");
    const ga4 = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "ga4");
    expect(ga4?.status).toBe("configured_not_verified");
    expect((ga4?.configuration as any).webStreamDefaultUri).toBe("https://saltycowhide.com/");
  });

  it("Search Console setup requires explicit write scope and handles verification_required", async () => {
    const { repos, config } = await seedGoogleConnection();
    const missingScope = await setupSearchConsoleForSaltyCowhide({ repos, workspaceId, actorId: actor.id, config, authorizationUrl: "https://accounts.google.com/search-console" });
    expect(missingScope.status).toBe("requires_scope");
    expect(missingScope.setupRequired).toEqual(expect.arrayContaining(GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES));

    const scoped = await seedGoogleConnection(createMemoryRepositories(), {}, [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES]);
    const fetcher: GoogleFetch = async () => jsonResponse({});
    const result = await setupSearchConsoleForSaltyCowhide({ repos: scoped.repos, workspaceId, actorId: actor.id, config: scoped.config, fetcher });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("verification_required");
    const gsc = await scoped.repos.integration.getProviderConnectionForWorkspace(workspaceId, "google_search_console");
    expect(gsc?.status).toBe("configured_not_verified");
  });

  it("Merchant Center setup tracks owner actions and does not submit feeds", async () => {
    const { repos, config } = await seedGoogleConnection(createMemoryRepositories(), {}, [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_MERCHANT_CENTER_SETUP_SCOPES]);
    const fetcher: GoogleFetch = async () => jsonResponse({ accountIdentifiers: [{ merchantId: "1234567" }] });
    const result = await setupMerchantCenterForSaltyCowhide({ repos, workspaceId, actorId: actor.id, config, fetcher });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("configured_not_verified");
    expect(result.ownerActions).toEqual(expect.arrayContaining(["Product feed needed"]));
    expect(JSON.stringify(result)).not.toMatch(/feed submitted|access_token|refresh_token/i);
    const merchant = await repos.integration.getProviderConnectionForWorkspace(workspaceId, "google_merchant_center");
    expect((merchant?.configuration as any).feedSubmissionEnabled).toBe(false);
  });

  it("Google Business Profile online-only path is optional and not a Salty Cowhide launch blocker", async () => {
    const { checkGoogleBusinessProfileEligibilityForSaltyCowhide } = await import("@saltyfactory/integrations");
    const { repos, config } = await seedGoogleConnection();
    const result = await checkGoogleBusinessProfileEligibilityForSaltyCowhide({ repos, workspaceId, actorId: actor.id, config, eligibility: "online_only_ecommerce_pod" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("GBP eligibility failed");
    expect(result.status).toBe("optional_for_online_only");
    expect(result.configuration).toMatchObject({ launchBlocker: false });
  });
});
