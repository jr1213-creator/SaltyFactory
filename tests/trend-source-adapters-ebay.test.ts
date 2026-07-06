import { describe, expect, it, vi } from "vitest";
import { parseEnv } from "@saltyfactory/config";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  EBAY_AUTH_MISSING,
  EBAY_BROWSE_RATE_LIMITED,
  ensureSaltyCowhideTrendProfile,
  runTrendSourcesForProfile
} from "@saltyfactory/integrations";

const workspaceId = "wks_default";
const actorId = "trend_ebay_owner";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("eBay Browse trend source adapter", () => {
  it("blocks when eBay client credentials are missing", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["ebay_browse"],
      config: parseEnv({ NODE_ENV: "test", APP_ENV: "development" })
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "blocked", failureCode: EBAY_AUTH_MISSING });
  });

  it("uses the official token and browse search flow, then persists normalized listings", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    const fetcher = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("identity/v1/oauth2/token")) {
        expect(init?.method).toBe("POST");
        expect((init?.headers as Record<string, string>).authorization).toContain("Basic ");
        return jsonResponse({ access_token: "ebay_access_token" });
      }
      expect(href).toContain("https://api.ebay.com/buy/browse/v1/item_summary/search");
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer ebay_access_token");
      expect((init?.headers as Record<string, string>)["x-ebay-c-marketplace-id"]).toBe("EBAY_US");
      return jsonResponse({
        itemSummaries: [
          {
            itemId: "v1|123|0",
            title: "Coastal Cowgirl Keychain",
            itemWebUrl: "https://www.ebay.com/itm/123",
            price: { value: "19.99", currency: "USD" },
            categories: [{ categoryName: "Keychains" }]
          }
        ]
      });
    });

    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["ebay_browse"],
      keywords: ["coastal cowgirl"],
      config: parseEnv({
        NODE_ENV: "test",
        APP_ENV: "development",
        EBAY_CLIENT_ID: "ebay_client_id",
        EBAY_CLIENT_SECRET: "ebay_client_secret",
        EBAY_MARKETPLACE_ID: "EBAY_US"
      }),
      fetchers: { ebay_browse: fetcher }
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "success", normalizedSignalCount: 1, citationCount: 1 });
    const [signal] = await repos.trend.listByWorkspace(workspaceId);
    expect(signal).toMatchObject({
      source_key: "ebay_browse",
      signal_type: "ebay_listing",
      normalized_title: "Coastal Cowgirl Keychain",
      citation_url: "https://www.ebay.com/itm/123"
    });
  });

  it("maps eBay browse rate limits without writing fake data", async () => {
    const repos = createMemoryRepositories();
    const profile = await ensureSaltyCowhideTrendProfile({ repos, workspaceId, actorId });
    let calls = 0;
    const result = await runTrendSourcesForProfile({
      repos,
      workspaceId,
      actorId,
      profileId: String(profile.id),
      sourceKeys: ["ebay_browse"],
      keywords: ["coastal cowgirl"],
      config: parseEnv({
        NODE_ENV: "test",
        APP_ENV: "development",
        EBAY_CLIENT_ID: "ebay_client_id",
        EBAY_CLIENT_SECRET: "ebay_client_secret"
      }),
      fetchers: {
        ebay_browse: async () => {
          calls += 1;
          return calls === 1
            ? jsonResponse({ access_token: "ebay_access_token" })
            : jsonResponse({ error: "rate_limited" }, 429);
        }
      }
    });

    expect(result.sourceResults[0]).toMatchObject({ status: "failed", failureCode: EBAY_BROWSE_RATE_LIMITED });
    expect(await repos.trend.listByWorkspace(workspaceId)).toEqual([]);
  });
});
