import { describe, expect, it } from "vitest";
import { calculateMarginEconomics, createSeoGeoPdpRecommendation, runDeterministicReadinessCheck, runUnifiedPolicyIpCheck } from "@saltyfactory/ai-free";
import { tables } from "@saltyfactory/db";
import { coreInput, createDeterministicCoreRepos, deterministicWorkspaceId, seedDeterministicDraft } from "./agent-deterministic-core-test-helpers";

describe("deterministic core repository wiring", () => {
  it("memory adapter persists and reads all four deterministic output types", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "repo_memory", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    await runDeterministicReadinessCheck(coreInput(repos, fixture));
    await calculateMarginEconomics(coreInput(repos, fixture));
    await runUnifiedPolicyIpCheck(coreInput(repos, fixture));
    await createSeoGeoPdpRecommendation(coreInput(repos, fixture));

    expect(await repos.commerceAgent.productReadinessChecks.listByWorkspace(deterministicWorkspaceId)).toHaveLength(1);
    expect(await repos.commerceAgent.marginAnalysis.listByWorkspace(deterministicWorkspaceId)).toHaveLength(1);
    expect(await repos.marketing.policyReviewResults.listByWorkspace(deterministicWorkspaceId)).toHaveLength(2);
    expect(await repos.commerceAgent.seoRecommendations.listByWorkspace(deterministicWorkspaceId)).toHaveLength(1);
  });

  it("Drizzle schema exports include deterministic core tables and policy review columns", () => {
    expect(tables.productReadinessChecks).toBeTruthy();
    expect(tables.marginAnalysis).toBeTruthy();
    expect(tables.seoRecommendations).toBeTruthy();
    expect(tables.policyReviewResults).toBeTruthy();
    expect(Object.keys(tables.policyReviewResults)).toEqual(expect.arrayContaining([
      "sourceTextHash",
      "rulesetVersion",
      "flaggedTerms",
      "unsupportedClaims",
      "personalAttributeFlags",
      "ipFlags",
      "riskLevel",
      "suggestedRewrite",
      "rewriteRecheckStatus"
    ]));
  });
});
