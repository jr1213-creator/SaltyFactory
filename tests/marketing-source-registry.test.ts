import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { ensureMarketingSourceRegistry } from "@saltyfactory/ai-free";
import { marketingActorId, marketingWorkspaceId } from "./marketing-test-helpers";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllEnvs();
});

describe("marketing source registry", () => {
  it("registers every supported source with live writes disabled or blocked for execution lanes that would mutate platforms", async () => {
    const repos = createMemoryRepositories();
    vi.stubEnv("META_ACCESS_TOKEN", "meta_marketing_secret");
    vi.stubEnv("MARKETING_SOURCE_ENABLE_META_MARKETING", "true");
    vi.stubEnv("GOOGLE_ADS_CUSTOMER_ID", "123-456-7890");
    vi.stubEnv("MARKETING_SOURCE_ENABLE_GOOGLE_ADS", "true");
    vi.stubEnv("KLAVIYO_API_KEY", "klaviyo_secret");
    vi.stubEnv("MARKETING_SOURCE_ENABLE_KLAVIYO", "true");
    vi.stubEnv("MAILCHIMP_API_KEY", "mailchimp_secret");
    vi.stubEnv("MARKETING_SOURCE_ENABLE_MAILCHIMP", "true");

    const sources = await ensureMarketingSourceRegistry({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId
    });

    expect(sources.map((row) => row.source_key)).toEqual(expect.arrayContaining([
      "shopify_admin",
      "ga4",
      "google_search_console",
      "google_merchant",
      "klaviyo",
      "mailchimp",
      "meta_ad_library",
      "meta_marketing",
      "google_ads",
      "pinterest",
      "tiktok_business",
      "tiktok_commercial_content",
      "canva",
      "buffer",
      "dataforseo",
      "semrush",
      "ahrefs",
      "manual_owner_notes"
    ]));
    expect(sources.find((row) => row.source_key === "meta_marketing")).toMatchObject({
      credential_status: "configured",
      access_mode: "live_write_disabled",
      is_enabled: true
    });
    expect(sources.find((row) => row.source_key === "google_ads")).toMatchObject({
      credential_status: "configured",
      access_mode: "live_write_disabled",
      is_enabled: true
    });
    expect(sources.find((row) => row.source_key === "shopify_admin")).toMatchObject({
      access_mode: "write_blocked"
    });
    expect(sources.find((row) => row.source_key === "pinterest")).toMatchObject({
      access_mode: "draft_only"
    });
    expect(sources.every((row) => !String(row.access_mode).includes("live_write_enabled"))).toBe(true);
  });

  it("keeps missing-credential sources disabled with typed status instead of fabricating readiness", async () => {
    const repos = createMemoryRepositories();
    const sources = await ensureMarketingSourceRegistry({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId
    });

    expect(sources.find((row) => row.source_key === "klaviyo")).toMatchObject({
      credential_status: "not_configured",
      is_enabled: false,
      access_mode: "live_write_disabled"
    });
    expect(sources.find((row) => row.source_key === "mailchimp")).toMatchObject({
      credential_status: "not_configured",
      is_enabled: false,
      access_mode: "live_write_disabled"
    });
    expect(sources.find((row) => row.source_key === "manual_owner_notes")).toMatchObject({
      credential_status: "configured",
      is_enabled: true,
      access_mode: "read_only"
    });
  });
});
