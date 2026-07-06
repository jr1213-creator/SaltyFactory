import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runTrendSourcesSmoke } from "../scripts/smoke-trend-sources";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trend sources smoke harness", () => {
  it("writes a compact report without token echoes", async () => {
    vi.stubEnv("RUN_TREND_SOURCE_SMOKE", "true");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
    vi.stubEnv("ETSY_API_KEY", "etsy_smoke_secret");
    vi.stubGlobal("fetch", vi.fn(async (url: URL | RequestInfo) => {
      expect(String(url)).toContain("openapi.etsy.com");
      return new Response(JSON.stringify({
        results: [
          {
            listing_id: 456,
            title: "Coastal Cowgirl Smoke Charm",
            tags: ["coastal", "charm"],
            price: { amount: "17.00", currency_code: "USD" },
            url: "https://etsy.com/listing/456"
          }
        ]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch);

    const report = await runTrendSourcesSmoke();
    const reportPath = path.join(process.cwd(), "test-results", "trend-sources", "report.json");
    const written = JSON.parse(readFileSync(reportPath, "utf8")) as Record<string, unknown>;

    expect(report).toMatchObject({ tokenEchoDetected: false });
    expect(written).toMatchObject({ tokenEchoDetected: false });
    expect(JSON.stringify(written)).not.toContain("etsy_smoke_secret");
  });
});
