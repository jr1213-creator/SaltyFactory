import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPrintifySmokeProductProfile,
  classifyPrintifySmokeFailure,
  importPrintifyMockupsWithRetry,
  printifySmokeProductTitlePrefix,
  requirePrintifyMockupSmokeOptIn
} from "../scripts/smoke-printify-mockups-live";

describe("Printify mockup live smoke harness", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips unless explicitly enabled", () => {
    vi.stubEnv("RUN_LIVE_PRINTIFY_MOCKUP_SMOKE", "");

    expect(requirePrintifyMockupSmokeOptIn()).toMatchObject({
      ok: false,
      skipped: true
    });
  });

  it("requires exact confirmation before creating a Printify product", () => {
    vi.stubEnv("RUN_LIVE_PRINTIFY_MOCKUP_SMOKE", "true");
    vi.stubEnv("PRINTIFY_SMOKE_CONFIRMATION", "yes");

    expect(() => requirePrintifyMockupSmokeOptIn()).toThrow(/missing_printify_smoke_confirmation/);
  });

  it("refuses production runtime", () => {
    vi.stubEnv("RUN_LIVE_PRINTIFY_MOCKUP_SMOKE", "true");
    vi.stubEnv("PRINTIFY_SMOKE_CONFIRMATION", "CREATE TEST PRINTIFY PRODUCT");
    vi.stubEnv("APP_ENV", "production");

    expect(() => requirePrintifyMockupSmokeOptIn()).toThrow(/live_printify_smoke_refuses_production_runtime/);
  });

  it("uses the Printify mockup workflow helper and does not rely on raw env token shortcuts", () => {
    const source = readFileSync(join(process.cwd(), "scripts/smoke-printify-mockups-live.ts"), "utf8");

    expect(source).toContain("createPrintifyProductForMockups");
    expect(source).toContain("importPrintifyMockupsForReference");
    expect(source).toContain("PRINTIFY_SMOKE_CONFIRMATION");
    expect(source).toContain("CREATE TEST PRINTIFY PRODUCT");
    expect(source).toContain("mockupIds");
    expect(source).not.toContain("PRINTIFY_API_TOKEN");
  });

  it("labels live smoke products as safe-to-delete test products", () => {
    const profile = buildPrintifySmokeProductProfile(new Date("2026-07-04T12:34:56.000Z"));

    expect(profile.title).toBe(`${printifySmokeProductTitlePrefix} - 2026-07-04T12-34-56-000Z`);
    expect(profile.description).toContain("Safe to delete");
    expect(profile.tags).toEqual(["saltyfactory-smoke-test", "delete-me", "private-beta-test"]);
    expect(profile.metadata).toMatchObject({ smokeTest: true, productTitlePrefix: printifySmokeProductTitlePrefix });
  });

  it("classifies provider failures into owner-safe Printify smoke codes", () => {
    expect(classifyPrintifySmokeFailure("rate_limited")).toBe("rate_limited");
    expect(classifyPrintifySmokeFailure("product_create_failed")).toBe("product_create_failed");
    expect(classifyPrintifySmokeFailure("mockups_not_ready")).toBe("mockups_not_ready");
    expect(classifyPrintifySmokeFailure("printify_not_connected", { blockingReasons: ["Select Printify shop"] })).toBe("printify_shop_missing");
    expect(classifyPrintifySmokeFailure("printify_not_connected", { blockingReasons: ["Validate Printify token"] })).toBe("printify_token_invalid");
  });

  it("retries delayed Printify product.images imports without faking mockups", async () => {
    const wait = vi.fn(async () => undefined);
    const importOnce = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: "mockups_not_ready", retryable: true, blockingReasons: ["mockups_not_ready"] })
      .mockResolvedValueOnce({ ok: false, status: "mockups_not_ready", retryable: true, blockingReasons: ["mockups_not_ready"] })
      .mockResolvedValueOnce({ ok: true, status: "printify_mockups_imported", images: [{ src: "https://images.printify.com/front.png" }], mockups: [{ id: "mockup_printify_1" }] });

    const result = await importPrintifyMockupsWithRetry({ importOnce, attempts: 6, delayMs: 10, wait });

    expect(result.attempts).toBe(3);
    expect(result.result).toMatchObject({ ok: true, status: "printify_mockups_imported" });
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(10);
  });

  it("reports pending mockups after bounded retries", async () => {
    const wait = vi.fn(async () => undefined);
    const importOnce = vi.fn(async () => ({ ok: false as const, status: "mockups_not_ready", retryable: true, blockingReasons: ["mockups_not_ready"] }));

    const result = await importPrintifyMockupsWithRetry({ importOnce, attempts: 3, delayMs: 1, wait });

    expect(result.attempts).toBe(3);
    expect(result.result).toMatchObject({ ok: false, status: "mockups_not_ready", retryable: true });
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("does not call Shopify or live publish from the live smoke script", () => {
    const source = readFileSync(join(process.cwd(), "scripts/smoke-printify-mockups-live.ts"), "utf8");

    expect(source).toContain("Shopify publish: disabled");
    expect(source).toContain("publish/live sync: disabled");
    expect(source).not.toContain("publishProductGuarded");
    expect(source).not.toContain("/api/studio/publish");
    expect(source).not.toContain("publish.json");
    expect(source).not.toContain("liveSyncCalled: true");
    expect(source).not.toContain("shopifyPublishCalled: true");
  });
});
