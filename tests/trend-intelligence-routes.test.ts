import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { GET as legacyTrendSourcesGet, POST as legacyTrendSourcesPost } from "../apps/studio/app/api/studio/trend-sources/route";
import { POST as legacyTrendIngestPost } from "../apps/studio/app/api/studio/trend-sources/[id]/ingest/route";
import { GET as trendSourcesGet } from "../apps/studio/app/api/studio/trend-intelligence/sources/route";
import { POST as seedProfilePost } from "../apps/studio/app/api/studio/trend-intelligence/profiles/seed-salty-cowhide/route";
import { POST as createRunPost } from "../apps/studio/app/api/studio/trend-intelligence/runs/create/route";
import { GET as getRunGet } from "../apps/studio/app/api/studio/trend-intelligence/runs/[id]/route";
import { POST as analyzeRunPost } from "../apps/studio/app/api/studio/trend-intelligence/analyze/run/route";
import { POST as reviewConceptPost } from "../apps/studio/app/api/studio/trend-intelligence/concepts/[id]/review/route";

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
    const analyzeResponse = await analyzeRunPost(new Request("http://localhost:3001/api/studio/trend-intelligence/analyze/run", { method: "POST" }));

    expect(sourcesResponse.status).toBe(401);
    expect(runResponse.status).toBe(401);
    expect(analyzeResponse.status).toBe(401);
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

  it("analyze/run reads persisted signals only and does not call external source, commerce, or image providers", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");

    const profileResponse = await seedProfilePost(authedRequest("/api/studio/trend-intelligence/profiles/seed-salty-cowhide", "POST"));
    const profileBody = await profileResponse.json();
    const profileId = String(profileBody.profile.id);
    const suffix = `analyze_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const repos = createRepositories();
    await repos.trend.create({
      id: `tsig_${suffix}`,
      workspace_id: "wks_default",
      profile_id: profileId,
      source_id: null,
      source_key: "manual_owner_notes",
      signal_type: "keyword",
      keyword: "coastal cowgirl car charm",
      normalized_keyword: "coastal cowgirl car charm",
      normalized_title: "coastal cowgirl pearl car charm",
      normalized_tags: ["coastal cowgirl", "car charm"],
      normalized_motif_tags: ["pearl", "turquoise"],
      related_terms: ["western charm"],
      category: "accessories",
      season: "summer",
      confidence: "0.82",
      status: "active",
      risk_flags: [],
      observed_at: new Date().toISOString(),
      metric_value: "12",
      metric_type: "owner_note",
      created_by: actor.id,
      updated_by: actor.id
    } as WorkspaceRow);

    const fetchSpy = vi.fn(async (url: URL | RequestInfo) => {
      throw new Error(`unexpected external provider call: ${String(url)}`);
    }) as typeof fetch;
    vi.stubGlobal("fetch", fetchSpy);

    const response = await analyzeRunPost(authedRequest("/api/studio/trend-intelligence/analyze/run", "POST", {
      profileId,
      sourceKeys: ["manual_owner_notes"],
      dryRun: true
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "dry_run",
      profileId,
      signalCount: 1
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("concept review only updates review status and rejects invalid decisions without product or creative side effects", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");

    const profileResponse = await seedProfilePost(authedRequest("/api/studio/trend-intelligence/profiles/seed-salty-cowhide", "POST"));
    const profileBody = await profileResponse.json();
    const profileId = String(profileBody.profile.id);
    const suffix = `concept_review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const conceptId = `concept_${suffix}`;
    const repos = createRepositories();
    await repos.trendIntelligence.concepts.create({
      id: conceptId,
      workspace_id: "wks_default",
      profile_id: profileId,
      cluster_id: `cluster_${suffix}`,
      trend_score_id: null,
      title: "Concept review route fixture",
      customer_segment: "Coastal cowgirl shopper",
      product_category: "accessories",
      suggested_product_types: ["car charm"],
      personalization_potential: "medium",
      phrases: ["coastal cowgirl"],
      visual_motifs: ["turquoise"],
      palette: ["sand"],
      print_style: "boutique charm layout",
      recommended_blank_or_base_product: "acrylic charm",
      margin_hypothesis: "Owner review required.",
      source_evidence: {
        cluster_id: `cluster_${suffix}`,
        source_keys: ["manual_owner_notes"],
        signal_ids: [],
        citation_ids: [],
        evidence_summary: "Persisted owner note."
      },
      reason_it_may_sell: "Fits the customer segment.",
      risk_notes: "Owner review required.",
      owner_action_needed: "approve",
      review_status: "pending_review",
      created_by_kind: "ollama_agent",
      owner_notes: null,
      created_by: actor.id,
      updated_by: actor.id
    } as WorkspaceRow);

    const beforeDrafts = await repos.draft.listByWorkspace("wks_default");
    const beforeDesignBriefs = await repos.brief.listByWorkspace("wks_default");
    const beforeCreativeBriefs = await repos.marketing.creativeBriefs.listByWorkspace("wks_default");

    const invalidResponse = await reviewConceptPost(authedRequest(`/api/studio/trend-intelligence/concepts/${conceptId}/review`, "POST", {
      reviewStatus: "ready_for_review"
    }), { params: Promise.resolve({ id: conceptId }) });
    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toMatchObject({
      ok: false,
      status: "blocked",
      errorCode: "invalid_review_status"
    });
    await expect(repos.trendIntelligence.concepts.getById(conceptId, "wks_default")).resolves.toMatchObject({
      review_status: "pending_review"
    });

    const approveResponse = await reviewConceptPost(authedRequest(`/api/studio/trend-intelligence/concepts/${conceptId}/review`, "POST", {
      reviewStatus: "approved",
      ownerNotes: "Approved for marketing planning only."
    }), { params: Promise.resolve({ id: conceptId }) });
    expect(approveResponse.status).toBe(200);
    await expect(approveResponse.json()).resolves.toMatchObject({
      ok: true,
      conceptCandidate: {
        id: conceptId,
        reviewStatus: "approved",
        ownerNotes: "Approved for marketing planning only."
      }
    });
    expect(await repos.draft.listByWorkspace("wks_default")).toHaveLength(beforeDrafts.length);
    expect(await repos.brief.listByWorkspace("wks_default")).toHaveLength(beforeDesignBriefs.length);
    expect(await repos.marketing.creativeBriefs.listByWorkspace("wks_default")).toHaveLength(beforeCreativeBriefs.length);
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
