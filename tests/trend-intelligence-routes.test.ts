import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { GET as legacyTrendSourcesGet, POST as legacyTrendSourcesPost } from "../apps/studio/app/api/studio/trend-sources/route";
import { POST as legacyTrendIngestPost } from "../apps/studio/app/api/studio/trend-sources/[id]/ingest/route";
import { GET as trendSourcesGet } from "../apps/studio/app/api/studio/trend-intelligence/sources/route";
import { POST as seedProfilePost } from "../apps/studio/app/api/studio/trend-intelligence/profiles/seed-salty-cowhide/route";
import { POST as createRunPost } from "../apps/studio/app/api/studio/trend-intelligence/runs/create/route";
import { GET as getRunGet } from "../apps/studio/app/api/studio/trend-intelligence/runs/[id]/route";

const actor = { id: "trend_route_owner", email: "owner@saltycowhide.com", emailVerified: true };
const originalEnv = { ...process.env };

function authedRequest(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  return new Request(`http://localhost:3001${path}`, {
    method,
    headers: {
      cookie: `${SUPABASE_ACCESS_COOKIE}=valid`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? actor : null);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId,
    supabaseUserId: user.id
  }));
}

afterEach(() => {
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trend intelligence routes", () => {
  it("requires Studio auth for the new source and run routes", async () => {
    const sourcesResponse = await trendSourcesGet(new Request("http://localhost:3001/api/studio/trend-intelligence/sources"));
    const runResponse = await createRunPost(new Request("http://localhost:3001/api/studio/trend-intelligence/runs/create", { method: "POST" }));

    expect(sourcesResponse.status).toBe(401);
    expect(runResponse.status).toBe(401);
  });

  it("seeds a profile, runs official sources with isolated failures, and exposes run detail", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubEnv("ETSY_API_KEY", "etsy_route_key");
    vi.stubGlobal("fetch", vi.fn(async (url: URL | RequestInfo) => {
      expect(String(url)).toContain("openapi.etsy.com");
      return new Response(JSON.stringify({
        results: [
          {
            listing_id: 555,
            title: "Coastal Cowgirl Car Charm",
            tags: ["cowgirl", "car charm"],
            price: { amount: "18.00", currency_code: "USD" },
            url: "https://etsy.com/listing/555"
          }
        ]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch);

    const profileResponse = await seedProfilePost(authedRequest("/api/studio/trend-intelligence/profiles/seed-salty-cowhide", "POST"));
    const profileBody = await profileResponse.json();
    expect(profileBody.ok).toBe(true);

    const runResponse = await createRunPost(authedRequest("/api/studio/trend-intelligence/runs/create", "POST", {
      profileId: profileBody.profile.id,
      sourceKeys: ["etsy_v3", "pinterest_trends"],
      keywords: ["coastal cowgirl"]
    }));
    const runBody = await runResponse.json();

    expect(runBody.ok).toBe(true);
    expect(runBody.sourceResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceKey: "etsy_v3", status: "success", normalizedSignalCount: 1, citationCount: 1 }),
      expect.objectContaining({ sourceKey: "pinterest_trends", status: "blocked", failureCode: "pinterest_auth_missing" })
    ]));

    const successRunId = runBody.sourceResults.find((row: Record<string, unknown>) => row.sourceKey === "etsy_v3")?.runId;
    const detailResponse = await getRunGet(authedRequest(`/api/studio/trend-intelligence/runs/${successRunId}`, "GET"), {
      params: Promise.resolve({ id: successRunId })
    });
    const detailBody = await detailResponse.json();
    expect(detailBody.ok).toBe(true);
    expect(detailBody.run).toMatchObject({ status: "success", source_key: "etsy_v3" });
    expect(detailBody.signals).toHaveLength(1);
    expect(detailBody.citations).toHaveLength(1);
  });

  it("returns a safe 404 when a trend run does not exist", async () => {
    authorizeAsOwner();
    const response = await getRunGet(authedRequest("/api/studio/trend-intelligence/runs/tsrun_missing", "GET"), {
      params: Promise.resolve({ id: "tsrun_missing" })
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "not_found" });
  });

  it("blocks legacy manual trend-source creation and ingestion routes", async () => {
    authorizeAsOwner();
    const listResponse = await legacyTrendSourcesGet(authedRequest("/api/studio/trend-sources", "GET"));
    const createResponse = await legacyTrendSourcesPost(authedRequest("/api/studio/trend-sources", "POST", {
      name: "Manual URL",
      source_url: "https://example.com/feed"
    }));
    const ingestResponse = await legacyTrendIngestPost(authedRequest("/api/studio/trend-sources/tsrc_manual/ingest", "POST"), {
      params: Promise.resolve({ id: "tsrc_manual" })
    });

    expect(listResponse.status).toBe(200);
    expect(createResponse.status).toBe(409);
    await expect(createResponse.json()).resolves.toMatchObject({ failureCode: "source_restricted_do_not_automate" });
    expect(ingestResponse.status).toBe(409);
    await expect(ingestResponse.json()).resolves.toMatchObject({ failureCode: "source_restricted_do_not_automate" });
  });
});
