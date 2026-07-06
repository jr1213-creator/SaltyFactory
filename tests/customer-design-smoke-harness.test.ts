import { afterEach, describe, expect, it, vi } from "vitest";
import { createCustomerDesignRepos } from "./customer-design-test-helpers";
import { ScriptedCustomerDesignSmokeProvider, runCustomerDesignConciergeSmoke } from "../scripts/smoke-customer-design-concierge";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("customer design concierge smoke harness", () => {
  it("proves the memory/test-adapter customer loop without live provider mutation overclaims", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("AI_EMPLOYEES_REAL_AGENT_ENABLED", "true");
    vi.stubEnv("AI_EMPLOYEES_MODEL_PROVIDER", "ollama");
    const provider = new ScriptedCustomerDesignSmokeProvider();

    const report = await runCustomerDesignConciergeSmoke({
      repos: createCustomerDesignRepos(),
      modelProvider: provider,
      requireEnvGate: false
    });

    expect(report.ok).toBe(true);
    expect(report.storefrontProductsRendered).toBeGreaterThan(0);
    expect(report.candidatesGenerated).toBeGreaterThanOrEqual(3);
    expect(report.customerApprovedCandidate).toBe(true);
    expect(report.customerSpecificProductCreated).toBe(true);
    expect(report.purchaseUrlCreated).toBe(true);
    expect(report.publicCatalogPromoted).toBe(false);
    expect(report.shopifyAdminTokenExposed).toBe(false);
    expect(report.productCreateMode).toBe("test_adapter");
    expect(report.shopifyProductCreateMode).toBe("test_adapter");
    expect(report.purchaseUrlMode).toBe("test_adapter_product_page");
    expect(report.providerMutationInstrumentation).toBe("not_available");
    expect(report.liveShopifyMutationAttempted).toBe(false);
    expect(report.printifyTouched).toBe(false);
    expect(report.hfTouched).toBe(false);
    expect(report.imageGenerationMode).toBe("fixture");
    expect(report.liveImageGenerationAttempted).toBe(false);
    expect(report.emailSmsSent).toBe(false);
    expect(report.socialPosted).toBe(false);
    expect(report.adSpendAttempted).toBe(false);
    expect(report.tokenEchoDetected).toBe(false);
    expect(report.tokenHashExposed).toBe(false);
    expect(JSON.stringify(report)).not.toContain("session_token_hash");
    expect(provider.calls.length).toBeGreaterThan(0);
  });
});
