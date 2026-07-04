import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requirePrintifyMockupSmokeOptIn } from "../scripts/smoke-printify-mockups-live";

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
});
