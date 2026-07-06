import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { runMarketingLaunchSmoke } from "../scripts/smoke-marketing-launch-planning";
import {
  marketingFinalJson,
  marketingLaunchToolCalls,
  ScriptedMarketingProvider,
  seedMarketingLaunchPlan
} from "./marketing-test-helpers";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("marketing smoke harness", () => {
  it("is registered as an opt-in package script with no token-bearing output references", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const source = readFileSync("scripts/smoke-marketing-launch-planning.ts", "utf8");

    expect(pkg.scripts["smoke:marketing-launch-planning"]).toBe("tsx scripts/smoke-marketing-launch-planning.ts");
    expect(source).toContain("RUN_MARKETING_LAUNCH_SMOKE");
    expect(source).toContain("launchPlanId");
    expect(source).toContain("tokenEchoDetected");
    expect(source).not.toMatch(/Authorization|Bearer|service_role|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("writes a compact smoke report without token echoes or live-action flags", async () => {
    vi.stubEnv("RUN_MARKETING_LAUNCH_SMOKE", "true");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    const repos = createMemoryRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });
    vi.stubEnv("META_ACCESS_TOKEN", "meta_secret_for_echo_check");

    const report = await runMarketingLaunchSmoke({
      repos,
      modelProvider: new ScriptedMarketingProvider([
        {
          ok: true,
          providerUsed: "ollama",
          modelUsed: "qwen3:8b",
          text: "",
          toolCalls: marketingLaunchToolCalls(fixture.launchPlanId)
        },
        {
          ok: true,
          providerUsed: "ollama",
          modelUsed: "qwen3:8b",
          text: marketingFinalJson(fixture.launchPlanId)
        }
      ])
    });

    const reportPath = path.join(process.cwd(), "test-results", "marketing-launch-planning", "report.json");
    const written = JSON.parse(readFileSync(reportPath, "utf8")) as Record<string, unknown>;

    expect(report.ok).toBe(true);
    expect(written).toMatchObject({
      ok: true,
      tokenEchoDetected: false,
      liveAdWritesAttempted: false,
      shopifyMutationsAttempted: false,
      publicPostsAttempted: false,
      emailSendsAttempted: false,
      smsSendsAttempted: false,
      imageGenerationAttempted: false,
      printifyTouched: false,
      hfTouched: false,
      productPublishAttempted: false
    });
    expect(Number(written.organicContentDraftCount ?? 0)).toBeGreaterThan(0);
    expect(Number(written.campaignDraftCount ?? 0)).toBeGreaterThan(0);
    expect(JSON.stringify(written)).not.toContain("meta_secret_for_echo_check");
  });
});
